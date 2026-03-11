"""Abstract base class for mosque timetable scrapers."""

import logging
from abc import ABC, abstractmethod
from datetime import time

import requests

from core.models import Mosque, MosquePrayerTime

logger = logging.getLogger(__name__)


class DailyPrayerData:
    """Parsed prayer data for a single day."""

    __slots__ = (
        "date",
        "fajr_start",
        "fajr_jamat",
        "sunrise",
        "dhuhr_start",
        "dhuhr_jamat",
        "asr_start",
        "asr_jamat",
        "maghrib_jamat",
        "isha_start",
        "isha_jamat",
    )

    def __init__(self, **kwargs):
        for key in self.__slots__:
            setattr(self, key, kwargs.get(key))


class MosqueTimetableScraper(ABC):
    """Base class for mosque timetable scrapers.

    Subclasses implement discover_pdf_url() and parse_pdf() for their
    specific mosque's website and PDF format.
    """

    # Subclasses must set this to the mosque name used for DB lookup
    mosque_name: str = ""

    @abstractmethod
    def discover_pdf_url(self) -> str:
        """Find the current month's timetable PDF URL on the mosque's website."""

    @abstractmethod
    def parse_pdf(self, pdf_bytes: bytes) -> list[DailyPrayerData]:
        """Parse PDF bytes into a list of daily prayer time records."""

    def get_mosque(self) -> Mosque:
        """Look up the mosque in the database."""
        try:
            return Mosque.objects.get(name=self.mosque_name)
        except Mosque.DoesNotExist:
            raise ValueError(
                f"Mosque '{self.mosque_name}' not found in database. "
                f"Run seed_data first or create it manually."
            )

    def download_pdf(self, url: str) -> bytes:
        """Download a PDF from a URL."""
        logger.info("Downloading PDF from %s", url)
        resp = requests.get(url, timeout=30, verify=False)
        resp.raise_for_status()
        return resp.content

    def run(self, pdf_url: str | None = None) -> int:
        """Full pipeline: discover → download → parse → save. Returns rows saved."""
        mosque = self.get_mosque()

        if pdf_url is None:
            pdf_url = self.discover_pdf_url()
        logger.info("Using PDF URL: %s", pdf_url)

        pdf_bytes = self.download_pdf(pdf_url)
        days = self.parse_pdf(pdf_bytes)
        logger.info("Parsed %d days from PDF", len(days))

        saved = 0
        for day in days:
            if day.date is None or day.fajr_jamat is None:
                logger.warning("Skipping incomplete row: %s", day.date)
                continue

            _, created = MosquePrayerTime.objects.update_or_create(
                mosque=mosque,
                date=day.date,
                defaults={
                    "fajr_jamat": day.fajr_jamat,
                    "dhuhr_jamat": day.dhuhr_jamat,
                    "asr_jamat": day.asr_jamat,
                    "maghrib_jamat": day.maghrib_jamat,
                    "isha_jamat": day.isha_jamat,
                    "fajr_start": day.fajr_start,
                    "sunrise": day.sunrise,
                    "dhuhr_start": day.dhuhr_start,
                    "asr_start": day.asr_start,
                    "isha_start": day.isha_start,
                    "source_url": pdf_url,
                },
            )
            saved += 1

        logger.info("Saved %d prayer time records for %s", saved, mosque.name)
        return saved

    @staticmethod
    def parse_time(s: str) -> time | None:
        """Parse a time string like '5:43' or '12:30' into a time object."""
        s = s.strip()
        if not s:
            return None
        parts = s.split(":")
        if len(parts) != 2:
            return None
        try:
            h, m = int(parts[0]), int(parts[1])
            return time(h, m)
        except (ValueError, TypeError):
            return None
