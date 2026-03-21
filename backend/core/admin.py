"""Django admin configuration with Unfold theme."""

import csv

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.http import HttpResponse
from django.urls import path, reverse
from unfold.admin import ModelAdmin

from .models import (
    Announcement,
    CharityGiftAidSettings,
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
    save_on_top = True
    fieldsets = (
        ("Basics", {
            "fields": ("name", "address", "city", "state", "country", "photo"),
        }),
        ("Location & Prayer Calculation", {
            "fields": ("latitude", "longitude", "calculation_method", "jumua_time"),
            "description": "GPS coordinates are used for prayer time calculations and the 'nearby mosques' feature.",
        }),
        ("Contact Information", {
            "fields": ("contact_phone", "contact_email", "website"),
        }),
    )


class _MosqueAutoPopulateMixin:
    """Auto-populate the mosque field for admins who manage only one mosque."""

    def get_changeform_initial_data(self, request):
        initial = super().get_changeform_initial_data(request)
        if "mosque" not in initial or not initial["mosque"]:
            user_mosques = MosqueAdmin.objects.filter(user=request.user).select_related("mosque")
            if user_mosques.count() == 1:
                initial["mosque"] = user_mosques.first().mosque_id
        return initial

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Limit mosque choices for non-superusers to their assigned mosques."""
        if db_field.name == "mosque" and not request.user.is_superuser:
            user_mosque_ids = MosqueAdmin.objects.filter(user=request.user).values_list("mosque_id", flat=True)
            if user_mosque_ids:
                kwargs["queryset"] = Mosque.objects.filter(id__in=user_mosque_ids)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        """Auto-fill author field on create."""
        if not change and hasattr(obj, "author") and not obj.author_id:
            obj.author = request.user
        super().save_model(request, obj, form, change)


@admin.register(Announcement)
class AnnouncementAdmin(_MosqueAutoPopulateMixin, ModelAdmin):
    list_display = ["title", "mosque", "priority", "published_at", "expires_at"]
    list_filter = ["priority", "mosque"]
    search_fields = ["title", "body"]
    date_hierarchy = "published_at"
    save_on_top = True
    fieldsets = (
        ("Basics", {
            "fields": ("mosque", "title", "body"),
            "description": "Write a clear title (max 255 characters) and body for your announcement.",
        }),
        ("Priority & Visibility", {
            "fields": ("priority", "expires_at"),
            "description": (
                "Normal = appears in the feed. "
                "Urgent = highlighted in red. "
                "Janazah = funeral prayer notice with dignified styling."
            ),
        }),
        ("Author", {
            "fields": ("author",),
            "classes": ("collapse",),
            "description": "Auto-filled with your name. Only change if posting on behalf of someone else.",
        }),
    )


@admin.register(Event)
class EventAdmin(_MosqueAutoPopulateMixin, ModelAdmin):
    list_display = ["title", "mosque", "category", "event_date", "start_time", "recurring"]
    list_filter = ["category", "recurring", "mosque"]
    search_fields = ["title", "speaker", "description"]
    date_hierarchy = "event_date"
    save_on_top = True
    fieldsets = (
        ("Basics", {
            "fields": ("mosque", "title", "category", "description"),
            "description": "Give your event a clear name and pick the right category.",
        }),
        ("Date & Time", {
            "fields": ("event_date", "start_time", "end_time", "recurring"),
            "description": (
                "Set the date and time. For recurring events, set the date of the "
                "first occurrence and choose weekly or monthly."
            ),
        }),
        ("Details", {
            "fields": ("speaker", "location"),
            "description": "Optional: add the speaker name and specific room/area in the mosque.",
        }),
        ("Author", {
            "fields": ("author",),
            "classes": ("collapse",),
            "description": "Auto-filled with your name. Only change if posting on behalf of someone else.",
        }),
    )


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
    save_on_top = True
    fieldsets = (
        ("Basics", {
            "fields": ("mosque", "date"),
        }),
        ("Congregation (Jama'ah) Times", {
            "fields": ("fajr_jamat", "dhuhr_jamat", "asr_jamat", "maghrib_jamat", "isha_jamat"),
            "description": "These are the times set by the mosque for congregational prayer.",
        }),
        ("Prayer Start Times (from timetable)", {
            "fields": ("fajr_start", "sunrise", "dhuhr_start", "asr_start", "isha_start"),
            "description": "Optional start times from the mosque's printed timetable or PDF.",
            "classes": ("collapse",),
        }),
        ("Source", {
            "fields": ("source_url",),
            "classes": ("collapse",),
        }),
    )


# ── Donations & Gift Aid ────────────────────────────────────────────


def _generate_donation_receipt(modeladmin, request, queryset):
    """Generate donation receipt — opens receipt for the first selected donation."""
    if queryset.count() != 1:
        modeladmin.message_user(
            request,
            "Please select exactly one donation to generate a receipt.",
            level="warning",
        )
        return
    donation = queryset.first()
    from django.shortcuts import redirect
    return redirect(reverse("admin:donation_receipt_html", args=[donation.pk]))


_generate_donation_receipt.short_description = "Generate donation receipt"


class _DonationPermissionMixin:
    """Restrict donation-related admin views to users with view_donation_details access."""

    def has_module_permission(self, request):
        from .dashboard import can_view_donation_details
        return can_view_donation_details(request.user)

    def has_view_permission(self, request, obj=None):
        from .dashboard import can_view_donation_details
        return can_view_donation_details(request.user)

    def has_add_permission(self, request):
        from .dashboard import can_view_donation_details
        return can_view_donation_details(request.user)

    def has_change_permission(self, request, obj=None):
        from .dashboard import can_view_donation_details
        return can_view_donation_details(request.user)

    def has_delete_permission(self, request, obj=None):
        from .dashboard import can_view_donation_details
        return can_view_donation_details(request.user)


@admin.register(Donation)
class DonationAdmin(_DonationPermissionMixin, ModelAdmin):
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
    actions = [_generate_donation_receipt]
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
class GiftAidDeclarationAdmin(_DonationPermissionMixin, ModelAdmin):
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


def _export_gift_aid_xml(modeladmin, request, queryset):
    """Export Gift Aid claim as HMRC R68 XML for Charities Online."""
    if queryset.count() != 1:
        modeladmin.message_user(
            request, "Please select exactly one claim to export as XML.", level="error",
        )
        return

    claim = queryset.first()

    from .gift_aid_xml import generate_r68_schedule_xml

    try:
        xml_bytes = generate_r68_schedule_xml(claim)
    except ValueError as e:
        modeladmin.message_user(request, str(e), level="error")
        return

    response = HttpResponse(xml_bytes, content_type="application/xml")
    response["Content-Disposition"] = (
        f'attachment; filename="gift-aid-{claim.reference}.xml"'
    )
    return response


_export_gift_aid_xml.short_description = "Export as HMRC R68 XML (Charities Online)"


def _export_gift_aid_xml_envelope(modeladmin, request, queryset):
    """Export Gift Aid claim as full GovTalkMessage XML (Transaction Engine)."""
    if queryset.count() != 1:
        modeladmin.message_user(
            request, "Please select exactly one claim to export as XML.", level="error",
        )
        return

    claim = queryset.first()

    from .gift_aid_xml import generate_r68_xml

    try:
        xml_bytes = generate_r68_xml(claim, include_govtalk_envelope=True)
    except ValueError as e:
        modeladmin.message_user(request, str(e), level="error")
        return

    response = HttpResponse(xml_bytes, content_type="application/xml")
    response["Content-Disposition"] = (
        f'attachment; filename="gift-aid-{claim.reference}-govtalk.xml"'
    )
    return response


_export_gift_aid_xml_envelope.short_description = "Export as GovTalkMessage XML (full envelope)"


@admin.register(GiftAidClaim)
class GiftAidClaimAdmin(_DonationPermissionMixin, ModelAdmin):
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
    actions = [_export_gift_aid_csv, _export_gift_aid_xml, _export_gift_aid_xml_envelope]
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


@admin.register(CharityGiftAidSettings)
class CharityGiftAidSettingsAdmin(_DonationPermissionMixin, ModelAdmin):
    list_display = ["charity_name", "hmrc_reference", "regulator_number", "official_surname"]
    fieldsets = (
        ("Charity Identity", {
            "fields": ("charity_name", "hmrc_reference"),
            "description": "Your charity's registered name and HMRC reference. "
                           "Find your HMRC reference on your original recognition letter.",
        }),
        ("Regulator", {
            "fields": ("regulator_name", "regulator_number"),
            "description": "CCEW = Charity Commission for England & Wales, "
                           "OSCR = Scotland, CCNI = Northern Ireland.",
        }),
        ("Authorised Official", {
            "fields": (
                "official_title", "official_forename", "official_surname",
                "official_postcode", "official_phone",
            ),
            "description": "The person authorised to sign Gift Aid claims on behalf of the charity.",
        }),
        ("HMRC Gateway (optional)", {
            "fields": ("gateway_sender_id",),
            "description": "Only needed if submitting via the Transaction Engine API. "
                           "Most charities use the Charities Online web portal instead.",
            "classes": ("collapse",),
        }),
    )

    def has_add_permission(self, request):
        if not super().has_add_permission(request):
            return False
        # Only allow one settings row
        if CharityGiftAidSettings.objects.exists():
            return False
        return True

    def has_delete_permission(self, request, obj=None):
        return False


# ── Custom admin URLs for guide, receipts, and dashboard ─────────────

from .guide_views import (
    guide_index, guide_announcements, guide_events, guide_prayer_times,
    guide_donations, guide_users, guide_faqs, guide_troubleshooting,
    donation_receipt_html, donation_receipt_pdf,
)


def _donation_dashboard_view(request):
    """Dedicated donation dashboard page with tiered access."""
    from django.shortcuts import render
    from .dashboard import (
        can_view_donation_details, can_view_donation_summary,
        get_full_dashboard_data, get_summary_dashboard_data,
    )

    if can_view_donation_details(request.user):
        level = "full"
        data = get_full_dashboard_data()
    elif can_view_donation_summary(request.user):
        level = "summary"
        data = get_summary_dashboard_data()
    else:
        level = "none"
        data = {}

    context = {
        "title": "Donation Dashboard",
        "level": level,
        "data": data,
        "is_nav_sidebar_enabled": True,
        "available_apps": [],
        "is_popup": False,
    }
    return render(request, "admin/dashboard/donations.html", context)


_original_get_urls = admin.AdminSite.get_urls


def _custom_get_urls(self):
    custom_urls = [
        # Guide pages
        path("guide/", self.admin_view(guide_index), name="guide_index"),
        path("guide/announcements/", self.admin_view(guide_announcements), name="guide_announcements"),
        path("guide/events/", self.admin_view(guide_events), name="guide_events"),
        path("guide/prayer-times/", self.admin_view(guide_prayer_times), name="guide_prayer_times"),
        path("guide/donations/", self.admin_view(guide_donations), name="guide_donations"),
        path("guide/users/", self.admin_view(guide_users), name="guide_users"),
        path("guide/faqs/", self.admin_view(guide_faqs), name="guide_faqs"),
        path("guide/troubleshooting/", self.admin_view(guide_troubleshooting), name="guide_troubleshooting"),
        # Donation dashboard
        path("donations/dashboard/", self.admin_view(_donation_dashboard_view), name="donation_dashboard"),
        # Donation receipts
        path("receipts/donation/<uuid:pk>/", self.admin_view(donation_receipt_html), name="donation_receipt_html"),
        path("receipts/donation/<uuid:pk>/pdf/", self.admin_view(donation_receipt_pdf), name="donation_receipt_pdf"),
    ]
    return custom_urls + _original_get_urls(self)


admin.AdminSite.get_urls = _custom_get_urls
