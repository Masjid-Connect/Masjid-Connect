"""Centralised email service — all transactional emails via Resend.

Uses the same branded HTML template as the contact form, with consistent
Sapphire/Gold styling matching the app design system.
"""

import logging
import secrets
import threading

from django.conf import settings
from django.utils.html import escape

logger = logging.getLogger(__name__)

# ── Brand constants (matches Colors.ts) ──────────────────────────────
_SAPPHIRE = "#0F2D52"
_GOLD = "#D4AF37"
_STONE_100 = "#F9F7F2"
_STONE_BG = "#f4f2ed"
_ONYX_900 = "#121216"
_ONYX_600 = "#6B6B70"
_SEPARATOR = "#E2DFD8"
_FROM_EMAIL = "The Salafi Masjid <noreply@salafimasjid.app>"


def _send_email(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend. Returns True on success, False on failure.

    Runs synchronously — callers should use send_email_async() for
    fire-and-forget from request handlers.
    """
    api_key = getattr(settings, "RESEND_API_KEY", "")
    if not api_key:
        logger.warning("RESEND_API_KEY not configured — email to %s not sent", to)
        return False

    try:
        import resend

        resend.api_key = api_key
        resend.Emails.send(
            {
                "from": _FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
        logger.info("Email sent: '%s' to %s", subject, to)
        return True
    except Exception:
        logger.exception("Failed to send email '%s' to %s", subject, to)
        return False


def send_email_async(to: str, subject: str, html: str) -> None:
    """Fire-and-forget email in a background thread (same pattern as push.py)."""
    thread = threading.Thread(
        target=_send_email,
        args=(to, subject, html),
        daemon=True,
    )
    thread.start()


# ── HTML template wrapper ────────────────────────────────────────────


def _wrap_email(header_text: str, body_html: str, footer_text: str = "") -> str:
    """Wrap content in the branded email template."""
    footer = footer_text or "The Salafi Masjid &middot; salafimasjid.app"
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:{_STONE_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:{_STONE_BG};padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:{_SAPPHIRE};padding:28px 32px;text-align:center;">
          <span style="color:{_GOLD};font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">{escape(header_text)}</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          {body_html}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:{_STONE_100};padding:20px 32px;text-align:center;border-top:1px solid {_SEPARATOR};">
          <span style="font-size:12px;color:{_ONYX_600};">{footer}</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _paragraph(text: str) -> str:
    return f'<p style="font-size:15px;color:{_ONYX_900};line-height:1.6;margin:0 0 16px;">{text}</p>'


def _label(text: str) -> str:
    return f'<span style="font-size:12px;color:{_ONYX_600};text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">{escape(text)}</span>'


def _value(text: str) -> str:
    return f'<span style="font-size:15px;color:{_ONYX_900};font-weight:500;">{escape(text)}</span>'


def _divider() -> str:
    return f'<div style="border-top:1px solid {_SEPARATOR};margin:20px 0;"></div>'


def _button(url: str, text: str) -> str:
    return f'''<div style="text-align:center;margin:24px 0;">
  <a href="{url}" style="display:inline-block;background:{_SAPPHIRE};color:#ffffff;font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">{escape(text)}</a>
</div>'''


# ── Email builders ───────────────────────────────────────────────────


def send_welcome_email(user) -> None:
    """Send a welcome email after registration."""
    name = user.name or user.email.split("@")[0]
    body = (
        _paragraph(f"Assalamu alaikum {escape(name)},")
        + _paragraph(
            "Welcome to The Salafi Masjid app. You can now receive prayer time "
            "reminders, community announcements, and event notifications."
        )
        + _paragraph(
            "Open the app to subscribe to The Salafi Masjid and customise "
            "your notification preferences."
        )
        + _paragraph("Jazakallahu khairan,<br>The Salafi Masjid")
    )
    html = _wrap_email("Welcome to The Salafi Masjid", body)
    send_email_async(user.email, "Welcome to The Salafi Masjid", html)


def send_donation_receipt_email(donation) -> None:
    """Send a donation receipt email. Important for Gift Aid record-keeping."""
    if not donation.donor_email:
        return

    amount_pounds = f"\u00a3{donation.amount_pence / 100:.2f}"
    name = donation.donor_name or "Donor"
    frequency_label = "Monthly" if donation.frequency == "monthly" else "One-time"

    body = _paragraph(f"Assalamu alaikum {escape(name)},")
    body += _paragraph(
        f"Jazakallahu khairan for your generous {frequency_label.lower()} "
        f"donation of <strong>{amount_pounds}</strong> to The Salafi Masjid."
    )

    # Donation details table
    body += f'<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">'
    body += f'<tr><td style="padding:8px 0;">{_label("Amount")}<br>{_value(amount_pounds)}</td>'
    body += f'<td style="padding:8px 0;">{_label("Type")}<br>{_value(frequency_label)}</td></tr>'
    body += f'<tr><td style="padding:8px 0;">{_label("Date")}<br>{_value(str(donation.donation_date))}</td>'
    body += f'<td style="padding:8px 0;">{_label("Reference")}<br>{_value(str(donation.id)[:8])}</td></tr>'
    body += "</table>"

    if donation.gift_aid_eligible:
        gift_aid_amount = f"\u00a3{donation.gift_aid_amount_pence / 100:.2f}"
        body += _divider()
        body += _paragraph(
            f"<strong>Gift Aid:</strong> You declared Gift Aid on this donation. "
            f"This allows us to reclaim an additional <strong>{gift_aid_amount}</strong> "
            f"from HMRC at no extra cost to you."
        )
        if donation.donor_postcode:
            body += _paragraph(
                f'<span style="font-size:13px;color:{_ONYX_600};">'
                f"Donor address on file: {escape(donation.donor_address_line1)}, "
                f"{escape(donation.donor_postcode)}. "
                f"If this is incorrect, please contact us.</span>"
            )

    body += _divider()
    body += _paragraph(
        '<span style="font-size:13px;color:{_ONYX_600};">'
        "Please keep this email as your donation receipt. "
        "If you have any questions, reply to this email.</span>"
    )

    html = _wrap_email("Donation Receipt", body)
    send_email_async(
        donation.donor_email,
        f"Donation Receipt \u2014 {amount_pounds}",
        html,
    )


def send_password_reset_email(user, reset_url: str) -> None:
    """Send a password reset link."""
    name = user.name or user.email.split("@")[0]
    body = (
        _paragraph(f"Assalamu alaikum {escape(name)},")
        + _paragraph(
            "We received a request to reset your password. "
            "Click the button below to set a new password:"
        )
        + _button(reset_url, "Reset Password")
        + _paragraph(
            '<span style="font-size:13px;color:{_ONYX_600};">'
            "This link expires in 1 hour. If you did not request a password "
            "reset, you can safely ignore this email.</span>"
        )
    )
    html = _wrap_email("Password Reset", body)
    send_email_async(user.email, "Reset Your Password \u2014 The Salafi Masjid", html)


def send_account_deletion_email(email: str, name: str) -> None:
    """Send confirmation that the account has been deleted."""
    display_name = name or email.split("@")[0]
    body = (
        _paragraph(f"Assalamu alaikum {escape(display_name)},")
        + _paragraph(
            "Your account with The Salafi Masjid app has been permanently deleted, "
            "along with all associated data (subscriptions, push tokens, and preferences)."
        )
        + _paragraph(
            "Any announcements or events you authored remain visible but are no longer "
            "linked to your account."
        )
        + _paragraph(
            "If you did not request this deletion or believe it was done in error, "
            "please contact us at info@salafimasjid.app."
        )
        + _paragraph("Jazakallahu khairan,<br>The Salafi Masjid")
    )
    html = _wrap_email("Account Deleted", body)
    send_email_async(email, "Account Deleted \u2014 The Salafi Masjid", html)


def generate_password_reset_token() -> str:
    """Generate a cryptographically secure reset token."""
    return secrets.token_urlsafe(32)
