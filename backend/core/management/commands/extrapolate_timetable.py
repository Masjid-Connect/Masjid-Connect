"""Extrapolate prayer times from a source year to a target year.

Solar prayer times repeat annually to within ±1-2 minutes, so last year's
data is an excellent proxy.  The key complication is **DST transitions**:
the last Sunday of March (clocks forward) and October (clocks back) shift
by a week between years, so a naive date copy puts BST/GMT data on the
wrong days.

This command maps each target date to a source date with the **same DST
state** (both GMT or both BST), ensuring times are always in the correct
timezone.

Usage:
    python manage.py extrapolate_timetable                     # 2025 → 2026
    python manage.py extrapolate_timetable --source 2024 --target 2027
    python manage.py extrapolate_timetable --dry-run            # preview only
"""

import logging
from datetime import date, timedelta
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand

from core.models import Mosque, MosquePrayerTime

logger = logging.getLogger(__name__)

UK_TZ = ZoneInfo("Europe/London")


def is_bst(d: date) -> bool:
    """Check whether a date is in BST (UTC+1) vs GMT (UTC+0)."""
    from datetime import datetime, time

    # Check the timezone offset at noon on this date
    noon = datetime.combine(d, time(12, 0), tzinfo=UK_TZ)
    return noon.utcoffset().total_seconds() == 3600


def find_matching_source_date(target_d: date, source_year: int) -> date:
    """Find a date in the source year with the same DST state as target_d.

    Starts with the same calendar day (month/day) in the source year.
    If the DST states differ (e.g. target is BST but source same-date is GMT
    because the transition Sunday falls on a different week), search nearby
    source dates (±1 to ±7 days) until a match is found.
    """
    target_bst = is_bst(target_d)

    # Try same calendar day first
    try:
        candidate = target_d.replace(year=source_year)
    except ValueError:
        # Feb 29 in a leap year → use Feb 28
        candidate = date(source_year, target_d.month, 28)

    if is_bst(candidate) == target_bst:
        return candidate

    # DST states differ — search nearby dates in the source year
    for offset in range(1, 8):
        for direction in (1, -1):
            nearby = candidate + timedelta(days=offset * direction)
            if nearby.year == source_year and is_bst(nearby) == target_bst:
                return nearby

    # Fallback: use the same calendar day even if DST doesn't match
    return candidate


class Command(BaseCommand):
    help = "Extrapolate prayer times from a source year to a target year (DST-aware)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            type=int,
            default=None,
            help="Source year to copy from (default: target - 1)",
        )
        parser.add_argument(
            "--target",
            type=int,
            default=None,
            help="Target year to populate (default: current year + 1)",
        )
        parser.add_argument(
            "--mosque",
            type=str,
            default="The Salafi Masjid (Wright Street)",
            help="Mosque name",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Preview changes without saving",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            default=False,
            help="Overwrite existing records in the target year",
        )

    def handle(self, *args, **options):
        target_year = options["target"] or (date.today().year + 1)
        source_year = options["source"] or (target_year - 1)
        dry_run = options["dry_run"]
        overwrite = options["overwrite"]
        mosque_name = options["mosque"]

        try:
            mosque = Mosque.objects.get(name=mosque_name)
        except Mosque.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"Mosque '{mosque_name}' not found."))
            return

        # Load all source year records into a dict keyed by date
        source_records = {
            r.date: r
            for r in MosquePrayerTime.objects.filter(
                mosque=mosque,
                date__year=source_year,
            )
        }

        if not source_records:
            self.stderr.write(
                self.style.ERROR(f"No prayer times found for {source_year}.")
            )
            return

        self.stdout.write(
            f"\nExtrapolating {mosque_name}: {source_year} → {target_year}"
        )
        self.stdout.write(f"Source records: {len(source_records)}")
        self.stdout.write(f"Mode: {'DRY-RUN' if dry_run else 'LIVE'}")
        if overwrite:
            self.stdout.write("Overwrite: YES")
        self.stdout.write("")

        # Iterate every day in the target year
        start = date(target_year, 1, 1)
        end = date(target_year, 12, 31)
        current = start

        created = 0
        updated = 0
        skipped = 0
        dst_adjusted = 0

        while current <= end:
            source_date = find_matching_source_date(current, source_year)
            source_record = source_records.get(source_date)

            if source_record is None:
                # No source data for this date — try adjacent days
                for fallback_offset in range(1, 4):
                    for direction in (1, -1):
                        fb = source_date + timedelta(days=fallback_offset * direction)
                        if fb in source_records:
                            source_record = source_records[fb]
                            break
                    if source_record:
                        break

            if source_record is None:
                self.stdout.write(
                    self.style.WARNING(f"  {current}: no source data (skipped)")
                )
                skipped += 1
                current += timedelta(days=1)
                continue

            was_dst_adjusted = source_date != current.replace(year=source_year) if current.month == source_date.month else True

            # Check if target already has data
            existing = MosquePrayerTime.objects.filter(
                mosque=mosque, date=current,
            ).first()

            if existing and not overwrite:
                skipped += 1
                current += timedelta(days=1)
                continue

            fields = {
                "fajr_jamat": source_record.fajr_jamat,
                "dhuhr_jamat": source_record.dhuhr_jamat,
                "asr_jamat": source_record.asr_jamat,
                "maghrib_jamat": source_record.maghrib_jamat,
                "isha_jamat": source_record.isha_jamat,
                "fajr_start": source_record.fajr_start,
                "sunrise": source_record.sunrise,
                "dhuhr_start": source_record.dhuhr_start,
                "asr_start": source_record.asr_start,
                "isha_start": source_record.isha_start,
                "source_url": "",
            }

            if was_dst_adjusted:
                dst_adjusted += 1
                try:
                    same_cal = current.replace(year=source_year)
                except ValueError:
                    same_cal = source_date
                if source_date != same_cal:
                    self.stdout.write(
                        f"  {current}: DST adjusted — "
                        f"using {source_date} instead of {same_cal}"
                    )

            if not dry_run:
                _, was_created = MosquePrayerTime.objects.update_or_create(
                    mosque=mosque,
                    date=current,
                    defaults=fields,
                )
                if was_created:
                    created += 1
                else:
                    updated += 1
            else:
                if existing:
                    updated += 1
                else:
                    created += 1

            current += timedelta(days=1)

        self.stdout.write(f"\n{'='*50}")
        prefix = "Would create" if dry_run else "Created"
        self.stdout.write(self.style.SUCCESS(
            f"{prefix} {created} / Updated {updated} / "
            f"Skipped {skipped} / DST-adjusted {dst_adjusted}"
        ))
        if dry_run:
            self.stdout.write(
                self.style.WARNING("Run without --dry-run to apply changes.")
            )
        else:
            self.stdout.write(
                "\nRun 'export_timetable_json' to update the static fallback JSON."
            )
