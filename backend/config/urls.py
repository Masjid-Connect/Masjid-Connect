from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(request):
    return JsonResponse({"status": "ok"})


def cors_debug(request):
    """Temporary diagnostic endpoint — shows CORS config. Remove after debugging."""
    import os

    cors_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
    cors_all = getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False)
    csrf_origins = getattr(settings, "CSRF_TRUSTED_ORIGINS", [])
    allowed_hosts = getattr(settings, "ALLOWED_HOSTS", [])

    response = JsonResponse({
        "status": "cors_debug",
        "CORS_ALLOWED_ORIGINS": cors_origins,
        "CORS_ALLOW_ALL_ORIGINS": cors_all,
        "CORS_ALLOWED_ORIGIN_REGEXES": bool(getattr(settings, "CORS_ALLOWED_ORIGIN_REGEXES", [])),
        "CSRF_TRUSTED_ORIGINS": csrf_origins,
        "ALLOWED_HOSTS": allowed_hosts,
        "DEBUG": settings.DEBUG,
        "SECURE_SSL_REDIRECT": getattr(settings, "SECURE_SSL_REDIRECT", False),
        "env_CORS_ALLOWED_ORIGINS": os.environ.get("CORS_ALLOWED_ORIGINS", "<NOT SET>"),
        "env_CSRF_TRUSTED_ORIGINS": os.environ.get("CSRF_TRUSTED_ORIGINS", "<NOT SET>"),
        "cors_middleware_installed": "corsheaders.middleware.CorsMiddleware" in settings.MIDDLEWARE,
        "corsheaders_in_apps": "corsheaders" in settings.INSTALLED_APPS,
        "request_origin": request.META.get("HTTP_ORIGIN", "<none>"),
        "request_host": request.META.get("HTTP_HOST", "<none>"),
    })
    # Manually add CORS header so this endpoint is always readable from the browser
    response["Access-Control-Allow-Origin"] = "*"
    return response


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("api.urls")),
    path("health/", health),
    path("debug/cors/", cors_debug),
    path("privacy/", TemplateView.as_view(template_name="legal/privacy_policy.html"), name="privacy-policy"),
    path("terms/", TemplateView.as_view(template_name="legal/terms.html"), name="terms"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
