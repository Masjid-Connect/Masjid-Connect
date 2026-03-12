"""Fix prayer times stored with AM values that should be PM.

Scans all MosquePrayerTime records and corrects any PM prayer
(dhuhr, asr, maghrib, isha) where the hour is < 12 by adding 12.

Idempotent — safe to run multiple times. Already-correct values are unchanged.
"""

from django.core.management.base import BaseCommand

from core.models import MosquePrayerTime

# Fields that must always be PM (hour >= 12)
PM_FIELDS = [
    "dhuhr_start",
    "dhuhr_jamat",
    "asr_start",
    "asr_jamat",
    "maghrib_jamat",
    "isha_start",
    "isha_jamat",
]


class Command(BaseCommand):
    help = "Fix prayer times stored as AM that should be PM (add 12 hours)"

    def handle(self, *args, **options):
        records = MosquePrayerTime.objects.all()
        total = records.count()
        fixed_count = 0

        for record in records:
            changed = False
            for field in PM_FIELDS:
                value = getattr(record, field, None)
                if value is not None and value.hour < 12:
                    corrected = value.replace(hour=value.hour + 12)
                    setattr(record, field, corrected)
                    changed = True
                    self.stdout.write(
                        f"  {record.mosque.name} {record.date} "
                        f"{field}: {value} → {corrected}"
                    )

            if changed:
                record.save()
                fixed_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nScanned {total} records, fixed {fixed_count}."
            )
        )
