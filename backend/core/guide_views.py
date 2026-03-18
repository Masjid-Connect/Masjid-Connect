"""Admin guide views and donation receipt views."""

import datetime

from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpResponse, Http404
from django.template.loader import render_to_string
from django.shortcuts import get_object_or_404, render

from .models import CharityGiftAidSettings, Donation


# ── Guide pages ──────────────────────────────────────────────────────

GUIDE_PAGES = {
    "index": {
        "template": "admin/guide/index.html",
        "title": "User Guide",
        "section": "",
    },
    "announcements": {
        "template": "admin/guide/announcements.html",
        "title": "Managing Announcements",
        "section": "Announcements",
    },
    "events": {
        "template": "admin/guide/events.html",
        "title": "Events & Lessons",
        "section": "Events & Lessons",
    },
    "prayer_times": {
        "template": "admin/guide/prayer_times.html",
        "title": "Prayer Times",
        "section": "Prayer Times",
    },
    "donations": {
        "template": "admin/guide/donations.html",
        "title": "Donations & Gift Aid",
        "section": "Donations & Gift Aid",
    },
    "users": {
        "template": "admin/guide/users.html",
        "title": "Users & Subscribers",
        "section": "Users & Subscribers",
    },
    "faqs": {
        "template": "admin/guide/faqs.html",
        "title": "FAQs",
        "section": "FAQs",
    },
    "troubleshooting": {
        "template": "admin/guide/troubleshooting.html",
        "title": "Troubleshooting",
        "section": "Troubleshooting",
    },
}


def _guide_view(page_key):
    """Create a guide view for the given page key."""
    page = GUIDE_PAGES[page_key]

    @staff_member_required
    def view(request):
        context = {
            "guide_title": page["title"],
            "guide_section": page["section"],
            "title": page["title"],
            "is_nav_sidebar_enabled": True,
            "available_apps": [],
            "is_popup": False,
        }
        return render(request, page["template"], context)

    view.__name__ = f"guide_{page_key}"
    return view


# Generate all guide views
guide_index = _guide_view("index")
guide_announcements = _guide_view("announcements")
guide_events = _guide_view("events")
guide_prayer_times = _guide_view("prayer_times")
guide_donations = _guide_view("donations")
guide_users = _guide_view("users")
guide_faqs = _guide_view("faqs")
guide_troubleshooting = _guide_view("troubleshooting")


# ── Donation receipts ────────────────────────────────────────────────

def _get_charity_context():
    """Get charity details from settings for receipts."""
    settings = CharityGiftAidSettings.get()
    if settings:
        return {
            "charity_name": settings.charity_name,
            "hmrc_reference": settings.hmrc_reference,
            "regulator_number": settings.regulator_number,
        }
    return {
        "charity_name": "The Salafi Masjid",
        "hmrc_reference": "",
        "regulator_number": "",
    }


def _receipt_context(donation):
    """Build template context for a donation receipt."""
    ctx = _get_charity_context()
    ctx.update({
        "donation": donation,
        "amount_pounds": f"{donation.amount_pence / 100:.2f}",
        "gift_aid_pounds": f"{(donation.gift_aid_amount_pence or 0) / 100:.2f}",
        "today": datetime.date.today(),
    })
    return ctx


@staff_member_required
def donation_receipt_html(request, pk):
    """Render donation receipt as HTML page."""
    donation = get_object_or_404(
        Donation.objects.select_related("gift_aid_declaration"), pk=pk
    )
    context = _receipt_context(donation)
    return render(request, "admin/receipts/donation_receipt.html", context)


@staff_member_required
def donation_receipt_pdf(request, pk):
    """Generate donation receipt as PDF."""
    donation = get_object_or_404(
        Donation.objects.select_related("gift_aid_declaration"), pk=pk
    )
    context = _receipt_context(donation)

    # Try WeasyPrint first, fall back to HTML
    try:
        from weasyprint import HTML

        html_string = render_to_string(
            "admin/receipts/donation_receipt.html", context, request=request
        )
        pdf_bytes = HTML(string=html_string, base_url=request.build_absolute_uri("/")).write_pdf()
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        donor_name = donation.donor_name or "anonymous"
        safe_name = donor_name.replace(" ", "_").lower()
        response["Content-Disposition"] = (
            f'attachment; filename="receipt-{safe_name}-{donation.donation_date}.pdf"'
        )
        return response
    except ImportError:
        # WeasyPrint not installed — redirect to HTML version with print hint
        from django.shortcuts import redirect
        from django.contrib import messages

        messages.info(
            request,
            "PDF generation is not available. Use your browser's Print > Save as PDF instead.",
        )
        from django.urls import reverse
        return redirect(reverse("admin:donation_receipt_html", args=[pk]))
