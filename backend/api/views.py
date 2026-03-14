"""API views for Masjid Connect."""

import logging
import math

import jwt
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

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
    """Authenticate and return token. Accepts email (primary) or username as fallback."""
    email = request.data.get("email", "")
    password = request.data.get("password", "")
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Fallback: try username for legacy superusers created via createsuperuser
        try:
            user = User.objects.get(username=email)
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

    # Find or create user
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
            audience=["com.masjidconnect.app"],
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
    """Verify Google ID token via Google's tokeninfo endpoint."""
    try:
        resp = requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}",
            timeout=10,
        )
        if resp.status_code != 200:
            raise ValueError("Invalid Google token.")

        payload = resp.json()
        email = payload.get("email", "")
        name = payload.get("name", "")

        if not email:
            raise ValueError("No email in Google token.")
        if not payload.get("email_verified"):
            raise ValueError("Google email not verified.")

        return email, name
    except requests.RequestException as e:
        logger.warning("Google token verification failed: %s", e)
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

    @action(detail=False, methods=["get"])
    def nearby(self, request):
        """Return mosques within `radius` km of `lat`/`lng` (haversine)."""
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
        except (KeyError, ValueError):
            return Response(
                {"detail": "lat and lng query params are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        radius = float(request.query_params.get("radius", 50))

        results = []
        for m in Mosque.objects.all():
            d = _haversine_km(lat, lng, m.latitude, m.longitude)
            if d <= radius:
                data = MosqueListSerializer(m).data
                data["distance"] = round(d, 2)
                results.append(data)

        results.sort(key=lambda x: x["distance"])

        # Paginate the nearby results consistently with other list endpoints
        page = self.paginate_queryset(results)
        if page is not None:
            return self.get_paginated_response(page)
        return Response(results)


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
            ids = [mid.strip() for mid in mosque_ids.split(",") if mid.strip()]
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
            ids = [mid.strip() for mid in mosque_ids.split(",") if mid.strip()]
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


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
