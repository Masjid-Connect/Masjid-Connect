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
    """Mosque event — lesson, lecture, Quran circle, etc."""

    class Category(models.TextChoices):
        LESSON = "lesson", "Lesson"
        LECTURE = "lecture", "Lecture"
        QURAN_CIRCLE = "quran_circle", "Quran Circle"
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
    """Expo push notification token for a device. User is optional for anonymous devices."""

    class Platform(models.TextChoices):
        IOS = "ios", "iOS"
        ANDROID = "android", "Android"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="push_tokens",
        null=True,
        blank=True,
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
