"""API views for Masjid Connect."""

import logging
import math
import os
import uuid as uuid_mod

import jwt
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
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
    Event,
    Feedback,
    Mosque,
    MosqueAdmin,
    MosquePrayerTime,
    PushToken,
    UserSubscription,
)

from .serializers import (
    AnnouncementSerializer,
    EventSerializer,
    FeedbackCreateSerializer,
    FeedbackSerializer,
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
    user = serializer.save()
    token, _ = Token.objects.get_or_create(user=user)
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
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.check_password(password):
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": UserSerializer(user).data})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AuthRateThrottle])
def social_login(request):
    """
    Authenticate via Apple or Google.
    Expects: { "provider": "apple"|"google", "token": "<id_token>", "name": "optional" }
    Creates user if first login, returns auth token.
    """
    provider = request.data.get("provider")
    id_token = request.data.get("token")
    name = request.data.get("name", "")

    if not provider or not id_token:
        return Response(
            {"detail": "provider and token are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if provider not in ("apple", "google"):
        return Response(
            {"detail": "provider must be 'apple' or 'google'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        if provider == "apple":
            email, social_name = _verify_apple_token(id_token)
        else:
            email, social_name = _verify_google_token(id_token)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

    # Use provided name, then social provider name, then email prefix
    display_name = name or social_name or email.split("@")[0]

    # Find or create user (atomic to prevent race conditions)
    with transaction.atomic():
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "name": display_name,
            },
        )

        if created:
            # Set unusable password for social-only accounts
            user.set_unusable_password()
            user.save()

    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {"token": token.key, "user": UserSerializer(user).data},
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


def _verify_apple_token(id_token: str) -> tuple[str, str]:
    """Verify Apple identity token and extract email + name."""
    try:
        # Decode without verification first to get the header
        header = jwt.get_unverified_header(id_token)
        kid = header.get("kid")

        # Fetch Apple's public keys
        resp = requests.get("https://appleid.apple.com/auth/keys", timeout=10)
        resp.raise_for_status()
        apple_keys = resp.json()["keys"]

        # Find the matching key
        key_data = next((k for k in apple_keys if k["kid"] == kid), None)
        if not key_data:
            raise ValueError("Apple key not found.")

        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=[os.environ.get("APPLE_BUNDLE_ID", "app.salafimasjid")],
            issuer="https://appleid.apple.com",
        )

        email = payload.get("email", "")
        if not email:
            raise ValueError("No email in Apple token.")
        return email, ""
    except jwt.PyJWTError as e:
        logger.warning("Apple token verification failed: %s", e)
        raise ValueError("Invalid Apple token.") from e


def _verify_google_token(id_token: str) -> tuple[str, str]:
    """Verify Google ID token using Google's public keys (JWT verification)."""
    try:
        # Decode header to get key ID
        header = jwt.get_unverified_header(id_token)
        kid = header.get("kid")

        # Fetch Google's public keys
        resp = requests.get("https://www.googleapis.com/oauth2/v3/certs", timeout=10)
        resp.raise_for_status()
        google_keys = resp.json()["keys"]

        # Find matching key
        key_data = next((k for k in google_keys if k["kid"] == kid), None)
        if not key_data:
            raise ValueError("Google key not found.")

        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
        google_client_id = os.environ.get("GOOGLE_CLIENT_ID", "")

        # Build audience list — accept both web and iOS client IDs if configured
        audiences = [a for a in [
            google_client_id,
            os.environ.get("GOOGLE_IOS_CLIENT_ID", ""),
        ] if a]

        decode_options = {}
        if not audiences:
            # No client IDs configured — skip audience verification (dev only)
            decode_options["verify_aud"] = False

        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=audiences if audiences else None,
            issuer=["accounts.google.com", "https://accounts.google.com"],
            options=decode_options,
        )

        email = payload.get("email", "")
        name = payload.get("name", "")

        if not email:
            raise ValueError("No email in Google token.")
        if not payload.get("email_verified"):
            raise ValueError("Google email not verified.")

        return email, name
    except jwt.PyJWTError as e:
        logger.warning("Google token verification failed: %s", e)
        raise ValueError("Invalid Google token.") from e
    except requests.RequestException as e:
        logger.warning("Google key fetch failed: %s", e)
        raise ValueError("Could not verify Google token.") from e


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
def export_user_data(request):
    """GDPR-compliant data export — return all data associated with the authenticated user."""
    user = request.user

    profile = UserSerializer(user).data
    user_subscriptions = UserSubscription.objects.filter(user=user).select_related("mosque")
    user_push_tokens = PushToken.objects.filter(user=user)
    user_announcements = Announcement.objects.filter(author=user).select_related("mosque")
    user_events = Event.objects.filter(author=user).select_related("mosque")
    user_admin_roles = MosqueAdmin.objects.filter(user=user).select_related("mosque")

    return Response({
        "profile": profile,
        "subscriptions": UserSubscriptionSerializer(user_subscriptions, many=True).data,
        "push_tokens": PushTokenSerializer(user_push_tokens, many=True).data,
        "announcements": AnnouncementSerializer(user_announcements, many=True).data,
        "events": EventSerializer(user_events, many=True).data,
        "admin_roles": MosqueAdminSerializer(user_admin_roles, many=True).data,
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

    with transaction.atomic():
        # Delete auth token
        if hasattr(user, "auth_token"):
            user.auth_token.delete()
        # Cascade deletes: subscriptions, push_tokens, mosque_roles
        # Orphan authored content (SET_NULL on announcements/events)
        user.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


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
        radius = float(request.query_params.get("radius", 50))

        # Haversine formula executed at the DB level (works with SQLite and PostgreSQL)
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


class UserSubscriptionViewSet(viewsets.ModelViewSet):
    """Manage the authenticated user's mosque subscriptions."""

    serializer_class = UserSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSubscription.objects.filter(user=self.request.user).select_related("mosque")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ── Push Tokens ──────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def register_push_token(request):
    """Register or update a push token for the authenticated user."""
    token_str = request.data.get("token")
    platform = request.data.get("platform")
    if not token_str or not platform:
        return Response(
            {"detail": "token and platform are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    push_token, created = PushToken.objects.update_or_create(
        user=request.user,
        token=token_str,
        defaults={"platform": platform},
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
            return Feedback.objects.filter(user=self.request.user)
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

    scope = "contact"  # reuse same rate

    def allow_request(self, request, view):
        if getattr(settings, "TESTING", False):
            return True
        return super().allow_request(request, view)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([DonationRateThrottle])
def create_donation(request):
    """Create a Stripe PaymentIntent for a donation."""
    import stripe as stripe_lib

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
    email = request.data.get("email", "")

    # Validate amount (100p = £1 minimum, £10000 max)
    try:
        amount = int(amount)
    except (TypeError, ValueError):
        return Response(
            {"detail": "Invalid amount."}, status=status.HTTP_400_BAD_REQUEST
        )

    if amount < 100 or amount > 1000000:
        return Response(
            {"detail": "Amount must be between £1 and £10,000."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        metadata = {"frequency": frequency, "source": "website"}
        if email:
            metadata["donor_email"] = email

        intent = stripe_lib.PaymentIntent.create(
            amount=amount,
            currency=currency,
            metadata=metadata,
            description=f"Donation to The Salafi Masjid ({frequency})",
            receipt_email=email if email else None,
        )

        return Response(
            {"client_secret": intent.client_secret},
            status=status.HTTP_200_OK,
        )
    except Exception:
        logger.exception("Stripe PaymentIntent creation failed")
        return Response(
            {"detail": "Failed to process donation. Please try again."},
            status=status.HTTP_502_BAD_GATEWAY,
        )


# ── Helpers ──────────────────────────────────────────────────────────


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
