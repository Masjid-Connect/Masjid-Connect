"""Expo Push Notification service — sends push notifications to subscribers.

Batches tokens in chunks of 100 (Expo API limit), handles errors,
and prunes invalid tokens (DeviceNotRegistered).
"""

import logging
from typing import Optional

from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
)

logger = logging.getLogger("api")

# Re-use a single client instance (connection pooling).
_client = PushClient()


def send_push_notifications(
    tokens: list[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
    channel_id: Optional[str] = None,
    priority: str = "default",
) -> dict:
    """Send a push notification to a list of Expo push tokens.

    Args:
        tokens: List of Expo push token strings (e.g. "ExponentPushToken[...]").
        title: Notification title.
        body: Notification body text.
        data: Optional JSON-serializable payload (for deep linking).
        channel_id: Android notification channel ID.
        priority: "default" or "high" (maps to Expo priority).

    Returns:
        dict with keys: sent (int), failed (int), pruned (list of pruned token strings).
    """
    if not tokens:
        return {"sent": 0, "failed": 0, "pruned": []}

    messages = [
        PushMessage(
            to=token,
            title=title,
            body=body,
            data=data or {},
            channel_id=channel_id,
            priority=priority,
        )
        for token in tokens
    ]

    sent = 0
    failed = 0
    pruned_tokens: list[str] = []

    # Expo accepts up to 100 messages per request.
    for chunk in _chunked(messages, 100):
        try:
            responses = _client.publish_multiple(chunk)
        except PushServerError:
            logger.exception("Expo Push Server error for batch of %d", len(chunk))
            failed += len(chunk)
            continue
        except Exception:
            logger.exception("Unexpected error sending push batch of %d", len(chunk))
            failed += len(chunk)
            continue

        for msg, response in zip(chunk, responses):
            try:
                response.validate_response()
                sent += 1
            except DeviceNotRegisteredError:
                pruned_tokens.append(msg.to)
            except Exception:
                logger.warning(
                    "Push failed for token %.20s...: %s",
                    msg.to,
                    getattr(response, "message", "unknown"),
                )
                failed += 1

    # Prune invalid tokens from the database.
    if pruned_tokens:
        _prune_tokens(pruned_tokens)

    logger.info(
        "Push send complete: %d sent, %d failed, %d pruned",
        sent,
        failed,
        len(pruned_tokens),
    )
    return {"sent": sent, "failed": failed, "pruned": pruned_tokens}


def notify_announcement_subscribers(announcement) -> dict:
    """Send push notification for a new announcement to all subscribers."""
    from .models import PushToken, UserSubscription

    mosque = announcement.mosque
    subscriber_user_ids = UserSubscription.objects.filter(
        mosque=mosque,
        notify_announcements=True,
    ).values_list("user_id", flat=True)

    tokens = list(
        PushToken.objects.filter(user_id__in=subscriber_user_ids).values_list(
            "token", flat=True
        )
    )

    if not tokens:
        logger.info("No push tokens for announcement '%s' (mosque: %s)", announcement.title, mosque.name)
        return {"sent": 0, "failed": 0, "pruned": []}

    priority_label = "URGENT" if announcement.priority == "urgent" else ""
    title = f"{priority_label} {mosque.name}".strip() if priority_label else mosque.name

    return send_push_notifications(
        tokens=tokens,
        title=title,
        body=announcement.title,
        data={
            "type": "announcement",
            "announcement_id": str(announcement.id),
            "mosque_id": str(mosque.id),
        },
        channel_id="announcements",
        priority="high" if announcement.priority == "urgent" else "default",
    )


def notify_event_subscribers(event) -> dict:
    """Send push notification for a new event to all subscribers."""
    from .models import PushToken, UserSubscription

    mosque = event.mosque
    subscriber_user_ids = UserSubscription.objects.filter(
        mosque=mosque,
        notify_events=True,
    ).values_list("user_id", flat=True)

    tokens = list(
        PushToken.objects.filter(user_id__in=subscriber_user_ids).values_list(
            "token", flat=True
        )
    )

    if not tokens:
        logger.info("No push tokens for event '%s' (mosque: %s)", event.title, mosque.name)
        return {"sent": 0, "failed": 0, "pruned": []}

    return send_push_notifications(
        tokens=tokens,
        title=mosque.name,
        body=f"{event.title} — {event.event_date.strftime('%d %b')}",
        data={
            "type": "event",
            "event_id": str(event.id),
            "mosque_id": str(mosque.id),
        },
        channel_id="announcements",
        priority="default",
    )


def _chunked(lst: list, size: int):
    """Yield successive chunks of `size` from `lst`."""
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


def _prune_tokens(token_strings: list[str]) -> int:
    """Delete PushToken rows for invalid Expo tokens."""
    from .models import PushToken

    count, _ = PushToken.objects.filter(token__in=token_strings).delete()
    logger.info("Pruned %d invalid push tokens", count)
    return count
