"""API views — designed to match the PocketBase client calls in lib/pocketbase.ts."""

import math

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

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
def logout(request):
    """Delete the user's auth token."""
    if hasattr(request.user, "auth_token"):
        request.user.auth_token.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def me(request):
    """Return current authenticated user."""
    return Response(UserSerializer(request.user).data)


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
