"""Django settings for The Salafi Masjid."""

import os
import sys
from datetime import timedelta
from pathlib import Path

TESTING = "test" in sys.argv

import logging
import environ
import sentry_sdk
from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parent.parent

_INSECURE_SECRET_KEY = "django-insecure-dev-only-change-me"

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    DATABASE_URL=(str, "postgres://localhost:5432/masjid_connect"),
    SECRET_KEY=(str, _INSECURE_SECRET_KEY),
    CORS_ALLOWED_ORIGINS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
)

env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")

# In production, generate a random key if none was explicitly set.
# This lets the app start (health checks pass) but sessions/tokens won't
# persist across container restarts — operators should set a proper key.
if not DEBUG and SECRET_KEY == _INSECURE_SECRET_KEY:
    SECRET_KEY = get_random_secret_key()
    logger = logging.getLogger("django")
    logger.critical(
        "SECRET_KEY is not set — using a random key. "
        "Sessions will be lost on restart. "
        "Set SECRET_KEY in your environment variables or .env file."
    )
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

# Safety check: production must have explicit ALLOWED_HOSTS
if not DEBUG and not ALLOWED_HOSTS:
    logger = logging.getLogger("django")
    logger.critical(
        "ALLOWED_HOSTS is empty in production. "
        "Set ALLOWED_HOSTS in your environment variables or .env file."
    )

INSTALLED_APPS = [
    "unfold",
    "unfold.contrib.filters",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "axes",
    # Local
    "core",
    "api",
]

MIDDLEWARE = [
    "config.middleware.RequestCorrelationMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "config.middleware.ContentSecurityPolicyMiddleware",
    "axes.middleware.AxesMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {"default": {**env.db(), "CONN_MAX_AGE": 600}}

AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Limit uploaded file size to 10 MB (prevents memory exhaustion from large uploads)
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Auth token expiration — tokens older than this are rejected
TOKEN_TTL = timedelta(days=30)

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.authentication.ExpiringTokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "api.pagination.AppPageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [] if TESTING else [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/hour",
        "user": "500/hour",
        "feedback": "5/hour",
        "contact": "5/hour",
        "content_creation": "30/hour",
        "data_export": "3/day",
    },
}

# Logging
_LOG_FORMATTER = "json" if not DEBUG else "verbose"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
        },
        "json": {
            "()": "config.logging_formatter.JSONFormatter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": _LOG_FORMATTER,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "api": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# Email — console backend in dev, SMTP in production via .env
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@salafimasjid.app")
FEEDBACK_NOTIFY_EMAIL = env("FEEDBACK_NOTIFY_EMAIL", default="info@salafimasjid.app")

# Resend — email service for contact form
RESEND_API_KEY = env("RESEND_API_KEY", default="")
CONTACT_TO_EMAIL = env("CONTACT_TO_EMAIL", default="info@salafimasjid.app")

# Cloudflare Turnstile — server-side validation for contact/donate forms
TURNSTILE_SECRET_KEY = env("TURNSTILE_SECRET_KEY", default="")

# Stripe
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")

# API Documentation
SPECTACULAR_SETTINGS = {
    "TITLE": "The Salafi Masjid API",
    "DESCRIPTION": "REST API for The Salafi Masjid — prayer times, announcements, and events.",
    "VERSION": "1.0.0",
}

# CORS
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
# Allow Cloudflare Pages preview deployments (unique subdomains per deploy)
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://[a-z0-9]+\.masjid-connect\.pages\.dev$",
    r"^https://(www\.)?salafimasjid\.app$",
]
if DEBUG and not CORS_ALLOWED_ORIGINS:
    # Allow common local development origins instead of wildcard CORS_ALLOW_ALL_ORIGINS.
    # Using explicit origins prevents accidental exposure if DEBUG=True leaks to production.
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:3000",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:19006",
        "http://127.0.0.1:3000",
    ]

# CSRF
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS")

# ── Security headers (production only, not during tests) ──────────────
if not DEBUG and not TESTING:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = True
    SECURE_REDIRECT_EXEMPT = [r"^health/$"]  # allow internal HTTP health checks
    # Trust X-Forwarded-Proto from Cloudflare/Traefik so Django knows the
    # original request was HTTPS and doesn't 301-redirect (which breaks CORS
    # preflight OPTIONS requests because the redirect lacks CORS headers).
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"

# Unfold admin theme
UNFOLD = {
    "SITE_TITLE": "The Salafi Masjid",
    "SITE_HEADER": "The Salafi Masjid Admin",
    "DASHBOARD_CALLBACK": "core.dashboard.dashboard_callback",
    "SITE_LOGO": {
        "light": lambda request: "/static/admin/img/Masjid_Logo.png",
        "dark": lambda request: "/static/admin/img/Masjid_Logo.png",
    },
    "SITE_ICON": lambda request: "/static/admin/img/Masjid_Logo.png",
    "SITE_FAVICONS": [
        {"rel": "icon", "sizes": "any", "href": lambda request: "/static/admin/img/Masjid_Logo.png"},
    ],
    "COLORS": {
        "font": {
            "subtle-light": "107 114 128",
            "subtle-dark": "156 163 175",
            "default-light": "18 18 22",
            "default-dark": "245 245 247",
            "important-light": "15 45 82",
            "important-dark": "212 175 55",
        },
        "primary": {
            "50": "232 238 247",
            "100": "209 222 238",
            "200": "163 189 218",
            "300": "116 155 198",
            "400": "70 122 178",
            "500": "36 90 148",
            "600": "25 68 118",
            "700": "15 45 82",
            "800": "10 31 58",
            "900": "6 20 37",
            "950": "3 12 22",
        },
    },
    "SIDEBAR": {
        "navigation": [
            {
                "title": "Mosques",
                "items": [
                    {"title": "Mosques", "link": "/admin/core/mosque/", "icon": "mosque"},
                    {"title": "Mosque Admins", "link": "/admin/core/mosqueadmin/", "icon": "admin_panel_settings"},
                    {"title": "Prayer Times", "link": "/admin/core/mosqueprayertime/", "icon": "schedule"},
                ],
            },
            {
                "title": "Content",
                "items": [
                    {"title": "Announcements", "link": "/admin/core/announcement/", "icon": "campaign"},
                    {"title": "Events", "link": "/admin/core/event/", "icon": "event"},
                ],
            },
            {
                "title": "Donations & Gift Aid",
                "items": [
                    {"title": "Dashboard", "link": "/admin/donations/dashboard/", "icon": "dashboard", "permission": "core.dashboard.can_view_donation_summary"},
                    {"title": "Donations", "link": "/admin/core/donation/", "icon": "volunteer_activism", "permission": "core.dashboard.can_view_donation_details"},
                    {"title": "Gift Aid Declarations", "link": "/admin/core/giftaiddeclaration/", "icon": "description", "permission": "core.dashboard.can_view_donation_details"},
                    {"title": "Gift Aid Claims", "link": "/admin/core/giftaidclaim/", "icon": "request_quote", "permission": "core.dashboard.can_view_donation_details"},
                    {"title": "Charity Settings", "link": "/admin/core/charitygiftaidsettings/", "icon": "settings", "permission": "core.dashboard.can_view_donation_details"},
                ],
            },
            {
                "title": "Feedback",
                "items": [
                    {"title": "Feedback", "link": "/admin/core/feedback/", "icon": "feedback"},
                ],
            },
            {
                "title": "Users",
                "items": [
                    {"title": "Users", "link": "/admin/core/user/", "icon": "person"},
                    {"title": "Subscriptions", "link": "/admin/core/usersubscription/", "icon": "notifications"},
                    {"title": "Push Tokens", "link": "/admin/core/pushtoken/", "icon": "phone_android"},
                ],
            },
            {
                "title": "Help & Guides",
                "separator": True,
                "items": [
                    {"title": "User Guide", "link": "/admin/guide/", "icon": "menu_book"},
                    {"title": "FAQs", "link": "/admin/guide/faqs/", "icon": "help"},
                    {"title": "Troubleshooting", "link": "/admin/guide/troubleshooting/", "icon": "build"},
                ],
            },
        ],
    },
}

# ── django-axes — brute-force login protection ─────────────────────────
AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
]
AXES_FAILURE_LIMIT = 5  # Lock after 5 failed attempts
AXES_COOLOFF_TIME = timedelta(minutes=30)  # 30 minute lockout
AXES_LOCKOUT_PARAMETERS = ["ip_address"]  # Lock by IP
AXES_RESET_ON_SUCCESS = True  # Reset counter on successful login

# ── Sentry — error tracking ──────────────────────────────────────────
SENTRY_DSN_BACKEND = env("SENTRY_DSN_BACKEND", default="")

if SENTRY_DSN_BACKEND and not TESTING:
    sentry_sdk.init(
        dsn=SENTRY_DSN_BACKEND,
        # Send 100% of errors, sample 10% of performance transactions
        traces_sample_rate=0.1,
        # Never attach PII (emails, usernames, IPs) to error reports
        send_default_pii=False,
        # Tag with environment for filtering in Sentry dashboard
        environment="production" if not DEBUG else "development",
    )
