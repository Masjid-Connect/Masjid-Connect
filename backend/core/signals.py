"""Signals for the core app — email notifications and push notifications."""

import json
import logging
import threading

from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Announcement, Event, Feedback

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Feedback)
def notify_admin_on_new_feedback(sender, instance, created, **kwargs):
    """Send an email to the admin when new feedback is submitted."""
    if not created:
        return

    notify_email = getattr(settings, "FEEDBACK_NOTIFY_EMAIL", "info@salafimasjid.app")
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@salafimasjid.app")

    type_label = instance.get_type_display()
    user_email = instance.user.email if instance.user else "Guest (not signed in)"
    device = json.dumps(instance.device_info, indent=2) if instance.device_info else "None"

    subject = f"New {type_label} — {instance.category}"
    body = (
        f"Type: {type_label}\n"
        f"Category: {instance.category}\n"
        f"From: {user_email}\n\n"
        f"Description:\n{instance.description or '(no description)'}\n\n"
        f"Device Info:\n{device}\n\n"
        f"View in admin: /admin/core/feedback/{instance.pk}/change/"
    )

    try:
        send_mail(subject, body, from_email, [notify_email], fail_silently=True)
    except Exception:
        logger.exception("Failed to send feedback notification email")


def _send_announcement_push(announcement_pk, announcement_title):
    """Background thread target for sending announcement push notifications."""
    from django.apps import apps

    try:
        from .push import notify_announcement_subscribers

        Announcement = apps.get_model("core", "Announcement")
        instance = Announcement.objects.get(pk=announcement_pk)
        result = notify_announcement_subscribers(instance)
        logger.info(
            "Push notifications for announcement '%s': %d sent, %d failed, %d pruned",
            announcement_title,
            result["sent"],
            result["failed"],
            len(result["pruned"]),
        )
    except Exception:
        logger.exception("Failed to send push notifications for announcement '%s'", announcement_title)


def _send_event_push(event_pk, event_title):
    """Background thread target for sending event push notifications."""
    from django.apps import apps

    try:
        from .push import notify_event_subscribers

        Event = apps.get_model("core", "Event")
        instance = Event.objects.get(pk=event_pk)
        result = notify_event_subscribers(instance)
        logger.info(
            "Push notifications for event '%s': %d sent, %d failed, %d pruned",
            event_title,
            result["sent"],
            result["failed"],
            len(result["pruned"]),
        )
    except Exception:
        logger.exception("Failed to send push notifications for event '%s'", event_title)


@receiver(post_save, sender=Announcement)
def push_notify_new_announcement(sender, instance, created, **kwargs):
    """Send push notifications to mosque subscribers when a new announcement is created."""
    if not created:
        return

    thread = threading.Thread(
        target=_send_announcement_push,
        args=(instance.pk, instance.title),
        daemon=True,
    )
    thread.start()


@receiver(post_save, sender=Event)
def push_notify_new_event(sender, instance, created, **kwargs):
    """Send push notifications to mosque subscribers when a new event is created."""
    if not created:
        return

    thread = threading.Thread(
        target=_send_event_push,
        args=(instance.pk, instance.title),
        daemon=True,
    )
    thread.start()
