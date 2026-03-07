"""Django settings for Masjid Connect."""

import os
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["*"]),
    DATABASE_URL=(str, "sqlite:///db.sqlite3"),
    SECRET_KEY=(str, "change-me-in-production"),
    CORS_ALLOWED_ORIGINS=(list, []),
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
    # Local
    "core",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
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
}

# CORS
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

# Unfold admin theme
UNFOLD = {
    "SITE_TITLE": "Masjid Connect",
    "SITE_HEADER": "Masjid Connect Admin",
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
                "title": "Users",
                "items": [
                    {"title": "Users", "link": "/admin/core/user/", "icon": "person"},
                    {"title": "Subscriptions", "link": "/admin/core/usersubscription/", "icon": "notifications"},
                    {"title": "Push Tokens", "link": "/admin/core/pushtoken/", "icon": "phone_android"},
                ],
            },
        ],
    },
}
