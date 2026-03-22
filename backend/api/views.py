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

    # Rotate token on each login to limit token lifetime
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)
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

    # Rotate token on each social login to limit token lifetime
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)
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
        apple_bundle_id = os.environ.get("APPLE_BUNDLE_ID", "")
        if not apple_bundle_id:
            raise ValueError(
                "Apple login is not configured. "
                "Set APPLE_BUNDLE_ID in environment variables."
            )
        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=[apple_bundle_id],
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

        if not audiences:
            raise ValueError(
                "Google login is not configured. "
                "Set GOOGLE_CLIENT_ID in environment variables."
            )

        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=audiences,
            issuer=["accounts.google.com", "https://accounts.google.com"],
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
@permission_classes([permissions.AllowAny])
@throttle_classes([AuthRateThrottle])
def google_code_exchange(request):
    """
    Exchange a Google authorization code (with PKCE) for user authentication.
    Expects: { "code": "<auth_code>", "code_verifier": "<pkce_verifier>", "redirect_uri": "<uri>" }
    Exchanges code with Google for an id_token, verifies it, creates user if needed.
    """
    code = request.data.get("code")
    code_verifier = request.data.get("code_verifier")
    redirect_uri = request.data.get("redirect_uri")

    if not code or not code_verifier or not redirect_uri:
        return Response(
            {"detail": "code, code_verifier, and redirect_uri are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    google_client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    if not google_client_id:
        return Response(
            {"detail": "Google login is not configured."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Exchange authorization code for tokens with Google
    try:
        token_resp = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": google_client_id,
                "code_verifier": code_verifier,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=15,
        )
        token_resp.raise_for_status()
        token_data = token_resp.json()
    except requests.RequestException as e:
        logger.warning("Google token exchange failed: %s", e)
        return Response(
            {"detail": "Failed to exchange code with Google."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    id_token_str = token_data.get("id_token")
    if not id_token_str:
        return Response(
            {"detail": "No id_token returned from Google."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Verify the id_token and extract user info (reuses existing logic)
    try:
        email, social_name = _verify_google_token(id_token_str)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

    display_name = social_name or email.split("@")[0]

    with transaction.atomic():
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "name": display_name,
            },
        )
        if created:
            user.set_unusable_password()
            user.save()

    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)
    return Response(
        {"token": token.key, "user": UserSerializer(user).data},
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


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

    is_embedded = ui_mode == "embedded"

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
        return _error("Invalid amount.", for_redirect=not is_embedded)

    if amount < 100 or amount > 1000000:
        return _error("Amount must be between £1 and £10,000.", for_redirect=not is_embedded)

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
            "source": "website",
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
            return Response(
                {
                    "client_secret": session.client_secret,
                    "publishable_key": publishable_key,
                },
                status=status.HTTP_200_OK,
            )
        else:
            # 303 See Other — browser converts POST to GET for Stripe's hosted page
            return _redirect_303(session.url)
    except Exception:
        logger.exception("Stripe Checkout Session creation failed")
        return _error("Something went wrong. Please try again.", for_redirect=not is_embedded)



@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@throttle_classes([DonationRateThrottle])
def checkout_session_status(request):
    """
    Return the status of a Stripe Checkout Session created for embedded checkout.

    Query params:
      - session_id: Stripe checkout session ID.

    Returns minimal, non-sensitive status information for the web donate page.
    """
    import stripe as stripe_lib

    session_id = request.query_params.get("session_id")
    if not session_id:
        return Response(
            {"detail": "session_id is required."},
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

    return Response(
        {
            "id": session.id,
            "status": session.status,
            "mode": session.mode,
            "amount_total": session.amount_total,
            "currency": session.currency,
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

    # Idempotency: skip already-processed events
    if StripeEvent.objects.filter(stripe_event_id=event["id"]).exists():
        logger.info("Stripe webhook: duplicate event %s, skipping", event["id"])
        return Response({"detail": "Already processed."}, status=status.HTTP_200_OK)

    event_type = event["type"]
    data_object = event["data"]["object"]

    logger.info("Stripe webhook received: %s (%s)", event_type, event["id"])

    # ── Handle specific event types ──
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
    else:
        logger.info("Stripe webhook: unhandled event type %s", event_type)

    # Record the event
    StripeEvent.objects.create(
        stripe_event_id=event["id"],
        event_type=event_type,
        processed=True,
        payload=event["data"],
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
        amount_pence=amount_total,
        currency=currency,
        frequency=Donation.Frequency.MONTHLY if frequency == "monthly" else Donation.Frequency.ONE_TIME,
        source=Donation.Source.STRIPE,
        gift_aid_eligible=wants_gift_aid,
        donation_date=date.today(),
    )

    # Auto-create or link Gift Aid declaration
    if wants_gift_aid and customer_email:
        _link_gift_aid_declaration(donation)


def _link_gift_aid_declaration(donation):
    """Find or create a GiftAidDeclaration for this donor and link it."""
    from datetime import date

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
        # Generate next charity reference
        last = GiftAidDeclaration.objects.order_by("-charity_reference").first()
        if last and last.charity_reference.startswith("GA-"):
            try:
                seq = int(last.charity_reference.split("-")[1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        ref = f"GA-{seq:06d}"

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
