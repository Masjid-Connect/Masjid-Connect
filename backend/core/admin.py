"""Django admin configuration with Unfold theme."""

import csv

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.http import HttpResponse
from unfold.admin import ModelAdmin

from .models import (
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


# ── Donations & Gift Aid ────────────────────────────────────────────


@admin.register(Donation)
class DonationAdmin(ModelAdmin):
    list_display = [
        "donation_date",
        "donor_name",
        "donor_email",
        "amount_display",
        "frequency",
        "source",
        "gift_aid_eligible",
        "gift_aid_amount_display",
    ]
    list_filter = ["gift_aid_eligible", "frequency", "source", "currency"]
    search_fields = ["donor_name", "donor_email", "stripe_payment_intent_id", "stripe_checkout_session_id"]
    date_hierarchy = "donation_date"
    ordering = ["-donation_date"]
    readonly_fields = [
        "id", "stripe_payment_intent_id", "stripe_customer_id",
        "stripe_checkout_session_id", "gift_aid_amount_pence", "created", "updated",
    ]
    fieldsets = (
        ("Donor", {
            "fields": (
                "donor_name", "donor_email",
                "donor_address_line1", "donor_address_line2",
                "donor_city", "donor_postcode", "donor_country",
            ),
        }),
        ("Payment", {
            "fields": (
                "amount_pence", "currency", "frequency", "source", "donation_date",
            ),
        }),
        ("Gift Aid", {
            "fields": ("gift_aid_eligible", "gift_aid_declaration", "gift_aid_amount_pence"),
        }),
        ("Stripe", {
            "fields": (
                "stripe_payment_intent_id", "stripe_customer_id",
                "stripe_checkout_session_id",
            ),
            "classes": ("collapse",),
        }),
        ("Meta", {
            "fields": ("id", "created", "updated"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Amount")
    def amount_display(self, obj):
        return f"£{obj.amount_pence / 100:.2f}"

    @admin.display(description="Gift Aid")
    def gift_aid_amount_display(self, obj):
        if obj.gift_aid_amount_pence:
            return f"£{obj.gift_aid_amount_pence / 100:.2f}"
        return "—"


@admin.register(GiftAidDeclaration)
class GiftAidDeclarationAdmin(ModelAdmin):
    list_display = [
        "charity_reference",
        "donor_name",
        "donor_email",
        "donor_postcode",
        "declaration_date",
        "status",
        "donation_count",
        "total_donated_display",
        "total_gift_aid_display",
    ]
    list_filter = ["status"]
    search_fields = ["donor_name", "donor_email", "charity_reference", "donor_postcode"]
    date_hierarchy = "declaration_date"
    ordering = ["-declaration_date"]
    readonly_fields = ["id", "created", "updated"]
    fieldsets = (
        ("Donor Details (HMRC required)", {
            "fields": (
                "donor_name", "donor_email",
                "donor_address_line1", "donor_address_line2",
                "donor_city", "donor_postcode", "donor_country",
            ),
        }),
        ("Declaration", {
            "fields": (
                "charity_reference", "declaration_date",
                "covers_past_donations", "status", "cancelled_date",
            ),
        }),
        ("Stripe", {
            "fields": ("stripe_customer_id",),
            "classes": ("collapse",),
        }),
        ("Notes", {
            "fields": ("notes",),
        }),
        ("Meta", {
            "fields": ("id", "created", "updated"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Donations")
    def donation_count(self, obj):
        return obj.donations.count()

    @admin.display(description="Total Donated")
    def total_donated_display(self, obj):
        return f"£{obj.total_donated_pence / 100:.2f}"

    @admin.display(description="Gift Aid Value")
    def total_gift_aid_display(self, obj):
        return f"£{obj.total_gift_aid_pence / 100:.2f}"


def _export_gift_aid_csv(modeladmin, request, queryset):
    """Export Gift Aid claim as CSV for HMRC Charities Online (R68i schedule)."""
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="gift-aid-hmrc-schedule.csv"'

    writer = csv.writer(response)
    # HMRC R68i schedule columns
    writer.writerow([
        "Donor Title", "Donor First Name", "Donor Last Name",
        "House Name/Number", "Postcode",
        "Charity Reference", "Donation Date", "Donation Amount (£)",
        "Gift Aid Amount (£)",
    ])

    for claim in queryset:
        for donation in claim.donations.filter(gift_aid_eligible=True).select_related("gift_aid_declaration"):
            decl = donation.gift_aid_declaration
            if not decl:
                continue

            # Split name into first/last (best effort)
            name_parts = decl.donor_name.strip().split(" ", 1)
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            writer.writerow([
                "",  # Title (optional)
                first_name,
                last_name,
                decl.donor_address_line1,
                decl.donor_postcode,
                decl.charity_reference,
                donation.donation_date.strftime("%d/%m/%Y"),
                f"{donation.amount_pence / 100:.2f}",
                f"{donation.gift_aid_amount_pence / 100:.2f}",
            ])

    return response


_export_gift_aid_csv.short_description = "Export as HMRC Gift Aid CSV (R68i)"


@admin.register(GiftAidClaim)
class GiftAidClaimAdmin(ModelAdmin):
    list_display = [
        "reference",
        "period_start",
        "period_end",
        "donation_count",
        "total_donations_display",
        "total_gift_aid_display",
        "status",
        "submitted_date",
    ]
    list_filter = ["status"]
    search_fields = ["reference"]
    ordering = ["-period_end"]
    readonly_fields = [
        "id", "total_donations_pence", "total_gift_aid_pence",
        "donation_count", "created", "updated",
    ]
    filter_horizontal = ["donations"]
    actions = [_export_gift_aid_csv]
    fieldsets = (
        ("Claim Period", {
            "fields": ("reference", "period_start", "period_end"),
        }),
        ("Donations", {
            "fields": ("donations",),
            "description": "Select the Gift Aid eligible donations to include in this HMRC claim.",
        }),
        ("Totals (auto-calculated)", {
            "fields": ("donation_count", "total_donations_pence", "total_gift_aid_pence"),
        }),
        ("HMRC Submission", {
            "fields": ("status", "submitted_date", "hmrc_response"),
        }),
        ("Notes", {
            "fields": ("notes",),
        }),
        ("Meta", {
            "fields": ("id", "created", "updated"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Donations (£)")
    def total_donations_display(self, obj):
        return f"£{obj.total_donations_pence / 100:.2f}"

    @admin.display(description="Gift Aid (£)")
    def total_gift_aid_display(self, obj):
        return f"£{obj.total_gift_aid_pence / 100:.2f}"
