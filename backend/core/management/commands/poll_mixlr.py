"""Poll Mixlr API for live broadcast status and send push notifications.

Designed to run on a 30-second cron:
    */1 * * * * cd /path/to/backend && python manage.py poll_mixlr

Workflow:
  1. Fetch current broadcast status from api.mixlr.com
  2. Compare with stored MixlrStatus
  3. If is_live transitions False→True:
       a. Find Event rows for the mosque flagged is_broadcast_live=True
          whose time window contains now() (+/- the same head/tail
          tolerances the EventSerializer uses for is_live_now).
       b. For each matching event, send a per-event push with eventId
          in the data payload so a tap deep-links into the event.
       c. If no events match, fall back to the generic 'Live Lesson'
          push to all push tokens (legacy behaviour).
       d. Dedupe each push via a cache key so repeated polls during
          a single broadcast don't re-fire the notification.
  4. Update the MixlrStatus record

The push notification deep-links to the live lesson player in the app.
"""

import logging
from datetime import datetime, timedelta

import requests
from django.core.cache import cache
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Event, MixlrStatus, Mosque, PushToken
from core.push import send_push_notifications

logger = logging.getLogger("api")

MIXLR_API_URL = "https://api.mixlr.com/users/{slug}"
MIXLR_API_TIMEOUT = 10  # seconds

# Default channel config — used if no MixlrStatus record exists yet
DEFAULT_CHANNEL_SLUG = "salafi-publications"
DEFAULT_MIXLR_USER_ID = 4895725

# Event-window tolerances — must match EventSerializer.is_live_now so the
# pill shown on the mobile event row and the push dispatched here agree
# on which events count as 'in window'.
LIVE_WINDOW_HEAD = timedelta(minutes=5)
LIVE_WINDOW_TAIL = timedelta(minutes=15)
DEFAULT_EVENT_DURATION = timedelta(minutes=90)

# Dedup cache TTL — broadcasts run minutes-to-hours; an hour is enough to
# cover the longest broadcast without preventing a same-day repeat.
LIVE_DEDUP_TTL_SECONDS = 60 * 60


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
                self._dispatch_live_pushes(status_obj)
        elif not is_live and was_live:
            self.stdout.write(f"Broadcast ended for {slug}.")
        else:
            status_label = "LIVE" if is_live else "offline"
            self.stdout.write(f"{slug}: {status_label} (no transition)")

    # ── Push dispatch ─────────────────────────────────────────────────

    def _dispatch_live_pushes(self, status_obj):
        """Route the live-transition push to matching events, or fall back
        to the generic broadcast push when nothing matches the window."""
        matching_events = self._find_matching_events(status_obj.mosque)

        if matching_events:
            for event in matching_events:
                self._send_event_push(status_obj, event)
        else:
            self._send_generic_push(status_obj)

    def _find_matching_events(self, mosque) -> list:
        """Events flagged for broadcast on this mosque whose time window
        contains now() (with the same +/- tolerances as the serializer)."""
        if mosque is None:
            return []
        candidates = Event.objects.filter(
            mosque=mosque,
            is_broadcast_live=True,
            event_date=timezone.localdate(),
        )
        current = timezone.localtime().replace(tzinfo=None)
        matches = []
        for event in candidates:
            start_dt = datetime.combine(event.event_date, event.start_time)
            end_time = event.end_time or (
                (start_dt + DEFAULT_EVENT_DURATION).time()
            )
            end_dt = datetime.combine(event.event_date, end_time)
            if end_dt <= start_dt:
                end_dt = start_dt + DEFAULT_EVENT_DURATION
            if (start_dt - LIVE_WINDOW_HEAD) <= current <= (end_dt + LIVE_WINDOW_TAIL):
                matches.append(event)
        return matches

    def _send_event_push(self, status_obj, event):
        """Send a per-event push, deduped on (mixlr_user, event)."""
        cache_key = f"live_push:mixlr_{status_obj.mixlr_user_id}:event_{event.id}"
        if cache.get(cache_key):
            self.stdout.write(f"Event push deduped for {event.title} ({event.id}).")
            return
        cache.set(cache_key, True, LIVE_DEDUP_TTL_SECONDS)

        tokens = list(PushToken.objects.values_list("token", flat=True))
        if not tokens:
            self.stdout.write("No push tokens registered — skipping event push.")
            return

        # Tova-voiced copy: quiet, factual, no urgency framing.
        body = f"{event.title} is live now. Tap to listen."
        result = send_push_notifications(
            tokens=tokens,
            title="Live Lesson",
            body=body,
            data={
                "type": "live_lesson",
                "channel_slug": status_obj.channel_slug,
                "event_id": str(event.id),
            },
            channel_id="live-lessons",
            priority="high",
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Event push for '{event.title}': {result['sent']} delivered, "
                f"{result['failed']} failed, {len(result['pruned'])} pruned."
            )
        )

    def _send_generic_push(self, status_obj):
        """Fallback path used when no event matches the broadcast window —
        preserves the pre-Phase-D behaviour for unscheduled broadcasts."""
        cache_key = f"live_push:mixlr_{status_obj.mixlr_user_id}:generic"
        if cache.get(cache_key):
            self.stdout.write("Generic broadcast push deduped.")
            return
        cache.set(cache_key, True, LIVE_DEDUP_TTL_SECONDS)

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
                f"Generic push: {result['sent']} delivered, "
                f"{result['failed']} failed, {len(result['pruned'])} pruned."
            )
        )
