"""Unit tests for the push notification service (core/push.py).

All Expo Push API calls are mocked — no network required.
"""

from unittest.mock import MagicMock, patch

from django.test import TestCase

from core.models import (
    Announcement,
    Event,
    Mosque,
    PushToken,
    User,
    UserSubscription,
)
from core.push import (
    notify_announcement_subscribers,
    notify_event_subscribers,
    send_push_notifications,
)


class SendPushNotificationsTest(TestCase):
    """Tests for the low-level send_push_notifications helper."""

    @patch("core.push._client")
    def test_empty_token_list_returns_zeros(self, mock_client):
        result = send_push_notifications([], "Title", "Body")
        self.assertEqual(result, {"sent": 0, "failed": 0, "pruned": []})
        mock_client.publish_multiple.assert_not_called()

    @patch("core.push._client")
    def test_sends_messages_and_returns_counts(self, mock_client):
        """Successful sends are counted correctly."""
        ok_response = MagicMock()
        ok_response.validate_response.return_value = None  # no exception = success

        mock_client.publish_multiple.return_value = [ok_response, ok_response]

        result = send_push_notifications(
            tokens=["ExponentPushToken[aaa]", "ExponentPushToken[bbb]"],
            title="Test",
            body="Hello",
        )
        self.assertEqual(result["sent"], 2)
        self.assertEqual(result["failed"], 0)
        self.assertEqual(result["pruned"], [])

    @patch("core.push._client")
    def test_device_not_registered_prunes_token(self, mock_client):
        """DeviceNotRegisteredError triggers token pruning."""
        from exponent_server_sdk import DeviceNotRegisteredError

        user = User.objects.create_user(
            username="prune@test.com", email="prune@test.com", password="pass"
        )
        PushToken.objects.create(
            user=user, token="ExponentPushToken[dead]", platform="ios"
        )

        # DeviceNotRegisteredError requires a push_response argument
        fake_push_response = MagicMock()
        fake_push_response.push_message = MagicMock(to="ExponentPushToken[dead]")
        dead_response = MagicMock()
        dead_response.validate_response.side_effect = DeviceNotRegisteredError(fake_push_response)

        mock_client.publish_multiple.return_value = [dead_response]

        result = send_push_notifications(
            tokens=["ExponentPushToken[dead]"],
            title="Test",
            body="Hello",
        )
        self.assertEqual(result["sent"], 0)
        self.assertEqual(result["pruned"], ["ExponentPushToken[dead]"])
        # Token should be deleted from DB
        self.assertFalse(PushToken.objects.filter(token="ExponentPushToken[dead]").exists())

    @patch("core.push._client")
    def test_server_error_counts_as_failed(self, mock_client):
        """PushServerError for a whole batch counts all as failed."""
        from exponent_server_sdk import PushServerError

        mock_client.publish_multiple.side_effect = PushServerError("boom", MagicMock())

        result = send_push_notifications(
            tokens=["ExponentPushToken[aaa]"],
            title="Test",
            body="Hello",
        )
        self.assertEqual(result["sent"], 0)
        self.assertEqual(result["failed"], 1)

    @patch("core.push._client")
    def test_batches_in_chunks_of_100(self, mock_client):
        """Tokens are sent in batches of 100."""
        ok_response = MagicMock()
        ok_response.validate_response.return_value = None

        # 250 tokens → 3 batches (100, 100, 50)
        tokens = [f"ExponentPushToken[t{i}]" for i in range(250)]
        mock_client.publish_multiple.return_value = [ok_response] * 100

        # Need different return values for each batch
        mock_client.publish_multiple.side_effect = [
            [ok_response] * 100,
            [ok_response] * 100,
            [ok_response] * 50,
        ]

        result = send_push_notifications(tokens=tokens, title="Test", body="Hello")
        self.assertEqual(result["sent"], 250)
        self.assertEqual(mock_client.publish_multiple.call_count, 3)

    @patch("core.push._client")
    def test_channel_id_and_priority_passed_through(self, mock_client):
        """channel_id and priority are forwarded to PushMessage."""
        ok_response = MagicMock()
        ok_response.validate_response.return_value = None
        mock_client.publish_multiple.return_value = [ok_response]

        send_push_notifications(
            tokens=["ExponentPushToken[aaa]"],
            title="Urgent",
            body="Now",
            channel_id="announcements",
            priority="high",
        )

        call_args = mock_client.publish_multiple.call_args[0][0]
        msg = call_args[0]
        self.assertEqual(msg.channel_id, "announcements")
        self.assertEqual(msg.priority, "high")


class NotifyAnnouncementSubscribersTest(TestCase):
    """Tests for the announcement fan-out helper."""

    def setUp(self):
        self.mosque = Mosque.objects.create(name="Test Mosque")
        self.user = User.objects.create_user(
            username="sub@test.com", email="sub@test.com", password="pass", name="Sub"
        )
        self.sub = UserSubscription.objects.create(
            user=self.user,
            mosque=self.mosque,
            notify_announcements=True,
            notify_events=True,
        )
        self.token = PushToken.objects.create(
            user=self.user, token="ExponentPushToken[sub-device]", platform="ios"
        )

    @patch("core.push._client")
    def test_sends_to_subscribers_with_announcements_enabled(self, mock_client):
        ok = MagicMock()
        ok.validate_response.return_value = None
        mock_client.publish_multiple.return_value = [ok]

        announcement = Announcement.objects.create(
            mosque=self.mosque, title="Janazah today", body="After Dhuhr", author=self.user
        )

        # Disconnect signal to test helper directly
        result = notify_announcement_subscribers(announcement)
        self.assertEqual(result["sent"], 1)

    # Note: the previous `test_skips_subscribers_with_announcements_disabled`
    # has been removed. In the single-mosque model, `notify_announcement_subscribers`
    # broadcasts to every PushToken regardless of per-subscription preferences —
    # there is one mosque and every congregant is implicitly subscribed.
    # Fine-grained per-user opt-out would re-introduce multi-mosque machinery.

    @patch("core.push._client")
    def test_urgent_announcement_sets_high_priority(self, mock_client):
        ok = MagicMock()
        ok.validate_response.return_value = None
        mock_client.publish_multiple.return_value = [ok]

        announcement = Announcement.objects.create(
            mosque=self.mosque, title="Janazah", body="Urgent", priority="urgent", author=self.user
        )
        notify_announcement_subscribers(announcement)

        call_args = mock_client.publish_multiple.call_args[0][0]
        msg = call_args[0]
        self.assertEqual(msg.priority, "high")
        self.assertIn("URGENT", msg.title)

    @patch("core.push._client")
    def test_no_tokens_returns_zeros(self, mock_client):
        """Subscriber exists but has no push token registered."""
        self.token.delete()

        announcement = Announcement.objects.create(
            mosque=self.mosque, title="No devices", body="Body", author=self.user
        )
        result = notify_announcement_subscribers(announcement)
        self.assertEqual(result["sent"], 0)
        mock_client.publish_multiple.assert_not_called()


class NotifyEventSubscribersTest(TestCase):
    """Tests for the event fan-out helper."""

    def setUp(self):
        self.mosque = Mosque.objects.create(name="Test Mosque")
        self.user = User.objects.create_user(
            username="evt@test.com", email="evt@test.com", password="pass", name="Evt"
        )
        UserSubscription.objects.create(
            user=self.user,
            mosque=self.mosque,
            notify_events=True,
        )
        PushToken.objects.create(
            user=self.user, token="ExponentPushToken[evt-device]", platform="android"
        )

    @patch("core.push._client")
    def test_sends_to_event_subscribers(self, mock_client):
        ok = MagicMock()
        ok.validate_response.return_value = None
        mock_client.publish_multiple.return_value = [ok]

        from datetime import date, time

        event = Event.objects.create(
            mosque=self.mosque,
            title="Quran Circle",
            event_date=date(2026, 3, 25),
            start_time=time(19, 0),
            category="quran_school",
            author=self.user,
        )
        result = notify_event_subscribers(event)
        self.assertEqual(result["sent"], 1)

        call_args = mock_client.publish_multiple.call_args[0][0]
        msg = call_args[0]
        self.assertIn("event", msg.data.get("type", ""))

    # Note: the previous `test_skips_subscribers_with_events_disabled` has
    # been removed — see the equivalent note on the announcement version
    # above. Event notifications broadcast to all tokens under the
    # single-mosque model.
