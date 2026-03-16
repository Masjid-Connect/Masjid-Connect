"""Django admin configuration with Unfold theme."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from unfold.admin import ModelAdmin

from .models import (
    Announcement,
    Event,
    Feedback,
    Mosque,
    MosqueAdmin,
    MosquePrayerTime,
    PushToken,
    StripeEvent,
    User,
    UserSubscription,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    list_display = ["username", "name", "email", "is_staff", "date_joined"]
    search_fields = ["username", "name", "email"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Profile", {"fields": ("name",)}),
    )


@admin.register(Mosque)
class MosqueAdminView(ModelAdmin):
    list_display = ["name", "city", "country", "calculation_method", "updated"]
    list_filter = ["country", "city"]
    search_fields = ["name", "city", "address"]


@admin.register(Announcement)
class AnnouncementAdmin(ModelAdmin):
    list_display = ["title", "mosque", "priority", "published_at", "expires_at"]
    list_filter = ["priority", "mosque"]
    search_fields = ["title", "body"]
    date_hierarchy = "published_at"


@admin.register(Event)
class EventAdmin(ModelAdmin):
    list_display = ["title", "mosque", "category", "event_date", "start_time", "recurring"]
    list_filter = ["category", "recurring", "mosque"]
    search_fields = ["title", "speaker", "description"]
    date_hierarchy = "event_date"


@admin.register(UserSubscription)
class UserSubscriptionAdmin(ModelAdmin):
    list_display = ["user", "mosque", "notify_prayers", "notify_announcements", "notify_events"]
    list_filter = ["notify_prayers", "notify_announcements", "notify_events"]
    raw_id_fields = ["user", "mosque"]


@admin.register(PushToken)
class PushTokenAdmin(ModelAdmin):
    list_display = ["user", "platform", "created", "updated"]
    list_filter = ["platform"]
    raw_id_fields = ["user"]


@admin.register(MosqueAdmin)
class MosqueAdminAdmin(ModelAdmin):
    list_display = ["user", "mosque", "role", "created"]
    list_filter = ["role"]
    raw_id_fields = ["user", "mosque"]


@admin.register(Feedback)
class FeedbackAdmin(ModelAdmin):
    list_display = ["type", "category", "status", "user", "created"]
    list_filter = ["type", "status", "category"]
    search_fields = ["description", "user__email", "category"]
    date_hierarchy = "created"
    ordering = ["-created"]
    readonly_fields = ["id", "user", "type", "category", "description", "device_info", "created", "updated"]
    fieldsets = (
        (None, {"fields": ("id", "type", "category", "status", "user")}),
        ("Submission", {"fields": ("description", "device_info", "created", "updated")}),
        ("Admin", {"fields": ("admin_notes", "resolved_at")}),
    )


@admin.register(StripeEvent)
class StripeEventAdmin(ModelAdmin):
    list_display = ["stripe_event_id", "event_type", "processed", "created"]
    list_filter = ["event_type", "processed"]
    search_fields = ["stripe_event_id", "event_type"]
    date_hierarchy = "created"
    ordering = ["-created"]
    readonly_fields = ["id", "stripe_event_id", "event_type", "processed", "payload", "created"]


@admin.register(MosquePrayerTime)
class MosquePrayerTimeAdmin(ModelAdmin):
    list_display = [
        "date",
        "mosque",
        "fajr_jamat",
        "dhuhr_jamat",
        "asr_jamat",
        "maghrib_jamat",
        "isha_jamat",
    ]
    list_filter = ["mosque"]
    date_hierarchy = "date"
    ordering = ["-date"]
