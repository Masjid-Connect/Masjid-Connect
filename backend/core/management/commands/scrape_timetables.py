"""Management command to scrape mosque timetable PDFs and import prayer times."""

import logging

from django.core.management.base import BaseCommand, CommandError

from core.scrapers import SCRAPERS

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Scrape mosque timetable PDFs and import jama'ah times into the database"

    def add_arguments(self, parser):
        parser.add_argument(
            "--mosque",
            type=str,
            help=f"Scraper key to run. Available: {', '.join(SCRAPERS.keys())}. "
            f"If omitted, runs all scrapers.",
        )
        parser.add_argument(
            "--url",
            type=str,
            help="Direct PDF URL (skips auto-discovery). Only valid with --mosque.",
        )

    def handle(self, *args, **options):
        mosque_key = options.get("mosque")
        pdf_url = options.get("url")

        if pdf_url and not mosque_key:
            raise CommandError("--url requires --mosque to be specified.")

        if mosque_key:
            if mosque_key not in SCRAPERS:
                raise CommandError(
                    f"Unknown scraper '{mosque_key}'. "
                    f"Available: {', '.join(SCRAPERS.keys())}"
                )
            scrapers_to_run = {mosque_key: SCRAPERS[mosque_key]}
        else:
            scrapers_to_run = SCRAPERS

        total_saved = 0
        errors = []

        for key, scraper_cls in scrapers_to_run.items():
            self.stdout.write(f"\n{'='*60}")
            self.stdout.write(f"Scraping: {key}")
            self.stdout.write(f"{'='*60}")

            try:
                scraper = scraper_cls()
                saved = scraper.run(pdf_url=pdf_url)
                total_saved += saved
                self.stdout.write(
                    self.style.SUCCESS(f"  {key}: saved {saved} prayer time records")
                )
            except Exception as e:
                logger.exception("Scraper '%s' failed", key)
                errors.append((key, str(e)))
                self.stdout.write(
                    self.style.ERROR(f"  {key}: FAILED — {e}")
                )

        self.stdout.write(f"\n{'='*60}")
        if errors:
            self.stdout.write(
                self.style.WARNING(
                    f"Completed with {len(errors)} error(s). "
                    f"Total saved: {total_saved}"
                )
            )
            for key, err in errors:
                self.stdout.write(self.style.ERROR(f"  {key}: {err}"))
        else:
            self.stdout.write(
                self.style.SUCCESS(f"All scrapers completed. Total saved: {total_saved}")
            )
