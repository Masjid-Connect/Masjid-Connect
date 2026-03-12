"""Fix AM/PM prayer times in existing MosquePrayerTime records.

PM prayers (Dhuhr, Asr, Maghrib, Isha) must have hour >= 12.
Early scraper runs saved 12-hour values without the +12 correction,
so e.g. Asr "4:00" was stored as 04:00 instead of 16:00.

This command scans all records and corrects any PM prayer with hour < 12.
It is idempotent — safe to run multiple times.

Usage:
    python manage.py fix_prayer_times           # dry-run (default)
    python manage.py fix_prayer_times --apply   # apply fixes
"""

from datetime import time

from django.core.management.base import BaseCommand

from core.models import MosquePrayerTime


# Fields that must be PM (hour >= 12), mapped to their DB column names
PM_FIELDS = [
    "dhuhr_jamat",
    "dhuhr_start",
    "asr_jamat",
    "asr_start",
    "maghrib_jamat",
    "isha_jamat",
    "isha_start",
]


def _ensure_pm(t: time | None) -> time | None:
    """Add 12 hours if hour < 12."""
    if t is None:
        return None
    if t.hour < 12:
        return t.replace(hour=t.hour + 12)
    return t


class Command(BaseCommand):
    help = "Fix PM prayer times stored with AM hours (e.g. 04:00 → 16:00)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            default=False,
            help="Actually apply fixes (default is dry-run)",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        mode = "APPLYING" if apply else "DRY-RUN"
        self.stdout.write(f"\n[{mode}] Scanning MosquePrayerTime records...\n")

        records = MosquePrayerTime.objects.all()
        total = records.count()
        fixed_records = 0
        fixed_fields = 0

        for record in records.iterator():
            changes = {}
            for field in PM_FIELDS:
                value = getattr(record, field)
                corrected = _ensure_pm(value)
                if corrected != value:
                    changes[field] = corrected

            if changes:
                fixed_records += 1
                fixed_fields += len(changes)
                desc = ", ".join(f"{f}: {getattr(record, f)} → {v}" for f, v in changes.items())
                self.stdout.write(
                    f"  {record.mosque.name} {record.date}: {desc}"
                )
                if apply:
                    for field, value in changes.items():
                        setattr(record, field, value)
                    record.save(update_fields=list(changes.keys()))

        self.stdout.write(
            f"\nScanned {total} records. "
            f"{'Fixed' if apply else 'Would fix'} {fixed_fields} fields "
            f"across {fixed_records} records.\n"
        )
        if not apply and fixed_records > 0:
            self.stdout.write(
                self.style.WARNING("Run with --apply to save changes.\n")
            )
