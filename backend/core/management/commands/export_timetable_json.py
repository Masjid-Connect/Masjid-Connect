"""Export prayer times to a static JSON file for the mobile app.

Dumps all MosquePrayerTime records into a compact JSON file that ships
bundled with the React Native app as the **primary** source of prayer
times. The backend API is used only as an optional overlay for ad-hoc
schedule edits between JSON regenerations. The mobile app does not call
any calculation-based service (e.g. Aladhan) for prayer times.

Regenerated weekly by the `scrape-timetables` GitHub Action and delivered
to installed apps via EAS OTA updates.

Usage:
    python manage.py export_timetable_json
    python manage.py export_timetable_json --output /path/to/static-timetable.json
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from core.models import Mosque, MosquePrayerTime

# Default output path — writes to the React Native constants directory
DEFAULT_OUTPUT = Path(__file__).resolve().parents[4] / "constants" / "static-timetable.json"


def _fmt(t) -> str | None:
    """Format a TimeField value as HH:MM string, or None."""
    if t is None:
        return None
    return t.strftime("%H:%M")


class Command(BaseCommand):
    help = "Export all prayer times as a static JSON file for the mobile app"

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            type=str,
            default=str(DEFAULT_OUTPUT),
            help=f"Output file path (default: {DEFAULT_OUTPUT})",
        )
        parser.add_argument(
            "--mosque",
            type=str,
            default="The Salafi Masjid (Wright Street)",
            help="Mosque name to export",
        )

    def handle(self, *args, **options):
        output_path = Path(options["output"])
        mosque_name = options["mosque"]

        try:
            mosque = Mosque.objects.get(name=mosque_name)
        except Mosque.DoesNotExist:
            self.stderr.write(
                self.style.ERROR(f"Mosque '{mosque_name}' not found in database.")
            )
            return

        records = (
            MosquePrayerTime.objects
            .filter(mosque=mosque)
            .order_by("date")
        )

        timetable: dict[str, dict[str, str | None]] = {}
        for r in records:
            date_str = r.date.isoformat()  # YYYY-MM-DD
            timetable[date_str] = {
                "fS": _fmt(r.fajr_start),
                "fJ": _fmt(r.fajr_jamat),
                "sr": _fmt(r.sunrise),
                "dS": _fmt(r.dhuhr_start),
                "dJ": _fmt(r.dhuhr_jamat),
                "aS": _fmt(r.asr_start),
                "aJ": _fmt(r.asr_jamat),
                "mJ": _fmt(r.maghrib_jamat),
                "iS": _fmt(r.isha_start),
                "iJ": _fmt(r.isha_jamat),
            }

        # Write compact JSON (no pretty-printing to minimise bundle size)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(timetable, f, separators=(",", ":"))

        size_kb = output_path.stat().st_size / 1024
        self.stdout.write(
            self.style.SUCCESS(
                f"Exported {len(timetable)} days → {output_path} ({size_kb:.1f} KB)"
            )
        )
