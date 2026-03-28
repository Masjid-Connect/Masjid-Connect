"""Poll Mixlr API for live broadcast status and send push notifications.

Designed to run on a 30-second cron:
    */1 * * * * cd /path/to/backend && python manage.py poll_mixlr

Workflow:
  1. Fetch current broadcast status from api.mixlr.com
  2. Compare with stored MixlrStatus
  3. If is_live transitions False→True → send push notification
  4. Update the MixlrStatus record

The push notification deep-links to the live lesson player in the app.
"""

import logging

import requests
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import MixlrStatus, Mosque, PushToken
from core.push import send_push_notifications

logger = logging.getLogger("api")

MIXLR_API_URL = "https://api.mixlr.com/users/{slug}"
MIXLR_API_TIMEOUT = 10  # seconds

# Default channel config — used if no MixlrStatus record exists yet
DEFAULT_CHANNEL_SLUG = "salafi-publications"
DEFAULT_MIXLR_USER_ID = 4895725


class Command(BaseCommand):
    help = "Poll Mixlr API for live broadcast status and notify subscribers."

    def add_arguments(self, parser):
        parser.add_argument(
            "--slug",
            default=DEFAULT_CHANNEL_SLUG,
            help=f"Mixlr channel slug to poll (default: {DEFAULT_CHANNEL_SLUG}).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Check status but don't send push notifications.",
        )

    def handle(self, *args, **options):
        slug = options["slug"]
        dry_run = options["dry_run"]

        # 1. Fetch from Mixlr API
        try:
            response = requests.get(
                MIXLR_API_URL.format(slug=slug),
                timeout=MIXLR_API_TIMEOUT,
            )
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as e:
            logger.warning("Mixlr API poll failed for %s: %s", slug, e)
            self.stderr.write(self.style.WARNING(f"Mixlr API unreachable: {e}"))
            return

        is_live = data.get("is_live", False)
        channel_info = data.get("channel", {})

        # 2. Get or create the MixlrStatus record
        status_obj = MixlrStatus.objects.first()
        if status_obj is None:
            # First run — find the mosque and create the status record
            mosque = Mosque.objects.first()
            if mosque is None:
                self.stderr.write(self.style.ERROR("No mosque found in database. Run seed_data first."))
                return

            status_obj = MixlrStatus.objects.create(
                mosque=mosque,
                channel_slug=slug,
                mixlr_user_id=data.get("id", DEFAULT_MIXLR_USER_ID),
                is_live=False,
            )
            self.stdout.write(f"Created MixlrStatus for {mosque.name} ({slug})")

        was_live = status_obj.is_live

        # 3. Update status fields
        status_obj.is_live = is_live
        status_obj.broadcast_title = channel_info.get("name", "")
        status_obj.channel_name = data.get("username", "")
        status_obj.channel_logo_url = channel_info.get("logo_url", "")
        if is_live:
            status_obj.last_live_at = timezone.now()
        status_obj.save()

        # 4. Detect live transition: False → True
        if is_live and not was_live:
            self.stdout.write(self.style.SUCCESS(f"🔴 LIVE transition detected for {slug}!"))

            if dry_run:
                self.stdout.write("(dry-run) Skipping push notification.")
            else:
                self._send_live_notification(status_obj)
        elif not is_live and was_live:
            self.stdout.write(f"Broadcast ended for {slug}.")
        else:
            status_label = "LIVE" if is_live else "offline"
            self.stdout.write(f"{slug}: {status_label} (no transition)")

    def _send_live_notification(self, status_obj):
        """Send push notification to all registered devices."""
        tokens = list(PushToken.objects.values_list("token", flat=True))

        if not tokens:
            self.stdout.write("No push tokens registered — skipping notification.")
            return

        mosque_name = status_obj.mosque.name if status_obj.mosque else "The Salafi Masjid"

        result = send_push_notifications(
            tokens=tokens,
            title="Live Lesson",
            body=f"A lesson is now being broadcast from {mosque_name}. Tap to listen.",
            data={
                "type": "live_lesson",
                "channel_slug": status_obj.channel_slug,
            },
            channel_id="live-lessons",
            priority="high",
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Push sent: {result['sent']} delivered, "
                f"{result['failed']} failed, "
                f"{len(result['pruned'])} pruned."
            )
        )
