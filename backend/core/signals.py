"""Signals for the core app — email notifications on new feedback."""

import json
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Feedback

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
