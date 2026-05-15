"""Tests for EventSerializer.is_live_now and Event broadcast flagging.

Covers the matrix:
  - is_broadcast_live × MixlrStatus.is_live × time-window membership
  - tolerance: 5 min before start_time, 15 min after end_time
  - end_time defaulting to start_time + 90 min when null
"""

from datetime import date, datetime, time, timedelta
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from core.models import Event, MixlrStatus, Mosque, User
from api.serializers import EventSerializer


def _serialize(event):
    """Render the serializer with a request-less context."""
    return EventSerializer(event).data


class EventIsLiveNowTests(TestCase):
    def setUp(self):
        self.mosque = Mosque.objects.create(
            name="Test Mosque",
            address="1",
            city="x",
            state="y",
            country="UK",
            latitude=0,
            longitude=0,
        )
        self.user = User.objects.create_user(
            username="a@b.com", email="a@b.com", password="pw",
        )
        # Anchor 'now' so the test is deterministic. Event is 19:00–20:00
        # local; we simulate now=19:30 (firmly inside the window).
        self.fixed_now = datetime(2026, 6, 15, 19, 30)
        self.event = Event.objects.create(
            mosque=self.mosque,
            title="Tafseer al-Sa'di",
            description="",
            event_date=date(2026, 6, 15),
            start_time=time(19, 0),
            end_time=time(20, 0),
            category="lesson",
            author=self.user,
        )

    def _patch_now(self):
        """Patch timezone.localtime() inside the serializer to fixed_now."""
        mock_dt = timezone.make_aware(self.fixed_now, timezone.get_current_timezone())
        return mock.patch(
            "api.serializers.timezone.localtime",
            return_value=mock_dt,
        )

    def _set_mixlr(self, *, is_live: bool):
        MixlrStatus.objects.update_or_create(
            mosque=self.mosque,
            defaults={
                "channel_slug": "test",
                "mixlr_user_id": 1,
                "is_live": is_live,
            },
        )

    # ── Matrix ──────────────────────────────────────────────────────────

    def test_is_live_now_false_when_broadcast_flag_off(self):
        self.event.is_broadcast_live = False
        self.event.save()
        self._set_mixlr(is_live=True)
        with self._patch_now():
            data = _serialize(self.event)
        self.assertFalse(data["is_live_now"])

    def test_is_live_now_false_when_mixlr_offline(self):
        self.event.is_broadcast_live = True
        self.event.save()
        self._set_mixlr(is_live=False)
        with self._patch_now():
            data = _serialize(self.event)
        self.assertFalse(data["is_live_now"])

    def test_is_live_now_false_when_no_mixlr_status_row(self):
        self.event.is_broadcast_live = True
        self.event.save()
        # No MixlrStatus row at all.
        with self._patch_now():
            data = _serialize(self.event)
        self.assertFalse(data["is_live_now"])

    def test_is_live_now_true_inside_window(self):
        self.event.is_broadcast_live = True
        self.event.save()
        self._set_mixlr(is_live=True)
        with self._patch_now():
            data = _serialize(self.event)
        self.assertTrue(data["is_live_now"])

    def test_is_live_now_true_in_5min_head_tolerance(self):
        # 4 min BEFORE the official start — still in window.
        self.fixed_now = datetime(2026, 6, 15, 18, 56)
        self.event.is_broadcast_live = True
        self.event.save()
        self._set_mixlr(is_live=True)
        with self._patch_now():
            data = _serialize(self.event)
        self.assertTrue(data["is_live_now"])

    def test_is_live_now_false_before_head_tolerance(self):
        # 10 min before start — outside the 5-min head tolerance.
        self.fixed_now = datetime(2026, 6, 15, 18, 50)
        self.event.is_broadcast_live = True
        self.event.save()
        self._set_mixlr(is_live=True)
        with self._patch_now():
            data = _serialize(self.event)
        self.assertFalse(data["is_live_now"])

    def test_is_live_now_true_in_15min_tail_tolerance(self):
        # 12 min after the official end — still in window.
        self.fixed_now = datetime(2026, 6, 15, 20, 12)
        self.event.is_broadcast_live = True
        self.event.save()
        self._set_mixlr(is_live=True)
        with self._patch_now():
            data = _serialize(self.event)
        self.assertTrue(data["is_live_now"])

    def test_is_live_now_false_after_tail_tolerance(self):
        # 30 min after end — outside the 15-min tail tolerance.
        self.fixed_now = datetime(2026, 6, 15, 20, 30)
        self.event.is_broadcast_live = True
        self.event.save()
        self._set_mixlr(is_live=True)
        with self._patch_now():
            data = _serialize(self.event)
        self.assertFalse(data["is_live_now"])

    def test_is_live_now_uses_default_duration_when_end_time_null(self):
        # No end_time → default 90-min duration applied. 60 min after
        # start (19:00) is firmly inside the implicit window.
        self.event.end_time = None
        self.event.is_broadcast_live = True
        self.event.save()
        self.fixed_now = datetime(2026, 6, 15, 20, 0)
        self._set_mixlr(is_live=True)
        with self._patch_now():
            data = _serialize(self.event)
        self.assertTrue(data["is_live_now"])

    def test_is_broadcast_live_field_exposed_in_api(self):
        self.event.is_broadcast_live = True
        self.event.save()
        data = _serialize(self.event)
        self.assertIn("is_broadcast_live", data)
        self.assertTrue(data["is_broadcast_live"])
