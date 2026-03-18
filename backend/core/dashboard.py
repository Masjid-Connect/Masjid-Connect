"""Dashboard data layer and access control for the admin homepage."""

import datetime
import json

from django.db.models import Sum, Count, Q
from django.utils import timezone

from .models import Donation, GiftAidClaim, GiftAidDeclaration, MosqueAdmin, UserSubscription


# ── Access helpers ───────────────────────────────────────────────────


def can_view_donation_details(user):
    """Can this user see individual donation amounts and donor info?

    Granted to: superusers, users with explicit permission, Super Admins.
    """
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    if user.has_perm("core.view_donation_details"):
        return True
    return MosqueAdmin.objects.filter(user=user, role="super_admin").exists()


def can_view_donation_summary(user):
    """Can this user see aggregated donation totals (no PII)?

    Granted to: anyone who can see details, plus any mosque admin.
    """
    if can_view_donation_details(user):
        return True
    return MosqueAdmin.objects.filter(user=user).exists()


# ── Data aggregation ─────────────────────────────────────────────────


def _donation_stats_for_period(start_date, end_date=None):
    """Aggregate donation stats for a date range."""
    qs = Donation.objects.filter(donation_date__gte=start_date)
    if end_date:
        qs = qs.filter(donation_date__lte=end_date)

    agg = qs.aggregate(
        total_pence=Sum("amount_pence"),
        total_gift_aid_pence=Sum("gift_aid_amount_pence"),
        count=Count("id"),
        gift_aid_count=Count("id", filter=Q(gift_aid_eligible=True)),
    )
    return {
        "total_pounds": (agg["total_pence"] or 0) / 100,
        "total_gift_aid_pounds": (agg["total_gift_aid_pence"] or 0) / 100,
        "count": agg["count"] or 0,
        "gift_aid_count": agg["gift_aid_count"] or 0,
    }


def get_full_dashboard_data():
    """Full dashboard data for Super Admins — amounts, donors, Gift Aid."""
    today = timezone.now().date()
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)

    # Key metrics
    today_stats = _donation_stats_for_period(today, today)
    month_stats = _donation_stats_for_period(month_start)
    year_stats = _donation_stats_for_period(year_start)

    # Unclaimed Gift Aid (donations with gift_aid_eligible not in accepted/submitted claims)
    claimed_donation_ids = Donation.objects.filter(
        gift_aid_claims__status__in=["submitted", "accepted"],
    ).values_list("id", flat=True)
    unclaimed = Donation.objects.filter(
        gift_aid_eligible=True,
    ).exclude(id__in=claimed_donation_ids).aggregate(
        total_pence=Sum("gift_aid_amount_pence"),
        count=Count("id"),
    )
    unclaimed_gift_aid_pounds = (unclaimed["total_pence"] or 0) / 100
    unclaimed_gift_aid_count = unclaimed["count"] or 0

    # Recent donations (last 5)
    recent_donations = list(
        Donation.objects.order_by("-donation_date", "-created")[:5].values(
            "id", "donor_name", "donor_email", "amount_pence",
            "donation_date", "gift_aid_eligible", "source",
        )
    )
    for d in recent_donations:
        d["amount_pounds"] = f"{d['amount_pence'] / 100:.2f}"

    # Gift Aid status
    active_declarations = GiftAidDeclaration.objects.filter(status="active").count()
    last_claim = GiftAidClaim.objects.filter(
        status__in=["submitted", "accepted"]
    ).order_by("-submitted_date").first()
    draft_claims = GiftAidClaim.objects.filter(status="draft").count()

    # Frequency breakdown
    frequency_data = dict(
        Donation.objects.values_list("frequency").annotate(
            total=Sum("amount_pence")
        ).values_list("frequency", "total")
    )

    # Source breakdown
    source_data = dict(
        Donation.objects.values_list("source").annotate(
            total=Sum("amount_pence")
        ).values_list("source", "total")
    )

    # Monthly trend (last 12 months)
    monthly_trend = []
    for i in range(11, -1, -1):
        d = today.replace(day=1) - datetime.timedelta(days=i * 30)
        m_start = d.replace(day=1)
        if m_start.month == 12:
            m_end = m_start.replace(year=m_start.year + 1, month=1, day=1) - datetime.timedelta(days=1)
        else:
            m_end = m_start.replace(month=m_start.month + 1, day=1) - datetime.timedelta(days=1)
        stats = _donation_stats_for_period(m_start, m_end)
        monthly_trend.append({
            "month": m_start.strftime("%b %Y"),
            "total_pounds": stats["total_pounds"],
            "count": stats["count"],
            "gift_aid_pounds": stats["total_gift_aid_pounds"],
        })

    # Top donors (by total donated)
    top_donors = list(
        Donation.objects.values("donor_name", "donor_email")
        .annotate(
            total_pence=Sum("amount_pence"),
            donation_count=Count("id"),
        )
        .order_by("-total_pence")[:10]
    )
    for d in top_donors:
        d["total_pounds"] = f"{d['total_pence'] / 100:.2f}"

    return {
        "today_stats": today_stats,
        "month_stats": month_stats,
        "year_stats": year_stats,
        "unclaimed_gift_aid_pounds": unclaimed_gift_aid_pounds,
        "unclaimed_gift_aid_count": unclaimed_gift_aid_count,
        "recent_donations": recent_donations,
        "active_declarations": active_declarations,
        "last_claim": {
            "reference": last_claim.reference if last_claim else None,
            "submitted_date": str(last_claim.submitted_date) if last_claim and last_claim.submitted_date else None,
            "status": last_claim.get_status_display() if last_claim else None,
        },
        "draft_claims": draft_claims,
        "frequency_data_json": json.dumps({
            "one_time": (frequency_data.get("one_time", 0) or 0) / 100,
            "monthly": (frequency_data.get("monthly", 0) or 0) / 100,
        }),
        "source_data_json": json.dumps({
            k: (v or 0) / 100 for k, v in source_data.items()
        }),
        "monthly_trend_json": json.dumps(monthly_trend),
        "top_donors": top_donors,
    }


def get_summary_dashboard_data():
    """Summary data for Regular Admins — counts only, no amounts or PII."""
    today = timezone.now().date()
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)

    month_count = Donation.objects.filter(donation_date__gte=month_start).count()
    year_count = Donation.objects.filter(donation_date__gte=year_start).count()

    # Subscriber growth this month
    new_subscribers = UserSubscription.objects.filter(created__date__gte=month_start).count()
    total_subscribers = UserSubscription.objects.count()

    # Monthly donation counts (last 12 months, no amounts)
    monthly_counts = []
    for i in range(11, -1, -1):
        d = today.replace(day=1) - datetime.timedelta(days=i * 30)
        m_start = d.replace(day=1)
        if m_start.month == 12:
            m_end = m_start.replace(year=m_start.year + 1, month=1, day=1) - datetime.timedelta(days=1)
        else:
            m_end = m_start.replace(month=m_start.month + 1, day=1) - datetime.timedelta(days=1)
        count = Donation.objects.filter(
            donation_date__gte=m_start, donation_date__lte=m_end,
        ).count()
        monthly_counts.append({
            "month": m_start.strftime("%b %Y"),
            "count": count,
        })

    return {
        "month_count": month_count,
        "year_count": year_count,
        "new_subscribers": new_subscribers,
        "total_subscribers": total_subscribers,
        "monthly_counts_json": json.dumps(monthly_counts),
    }


# ── Unfold DASHBOARD_CALLBACK ───────────────────────────────────────


def dashboard_callback(request, context):
    """Unfold DASHBOARD_CALLBACK — injects dashboard data based on user access level."""
    user = request.user

    if can_view_donation_details(user):
        context["dashboard_level"] = "full"
        context["dashboard"] = get_full_dashboard_data()
    elif can_view_donation_summary(user):
        context["dashboard_level"] = "summary"
        context["dashboard"] = get_summary_dashboard_data()
    else:
        context["dashboard_level"] = "none"
        context["dashboard"] = {}

    return context
