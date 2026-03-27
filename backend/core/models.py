"""Core models for Masjid Connect."""

import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


def validate_image_file(value):
    """Validate uploaded images: max 5 MB, must be JPEG/PNG/WebP."""
    max_size = 5 * 1024 * 1024  # 5 MB
    allowed_types = {"image/jpeg", "image/png", "image/webp"}

    if value.size > max_size:
        raise ValidationError(
            f"Image file too large (max 5 MB, got {value.size / 1024 / 1024:.1f} MB)."
        )

    # Check content type from the uploaded file
    content_type = getattr(value, "content_type", None)
    if content_type and content_type not in allowed_types:
        raise ValidationError(
            f"Unsupported image format '{content_type}'. Use JPEG, PNG, or WebP."
        )


class User(AbstractUser):
    """Extended user with mobile-app fields. Uses email as primary login field."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True, help_text="Full name as displayed in the app")
    email = models.EmailField("email address", unique=True, help_text="Used for login and notifications")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "name"]

    class Meta:
        ordering = ["-date_joined"]

    def __str__(self):
        return self.name or self.email


class Mosque(models.Model):
    """A mosque/masjid location."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="Official name of the mosque")
    address = models.CharField(max_length=500, blank=True, help_text="Street address including building number")
    city = models.CharField(max_length=100, blank=True, help_text="City or town")
    state = models.CharField(max_length=100, blank=True, help_text="County, state, or province")
    country = models.CharField(max_length=100, blank=True, help_text="Country name (e.g. United Kingdom)")
    latitude = models.FloatField(default=0, help_text="GPS latitude for prayer time calculations and nearby search")
    longitude = models.FloatField(default=0, help_text="GPS longitude for prayer time calculations and nearby search")
    calculation_method = models.IntegerField(
        default=4,
        help_text="Aladhan calculation method code (4 = Umm Al-Qura)",
    )
    jumua_time = models.TimeField(null=True, blank=True, help_text="Jumu'ah (Friday) prayer time")
    contact_phone = models.CharField(max_length=30, blank=True, help_text="Public phone number for the mosque")
    contact_email = models.EmailField(blank=True, help_text="Public email address for enquiries")
    website = models.URLField(blank=True, help_text="Mosque website URL (include https://)")
    photo = models.ImageField(
        upload_to="mosques/", blank=True,
        validators=[validate_image_file],
        help_text="Photo of the mosque exterior (JPEG, PNG, or WebP, max 5 MB)",
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "mosques"

    def __str__(self):
        return self.name


class Announcement(models.Model):
    """Community announcement from a mosque."""

    class Priority(models.TextChoices):
        NORMAL = "normal", "Normal"
        URGENT = "urgent", "Urgent"
        JANAZAH = "janazah", "Janazah"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mosque = models.ForeignKey(
        Mosque, on_delete=models.CASCADE, related_name="announcements",
        db_index=True,
        help_text="Which mosque is this announcement for?",
    )
    title = models.CharField(
        max_length=255,
        help_text="Short, clear title (e.g. 'Eid Prayer Time Change'). Max 255 characters.",
    )
    body = models.TextField(
        help_text="Full announcement text. This appears in the app feed and push notifications.",
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.NORMAL,
        help_text="Normal = standard feed. Urgent = highlighted alert. Janazah = funeral prayer notice with dignified styling.",
    )
    published_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        null=True, blank=True, db_index=True,
        help_text="Leave blank to keep visible indefinitely. Set a date to auto-hide after that time.",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcements",
        help_text="Who posted this announcement (auto-filled).",
    )

    class Meta:
        ordering = ["-published_at"]

    def __str__(self):
        return self.title


class Event(models.Model):
    """Mosque event — lesson, lecture, Quran school, etc."""

    class Category(models.TextChoices):
        LESSON = "lesson", "Lesson"
        LECTURE = "lecture", "Lecture"
        QURAN_SCHOOL = "quran_school", "Quran School"
        YOUTH = "youth", "Youth"
        SISTERS = "sisters", "Sisters"
        COMMUNITY = "community", "Community"

    class Recurring(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mosque = models.ForeignKey(
        Mosque, on_delete=models.CASCADE, related_name="events",
        db_index=True,
        help_text="Which mosque is hosting this event?",
    )
    title = models.CharField(
        max_length=255,
        help_text="Event name (e.g. 'Weekly Tafseer Class'). Max 255 characters.",
    )
    description = models.TextField(
        blank=True,
        help_text="Describe what the event is about, who it's for, and what to bring.",
    )
    speaker = models.CharField(
        max_length=255, blank=True,
        help_text="Name of the speaker, teacher, or instructor (if applicable).",
    )
    event_date = models.DateField(db_index=True, help_text="Date of the event (or first occurrence if recurring).")
    start_time = models.TimeField(help_text="Start time (e.g. 19:00 or 7:00 PM).")
    end_time = models.TimeField(
        null=True, blank=True,
        help_text="End time. Leave blank if unknown.",
    )
    location = models.CharField(
        max_length=255, blank=True,
        help_text="Room or area within the mosque (e.g. 'Main Hall', 'Sisters Section').",
    )
    recurring = models.CharField(
        max_length=10, choices=Recurring.choices, blank=True,
        help_text="Leave blank for one-off events. Select weekly or monthly for repeating events.",
    )
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.LESSON,
        help_text="Lesson = study circle. Lecture = one-off talk. Youth/Sisters = targeted audience. Community = general.",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
        help_text="Who created this event (auto-filled).",
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["event_date", "start_time"]

    def __str__(self):
        return f"{self.title} — {self.event_date}"


class UserSubscription(models.Model):
    """A user's subscription to a mosque (notification preferences)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
        db_index=True,
        help_text="The app user who subscribed.",
    )
    mosque = models.ForeignKey(
        Mosque, on_delete=models.CASCADE, related_name="subscribers",
        help_text="The mosque they subscribed to.",
    )
    notify_prayers = models.BooleanField(default=True, help_text="Send prayer time reminders.")
    notify_announcements = models.BooleanField(default=True, help_text="Send announcement notifications.")
    notify_events = models.BooleanField(default=True, help_text="Send event notifications.")
    prayer_reminder_minutes = models.IntegerField(
        default=15,
        help_text="How many minutes before each prayer to send the reminder (e.g. 15).",
    )
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "mosque")
        ordering = ["-created"]

    def __str__(self):
        return f"{self.user} → {self.mosque}"


class PushToken(models.Model):
    """Expo push notification token for a user's device."""

    class Platform(models.TextChoices):
        IOS = "ios", "iOS"
        ANDROID = "android", "Android"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="push_tokens",
        help_text="Optional — null for anonymous device registrations.",
    )
    token = models.CharField(max_length=255, unique=True, help_text="Expo push token for this device.")
    platform = models.CharField(max_length=10, choices=Platform.choices, help_text="iOS or Android.")
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated"]

    def __str__(self):
        return f"{self.user or 'anonymous'} ({self.platform})"


class MosqueAdmin(models.Model):
    """Assigns a user as admin of a specific mosque."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        SUPER_ADMIN = "super_admin", "Super Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mosque = models.ForeignKey(
        Mosque, on_delete=models.CASCADE, related_name="admins",
        help_text="The mosque this person helps manage.",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mosque_roles",
        help_text="The user being granted admin access.",
    )
    role = models.CharField(
        max_length=15, choices=Role.choices, default=Role.ADMIN,
        help_text="Admin = can post announcements/events. Super Admin = full management access.",
    )
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("mosque", "user")
        ordering = ["-created"]

    def __str__(self):
        return f"{self.user} — {self.mosque} ({self.role})"


class Feedback(models.Model):
    """User-submitted bug reports and feature requests — stored in DB, not lost in email."""

    class Type(models.TextChoices):
        BUG_REPORT = "bug_report", "Bug Report"
        FEATURE_REQUEST = "feature_request", "Feature Request"

    class Status(models.TextChoices):
        NEW = "new", "New"
        ACKNOWLEDGED = "acknowledged", "Acknowledged"
        IN_PROGRESS = "in_progress", "In Progress"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedback",
        help_text="The user who submitted this. Blank for guest submissions.",
    )
    type = models.CharField(max_length=20, choices=Type.choices, help_text="Bug report or feature request.")
    category = models.CharField(max_length=50, help_text="Area of the app (e.g. prayer times, events).")
    description = models.TextField(blank=True, help_text="Details of the bug or feature request.")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEW,
        help_text="Track progress: New → Acknowledged → In Progress → Resolved → Closed.",
    )
    admin_notes = models.TextField(blank=True, help_text="Internal notes — not visible to user")
    device_info = models.JSONField(
        default=dict,
        blank=True,
        help_text="Auto-collected: platform, os_version, app_version, device_model, screen_size, theme",
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created"]
        verbose_name_plural = "feedback"

    def __str__(self):
        return f"{self.get_type_display()} — {self.category}"


class MosquePrayerTime(models.Model):
    """Daily jama'ah (congregation) times for a mosque — scraped from timetable PDFs."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mosque = models.ForeignKey(
        Mosque, on_delete=models.CASCADE, related_name="prayer_times",
        help_text="Which mosque these prayer times are for.",
    )
    date = models.DateField(help_text="The date these prayer times apply to.")

    # Jama'ah (congregation) times — set by the mosque
    fajr_jamat = models.TimeField(help_text="Fajr congregation time set by the mosque.")
    dhuhr_jamat = models.TimeField(help_text="Dhuhr congregation time set by the mosque.")
    asr_jamat = models.TimeField(help_text="Asr congregation time set by the mosque.")
    maghrib_jamat = models.TimeField(help_text="Maghrib congregation time set by the mosque.")
    isha_jamat = models.TimeField(help_text="Isha congregation time set by the mosque.")

    # Prayer start times (from PDF — may differ slightly from Aladhan calculations)
    fajr_start = models.TimeField(null=True, blank=True, help_text="Fajr start time (from timetable PDF).")
    sunrise = models.TimeField(null=True, blank=True, help_text="Sunrise time.")
    dhuhr_start = models.TimeField(null=True, blank=True, help_text="Dhuhr start time (from timetable PDF).")
    asr_start = models.TimeField(null=True, blank=True, help_text="Asr start time (from timetable PDF).")
    isha_start = models.TimeField(null=True, blank=True, help_text="Isha start time (from timetable PDF).")

    source_url = models.URLField(blank=True, help_text="URL of the PDF this was scraped from")

    class Meta:
        unique_together = ("mosque", "date")
        ordering = ["date"]

    def __str__(self):
        return f"{self.mosque.name} — {self.date}"


class PasswordResetToken(models.Model):
    """Time-limited token for password reset via email."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created"]

    def __str__(self):
        return f"Reset token for {self.user.email}"

    def is_expired(self):
        """Token expires after 1 hour."""
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now() > self.created + timedelta(hours=1)

    def is_valid(self):
        return not self.used and not self.is_expired()


class StripeEvent(models.Model):
    """Tracks processed Stripe webhook events for idempotency."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stripe_event_id = models.CharField(max_length=255, unique=True, db_index=True, help_text="Stripe event ID (e.g. evt_...).")
    event_type = models.CharField(max_length=100, help_text="Stripe event type (e.g. checkout.session.completed).")
    processed = models.BooleanField(default=True, help_text="Whether this event has been processed.")
    payload = models.JSONField(default=dict, blank=True, help_text="Raw event payload from Stripe.")
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created"]

    def __str__(self):
        return f"{self.event_type} — {self.stripe_event_id}"


# ── Donations & Gift Aid ────────────────────────────────────────────


class CharityGiftAidSettings(models.Model):
    """Singleton settings for HMRC Gift Aid submissions.

    Stores charity identity and authorised official details required
    by the HMRC R68 XML schema.  Only one row should exist.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Charity identity
    charity_name = models.CharField(
        max_length=255, help_text="Registered charity name as known to HMRC",
    )
    hmrc_reference = models.CharField(
        max_length=20,
        help_text="HMRC Charities reference (e.g. XR12345)",
    )

    # Regulator (Charity Commission for England & Wales)
    regulator_name = models.CharField(
        max_length=100, default="CCEW",
        help_text="CCEW, OSCR, or CCNI",
    )
    regulator_number = models.CharField(
        max_length=20,
        help_text="Charity Commission registration number",
    )

    # Authorised official (person signing the claim)
    official_title = models.CharField(max_length=10, blank=True, help_text="e.g. Mr, Mrs, Dr")
    official_forename = models.CharField(max_length=100)
    official_surname = models.CharField(max_length=100)
    official_postcode = models.CharField(max_length=20, help_text="Postcode of authorised official")
    official_phone = models.CharField(max_length=30)

    # HMRC Gateway credentials (for API submission — optional)
    gateway_sender_id = models.CharField(
        max_length=50, blank=True,
        help_text="HMRC Government Gateway User ID (optional — only for API submission)",
    )

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Gift Aid Settings"
        verbose_name_plural = "Gift Aid Settings"

    def __str__(self):
        return f"{self.charity_name} ({self.hmrc_reference})"

    def save(self, *args, **kwargs):
        # Enforce singleton — delete any other rows atomically
        from django.db import transaction

        with transaction.atomic():
            CharityGiftAidSettings.objects.select_for_update().exclude(pk=self.pk).delete()
            super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        """Return the singleton settings instance or None."""
        return cls.objects.first()


class Donation(models.Model):
    """A recorded donation — created from Stripe webhook events.

    Each successful payment (one-time or recurring invoice) creates one
    Donation row so we have a local ledger independent of Stripe.
    """

    class Frequency(models.TextChoices):
        ONE_TIME = "one_time", "One-time"
        MONTHLY = "monthly", "Monthly"

    class Source(models.TextChoices):
        STRIPE = "stripe", "Stripe"
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"
        CASH = "cash", "Cash"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Stripe references (nullable for manual/cash donations)
    stripe_payment_intent_id = models.CharField(
        max_length=255, blank=True, db_index=True,
        help_text="Stripe PaymentIntent or Invoice ID",
    )
    stripe_customer_id = models.CharField(max_length=255, blank=True, help_text="Stripe customer ID (cus_...).")
    stripe_checkout_session_id = models.CharField(max_length=255, blank=True, help_text="Stripe checkout session ID.")

    # Donor details (from Stripe billing or manual entry)
    donor_name = models.CharField(max_length=255, blank=True, help_text="Donor's full name.")
    donor_email = models.EmailField(blank=True, db_index=True, help_text="Donor's email address.")
    donor_address_line1 = models.CharField(max_length=255, blank=True, help_text="House number and street.")
    donor_address_line2 = models.CharField(max_length=255, blank=True, help_text="Second address line (optional).")
    donor_city = models.CharField(max_length=100, blank=True, help_text="City or town.")
    donor_postcode = models.CharField(max_length=20, blank=True, help_text="Postcode (required for Gift Aid).")
    donor_country = models.CharField(max_length=2, blank=True, default="GB", help_text="Two-letter country code (e.g. GB).")

    # Payment details
    amount_pence = models.PositiveIntegerField(help_text="Donation amount in pence (e.g. 1000 = £10.00).")
    currency = models.CharField(max_length=3, default="gbp", help_text="Three-letter currency code (e.g. gbp).")
    frequency = models.CharField(max_length=10, choices=Frequency.choices, default=Frequency.ONE_TIME, help_text="One-time or monthly recurring.")
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.STRIPE, help_text="How the donation was received.")

    # Gift Aid
    gift_aid_eligible = models.BooleanField(
        default=False,
        help_text="Donor declared they are a UK taxpayer and want Gift Aid applied",
    )
    gift_aid_declaration = models.ForeignKey(
        "GiftAidDeclaration",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="donations",
        help_text="The Gift Aid declaration covering this donation",
    )
    gift_aid_amount_pence = models.PositiveIntegerField(
        default=0,
        help_text="Reclaimable Gift Aid = 25% of donation (amount × 25/100)",
    )

    donation_date = models.DateField(db_index=True, help_text="Date the payment was received.")
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-donation_date", "-created"]
        permissions = [
            ("view_donation_details", "Can view individual donation details and donor information"),
        ]

    def __str__(self):
        pounds = self.amount_pence / 100
        ga = " (Gift Aid)" if self.gift_aid_eligible else ""
        return f"£{pounds:.2f}{ga} — {self.donor_name or self.donor_email or 'Anonymous'}"

    def save(self, *args, **kwargs):
        if self.gift_aid_eligible and self.amount_pence:
            self.gift_aid_amount_pence = self.amount_pence * 25 // 100
        else:
            self.gift_aid_amount_pence = 0
        super().save(*args, **kwargs)


class GiftAidDeclaration(models.Model):
    """A donor's Gift Aid declaration — HMRC requires name, address, and postcode.

    One declaration can cover multiple donations (past 4 years + all future).
    HMRC reference: https://www.gov.uk/claim-gift-aid
    """

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Donor identity — HMRC mandatory fields
    donor_name = models.CharField(max_length=255, help_text="Full name as known to HMRC")
    donor_email = models.EmailField(blank=True, help_text="Donor's email for correspondence.")
    donor_address_line1 = models.CharField(max_length=255, help_text="House number/name and street.")
    donor_address_line2 = models.CharField(max_length=255, blank=True, help_text="Second address line (optional).")
    donor_city = models.CharField(max_length=100, blank=True, help_text="City or town.")
    donor_postcode = models.CharField(max_length=20, help_text="UK postcode — required by HMRC.")
    donor_country = models.CharField(max_length=2, default="GB", help_text="Two-letter country code.")

    # Stripe customer ID for matching future donations
    stripe_customer_id = models.CharField(
        max_length=255, blank=True, db_index=True,
        help_text="Links future Stripe payments to this declaration",
    )

    # Declaration details
    declaration_date = models.DateField(help_text="Date the donor made this declaration")
    covers_past_donations = models.BooleanField(
        default=True,
        help_text="Covers donations in the past 4 years",
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE, help_text="Active or cancelled.")
    cancelled_date = models.DateField(null=True, blank=True, help_text="Date the declaration was cancelled (if applicable).")

    # Charity's internal reference for this donor (HMRC requires this)
    charity_reference = models.CharField(
        max_length=50, unique=True,
        help_text="Unique reference for this donor (e.g. GA-000001)",
    )

    notes = models.TextField(blank=True, help_text="Internal admin notes")
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-declaration_date"]

    def __str__(self):
        return f"{self.donor_name} — {self.charity_reference} ({self.status})"

    @property
    def total_donated_pence(self):
        return self.donations.aggregate(total=models.Sum("amount_pence"))["total"] or 0

    @property
    def total_gift_aid_pence(self):
        return self.donations.aggregate(total=models.Sum("gift_aid_amount_pence"))["total"] or 0


class GiftAidClaim(models.Model):
    """A batch Gift Aid claim for HMRC submission via Charities Online.

    Groups eligible donations into a single R68i schedule submission.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted to HMRC"
        ACCEPTED = "accepted", "Accepted by HMRC"
        REJECTED = "rejected", "Rejected by HMRC"
        PARTIALLY_ACCEPTED = "partially_accepted", "Partially Accepted"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(
        max_length=50, unique=True,
        help_text="Claim reference (e.g. GACLAIM-2026-001)",
    )

    # Claim period
    period_start = models.DateField(help_text="Start of the claim period")
    period_end = models.DateField(help_text="End of the claim period")

    # Donations included in this claim
    donations = models.ManyToManyField(
        Donation,
        blank=True,
        related_name="gift_aid_claims",
        help_text="Donations included in this HMRC claim",
    )

    # Totals (denormalised for quick reference — recalculated on save)
    total_donations_pence = models.PositiveIntegerField(default=0, help_text="Auto-calculated total donation amount.")
    total_gift_aid_pence = models.PositiveIntegerField(default=0, help_text="Auto-calculated total Gift Aid reclaimable.")
    donation_count = models.PositiveIntegerField(default=0, help_text="Auto-calculated number of donations in this claim.")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, help_text="Current status of the HMRC claim.")
    submitted_date = models.DateField(null=True, blank=True, help_text="Date the claim was submitted to HMRC.")
    hmrc_response = models.TextField(blank=True, help_text="Response from HMRC after submission")
    notes = models.TextField(blank=True, help_text="Internal admin notes")

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-period_end"]

    def __str__(self):
        return f"{self.reference} — {self.get_status_display()}"

    def recalculate_totals(self):
        """Recalculate totals from the linked donations."""
        agg = self.donations.aggregate(
            total=models.Sum("amount_pence"),
            gift_aid=models.Sum("gift_aid_amount_pence"),
            count=models.Count("id"),
        )
        self.total_donations_pence = agg["total"] or 0
        self.total_gift_aid_pence = agg["gift_aid"] or 0
        self.donation_count = agg["count"] or 0
        self.save(update_fields=["total_donations_pence", "total_gift_aid_pence", "donation_count", "updated"])
