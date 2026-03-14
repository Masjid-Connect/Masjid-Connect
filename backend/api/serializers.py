"""DRF serializers — shaped to match existing React Native types."""

from django.contrib.auth import get_user_model
from rest_framework import serializers

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

User = get_user_model()


# ── Auth ──────────────────────────────────────────────────────────────


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(max_length=255)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        email = validated_data["email"]
        user = User.objects.create_user(
            username=email,  # username required by AbstractUser but email is the login field
            email=email,
            password=validated_data["password"],
            name=validated_data["name"],
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "date_joined"]
        read_only_fields = fields


# ── Mosque ────────────────────────────────────────────────────────────


class MosqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mosque
        fields = [
            "id",
            "name",
            "address",
            "city",
            "state",
            "country",
            "latitude",
            "longitude",
            "calculation_method",
            "jumua_time",
            "contact_phone",
            "contact_email",
            "website",
            "photo",
            "created",
            "updated",
        ]


class MosqueListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views."""

    class Meta:
        model = Mosque
        fields = ["id", "name", "city", "country", "latitude", "longitude"]


# ── Announcement ──────────────────────────────────────────────────────


class AnnouncementSerializer(serializers.ModelSerializer):
    mosque_detail = MosqueListSerializer(source="mosque", read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id",
            "mosque",
            "mosque_detail",
            "title",
            "body",
            "priority",
            "published_at",
            "expires_at",
            "author",
        ]
        read_only_fields = ["id", "published_at", "author"]


# ── Event ─────────────────────────────────────────────────────────────


class EventSerializer(serializers.ModelSerializer):
    mosque_detail = MosqueListSerializer(source="mosque", read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "mosque",
            "mosque_detail",
            "title",
            "description",
            "speaker",
            "event_date",
            "start_time",
            "end_time",
            "location",
            "recurring",
            "category",
            "author",
            "created",
            "updated",
        ]
        read_only_fields = ["id", "author", "created", "updated"]


# ── Subscription ──────────────────────────────────────────────────────


class UserSubscriptionSerializer(serializers.ModelSerializer):
    mosque_detail = MosqueListSerializer(source="mosque", read_only=True)

    class Meta:
        model = UserSubscription
        fields = [
            "id",
            "user",
            "mosque",
            "mosque_detail",
            "notify_prayers",
            "notify_announcements",
            "notify_events",
            "prayer_reminder_minutes",
            "created",
        ]
        read_only_fields = ["id", "user", "created"]


# ── Push Token ────────────────────────────────────────────────────────


class PushTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushToken
        fields = ["id", "token", "platform", "created", "updated"]
        read_only_fields = ["id", "created", "updated"]


# ── Mosque Admin ──────────────────────────────────────────────────────


class MosqueAdminSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source="user", read_only=True)

    class Meta:
        model = MosqueAdmin
        fields = ["id", "mosque", "user", "user_detail", "role", "created"]
        read_only_fields = ["id", "created"]


# ── Prayer Times ─────────────────────────────────────────────────────


# ── Feedback ─────────────────────────────────────────────────────────


class FeedbackCreateSerializer(serializers.ModelSerializer):
    """Write-only serializer for submitting feedback."""

    class Meta:
        model = Feedback
        fields = ["type", "category", "description", "device_info"]


class FeedbackSerializer(serializers.ModelSerializer):
    """Read-only serializer for viewing submitted feedback."""

    class Meta:
        model = Feedback
        fields = [
            "id",
            "type",
            "category",
            "description",
            "status",
            "device_info",
            "created",
            "updated",
        ]
        read_only_fields = fields


# ── Prayer Times ─────────────────────────────────────────────────────


class MosquePrayerTimeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MosquePrayerTime
        fields = [
            "id",
            "mosque",
            "date",
            "fajr_jamat",
            "dhuhr_jamat",
            "asr_jamat",
            "maghrib_jamat",
            "isha_jamat",
            "fajr_start",
            "sunrise",
            "dhuhr_start",
            "asr_start",
            "isha_start",
        ]
