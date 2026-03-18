"""Django settings for The Salafi Masjid."""

import os
import sys
from pathlib import Path

TESTING = "test" in sys.argv

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    DATABASE_URL=(str, "sqlite:///db.sqlite3"),
    SECRET_KEY=(str, "change-me-in-production"),
    CORS_ALLOWED_ORIGINS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
)

env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

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
    # Local
    "core",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
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

DATABASES = {"default": env.db()}

AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
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

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [] if TESTING else [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
        "feedback": "5/hour",
        "contact": "5/hour",
    },
}

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
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
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@salafimasjid.app")
FEEDBACK_NOTIFY_EMAIL = env("FEEDBACK_NOTIFY_EMAIL", default="info@salafimasjid.app")

# Resend — email service for contact form
RESEND_API_KEY = env("RESEND_API_KEY", default="")
CONTACT_TO_EMAIL = env("CONTACT_TO_EMAIL", default="info@salafimasjid.app")

# Stripe
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
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
    CORS_ALLOW_ALL_ORIGINS = True

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
    "COLORS": {
        "font": {
            "subtle-light": "107 114 128",
            "subtle-dark": "156 163 175",
            "default-light": "43 45 66",
            "default-dark": "209 213 219",
            "important-light": "27 73 101",
            "important-dark": "200 169 81",
        },
        "primary": {
            "50": "240 249 255",
            "100": "224 242 254",
            "200": "186 230 253",
            "300": "125 211 252",
            "400": "56 189 248",
            "500": "27 73 101",
            "600": "22 60 83",
            "700": "18 48 66",
            "800": "14 37 51",
            "900": "12 30 41",
            "950": "8 21 29",
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
                    {"title": "Donations", "link": "/admin/core/donation/", "icon": "volunteer_activism"},
                    {"title": "Gift Aid Declarations", "link": "/admin/core/giftaiddeclaration/", "icon": "description"},
                    {"title": "Gift Aid Claims", "link": "/admin/core/giftaidclaim/", "icon": "request_quote"},
                    {"title": "Charity Settings", "link": "/admin/core/charitygiftaidsettings/", "icon": "settings"},
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
