"""DRF serializers — shaped to match existing React Native types."""

import re

from django.contrib.auth import get_user_model
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
    password = serializers.CharField(write_only=True, min_length=10)
    name = serializers.CharField(max_length=255)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
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
    cf_turnstile_response = serializers.CharField(
        required=False, allow_blank=True, write_only=True,
        help_text="Cloudflare Turnstile token for spam protection.",
    )

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
        return f"{obj.total_donated_pence / 100:.2f}"

    def get_total_gift_aid_pounds(self, obj):
        return f"{obj.total_gift_aid_pence / 100:.2f}"


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
