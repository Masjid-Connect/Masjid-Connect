"""DRF serializers — shaped to match existing React Native types."""

import re

from django.contrib.auth import get_user_model
from datetime import datetime, timedelta

from django.utils import timezone
from django.utils.html import strip_tags
from rest_framework import serializers

from core.models import (
    Announcement,
    Donation,
    Event,
    Feedback,
    GiftAidClaim,
    GiftAidDeclaration,
    MixlrStatus,
    Mosque,
    MosqueAdmin,
    MosquePrayerTime,
    PushToken,
    UserSubscription,
    VersionPolicy,
)

User = get_user_model()


# ── Auth ──────────────────────────────────────────────────────────────


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=10)
    name = serializers.CharField(max_length=255)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Unable to complete registration. Please try again.")
        return value

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        validate_password(value)
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

    def validate_title(self, value):
        return strip_tags(value).strip()

    def validate_body(self, value):
        return strip_tags(value).strip()

    def validate_expires_at(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError("Expiry date must be in the future.")
        return value


# ── Event ─────────────────────────────────────────────────────────────


class EventSerializer(serializers.ModelSerializer):
    mosque_detail = MosqueListSerializer(source="mosque", read_only=True)
    is_live_now = serializers.SerializerMethodField()
    poster_image = serializers.ImageField(read_only=True)

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
            "is_broadcast_live",
            "poster_image",
            "is_live_now",
            "author",
            "created",
            "updated",
        ]
        read_only_fields = [
            "id",
            "author",
            "created",
            "updated",
            "poster_image",
            "is_live_now",
        ]

    def validate_title(self, value):
        return strip_tags(value).strip()

    def validate_description(self, value):
        return strip_tags(value).strip()

    def validate_speaker(self, value):
        return strip_tags(value).strip()

    def validate(self, attrs):
        end_time = attrs.get("end_time") or (self.instance and self.instance.end_time)
        start_time = attrs.get("start_time") or (self.instance and self.instance.start_time)
        if end_time and start_time and end_time <= start_time:
            raise serializers.ValidationError(
                {"end_time": "End time must be after start time."}
            )
        return attrs

    # ── is_live_now ───────────────────────────────────────────────────
    #
    # Computed each request, never stored — there is no second source of
    # truth that can drift out of sync with `MixlrStatus.is_live` or
    # `Event.is_broadcast_live`. Formula:
    #
    #   is_live_now = event.is_broadcast_live
    #                 AND the mosque's MixlrStatus.is_live
    #                 AND now() ∈ [start_time - 5min, end_time + 15min]
    #
    # The 5-min head and 15-min tail tolerate a broadcaster who clicks
    # GO LIVE a few minutes early or runs over slightly. Events without
    # an end_time treat start_time + 90 min as the implicit end.
    #
    # If a Mosque has no MixlrStatus row (test fixture, freshly-seeded
    # DB), the value is False — never True without a confirmed live state.

    LIVE_WINDOW_HEAD = timedelta(minutes=5)
    LIVE_WINDOW_TAIL = timedelta(minutes=15)
    DEFAULT_EVENT_DURATION = timedelta(minutes=90)

    def get_is_live_now(self, event: Event) -> bool:
        if not event.is_broadcast_live:
            return False
        mixlr = getattr(event.mosque, "mixlr_status", None)
        if mixlr is None or not mixlr.is_live:
            return False

        start_dt = datetime.combine(event.event_date, event.start_time)
        end_time = event.end_time or (
            (start_dt + self.DEFAULT_EVENT_DURATION).time()
        )
        end_dt = datetime.combine(event.event_date, end_time)
        if end_dt <= start_dt:
            # End-time clipped to next day (rare; treat duration as default).
            end_dt = start_dt + self.DEFAULT_EVENT_DURATION

        current = timezone.localtime().replace(tzinfo=None)
        return (
            (start_dt - self.LIVE_WINDOW_HEAD)
            <= current
            <= (end_dt + self.LIVE_WINDOW_TAIL)
        )


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

    def validate(self, attrs):
        request = self.context.get("request")
        if request and not self.instance:
            mosque = attrs.get("mosque")
            if mosque and UserSubscription.objects.filter(
                user=request.user, mosque=mosque
            ).exists():
                raise serializers.ValidationError(
                    "You are already subscribed to this mosque."
                )
        return attrs


# ── Push Token ────────────────────────────────────────────────────────


class PushTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushToken
        fields = ["id", "token", "platform", "created", "updated"]
        read_only_fields = ["id", "created", "updated"]

    def validate_token(self, value: str) -> str:
        if not re.match(r'^ExponentPushToken\[.+\]$', value):
            raise serializers.ValidationError(
                "Invalid push token format. Expected: ExponentPushToken[...]"
            )
        return value


# ── Mosque Admin ──────────────────────────────────────────────────────


class MosqueAdminSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source="user", read_only=True)

    class Meta:
        model = MosqueAdmin
        fields = ["id", "mosque", "user", "user_detail", "role", "created"]
        read_only_fields = ["id", "created"]


# ── Prayer Times ─────────────────────────────────────────────────────


# ── Feedback ─────────────────────────────────────────────────────────


# ── Contact Form ──────────────────────────────────────────────────────


class ContactSerializer(serializers.Serializer):
    """Validate contact form submissions from the website."""

    SUBJECT_CHOICES = [
        ("general", "General Enquiry"),
        ("app-feedback", "App Feedback"),
        ("bug-report", "Bug Report"),
        ("mosque-admin", "Mosque Administration"),
        ("volunteering", "Volunteering"),
        ("other", "Other"),
    ]

    name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    subject = serializers.ChoiceField(choices=SUBJECT_CHOICES)
    message = serializers.CharField(max_length=5000)
    turnstile_token = serializers.CharField(write_only=True, required=False, default="")

    def validate_name(self, value):
        return strip_tags(value).strip()

    def validate_message(self, value):
        return strip_tags(value).strip()


# ── Feedback ─────────────────────────────────────────────────────────


class FeedbackCreateSerializer(serializers.ModelSerializer):
    """Write-only serializer for submitting feedback."""

    class Meta:
        model = Feedback
        fields = ["type", "category", "description", "device_info"]

    def validate_category(self, value):
        return strip_tags(value).strip()

    def validate_description(self, value):
        return strip_tags(value).strip()


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


# ── Donations & Gift Aid ────────────────────────────────────────────


class DonationSerializer(serializers.ModelSerializer):
    """Read-only serializer for donation records."""

    amount_pounds = serializers.SerializerMethodField()
    gift_aid_amount_pounds = serializers.SerializerMethodField()

    class Meta:
        model = Donation
        fields = [
            "id",
            "donor_name",
            "donor_email",
            "amount_pence",
            "amount_pounds",
            "currency",
            "frequency",
            "source",
            "gift_aid_eligible",
            "gift_aid_amount_pence",
            "gift_aid_amount_pounds",
            "donation_date",
            "created",
        ]
        read_only_fields = fields

    def get_amount_pounds(self, obj):
        return f"{obj.amount_pence / 100:.2f}"

    def get_gift_aid_amount_pounds(self, obj):
        return f"{obj.gift_aid_amount_pence / 100:.2f}"


class GiftAidDeclarationSerializer(serializers.ModelSerializer):
    """Read-only serializer for Gift Aid declarations."""

    total_donated_pounds = serializers.SerializerMethodField()
    total_gift_aid_pounds = serializers.SerializerMethodField()

    class Meta:
        model = GiftAidDeclaration
        fields = [
            "id",
            "charity_reference",
            "donor_name",
            "donor_email",
            "donor_postcode",
            "declaration_date",
            "covers_past_donations",
            "status",
            "total_donated_pounds",
            "total_gift_aid_pounds",
        ]
        read_only_fields = fields

    def get_total_donated_pounds(self, obj):
        # Use annotated value if available (avoids N+1), fall back to property
        pence = getattr(obj, "_total_donated_pence", None)
        if pence is None:
            pence = obj.total_donated_pence
        return f"{(pence or 0) / 100:.2f}"

    def get_total_gift_aid_pounds(self, obj):
        pence = getattr(obj, "_total_gift_aid_pence", None)
        if pence is None:
            pence = obj.total_gift_aid_pence
        return f"{(pence or 0) / 100:.2f}"


class GiftAidClaimSerializer(serializers.ModelSerializer):
    """Read-only serializer for Gift Aid claims."""

    class Meta:
        model = GiftAidClaim
        fields = [
            "id",
            "reference",
            "period_start",
            "period_end",
            "donation_count",
            "total_donations_pence",
            "total_gift_aid_pence",
            "status",
            "submitted_date",
        ]
        read_only_fields = fields


# ── Mixlr Status ────────────────────────────────────────────────────


class MixlrStatusSerializer(serializers.ModelSerializer):
    """Public read-only serializer for Mixlr live broadcast status."""

    embed_url = serializers.CharField(read_only=True)
    channel_url = serializers.CharField(read_only=True)

    class Meta:
        model = MixlrStatus
        fields = [
            "is_live",
            "broadcast_title",
            "channel_name",
            "channel_logo_url",
            "channel_slug",
            "embed_url",
            "channel_url",
            "last_live_at",
            "last_checked",
        ]
        read_only_fields = fields


# ── Version Policy ─────────────────────────────────────────────────


class _VersionPolicyPlatformSerializer(serializers.Serializer):
    minimum = serializers.CharField()
    recommended = serializers.CharField()
    store_url = serializers.URLField()


class _VersionPolicyBehaviourSerializer(serializers.Serializer):
    below_minimum = serializers.ChoiceField(choices=["block", "soft", "none"])
    below_recommended = serializers.ChoiceField(choices=["soft", "none"])


class VersionPolicySerializer(serializers.Serializer):
    """Public read shape for /api/v1/version-policy.

    Reshapes the singleton VersionPolicy model into per-platform sub-objects
    plus a flat `policy` block so clients only consume their own platform's
    fields.
    """

    ios = _VersionPolicyPlatformSerializer(read_only=True)
    android = _VersionPolicyPlatformSerializer(read_only=True)
    policy = _VersionPolicyBehaviourSerializer(read_only=True)

    def to_representation(self, instance: VersionPolicy):
        return {
            "ios": {
                "minimum": instance.ios_minimum,
                "recommended": instance.ios_recommended,
                "store_url": instance.ios_store_url,
            },
            "android": {
                "minimum": instance.android_minimum,
                "recommended": instance.android_recommended,
                "store_url": instance.android_store_url,
            },
            "policy": {
                "below_minimum": instance.policy_below_minimum,
                "below_recommended": instance.policy_below_recommended,
            },
        }
