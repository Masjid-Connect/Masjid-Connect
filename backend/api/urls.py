from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("mosques", views.MosqueViewSet)
router.register("announcements", views.AnnouncementViewSet, basename="announcement")
router.register("events", views.EventViewSet, basename="event")
router.register("subscriptions", views.UserSubscriptionViewSet, basename="subscription")

urlpatterns = [
    # Auth
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login, name="login"),
    path("auth/social/", views.social_login, name="social-login"),
    path("auth/logout/", views.logout, name="logout"),
    path("auth/me/", views.me, name="me"),
    # Push tokens
    path("push-tokens/", views.register_push_token, name="push-token"),
    # Router-generated CRUD
    path("", include(router.urls)),
]
