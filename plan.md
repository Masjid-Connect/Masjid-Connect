# Feedback System — 10-Year Architecture Plan

## Problem
Report Issue and Feature Request currently bounce users to their native mail client. This is fragile (no mail app = dead end), untraceable (reports vanish into an inbox), and unscalable (no categorization, no status tracking, no analytics).

## Design Principles
- **Data lives in the database, not email** — every submission is a first-class Django model
- **Admin gets notified instantly** — email alert on every new submission
- **Status lifecycle** — new → acknowledged → in_progress → resolved → closed
- **No external dependencies for MVP** — Django's built-in `send_mail` + console backend in dev, SMTP in prod
- **Frontend stays simple** — POST to endpoint, show success toast, done
- **10-year maintainability** — standard Django patterns, no magic, trivially extensible

---

## Phase 1: Backend — Feedback Model (`backend/core/models.py`)

New `Feedback` model following all existing conventions (UUID pk, TextChoices, auto timestamps):

```
Feedback
├── id              UUID (pk, default=uuid4)
├── user            FK → User (nullable — guests can submit too)
├── type            TextChoices: "bug_report" | "feature_request"
├── category        CharField (matches frontend pill categories)
├── description     TextField (optional user input)
├── status          TextChoices: "new" | "acknowledged" | "in_progress" | "resolved" | "closed"
├── admin_notes     TextField (internal notes, not visible to user)
├── device_info     JSONField (platform, os_version, app_version, device_model, screen_size, theme)
├── created         DateTimeField (auto_now_add)
├── updated         DateTimeField (auto_now)
└── resolved_at     DateTimeField (nullable)
```

## Phase 2: Backend — Admin Registration (`backend/core/admin.py`)

- Register with Unfold `ModelAdmin` (matching all existing admin patterns)
- `list_display`: type, category, status, user email, created
- `list_filter`: type, status, category
- `search_fields`: description, user__email
- `date_hierarchy`: created
- `ordering`: ["-created"]
- Add to Unfold sidebar under new "Feedback" section with "feedback" icon
- Read-only `device_info` display (JSON pretty-printed)

## Phase 3: Backend — API Endpoint

```
POST /api/v1/feedback/          # Submit (AllowAny — guests too)
GET  /api/v1/feedback/          # List own feedback (IsAuthenticated)
GET  /api/v1/feedback/{id}/     # Detail (IsAuthenticated, own only)
```

- `FeedbackCreateSerializer` — write-only: type, category, description, device_info
- `FeedbackSerializer` — read-only for listing
- `perform_create()` attaches `request.user` if authenticated
- Custom throttle: 5 submissions/hour per IP (spam prevention)

## Phase 4: Backend — Admin Email Notification (`backend/core/signals.py`)

- New file: `backend/core/signals.py`
- `post_save` signal on Feedback (creation only, not updates)
- Sends structured email to `FEEDBACK_NOTIFY_EMAIL` setting
- Email body: type, category, description, device info, user email, admin link
- Wire up in `CoreConfig.ready()` in `apps.py`

## Phase 5: Backend — Email Configuration (`backend/config/settings.py`)

```python
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@salafimasjid.app")
FEEDBACK_NOTIFY_EMAIL = env("FEEDBACK_NOTIFY_EMAIL", default="info@salafimasjid.app")
```

Console backend in dev (prints to terminal), real SMTP in production via `.env`.

## Phase 6: Backend — Migration

Single auto-generated migration for the Feedback table.

## Phase 7: Frontend — API Client (`lib/api.ts`)

Add `submitFeedback(data)` function that POSTs to `/api/v1/feedback/`.

## Phase 8: Frontend — Update Both Sheets

Replace `Linking.openURL(mailto:...)` with:
1. Call `submitFeedback()` with type, category, description, device_info
2. On success → dismiss sheet + show success toast
3. On network failure → fall back to mailto (graceful degradation)

## Phase 9: Frontend — i18n for Success/Error States

Add toast message keys to `en.json` and `ar.json`.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `backend/core/models.py` | Add `Feedback` model |
| `backend/core/admin.py` | Register `FeedbackAdmin` with Unfold |
| `backend/core/signals.py` | **Create** — post_save email notification |
| `backend/core/apps.py` | Wire signals in `ready()` |
| `backend/api/serializers.py` | Add `FeedbackCreateSerializer` + `FeedbackSerializer` |
| `backend/api/views.py` | Add `FeedbackViewSet` |
| `backend/api/urls.py` | Register feedback route |
| `backend/config/settings.py` | Add email config + `FEEDBACK_NOTIFY_EMAIL` |
| `backend/core/migrations/` | Auto-generated migration |
| `lib/api.ts` | Add `submitFeedback()` |
| `components/settings/ReportIssueSheet.tsx` | Replace mailto with API call + toast |
| `components/settings/FeatureRequestSheet.tsx` | Replace mailto with API call + toast |
| `constants/locales/en.json` | Add success/error toast keys |
| `constants/locales/ar.json` | Add success/error toast keys |
