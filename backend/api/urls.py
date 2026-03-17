from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("mosques", views.MosqueViewSet)
router.register("announcements", views.AnnouncementViewSet, basename="announcement")
router.register("events", views.EventViewSet, basename="event")
router.register("subscriptions", views.UserSubscriptionViewSet, basename="subscription")
router.register("feedback", views.FeedbackViewSet, basename="feedback")

prayer_time_router = DefaultRouter()
prayer_time_router.register("", views.MosquePrayerTimeViewSet, basename="mosque-prayer-time")

urlpatterns = [
    # Auth
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login, name="login"),
    path("auth/social/", views.social_login, name="social-login"),
    path("auth/logout/", views.logout, name="logout"),
    path("auth/me/", views.me, name="me"),
    path("auth/export-data/", views.export_user_data, name="export-data"),
    path("auth/delete-account/", views.delete_account, name="delete-account"),
    # Push tokens
    path("push-tokens/", views.register_push_token, name="push-token"),
    # Router-generated CRUD (must come before nested routes to avoid shadowing detail views)
    path("", include(router.urls)),
    # Nested: /mosques/{mosque_pk}/prayer-times/
    path("mosques/<uuid:mosque_pk>/prayer-times/", include(prayer_time_router.urls)),
    # Contact form
    path("contact/", views.contact_submit, name="contact"),
    # Donations
    path("donate/", views.create_donation, name="donate"),
    # Stripe
    path("donate/checkout/", views.create_checkout_session, name="donate-checkout"),
    path(
        "donate/session-status/",
        views.checkout_session_status,
        name="donate-session-status",
    ),
    path("stripe/webhook/", views.stripe_webhook, name="stripe-webhook"),
]
