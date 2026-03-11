"""Scraper for The Salafi Masjid (Wright Street), Birmingham.

Website: wrightstreetmosque.com
PDF format: Monthly timetable with columns:
  Day | Hijri | Gregorian | Fajr Start | Fajr Jama'ah | Sunrise |
  Dhuhr Start | Dhuhr Jama'ah | Asr Start | Asr Jama'ah |
  Maghrib Jama'ah | Isha Start | Isha Jama'ah
"""

import logging
import re
from datetime import date

import requests
from bs4 import BeautifulSoup

from .base import DailyPrayerData, MosqueTimetableScraper

logger = logging.getLogger(__name__)

# Known timetable page URL patterns on wrightstreetmosque.com
TIMETABLE_LIST_URL = "https://www.wrightstreetmosque.com/?s=prayer+timetable"

# Month names for URL discovery
MONTH_NAMES = [
    "",
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
]


class WrightStreetScraper(MosqueTimetableScraper):
    mosque_name = "The Salafi Masjid (Wright Street)"

    # Browser-like headers to avoid compressed/garbled responses
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (compatible; MasjidConnect/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Encoding": "identity",
    }

    def discover_pdf_url(self) -> str:
        """Search the mosque website for the latest timetable page and extract PDF link."""
        today = date.today()
        month_name = MONTH_NAMES[today.month]
        year = today.year

        # Try the predictable URL pattern first
        # e.g. /february-2026-shaban-1447-prayer-timetable/
        # or /ramadan-1447-prayer-timetable/
        search_url = f"https://www.wrightstreetmosque.com/?s={month_name}+{year}+prayer+timetable"
        logger.info("Searching for timetable at: %s", search_url)

        resp = requests.get(search_url, timeout=15, verify=False, headers=self.HEADERS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Find links to timetable posts
        timetable_link = None
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "prayer-timetable" in href and (month_name in href or "ramadan" in href.lower()):
                timetable_link = href
                break

        if not timetable_link:
            # Fallback: search more broadly
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "prayer-timetable" in href and str(year) in href:
                    timetable_link = href
                    break

        if not timetable_link:
            raise ValueError(
                f"Could not find timetable page for {month_name} {year} on wrightstreetmosque.com"
            )

        logger.info("Found timetable page: %s", timetable_link)

        # Now fetch the timetable page and find the PDF link
        resp = requests.get(timetable_link, timeout=15, verify=False, headers=self.HEADERS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        for a in soup.find_all("a", href=True):
            href = a["href"]
            if ".pdf" in href:
                logger.info("Found PDF URL: %s", href)
                return href

        # Also check for embedded PDFs (iframe, embed, object tags)
        for tag_name in ("iframe", "embed", "object"):
            for tag in soup.find_all(tag_name):
                src = tag.get("src") or tag.get("data") or ""
                if ".pdf" in src:
                    logger.info("Found embedded PDF URL: %s", src)
                    return src

        raise ValueError(f"Could not find PDF link on {timetable_link}")

    def parse_pdf(self, pdf_bytes: bytes) -> list[DailyPrayerData]:
        """Parse Wright Street timetable PDF into daily prayer records."""
        import pymupdf

        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        all_text = ""
        for page in doc:
            all_text += page.get_text()
        doc.close()

        return self._parse_text(all_text)

    def _parse_text(self, text: str) -> list[DailyPrayerData]:
        """Parse the extracted text from the PDF.

        PyMuPDF extracts each cell on its own line, so a single day's data
        spans 13 lines:
          Line 0: Day name (Mon/Tue/...)
          Line 1: Hijri day number
          Line 2: Gregorian day (may include "1 Mar" as "1\nMar")
          Lines 3-12: 10 time values (fajr_start, fajr_jamat, sunrise,
                      dhuhr_start, dhuhr_jamat, asr_start, asr_jamat,
                      maghrib_jamat, isha_start, isha_jamat)
        """
        year = self._extract_year(text)

        # Clean lines — strip whitespace, drop empties
        raw_lines = text.strip().split("\n")
        lines = [l.strip() for l in raw_lines if l.strip()]

        DAY_NAMES = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
        MONTH_ABBREVS = {
            "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
            "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
        }

        days = []
        # Track which month we're in (for timetables spanning two months)
        current_month = self._detect_starting_month(text)

        i = 0
        while i < len(lines):
            # Look for a day name to start a record
            if lines[i] not in DAY_NAMES:
                i += 1
                continue

            # We found a day name — now consume the record
            # Need at least 13 more values after day name
            remaining = lines[i + 1:]
            if len(remaining) < 12:
                break

            j = 0  # index into remaining

            # Hijri day number
            hijri_str = remaining[j].strip()
            j += 1

            # Gregorian day — could be just a number, or could be "1 Mar"
            greg_str = remaining[j].strip()
            j += 1

            # Parse gregorian day — handles several formats:
            # "18" (plain day), "1 Mar" (day + month in one cell), "Mar" (month only)
            greg_month = None

            if greg_str in MONTH_ABBREVS:
                # The "greg" cell is actually a month abbreviation
                # This means hijri_str was the gregorian day
                greg_day = int(hijri_str)
                greg_month = MONTH_ABBREVS[greg_str]
            elif " " in greg_str:
                # Format like "1 Mar" — day and month in one cell
                parts_greg = greg_str.split()
                greg_day = int(parts_greg[0])
                if len(parts_greg) > 1 and parts_greg[1] in MONTH_ABBREVS:
                    greg_month = MONTH_ABBREVS[parts_greg[1]]
            else:
                greg_day = int(greg_str)
                # Check if next line is a month abbreviation (e.g. "1\nMar")
                if j < len(remaining) and remaining[j].strip() in MONTH_ABBREVS:
                    greg_month = MONTH_ABBREVS[remaining[j].strip()]
                    j += 1

            if greg_month is not None:
                current_month = greg_month

            # Now read 10 time values
            if j + 10 > len(remaining):
                break

            time_values = []
            for k in range(10):
                time_values.append(remaining[j + k].strip())
            j += 10

            try:
                the_date = date(year, current_month, greg_day)
            except ValueError as e:
                logger.warning("Invalid date %d-%d-%d: %s", year, current_month, greg_day, e)
                i += 1
                continue

            day_data = DailyPrayerData(
                date=the_date,
                fajr_start=self.parse_time(time_values[0]),
                fajr_jamat=self.parse_time(time_values[1]),
                sunrise=self.parse_time(time_values[2]),
                dhuhr_start=self.parse_time(time_values[3]),
                dhuhr_jamat=self.parse_time(time_values[4]),
                asr_start=self.parse_time(time_values[5]),
                asr_jamat=self.parse_time(time_values[6]),
                maghrib_jamat=self.parse_time(time_values[7]),
                isha_start=self.parse_time(time_values[8]),
                isha_jamat=self.parse_time(time_values[9]),
            )
            days.append(day_data)

            # Advance past the consumed lines
            i += 1 + j

        return days

    def _detect_starting_month(self, text: str) -> int:
        """Detect the starting Gregorian month from the PDF title."""
        text_lower = text.lower()

        # Check for explicit month names
        for i, name in enumerate(MONTH_NAMES):
            if name and name in text_lower:
                return i

        # Ramadan 1447 starts Feb 18, 2026
        if "ramadan" in text_lower:
            return 2  # February

        return date.today().month

    def _extract_year(self, text: str) -> int:
        """Extract the Gregorian year from the PDF text."""
        match = re.search(r"20\d{2}", text)
        if match:
            return int(match.group())
        return date.today().year

