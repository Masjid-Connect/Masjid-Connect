"""Scraper for The Salafi Masjid (Wright Street), Birmingham.

Website: wrightstreetmosque.com
PDF format: Monthly timetable with columns:
  Day | Hijri | Gregorian | Fajr Start | Fajr Jama'ah | Sunrise |
  Dhuhr Start | Dhuhr Jama'ah | Asr Start | Asr Jama'ah |
  Maghrib Jama'ah | Isha Start | Isha Jama'ah
"""

import logging
import re
from datetime import date, time

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
        """Search the mosque website for the latest timetable page and extract PDF link.

        Handles transitional months where multiple timetables exist (e.g. Ramadan
        ending mid-month with a separate "End of <Month>" timetable).  Priority:

        1. "End of <month>" timetable (covers post-Ramadan or partial month)
        2. Regular "<month> <year>" timetable
        3. "Ramadan" timetable (if current month overlaps with Ramadan)
        4. Any timetable matching the year
        """
        today = date.today()
        month_name = MONTH_NAMES[today.month]
        year = today.year

        search_url = f"https://www.wrightstreetmosque.com/?s={month_name}+{year}+prayer+timetable"
        logger.info("Searching for timetable at: %s", search_url)

        resp = requests.get(search_url, timeout=15, verify=False, headers=self.HEADERS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Collect all unique timetable links
        seen = set()
        candidates: list[tuple[str, int]] = []  # (url, priority)
        for a in soup.find_all("a", href=True):
            href = a["href"].rstrip("/")
            if href in seen or "prayer-timetable" not in href:
                continue
            seen.add(href)
            href_lower = href.lower()

            # Prioritise: "end-of-<month>" > regular month > ramadan > year-only
            if f"end-of-{month_name}" in href_lower:
                candidates.append((a["href"], 0))
            elif month_name in href_lower and "end-of" not in href_lower:
                candidates.append((a["href"], 1))
            elif "ramadan" in href_lower:
                candidates.append((a["href"], 2))
            elif str(year) in href_lower:
                candidates.append((a["href"], 3))

        if not candidates:
            # Broader fallback search
            search_url2 = f"https://www.wrightstreetmosque.com/?s=prayer+timetable+{year}"
            logger.info("Broad search fallback: %s", search_url2)
            resp = requests.get(search_url2, timeout=15, verify=False, headers=self.HEADERS)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "prayer-timetable" in href and str(year) in href:
                    candidates.append((href, 3))
                    break

        if not candidates:
            raise ValueError(
                f"Could not find timetable page for {month_name} {year} on wrightstreetmosque.com"
            )

        # Pick the highest-priority (lowest number) candidate
        candidates.sort(key=lambda c: c[1])
        timetable_link = candidates[0][0]
        logger.info("Selected timetable (priority %d): %s", candidates[0][1], timetable_link)

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

    def _detect_column_count(self, text: str) -> int:
        """Detect the number of time columns per day in the PDF.

        Standard timetable:  10 columns (fajr_start → isha_jamat)
        Ramadan timetable:   may have extra columns for Suhoor/Imsak or Taraweeh.

        Heuristic: find the first day record and count how many HH:MM values
        appear before the next day name.
        """
        lines = [l.strip() for l in text.strip().split("\n") if l.strip()]
        DAY_NAMES = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
        TIME_RE = re.compile(r"^\d{1,2}:\d{2}$")

        for idx, line in enumerate(lines):
            if line not in DAY_NAMES:
                continue
            # Count time values after the date fields
            count = 0
            for subsequent in lines[idx + 1:]:
                if subsequent in DAY_NAMES:
                    break
                if TIME_RE.match(subsequent):
                    count += 1
            if count >= 10:
                logger.info("Detected %d time columns per day", count)
                return count
            break

        return 10  # default

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

        Ramadan PDFs may have extra columns (e.g. Suhoor/Imsak at the start,
        Taraweeh at the end).  We auto-detect the column count and skip extras.
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
        is_ramadan = "ramadan" in text[:500].lower()
        num_columns = self._detect_column_count(text)

        i = 0
        while i < len(lines):
            # Look for a day name to start a record
            if lines[i] not in DAY_NAMES:
                i += 1
                continue

            # We found a day name — now consume the record
            remaining = lines[i + 1:]
            if len(remaining) < num_columns + 2:
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

            # Read all time values for this day
            if j + num_columns > len(remaining):
                break

            time_values = []
            for k in range(num_columns):
                time_values.append(remaining[j + k].strip())
            j += num_columns

            try:
                the_date = date(year, current_month, greg_day)
            except ValueError as e:
                logger.warning("Invalid date %d-%d-%d: %s", year, current_month, greg_day, e)
                i += 1
                continue

            # Map columns to prayer fields.
            # Standard PDF (10 cols): fajr_start, fajr_jamat, sunrise,
            #   dhuhr_start, dhuhr_jamat, asr_start, asr_jamat,
            #   maghrib_jamat, isha_start, isha_jamat
            #
            # Ramadan PDF (11 cols): suhoor/imsak, fajr_start, fajr_jamat, sunrise,
            #   dhuhr_start, dhuhr_jamat, asr_start, asr_jamat,
            #   maghrib_jamat, isha_start, isha_jamat
            #
            # Ramadan PDF (12 cols): same as 11 + taraweeh at end
            if num_columns >= 12 and is_ramadan:
                # 12+ columns: skip suhoor (col 0) and taraweeh (col 11+)
                offset = 1
            elif num_columns == 11 and is_ramadan:
                # 11 columns: skip suhoor (col 0)
                offset = 1
            else:
                # Standard 10 columns
                offset = 0

            day_data = DailyPrayerData(
                date=the_date,
                fajr_start=self.parse_time(time_values[offset + 0]),
                fajr_jamat=self.parse_time(time_values[offset + 1]),
                sunrise=self.parse_time(time_values[offset + 2]),
                dhuhr_start=self._ensure_pm(self.parse_time(time_values[offset + 3])),
                dhuhr_jamat=self._ensure_pm(self.parse_time(time_values[offset + 4])),
                asr_start=self._ensure_pm(self.parse_time(time_values[offset + 5])),
                asr_jamat=self._ensure_pm(self.parse_time(time_values[offset + 6])),
                maghrib_jamat=self._ensure_pm(self.parse_time(time_values[offset + 7])),
                isha_start=self._ensure_pm(self.parse_time(time_values[offset + 8])),
                isha_jamat=self._ensure_pm(self.parse_time(time_values[offset + 9])),
            )
            days.append(day_data)

            # Advance past the consumed lines
            i += 1 + j

        return days

    @staticmethod
    def _ensure_pm(t: time | None) -> time | None:
        """Convert 12h PM time to 24h. Mosque PDFs use 12h without AM/PM labels.

        Dhuhr, Asr, Maghrib, and Isha are always after noon, so if the parsed
        hour is < 12, add 12 (e.g. 4:00 → 16:00). Already-correct values
        (hour >= 12, e.g. 12:45) are left unchanged.
        """
        if t is None:
            return None
        if t.hour < 12:
            return t.replace(hour=t.hour + 12)
        return t

    def _detect_starting_month(self, text: str) -> int:
        """Detect the starting Gregorian month from the PDF title/header.

        Only inspects the first few lines (title area) to avoid matching month
        names that appear incidentally in the body or Hijri date sections.
        For Ramadan timetables that span two months, the first Gregorian day
        in the data determines the actual starting month (handled by the parser's
        inline month-transition logic).
        """
        # Use only the first ~500 characters (title/header area)
        header = text[:500].lower()

        # "End of March" style timetables — extract the month from the name
        end_of_match = re.search(r"end\s+of\s+(\w+)", header)
        if end_of_match:
            month_word = end_of_match.group(1)
            for i, name in enumerate(MONTH_NAMES):
                if name and name == month_word:
                    return i

        # Look for an explicit month name in the header
        # Search in reverse order (December → January) so that if the header
        # mentions "February / March", we pick the LATER month only if both
        # appear.  But prefer the first standalone month name in practice.
        found_months: list[tuple[int, int]] = []  # (position, month_index)
        for i, name in enumerate(MONTH_NAMES):
            if name:
                pos = header.find(name)
                if pos != -1:
                    found_months.append((pos, i))

        if found_months:
            # Pick the month that appears first in the header text
            found_months.sort(key=lambda x: x[0])
            return found_months[0][1]

        # Ramadan timetable without explicit Gregorian month — infer from Hijri year
        if "ramadan" in header:
            # Ramadan 1447 starts ~Feb 28, 2026; Ramadan 1448 starts ~Feb 17, 2027
            return 2  # February (safe default for recent years)

        return date.today().month

    def _extract_year(self, text: str) -> int:
        """Extract the Gregorian year from the PDF text."""
        match = re.search(r"20\d{2}", text)
        if match:
            return int(match.group())
        return date.today().year

