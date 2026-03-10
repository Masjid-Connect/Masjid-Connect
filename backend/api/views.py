"""API views for Masjid Connect."""

import logging
import math
import os
import uuid

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

logger = logging.getLogger(__name__)

from core.models import (
    Announcement,
    Event,
    Mosque,
    PushToken,
    UserSubscription,
)

from .serializers import (
    AnnouncementSerializer,
    EventSerializer,
    MosqueListSerializer,
    MosqueSerializer,
    PushTokenSerializer,
    RegisterSerializer,
    UserSerializer,
    UserSubscriptionSerializer,
)

User = get_user_model()


# ── Auth ──────────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
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
def logout(request):
    """Delete the user's auth token."""
    if hasattr(request.user, "auth_token"):
        request.user.auth_token.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def me(request):
    """Return current authenticated user."""
    return Response(UserSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def social_login(request):
    """
    Authenticate via Apple or Google identity token.
    Creates user on first login. Returns auth token.

    Body: { provider: "apple"|"google", identity_token: "...", name?: "..." }
    """
    provider = request.data.get("provider")
    identity_token = request.data.get("identity_token")
    name = request.data.get("name", "")

    if not provider or not identity_token:
        return Response(
            {"detail": "provider and identity_token are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if provider not in ("apple", "google"):
        return Response(
            {"detail": "provider must be 'apple' or 'google'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        if provider == "google":
            email, social_name = _verify_google_token(identity_token)
        else:
            email, social_name = _verify_apple_token(identity_token)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

    # Use name from provider if client didn't send one
    display_name = name or social_name or ""

    # Find or create user by email
    try:
        user = User.objects.get(email=email)
        if display_name and not user.name:
            user.name = display_name
            user.save(update_fields=["name"])
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=email,
            email=email,
            password=None,  # No password for social users
            name=display_name,
        )

    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {"token": token.key, "user": UserSerializer(user).data},
        status=status.HTTP_200_OK,
    )


def _verify_google_token(identity_token: str) -> tuple[str, str]:
    """Verify a Google ID token and return (email, name)."""
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        idinfo = google_id_token.verify_oauth2_token(
            identity_token, google_requests.Request()
        )
        email = idinfo.get("email")
        if not email:
            raise ValueError("Google token missing email claim.")
        return email, idinfo.get("name", "")
    except ImportError:
        raise ValueError("Google auth library not installed on server.")
    except Exception as e:
        logger.warning("Google token verification failed: %s", e)
        raise ValueError("Invalid Google identity token.")


def _verify_apple_token(identity_token: str) -> tuple[str, str]:
    """Verify an Apple identity token (JWT) and return (email, name)."""
    try:
        import jwt
        import requests as http_requests

        # Fetch Apple's public keys
        apple_keys_url = "https://appleid.apple.com/auth/keys"
        resp = http_requests.get(apple_keys_url, timeout=10)
        resp.raise_for_status()
        apple_keys = resp.json()

        # Decode header to find the right key
        header = jwt.get_unverified_header(identity_token)
        key = None
        for k in apple_keys["keys"]:
            if k["kid"] == header["kid"]:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(k)
                break

        if key is None:
            raise ValueError("Apple public key not found.")

        payload = jwt.decode(
            identity_token,
            key,
            algorithms=["RS256"],
            audience=os.environ.get("APPLE_BUNDLE_ID", "app.salafimasjid.mobile"),
            issuer="https://appleid.apple.com",
        )
        email = payload.get("email")
        if not email:
            raise ValueError("Apple token missing email claim.")
        return email, ""
    except ImportError:
        raise ValueError("PyJWT library not installed on server.")
    except jwt.ExpiredSignatureError:
        raise ValueError("Apple identity token has expired.")
    except Exception as e:
        logger.warning("Apple token verification failed: %s", e)
        raise ValueError("Invalid Apple identity token.")


# ── Mosques ───────────────────────────────────────────────────────────


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
        """Return mosques within `radius` km of `lat`/`lng` (haversine, client-side for MVP)."""
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
        return Response(results)


# ── Announcements ─────────────────────────────────────────────────────


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    Announcements for subscribed mosques.
    GET params: ?mosque_ids=uuid1,uuid2 (comma-separated)
    """

    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

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
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


def models_q_expires_or_null(now):
    """Return Q for expires_at IS NULL OR expires_at > now."""
    from django.db.models import Q

    return Q(expires_at__isnull=True) | Q(expires_at__gt=now)


# ── Events ────────────────────────────────────────────────────────────


class EventViewSet(viewsets.ModelViewSet):
    """
    Events for subscribed mosques.
    GET params: ?mosque_ids=uuid1,uuid2&from_date=YYYY-MM-DD&category=lesson
    """

    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Event.objects.select_related("mosque", "author")
        mosque_ids = self.request.query_params.get("mosque_ids")
        if mosque_ids:
            ids = [mid.strip() for mid in mosque_ids.split(",") if mid.strip()]
            qs = qs.filter(mosque_id__in=ids)

        from_date = self.request.query_params.get("from_date")
        if from_date:
            qs = qs.filter(event_date__gte=from_date)

        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# ── Subscriptions ─────────────────────────────────────────────────────


class UserSubscriptionViewSet(viewsets.ModelViewSet):
    """Manage the authenticated user's mosque subscriptions."""

    serializer_class = UserSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSubscription.objects.filter(user=self.request.user).select_related("mosque")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ── Push Tokens ───────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_push_token(request):
    """Register or update a push token. Works for both authenticated and anonymous users."""
    token_str = request.data.get("token")
    platform = request.data.get("platform")
    if not token_str or not platform:
        return Response(
            {"detail": "token and platform are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user if request.user.is_authenticated else None

    # Use token as the unique key — update user/platform if token already exists
    push_token, created = PushToken.objects.update_or_create(
        token=token_str,
        defaults={"user": user, "platform": platform},
    )
    return Response(
        PushTokenSerializer(push_token).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


# ── Helpers ───────────────────────────────────────────────────────────


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
