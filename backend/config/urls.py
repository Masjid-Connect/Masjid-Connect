from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from django.db import connection
from django.http import JsonResponse
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(request):
    """Health check that verifies database connectivity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False

    ok = db_ok
    return JsonResponse(
        {
            "status": "ok" if ok else "degraded",
            "database": "ok" if db_ok else "unavailable",
        },
        status=200 if ok else 503,
    )


def api_root(request):
    """Root endpoint — friendly landing for anyone hitting the base URL.
    Docs at /api/docs/ are gated behind a Django staff session; not
    advertised to unauthenticated callers."""
    return JsonResponse({
        "name": "The Salafi Masjid API",
        "status": "ok",
        "health": "/health/",
        "api": "/api/v1/",
    })


urlpatterns = [
    path("", api_root),
    path("admin/", admin.site.urls),
    path("api/v1/", include("api.urls")),
    path("health/", health),
    path("privacy/", TemplateView.as_view(template_name="legal/privacy_policy.html"), name="privacy-policy"),
    path("terms/", TemplateView.as_view(template_name="legal/terms.html"), name="terms"),
    # API schema + Swagger UI — gated behind Django staff session
    # (staff_member_required redirects anonymous / non-staff requests to
    # /admin/login/). This closes the public exposure of the full endpoint
    # map, including admin-adjacent routes like /api/v1/gift-aid/summary/
    # and /api/v1/auth/admin-roles/. Both routes must be gated — Swagger UI
    # fetches the schema client-side; if only /api/docs/ is gated, attackers
    # hit /api/schema/ directly and bypass.
    path("api/schema/", staff_member_required(SpectacularAPIView.as_view()), name="schema"),
    path("api/docs/", staff_member_required(SpectacularSwaggerView.as_view(url_name="schema")), name="swagger-ui"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
