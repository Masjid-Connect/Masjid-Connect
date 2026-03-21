from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(request):
    response = JsonResponse({"status": "ok"})
    # Ensure CORS works even if middleware is bypassed by proxy/CDN
    origin = request.META.get("HTTP_ORIGIN", "")
    if origin:
        response["Access-Control-Allow-Origin"] = origin
    return response


def api_root(request):
    """Root endpoint — friendly landing for anyone hitting the base URL."""
    return JsonResponse({
        "name": "The Salafi Masjid API",
        "status": "ok",
        "docs": "/api/docs/",
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
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
