"""API views for Masjid Connect."""

import logging
import math
import os
import uuid as uuid_mod

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Sum as models_Sum
from django.db.models.expressions import RawSQL
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle

logger = logging.getLogger(__name__)

from core.models import (
    Announcement,
    Donation,
    Event,
    Feedback,
    GiftAidDeclaration,
    MixlrStatus,
    Mosque,
    MosqueAdmin,
    MosquePrayerTime,
    PushToken,
    UserSubscription,
)

from .serializers import (
    AnnouncementSerializer,
    DonationSerializer,
    EventSerializer,
    FeedbackCreateSerializer,
    FeedbackSerializer,
    GiftAidDeclarationSerializer,
    MixlrStatusSerializer,
    MosqueAdminSerializer,
    MosqueListSerializer,
    MosquePrayerTimeSerializer,
    MosqueSerializer,
    PushTokenSerializer,
    RegisterSerializer,
    UserSerializer,
    UserSubscriptionSerializer,
)

User = get_user_model()


# ── Throttles ────────────────────────────────────────────────────────


class AuthRateThrottle(AnonRateThrottle):
    """Strict rate limit for auth endpoints to prevent brute-force."""

    rate = "5/minute"

    def allow_request(self, request, view):
        if getattr(settings, "TESTING", False):
            return True
        return super().allow_request(request, view)


class NearbyRateThrottle(AnonRateThrottle):
    """Rate limit for the computationally expensive nearby endpoint."""

    rate = "30/minute"

    def allow_request(self, request, view):
        if getattr(settings, "TESTING", False):
            return True
        return super().allow_request(request, view)


class FeedbackRateThrottle(AnonRateThrottle):
    """Limit feedback submissions to prevent spam."""

    scope = "feedback"

    def allow_request(self, request, view):
        if getattr(settings, "TESTING", False):
            return True
        return super().allow_request(request, view)


class ContentCreationRateThrottle(ScopedRateThrottle):
    """Rate limit content creation (announcements/events) to prevent abuse from compromised admin accounts."""

    scope = "content_creation"

    def allow_request(self, request, view):
        if getattr(settings, "TESTING", False):
            return True
        return super().allow_request(request, view)


class DataExportRateThrottle(ScopedRateThrottle):
    """Strict rate limit on GDPR data export to prevent abuse."""

    scope = "data_export"

    def allow_request(self, request, view):
        if getattr(settings, "TESTING", False):
            return True
        return super().allow_request(request, view)


# ── Permissions ──────────────────────────────────────────────────────


class IsMosqueAdminOrReadOnly(permissions.BasePermission):
    """Allow write operations only if the user is a mosque admin for the target mosque."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        # Staff users can do anything
        if request.user.is_staff:
            return True
        # For create actions, check that the user is admin for the target mosque
        mosque_id = request.data.get("mosque")
        if mosque_id:
            return MosqueAdmin.objects.filter(user=request.user, mosque_id=mosque_id).exists()
        # If no mosque specified, let the serializer handle validation
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        # Staff users can edit anything
        if request.user.is_staff:
            return True
        # Check if user is admin for this mosque
        mosque_id = getattr(obj, "mosque_id", None)
        if mosque_id is None:
            return False
        return MosqueAdmin.objects.filter(user=request.user, mosque_id=mosque_id).exists()


# ── Auth ─────────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AuthRateThrottle])
def register(request):
    """Register a new user and return auth token."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)

    # Fire-and-forget welcome email (outside transaction)
    from core.email import send_welcome_email
    send_welcome_email(user)

    return Response(
        {"token": token.key, "user": UserSerializer(user).data},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AuthRateThrottle])
def login(request):
    """Authenticate and return token."""
    email = request.data.get("email", "")
    password = request.data.get("password", "")
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Perform a dummy password check to prevent timing-based account enumeration.
        # This ensures the response time is consistent whether the user exists or not.
        import hashlib
        hashlib.pbkdf2_hmac("sha256", password.encode(), b"dummy-salt", 260000)
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.check_password(password):
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    # Rotate token on each login to limit token lifetime
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)
    return Response({"token": token.key, "user": UserSerializer(user).data})




@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout(request):
    """Delete the user's auth token."""
    if hasattr(request.user, "auth_token"):
        request.user.auth_token.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    """Return current authenticated user."""
    return Response(UserSerializer(request.user).data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def admin_roles(request):
    """Return mosques the authenticated user administers."""
    roles = MosqueAdmin.objects.filter(user=request.user).select_related("mosque")
    return Response(MosqueAdminSerializer(roles, many=True).data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([DataExportRateThrottle])
def export_user_data(request):
    """GDPR-compliant data export — return all data associated with the authenticated user."""
    user = request.user

    # Audit log: record data export request
    logger.info(
        "GDPR data export requested by user_id=%s from IP=%s",
        user.id,
        request.META.get("REMOTE_ADDR", "unknown"),
    )

    profile = UserSerializer(user).data
    user_subscriptions = UserSubscription.objects.filter(user=user).select_related("mosque")
    user_push_tokens = PushToken.objects.filter(user=user)
    user_announcements = Announcement.objects.filter(author=user).select_related("mosque")
    user_events = Event.objects.filter(author=user).select_related("mosque")
    user_admin_roles = MosqueAdmin.objects.filter(user=user).select_related("mosque")
    user_feedback = Feedback.objects.filter(user=user)
    # Donations matched by email (donors may not have app accounts)
    user_donations = Donation.objects.filter(donor_email=user.email)
    user_gift_aid = GiftAidDeclaration.objects.filter(donor_email=user.email).annotate(
        _total_donated_pence=models_Sum("donations__amount_pence"),
        _total_gift_aid_pence=models_Sum("donations__gift_aid_amount_pence"),
    )

    return Response({
        "profile": profile,
        "subscriptions": UserSubscriptionSerializer(user_subscriptions, many=True).data,
        "push_tokens": PushTokenSerializer(user_push_tokens, many=True).data,
        "announcements": AnnouncementSerializer(user_announcements, many=True).data,
        "events": EventSerializer(user_events, many=True).data,
        "admin_roles": MosqueAdminSerializer(user_admin_roles, many=True).data,
        "feedback": FeedbackSerializer(user_feedback, many=True).data,
        "donations": DonationSerializer(user_donations, many=True).data,
        "gift_aid_declarations": GiftAidDeclarationSerializer(user_gift_aid, many=True).data,
        "exported_at": timezone.now().isoformat(),
    })


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def delete_account(request):
    """
    Permanently delete the authenticated user's account and all associated data.
    Requires password confirmation for password-based accounts.
    """
    user = request.user

    # Require password confirmation for accounts that have a usable password
    if user.has_usable_password():
        password = request.data.get("password", "")
        if not user.check_password(password):
            return Response(
                {"detail": "Password confirmation required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Audit log: record account deletion before destroying data
    logger.info(
        "Account deletion: user_id=%s email=%s at %s from IP=%s",
        user.id,
        user.email,
        timezone.now().isoformat(),
        request.META.get("HTTP_CF_CONNECTING_IP", request.META.get("REMOTE_ADDR", "unknown")),
    )

    # Capture email and name before deletion
    user_email = user.email
    user_name = user.name

    with transaction.atomic():
        # Delete auth token
        if hasattr(user, "auth_token"):
            user.auth_token.delete()
        # Cascade deletes: subscriptions, push_tokens, mosque_roles
        # Orphan authored content (SET_NULL on announcements/events)
        user.delete()

    # Send confirmation email after successful deletion (outside transaction)
    from core.email import send_account_deletion_email
    send_account_deletion_email(user_email, user_name)

    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Password Reset ──────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AuthRateThrottle])
def request_password_reset(request):
    """Request a password reset email.

    Always returns 200 to prevent email enumeration — even if the email
    doesn't exist. The actual email is only sent if a matching user is found.
    """
    from core.email import generate_password_reset_token, send_password_reset_email
    from core.models import PasswordResetToken

    email = request.data.get("email", "").strip().lower()
    if not email:
        return Response(
            {"detail": "Email is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Always return success to prevent enumeration
    success_msg = {"detail": "If an account exists with that email, a reset link has been sent."}

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(success_msg, status=status.HTTP_200_OK)

    # Social-only accounts can't reset passwords
    if not user.has_usable_password():
        return Response(success_msg, status=status.HTTP_200_OK)

    # Invalidate any existing unused tokens for this user
    PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

    # Create new token
    token_value = generate_password_reset_token()
    PasswordResetToken.objects.create(user=user, token=token_value)

    # Build reset URL (frontend handles the actual reset form)
    frontend_url = getattr(settings, "FRONTEND_URL", "https://salafimasjid.app")
    reset_url = f"{frontend_url}/reset-password?token={token_value}"

    send_password_reset_email(user, reset_url)
    return Response(success_msg, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AuthRateThrottle])
def confirm_password_reset(request):
    """Confirm a password reset — validate token and set new password."""
    from core.models import PasswordResetToken

    token_value = request.data.get("token", "")
    new_password = request.data.get("password", "")

    if not token_value or not new_password:
        return Response(
            {"detail": "Token and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(new_password) < 8:
        return Response(
            {"detail": "Password must be at least 8 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        reset_token = PasswordResetToken.objects.select_related("user").get(token=token_value)
    except PasswordResetToken.DoesNotExist:
        return Response(
            {"detail": "Invalid or expired reset link."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not reset_token.is_valid():
        return Response(
            {"detail": "Invalid or expired reset link."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        user = reset_token.user
        user.set_password(new_password)
        user.save()

        # Mark token as used
        reset_token.used = True
        reset_token.save(update_fields=["used"])

        # Invalidate all existing auth tokens (force re-login)
        Token.objects.filter(user=user).delete()

    return Response({"detail": "Password has been reset. Please log in with your new password."})


# ── Mosques ──────────────────────────────────────────────────────────


class MosqueViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve mosques. Supports ?city= filter and ?search= search."""

    queryset = Mosque.objects.all()
    permission_classes = [permissions.AllowAny]
    filterset_fields = ["city", "country"]
    search_fields = ["name", "city", "address"]

    def get_serializer_class(self):
        if self.action == "list":
            return MosqueListSerializer
        return MosqueSerializer

    @action(detail=False, methods=["get"], throttle_classes=[NearbyRateThrottle])
    def nearby(self, request):
        """Return mosques within `radius` km of `lat`/`lng` (haversine in SQL)."""
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
        except (KeyError, ValueError):
            return Response(
                {"detail": "lat and lng query params are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return Response(
                {"detail": "lat must be between -90 and 90, lng between -180 and 180."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            radius = float(request.query_params.get("radius", 50))
        except (ValueError, TypeError):
            radius = 50
        radius = min(radius, 500)  # cap at 500 km

        # Haversine formula executed at the DB level (PostgreSQL)
        lat_rad = math.radians(lat)
        lng_rad = math.radians(lng)
        qs = Mosque.objects.annotate(
            distance=RawSQL(
                """
                6371 * acos(
                    cos(%s) * cos(radians(latitude)) * cos(radians(longitude) - %s) +
                    sin(%s) * sin(radians(latitude))
                )
                """,
                (lat_rad, lng_rad, lat_rad),
            )
        ).filter(distance__lte=radius).order_by("distance")

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = MosqueListSerializer(page, many=True)
            data = _inject_distances(serializer.data, page)
            return self.get_paginated_response(data)

        serializer = MosqueListSerializer(qs, many=True)
        data = _inject_distances(serializer.data, qs)
        return Response(data)


# ── Announcements ────────────────────────────────────────────────────


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    Announcements for mosques.
    GET params: ?mosque_ids=uuid1,uuid2 (comma-separated)
    """

    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsMosqueAdminOrReadOnly]
    throttle_scope = "content_creation"

    def get_throttles(self):
        if self.action in ("create", "update", "partial_update"):
            return [ContentCreationRateThrottle()]
        return []

    def get_queryset(self):
        qs = Announcement.objects.select_related("mosque", "author")
        mosque_ids = self.request.query_params.get("mosque_ids")
        if mosque_ids:
            ids = _parse_uuid_list(mosque_ids)
            qs = qs.filter(mosque_id__in=ids)

        now = timezone.now()
        qs = qs.filter(
            models_q_expires_or_null(now),
        )
        return qs.order_by("-published_at")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


def models_q_expires_or_null(now):
    """Return Q for expires_at IS NULL OR expires_at > now."""
    from django.db.models import Q

    return Q(expires_at__isnull=True) | Q(expires_at__gt=now)


# ── Events ───────────────────────────────────────────────────────────


class EventViewSet(viewsets.ModelViewSet):
    """
    Events for mosques.
    GET params: ?mosque_ids=uuid1,uuid2&from_date=YYYY-MM-DD&category=lesson
    """

    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsMosqueAdminOrReadOnly]
    throttle_scope = "content_creation"

    def get_throttles(self):
        if self.action in ("create", "update", "partial_update"):
            return [ContentCreationRateThrottle()]
        return []

    def get_queryset(self):
        qs = Event.objects.select_related("mosque", "author")
        mosque_ids = self.request.query_params.get("mosque_ids")
        if mosque_ids:
            ids = _parse_uuid_list(mosque_ids)
            qs = qs.filter(mosque_id__in=ids)

        from_date = self.request.query_params.get("from_date")
        if from_date:
            parsed = parse_date(from_date)
            if parsed is None:
                # Invalid date format — return empty rather than 500
                return qs.none()
            qs = qs.filter(event_date__gte=parsed)

        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        return qs.order_by("event_date", "start_time")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# ── Subscriptions ────────────────────────────────────────────────────


# ── Push Tokens ──────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
def register_push_token(request):
    """Register or update a push token. Works for both anonymous and authenticated users."""
    token_str = request.data.get("token")
    platform = request.data.get("platform")
    if not token_str or not platform:
        return Response(
            {"detail": "token and platform are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user if request.user.is_authenticated else None
    with transaction.atomic():
        push_token, created = PushToken.objects.update_or_create(
            token=token_str,
            defaults={"platform": platform, "user": user},
        )
    return Response(
        PushTokenSerializer(push_token).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


# ── Feedback ─────────────────────────────────────────────────────────


class FeedbackViewSet(viewsets.ModelViewSet):
    """
    Submit and view feedback (bug reports / feature requests).
    POST is open to everyone (guests too). GET requires auth (own feedback only).
    """

    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return FeedbackCreateSerializer
        return FeedbackSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_throttles(self):
        if self.action == "create":
            return [FeedbackRateThrottle()]
        return []

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Feedback.objects.filter(user=self.request.user).select_related("user")
        return Feedback.objects.none()

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)


# ── Contact Form (Resend) ────────────────────────────────────────────


class ContactRateThrottle(AnonRateThrottle):
    """Limit contact form submissions to prevent spam."""

    scope = "contact"

    def allow_request(self, request, view):
        if getattr(settings, "TESTING", False):
            return True
        return super().allow_request(request, view)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([ContactRateThrottle])
def contact_submit(request):
    """Handle contact form submissions — validate and send via Resend."""
    from api.serializers import ContactSerializer

    serializer = ContactSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # Validate Turnstile token (skip if no secret key configured)
    turnstile_secret = getattr(settings, "TURNSTILE_SECRET_KEY", "")
    turnstile_token = data.get("turnstile_token", "")
    if turnstile_secret and turnstile_token:
        try:
            turnstile_resp = requests.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={"secret": turnstile_secret, "response": turnstile_token},
                timeout=5,
            )
            result = turnstile_resp.json()
            if not result.get("success"):
                logger.warning("Turnstile verification failed: %s", result)
                return Response(
                    {"detail": "Bot verification failed. Please try again."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        except requests.RequestException:
            logger.exception("Turnstile verification request failed")
            # Fail open — don't block legitimate users if Turnstile is down
    elif turnstile_secret and not turnstile_token:
        return Response(
            {"detail": "Bot verification required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    api_key = getattr(settings, "RESEND_API_KEY", "")

    if not api_key:
        logger.error("RESEND_API_KEY not configured")
        return Response(
            {"detail": "Email service not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    subject_display = dict(ContactSerializer.SUBJECT_CHOICES).get(
        data["subject"], data["subject"]
    )

    try:
        import resend

        resend.api_key = api_key

        resend.Emails.send(
            {
                "from": "The Salafi Masjid <noreply@salafimasjid.app>",
                "to": [settings.CONTACT_TO_EMAIL],
                "reply_to": data["email"],
                "subject": f"[Contact] {subject_display} — {data['name']}",
                "html": _build_contact_email_html(data, subject_display),
            }
        )
    except Exception:
        logger.exception("Failed to send contact email via Resend")
        return Response(
            {"detail": "Failed to send message. Please try again later."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({"detail": "Message sent successfully."}, status=status.HTTP_200_OK)


def _build_contact_email_html(data: dict, subject_display: str) -> str:
    """Build a branded HTML email for contact form submissions."""
    from django.utils.html import escape

    name = escape(data["name"])
    email = escape(data["email"])
    message = escape(data["message"])
    subject_display = escape(subject_display)

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f2ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ed;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#0F2D52;padding:28px 32px;text-align:center;">
          <span style="color:#D4AF37;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">New Contact Message</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding-bottom:20px;">
              <span style="font-size:12px;color:#6B6B70;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">From</span><br>
              <span style="font-size:15px;color:#121216;font-weight:500;">{name}</span><br>
              <a href="mailto:{email}" style="font-size:14px;color:#0F2D52;">{email}</a>
            </td></tr>
            <tr><td style="padding-bottom:20px;border-top:1px solid #E2DFD8;padding-top:20px;">
              <span style="font-size:12px;color:#6B6B70;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Subject</span><br>
              <span style="font-size:15px;color:#121216;">{subject_display}</span>
            </td></tr>
            <tr><td style="border-top:1px solid #E2DFD8;padding-top:20px;">
              <span style="font-size:12px;color:#6B6B70;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Message</span><br>
              <p style="font-size:15px;color:#121216;line-height:1.6;margin:8px 0 0;white-space:pre-wrap;">{message}</p>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#F9F7F2;padding:20px 32px;text-align:center;border-top:1px solid #E2DFD8;">
          <span style="font-size:12px;color:#6B6B70;">Sent via salafimasjid.app contact form</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ── Donations (Stripe) ───────────────────────────────────────────────


class DonationRateThrottle(AnonRateThrottle):
    """Limit donation attempts."""

    scope = "donation"

    def allow_request(self, request, view):
        if getattr(settings, "TESTING", False):
            return True
        return super().allow_request(request, view)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([DonationRateThrottle])
def create_checkout_session(request):
    """Create a Stripe Checkout Session.

    Supports two modes controlled by the ``ui_mode`` field:

    **embedded** (recommended) — returns JSON ``{client_secret, publishable_key}``
    so the frontend can mount Stripe Embedded Checkout inline via Stripe.js.

    **redirect** (legacy) — creates a hosted checkout session and returns a 303
    redirect so the browser navigates straight to Stripe.

    Payment methods (Card, PayPal, Apple Pay, Google Pay, Pay by Bank) are
    managed via the Stripe Dashboard — no code changes needed.
    """
    from django.http import HttpResponseRedirect

    import stripe as stripe_lib

    def _redirect_303(url):
        """Return a 303 See Other redirect (correct for POST-to-GET)."""
        response = HttpResponseRedirect(url)
        response.status_code = 303
        return response

    secret_key = getattr(settings, "STRIPE_SECRET_KEY", "")
    if not secret_key:
        return Response(
            {"detail": "Payment service not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    stripe_lib.api_key = secret_key

    amount = request.data.get("amount")  # in pence
    currency = request.data.get("currency", "gbp")
    frequency = request.data.get("frequency", "one-time")
    return_url = request.data.get("return_url", "")
    gift_aid = request.data.get("gift_aid", "")
    cover_fees = request.data.get("cover_fees", "")
    ui_mode = request.data.get("ui_mode", "redirect")

    # ── Validate return_url against allowed domains ───────────
    ALLOWED_RETURN_DOMAINS = {
        "salafimasjid.app",
        "www.salafimasjid.app",
    }

    def _is_safe_return_url(url: str) -> bool:
        """Only allow return URLs on our own domains (prevent open redirect)."""
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url)
        except Exception:
            return False
        if parsed.scheme not in ("https",):
            return False
        host = parsed.hostname or ""
        # Allow exact match or Cloudflare Pages preview subdomains
        if host in ALLOWED_RETURN_DOMAINS:
            return True
        if host.endswith(".masjid-connect.pages.dev"):
            return True
        return False

    # ── Validation ────────────────────────────────────────────
    def _error(msg, for_redirect=False):
        """Return an error — JSON for embedded, redirect for legacy."""
        if for_redirect and return_url and _is_safe_return_url(return_url):
            from urllib.parse import quote
            sep = "&" if "?" in return_url else "?"
            return _redirect_303(return_url + sep + "donation=error&msg=" + quote(msg))
        return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

    is_embedded = ui_mode in ("embedded", "embedded_page", "custom", "elements")
    is_url_only = ui_mode == "url"
    # url mode (mobile apps) should receive JSON errors, not redirects
    is_json_mode = is_embedded or is_url_only

    if not return_url:
        return Response(
            {"detail": "return_url is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not _is_safe_return_url(return_url):
        return Response(
            {"detail": "return_url must be on an allowed domain."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        amount = int(amount)
    except (TypeError, ValueError):
        return _error("Invalid amount.", for_redirect=not is_json_mode)

    if amount < 100 or amount > 1000000:
        return _error("Amount must be between £1 and £10,000.", for_redirect=not is_json_mode)

    try:
        is_recurring = frequency == "monthly"
        wants_gift_aid = str(gift_aid).lower() in ("yes", "true", "1")
        wants_cover_fees = str(cover_fees).lower() in ("yes", "true", "1")

        # If donor opts to cover processing fees, calculate the gross amount
        # so the masjid receives the full donation after Stripe's cut.
        # Blended estimate: 2.5% + 20p (covers UK/EU cards, wallets, PayPal).
        import math

        donation_amount = amount  # original donation in pence
        if wants_cover_fees:
            amount = math.ceil((amount + 20) / (1 - 0.025))

        base_metadata = {
            "frequency": frequency,
            "source": "app" if is_url_only else "website",
            "gift_aid": "yes" if wants_gift_aid else "no",
            "cover_fees": "yes" if wants_cover_fees else "no",
            "donation_amount": str(donation_amount),
        }

        session_params = {
            "mode": "subscription" if is_recurring else "payment",
            "metadata": base_metadata,
        }

        # Gift Aid requires donor's full name and UK address for HMRC.
        # Without Gift Aid, minimise data collection — only collect
        # billing info when the payment method requires it.
        if wants_gift_aid:
            session_params["billing_address_collection"] = "required"
            if not is_recurring:
                session_params["customer_creation"] = "always"
        else:
            session_params["billing_address_collection"] = "auto"

        # Line items
        product_name = (
            "Monthly Donation to The Salafi Masjid"
            if is_recurring
            else "Donation to The Salafi Masjid"
        )
        price_data = {
            "currency": currency,
            "product_data": {"name": product_name},
            "unit_amount": amount,
        }
        if is_recurring:
            price_data["recurring"] = {"interval": "month"}

        session_params["line_items"] = [{"price_data": price_data, "quantity": 1}]

        if is_embedded:
            # Embedded Checkout — stays on the donor's page
            # Stripe only accepts "embedded" as the ui_mode value
            session_params["ui_mode"] = "embedded"
            session_params["return_url"] = (
                return_url + "?donation=success&session_id={CHECKOUT_SESSION_ID}"
            )
        else:
            # Hosted Checkout — redirect to Stripe
            session_params["success_url"] = (
                return_url + "?donation=success&session_id={CHECKOUT_SESSION_ID}"
            )
            session_params["cancel_url"] = return_url + "?donation=cancelled"

        session = stripe_lib.checkout.Session.create(**session_params)

        if is_embedded:
            publishable_key = getattr(settings, "STRIPE_PUBLISHABLE_KEY", "")
            if not publishable_key or not publishable_key.startswith("pk_"):
                logger.error("STRIPE_PUBLISHABLE_KEY is not configured or invalid")
                return Response(
                    {"detail": "Payment system is temporarily unavailable. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response(
                {
                    "client_secret": session.client_secret,
                    "publishable_key": publishable_key,
                },
                status=status.HTTP_200_OK,
            )
        elif is_url_only:
            # URL-only mode — return checkout URL as JSON (for mobile apps
            # where fetch redirect: 'manual' returns an opaque response)
            return Response(
                {"checkout_url": session.url},
                status=status.HTTP_200_OK,
            )
        else:
            # 303 See Other — browser converts POST to GET for Stripe's hosted page
            return _redirect_303(session.url)
    except Exception as exc:
        logger.exception("Stripe Checkout Session creation failed")
        error_msg = str(exc) if str(exc) else "Something went wrong. Please try again."
        return _error(error_msg, for_redirect=not is_json_mode)



@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@throttle_classes([DonationRateThrottle])
def checkout_session_status(request):
    """
    Return the status of a Stripe Checkout Session created for embedded checkout.

    Query params:
      - session_id: Stripe checkout session ID.

    Returns only the completion status — no financial details.
    """
    import stripe as stripe_lib

    session_id = request.query_params.get("session_id")
    if not session_id:
        return Response(
            {"detail": "session_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate format to prevent enumeration of arbitrary Stripe objects
    if not session_id.startswith("cs_"):
        return Response(
            {"detail": "Invalid session ID format."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    secret_key = getattr(settings, "STRIPE_SECRET_KEY", "")
    if not secret_key:
        return Response(
            {"detail": "Payment service not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    stripe_lib.api_key = secret_key

    try:
        session = stripe_lib.checkout.Session.retrieve(session_id)
    except Exception:
        logger.exception("Failed to retrieve Stripe Checkout Session status")
        return Response(
            {"detail": "Could not look up payment status."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # Return only non-sensitive status — no amounts, emails, or billing info
    return Response(
        {
            "status": session.status,
        },
        status=status.HTTP_200_OK,
    )


# ── Stripe Webhook ───────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def stripe_webhook(request):
    """
    Handle Stripe webhook events.

    Verifies the webhook signature using STRIPE_WEBHOOK_SECRET, then
    processes the event. Duplicate events are skipped (idempotent).
    """
    import stripe as stripe_lib

    from core.models import StripeEvent

    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")
    if not webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        return Response(
            {"detail": "Webhook not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    try:
        event = stripe_lib.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        logger.warning("Stripe webhook: invalid payload")
        return Response(
            {"detail": "Invalid payload."}, status=status.HTTP_400_BAD_REQUEST
        )
    except stripe_lib.error.SignatureVerificationError:
        logger.warning("Stripe webhook: invalid signature")
        return Response(
            {"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST
        )

    event_type = event["type"]
    data_object = event["data"]["object"]

    # Idempotency: record event BEFORE processing to prevent duplicates
    # from concurrent webhook retries. Use get_or_create to handle races.
    stripe_event, created = StripeEvent.objects.get_or_create(
        stripe_event_id=event["id"],
        defaults={
            "event_type": event_type,
            "processed": False,
            "payload": event["data"],
        },
    )

    if not created:
        logger.info("Stripe webhook: duplicate event %s, skipping", event["id"])
        return Response({"detail": "Already processed."}, status=status.HTTP_200_OK)

    logger.info("Stripe webhook received: %s (%s)", event_type, event["id"])

    # ── Handle specific event types ──
    # Wrap handler + processed flag update in a transaction so partial
    # writes (e.g. donation created but Gift Aid linking fails) are rolled back.
    try:
        with transaction.atomic():
            if event_type == "checkout.session.completed":
                _handle_checkout_completed(data_object)
            elif event_type == "invoice.payment_succeeded":
                _handle_invoice_payment_succeeded(data_object)
            elif event_type == "invoice.payment_failed":
                _handle_invoice_payment_failed(data_object)
            elif event_type == "customer.subscription.created":
                _handle_subscription_created(data_object)
            elif event_type == "customer.subscription.deleted":
                _handle_subscription_deleted(data_object)
            elif event_type == "payment_intent.succeeded":
                _handle_payment_intent_succeeded(data_object)
            elif event_type == "charge.refunded":
                _handle_charge_refunded(data_object)
            else:
                logger.info("Stripe webhook: unhandled event type %s", event_type)

            # Mark as successfully processed (inside transaction so it only
            # commits if the handler succeeded)
            stripe_event.processed = True
            stripe_event.save(update_fields=["processed"])
    except Exception:
        logger.exception("Stripe webhook: failed to process event %s", event["id"])
        # Event is recorded but not marked as processed — safe to retry
        return Response(
            {"detail": "Processing failed."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({"detail": "Webhook processed."}, status=status.HTTP_200_OK)


def _handle_checkout_completed(session):
    """Handle checkout.session.completed — create a Donation record.

    If Gift Aid was opted in, also create or link a GiftAidDeclaration.
    """
    from datetime import date

    from core.models import Donation, GiftAidDeclaration

    customer_email = session.get("customer_email") or session.get("customer_details", {}).get("email", "")
    amount_total = session.get("amount_total", 0)
    currency = session.get("currency", "gbp")
    metadata = session.get("metadata") or {}
    customer_details = session.get("customer_details") or {}
    address = customer_details.get("address") or {}

    logger.info(
        "Checkout completed: %s %s %s (email: %s)",
        amount_total, currency, session.get("id"), customer_email,
    )

    frequency = metadata.get("frequency", "one-time")
    wants_gift_aid = metadata.get("gift_aid") == "yes"

    # Use the original donation amount (before fee surcharge) for the record.
    # Gift Aid must be calculated on the actual gift, not the gross charge.
    donation_amount_str = metadata.get("donation_amount")
    if donation_amount_str:
        try:
            donation_amount_pence = int(donation_amount_str)
        except (ValueError, TypeError):
            donation_amount_pence = amount_total
    else:
        donation_amount_pence = amount_total

    donation = Donation.objects.create(
        stripe_checkout_session_id=session.get("id", ""),
        stripe_payment_intent_id=session.get("payment_intent") or "",
        stripe_customer_id=session.get("customer") or "",
        donor_name=customer_details.get("name", ""),
        donor_email=customer_email,
        donor_address_line1=address.get("line1", ""),
        donor_address_line2=address.get("line2", ""),
        donor_city=address.get("city", ""),
        donor_postcode=address.get("postal_code", ""),
        donor_country=address.get("country", "GB"),
        amount_pence=donation_amount_pence,
        currency=currency,
        frequency=Donation.Frequency.MONTHLY if frequency == "monthly" else Donation.Frequency.ONE_TIME,
        source=Donation.Source.STRIPE,
        gift_aid_eligible=wants_gift_aid,
        donation_date=date.today(),
    )

    # Auto-create or link Gift Aid declaration
    if wants_gift_aid and customer_email:
        _link_gift_aid_declaration(donation)
    elif wants_gift_aid and not customer_email:
        logger.warning(
            "Gift Aid opted in but no email on checkout %s — cannot create declaration",
            session.get("id"),
        )

    # Send donation receipt email
    from core.email import send_donation_receipt_email
    send_donation_receipt_email(donation)


def _link_gift_aid_declaration(donation):
    """Find or create a GiftAidDeclaration for this donor and link it."""
    from datetime import date

    from django.db import IntegrityError as DjangoIntegrityError
    from django.db.models import Max

    from core.models import GiftAidDeclaration

    # Try to match by Stripe customer ID first, then email
    declaration = None
    if donation.stripe_customer_id:
        declaration = GiftAidDeclaration.objects.filter(
            stripe_customer_id=donation.stripe_customer_id,
            status=GiftAidDeclaration.Status.ACTIVE,
        ).first()

    if not declaration and donation.donor_email:
        declaration = GiftAidDeclaration.objects.filter(
            donor_email=donation.donor_email,
            status=GiftAidDeclaration.Status.ACTIVE,
        ).first()

    if not declaration:
        # Generate next charity reference with retry on unique constraint violation.
        # select_for_update locks scanned rows, but when the table is empty no rows
        # are locked — two concurrent transactions can both generate the same ref.
        # Retry once on IntegrityError to handle this race.
        for attempt in range(2):
            max_ref = (
                GiftAidDeclaration.objects
                .select_for_update()
                .aggregate(max_ref=Max("charity_reference"))
            )["max_ref"]
            if max_ref and max_ref.startswith("GA-"):
                try:
                    seq = int(max_ref.split("-")[1]) + 1
                except (ValueError, IndexError):
                    seq = 1
            else:
                seq = 1
            ref = f"GA-{seq:06d}"

            try:
                declaration = GiftAidDeclaration.objects.create(
                    donor_name=donation.donor_name,
                    donor_email=donation.donor_email,
                    donor_address_line1=donation.donor_address_line1,
                    donor_address_line2=donation.donor_address_line2,
                    donor_city=donation.donor_city,
                    donor_postcode=donation.donor_postcode,
                    donor_country=donation.donor_country,
                    stripe_customer_id=donation.stripe_customer_id,
                    declaration_date=date.today(),
                    charity_reference=ref,
                )
                logger.info("Gift Aid declaration created: %s for %s", ref, donation.donor_email)
                break
            except DjangoIntegrityError:
                if attempt == 0:
                    logger.warning("Gift Aid ref %s conflict, retrying", ref)
                    continue
                raise

    donation.gift_aid_declaration = declaration
    donation.save(update_fields=["gift_aid_declaration", "updated"])


def _handle_invoice_payment_succeeded(invoice):
    """Handle invoice.payment_succeeded — a recurring payment went through."""
    from datetime import date

    from core.models import Donation

    customer_email = invoice.get("customer_email", "")
    amount_paid = invoice.get("amount_paid", 0)
    logger.info(
        "Invoice payment succeeded: %s pence (email: %s, invoice: %s)",
        amount_paid, customer_email, invoice.get("id"),
    )

    # Check if a donation already exists for this invoice (avoid duplicates)
    invoice_id = invoice.get("id", "")
    if invoice_id and Donation.objects.filter(stripe_payment_intent_id=invoice_id).exists():
        return

    # Try to find Gift Aid status from the subscription metadata
    subscription_id = invoice.get("subscription")
    metadata = invoice.get("metadata") or {}
    wants_gift_aid = metadata.get("gift_aid") == "yes"

    billing_address = invoice.get("customer_address") or {}

    donation = Donation.objects.create(
        stripe_payment_intent_id=invoice_id,
        stripe_customer_id=invoice.get("customer") or "",
        donor_name=invoice.get("customer_name", ""),
        donor_email=customer_email,
        donor_address_line1=billing_address.get("line1", ""),
        donor_address_line2=billing_address.get("line2", ""),
        donor_city=billing_address.get("city", ""),
        donor_postcode=billing_address.get("postal_code", ""),
        donor_country=billing_address.get("country", "GB"),
        amount_pence=amount_paid,
        currency=invoice.get("currency", "gbp"),
        frequency=Donation.Frequency.MONTHLY,
        source=Donation.Source.STRIPE,
        gift_aid_eligible=wants_gift_aid,
        donation_date=date.today(),
    )

    if wants_gift_aid and customer_email:
        _link_gift_aid_declaration(donation)

    # Send donation receipt email for recurring payment
    from core.email import send_donation_receipt_email
    send_donation_receipt_email(donation)


def _handle_invoice_payment_failed(invoice):
    """Handle invoice.payment_failed — a recurring payment failed."""
    customer_email = invoice.get("customer_email", "")
    logger.warning(
        "Invoice payment failed: email=%s, invoice=%s, attempt=%s",
        customer_email, invoice.get("id"), invoice.get("attempt_count"),
    )


def _handle_subscription_created(subscription):
    """Handle customer.subscription.created — a new subscription started."""
    logger.info(
        "Subscription created: %s (customer: %s, status: %s)",
        subscription.get("id"), subscription.get("customer"), subscription.get("status"),
    )


def _handle_subscription_deleted(subscription):
    """Handle customer.subscription.deleted — a subscription was cancelled."""
    logger.info(
        "Subscription deleted: %s (customer: %s)",
        subscription.get("id"), subscription.get("customer"),
    )


def _handle_payment_intent_succeeded(payment_intent):
    """Handle payment_intent.succeeded — a one-time payment completed.

    Note: For checkout-originated payments, the Donation record is already
    created by _handle_checkout_completed. This handler catches standalone
    PaymentIntents (e.g. from the API directly).
    """
    from core.models import Donation

    pi_id = payment_intent.get("id", "")
    if pi_id and Donation.objects.filter(stripe_payment_intent_id=pi_id).exists():
        return  # Already recorded via checkout.session.completed

    metadata = payment_intent.get("metadata", {})
    logger.info(
        "PaymentIntent succeeded: %s %s (frequency: %s, email: %s)",
        payment_intent.get("amount"), payment_intent.get("currency"),
        metadata.get("frequency", "unknown"), metadata.get("donor_email", "unknown"),
    )


def _handle_charge_refunded(charge):
    """Handle charge.refunded — mark donation as refunded so it's excluded from Gift Aid claims."""
    from core.models import Donation

    payment_intent_id = charge.get("payment_intent", "")
    if not payment_intent_id:
        logger.warning("charge.refunded: no payment_intent in charge %s", charge.get("id"))
        return

    donations = Donation.objects.filter(stripe_payment_intent_id=payment_intent_id)
    updated = donations.update(gift_aid_eligible=False, gift_aid_amount_pence=0)
    if updated:
        logger.info(
            "charge.refunded: marked %d donation(s) as ineligible for Gift Aid (pi: %s)",
            updated, payment_intent_id,
        )
    else:
        logger.warning(
            "charge.refunded: no matching donation for payment_intent %s",
            payment_intent_id,
        )


# ── Gift Aid Summary (admin-only) ────────────────────────────────────


@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])
def gift_aid_summary(request):
    """Return a summary of Gift Aid declarations, donations, and reclaimable totals.

    Admin-only endpoint for the dashboard/reporting.
    """
    from django.db.models import Count, Sum

    from core.models import Donation, GiftAidClaim, GiftAidDeclaration

    declarations = GiftAidDeclaration.objects.filter(status=GiftAidDeclaration.Status.ACTIVE)
    donations_ga = Donation.objects.filter(gift_aid_eligible=True)
    donations_all = Donation.objects.all()

    agg_all = donations_all.aggregate(
        total_pence=Sum("amount_pence"),
        count=Count("id"),
    )
    agg_ga = donations_ga.aggregate(
        total_pence=Sum("amount_pence"),
        gift_aid_pence=Sum("gift_aid_amount_pence"),
        count=Count("id"),
    )

    # Unclaimed = Gift Aid eligible donations NOT in any submitted/accepted claim
    claimed_ids = GiftAidClaim.objects.filter(
        status__in=[GiftAidClaim.Status.SUBMITTED, GiftAidClaim.Status.ACCEPTED],
    ).values_list("donations__id", flat=True)
    unclaimed = donations_ga.exclude(id__in=claimed_ids)
    unclaimed_agg = unclaimed.aggregate(
        total_pence=Sum("amount_pence"),
        gift_aid_pence=Sum("gift_aid_amount_pence"),
        count=Count("id"),
    )

    return Response({
        "total_donations": {
            "count": agg_all["count"] or 0,
            "total_pounds": f"{(agg_all['total_pence'] or 0) / 100:.2f}",
        },
        "gift_aid_donations": {
            "count": agg_ga["count"] or 0,
            "total_pounds": f"{(agg_ga['total_pence'] or 0) / 100:.2f}",
            "reclaimable_pounds": f"{(agg_ga['gift_aid_pence'] or 0) / 100:.2f}",
        },
        "unclaimed_gift_aid": {
            "count": unclaimed_agg["count"] or 0,
            "total_pounds": f"{(unclaimed_agg['total_pence'] or 0) / 100:.2f}",
            "reclaimable_pounds": f"{(unclaimed_agg['gift_aid_pence'] or 0) / 100:.2f}",
        },
        "active_declarations": declarations.count(),
    })


# ── Prayer Times ─────────────────────────────────────────────────────


class MosquePrayerTimeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Jama'ah times for a mosque, scraped from their published timetables.
    Nested under /mosques/{mosque_pk}/prayer-times/

    GET params:
      ?date=YYYY-MM-DD          — single day
      ?from_date=YYYY-MM-DD     — range start (inclusive)
      ?to_date=YYYY-MM-DD       — range end (inclusive)
    """

    serializer_class = MosquePrayerTimeSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        mosque_pk = self.kwargs.get("mosque_pk")
        qs = MosquePrayerTime.objects.filter(mosque_id=mosque_pk)

        # Single date filter
        single_date = self.request.query_params.get("date")
        if single_date:
            parsed = parse_date(single_date)
            if parsed:
                return qs.filter(date=parsed)
            # Invalid date format — return empty rather than all times
            return qs.none()

        # Date range filter
        from_date = self.request.query_params.get("from_date")
        to_date = self.request.query_params.get("to_date")
        if from_date:
            parsed = parse_date(from_date)
            if parsed:
                qs = qs.filter(date__gte=parsed)
        if to_date:
            parsed = parse_date(to_date)
            if parsed:
                qs = qs.filter(date__lte=parsed)

        return qs.order_by("date")


# ── Helpers ──────────────────────────────────────────────────────────


def _parse_uuid_list(raw: str) -> list[str]:
    """Parse and validate a comma-separated list of UUIDs. Skip invalid entries."""
    valid = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            uuid_mod.UUID(part)
            valid.append(part)
        except ValueError:
            continue
    return valid


def _inject_distances(serialized_data: list[dict], queryset) -> list[dict]:
    """Add the annotated distance value into each serialized mosque dict."""
    for item, obj in zip(serialized_data, queryset):
        item["distance"] = round(obj.distance, 2)
    return serialized_data


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Mixlr Live Status ──────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def mixlr_status(request):
    """Return the current Mixlr live broadcast status.

    Public endpoint — no authentication required. Returns the cached
    status from the database (updated by the poll_mixlr management
    command running on a 30-second cron).

    Falls back to a default "offline" response if no MixlrStatus
    record exists yet.
    """
    status_obj = MixlrStatus.objects.first()
    if status_obj is None:
        return Response(
            {
                "is_live": False,
                "broadcast_title": "",
                "channel_name": "",
                "channel_logo_url": "",
                "channel_slug": "",
                "embed_url": "",
                "channel_url": "",
                "last_live_at": None,
                "last_checked": None,
            }
        )
    serializer = MixlrStatusSerializer(status_obj)
    return Response(serializer.data)
