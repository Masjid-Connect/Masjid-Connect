"""Scrape ALL historical timetable PDFs and import prayer times.

This is a one-off bulk command that discovers every timetable PDF published
on the mosque website (across all archive pages) and imports them into the
database.  Useful for backfilling historical data or bootstrapping the
static timetable fallback.

Usage:
    python manage.py scrape_all_timetables
    python manage.py scrape_all_timetables --mosque wright_street
"""

import logging
import time as time_mod

from django.core.management.base import BaseCommand, CommandError

from core.scrapers import SCRAPERS

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Scrape ALL historical timetable PDFs (full archive) into the database"

    def add_arguments(self, parser):
        parser.add_argument(
            "--mosque",
            type=str,
            default="wright_street",
            help=f"Scraper key. Available: {', '.join(SCRAPERS.keys())}",
        )

    def handle(self, *args, **options):
        mosque_key = options["mosque"]
        if mosque_key not in SCRAPERS:
            raise CommandError(
                f"Unknown scraper '{mosque_key}'. "
                f"Available: {', '.join(SCRAPERS.keys())}"
            )

        scraper_cls = SCRAPERS[mosque_key]
        scraper = scraper_cls()

        self.stdout.write(f"Discovering all timetable PDFs for '{mosque_key}'...")
        pdf_urls = scraper.discover_all_pdf_urls()
        self.stdout.write(f"Found {len(pdf_urls)} PDFs\n")

        total_saved = 0
        errors = []

        for i, pdf_url in enumerate(pdf_urls, 1):
            self.stdout.write(f"[{i}/{len(pdf_urls)}] {pdf_url}")
            try:
                saved = scraper.run(pdf_url=pdf_url)
                total_saved += saved
                self.stdout.write(
                    self.style.SUCCESS(f"  → saved {saved} days")
                )
            except Exception as e:
                logger.exception("Failed to process %s", pdf_url)
                errors.append((pdf_url, str(e)))
                self.stdout.write(
                    self.style.ERROR(f"  → FAILED: {e}")
                )

            # Be polite to the server
            if i < len(pdf_urls):
                time_mod.sleep(1)

        self.stdout.write(f"\n{'='*60}")
        if errors:
            self.stdout.write(
                self.style.WARNING(
                    f"Completed with {len(errors)} error(s). "
                    f"Total saved: {total_saved} days"
                )
            )
            for url, err in errors:
                self.stdout.write(self.style.ERROR(f"  {url}: {err}"))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"All {len(pdf_urls)} PDFs processed. "
                    f"Total saved: {total_saved} days"
                )
            )
