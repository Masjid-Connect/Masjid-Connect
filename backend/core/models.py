"""Core models for Masjid Connect."""

import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Extended user with mobile-app fields. Uses email as primary login field."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField("email address", unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "name"]

    class Meta:
        ordering = ["-date_joined"]

    def __str__(self):
        return self.name or self.email


class Mosque(models.Model):
    """A mosque/masjid location."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=500, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    latitude = models.FloatField(default=0)
    longitude = models.FloatField(default=0)
    calculation_method = models.IntegerField(
        default=4,
        help_text="Aladhan calculation method code (4 = Umm Al-Qura)",
    )
    jumua_time = models.TimeField(null=True, blank=True, help_text="Jumu'ah prayer time")
    contact_phone = models.CharField(max_length=30, blank=True)
    contact_email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    photo = models.ImageField(upload_to="mosques/", blank=True)
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

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mosque = models.ForeignKey(Mosque, on_delete=models.CASCADE, related_name="announcements")
    title = models.CharField(max_length=255)
    body = models.TextField()
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    published_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcements",
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
    mosque = models.ForeignKey(Mosque, on_delete=models.CASCADE, related_name="events")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    speaker = models.CharField(max_length=255, blank=True)
    event_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    recurring = models.CharField(max_length=10, choices=Recurring.choices, blank=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.LESSON)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
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
    )
    mosque = models.ForeignKey(Mosque, on_delete=models.CASCADE, related_name="subscribers")
    notify_prayers = models.BooleanField(default=True)
    notify_announcements = models.BooleanField(default=True)
    notify_events = models.BooleanField(default=True)
    prayer_reminder_minutes = models.IntegerField(default=15)
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
        related_name="push_tokens",
    )
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=10, choices=Platform.choices)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated"]

    def __str__(self):
        return f"{self.user} ({self.platform})"


class MosqueAdmin(models.Model):
    """Assigns a user as admin of a specific mosque."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        SUPER_ADMIN = "super_admin", "Super Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mosque = models.ForeignKey(Mosque, on_delete=models.CASCADE, related_name="admins")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mosque_roles",
    )
    role = models.CharField(max_length=15, choices=Role.choices, default=Role.ADMIN)
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
        help_text="Null for guest submissions",
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    category = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
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
    mosque = models.ForeignKey(Mosque, on_delete=models.CASCADE, related_name="prayer_times")
    date = models.DateField()

    # Jama'ah (congregation) times — set by the mosque
    fajr_jamat = models.TimeField()
    dhuhr_jamat = models.TimeField()
    asr_jamat = models.TimeField()
    maghrib_jamat = models.TimeField()
    isha_jamat = models.TimeField()

    # Prayer start times (from PDF — may differ slightly from Aladhan calculations)
    fajr_start = models.TimeField(null=True, blank=True)
    sunrise = models.TimeField(null=True, blank=True)
    dhuhr_start = models.TimeField(null=True, blank=True)
    asr_start = models.TimeField(null=True, blank=True)
    isha_start = models.TimeField(null=True, blank=True)

    source_url = models.URLField(blank=True, help_text="URL of the PDF this was scraped from")

    class Meta:
        unique_together = ("mosque", "date")
        ordering = ["date"]

    def __str__(self):
        return f"{self.mosque.name} — {self.date}"


class StripeEvent(models.Model):
    """Tracks processed Stripe webhook events for idempotency."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stripe_event_id = models.CharField(max_length=255, unique=True, db_index=True)
    event_type = models.CharField(max_length=100)
    processed = models.BooleanField(default=True)
    payload = models.JSONField(default=dict, blank=True)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created"]

    def __str__(self):
        return f"{self.event_type} — {self.stripe_event_id}"


# ── Donations & Gift Aid ────────────────────────────────────────────


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
    stripe_customer_id = models.CharField(max_length=255, blank=True)
    stripe_checkout_session_id = models.CharField(max_length=255, blank=True)

    # Donor details (from Stripe billing or manual entry)
    donor_name = models.CharField(max_length=255, blank=True)
    donor_email = models.EmailField(blank=True)
    donor_address_line1 = models.CharField(max_length=255, blank=True)
    donor_address_line2 = models.CharField(max_length=255, blank=True)
    donor_city = models.CharField(max_length=100, blank=True)
    donor_postcode = models.CharField(max_length=20, blank=True)
    donor_country = models.CharField(max_length=2, blank=True, default="GB")

    # Payment details
    amount_pence = models.PositiveIntegerField(help_text="Donation amount in pence")
    currency = models.CharField(max_length=3, default="gbp")
    frequency = models.CharField(max_length=10, choices=Frequency.choices, default=Frequency.ONE_TIME)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.STRIPE)

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

    donation_date = models.DateField(help_text="Date the payment was received")
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-donation_date", "-created"]

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
    donor_email = models.EmailField(blank=True)
    donor_address_line1 = models.CharField(max_length=255, help_text="House number/name and street")
    donor_address_line2 = models.CharField(max_length=255, blank=True)
    donor_city = models.CharField(max_length=100, blank=True)
    donor_postcode = models.CharField(max_length=20, help_text="UK postcode — required by HMRC")
    donor_country = models.CharField(max_length=2, default="GB")

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
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    cancelled_date = models.DateField(null=True, blank=True)

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
    total_donations_pence = models.PositiveIntegerField(default=0)
    total_gift_aid_pence = models.PositiveIntegerField(default=0)
    donation_count = models.PositiveIntegerField(default=0)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    submitted_date = models.DateField(null=True, blank=True)
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
