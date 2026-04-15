# Backend — Django REST Framework

Lives in `/backend/`. Django 5 + DRF, Token authentication, self-hosted on Digital Ocean (Docker + Coolify, same pattern as Orphanages).

## Stack

- Django 5 + Django REST Framework
- PostgreSQL
- drf-spectacular — OpenAPI schema at `/api/schema/`, Swagger UI at `/api/docs/`
- Django Unfold — admin theme (Sacred Blue)
- django-environ — env-based settings
- Gunicorn — 2 workers, 2 threads, 30s timeout, 1000 max requests with jitter

## Structure

```
/backend
  /config/              # Django settings, URLs, WSGI
    settings.py         # Env-based via django-environ
    urls.py
  /core/                # Models + admin
    models.py
    admin.py            # Unfold-themed (Sacred Blue brand)
    management/commands/seed_data.py
  /api/                 # REST API
    serializers.py
    views.py
    urls.py
  manage.py
  requirements.txt
  .env / .env.example
```

## API Endpoints

```
POST /api/v1/auth/register/          # Register + token
POST /api/v1/auth/login/             # Login + token
POST /api/v1/auth/logout/            # Invalidate token
GET  /api/v1/auth/me/                # Current user

GET  /api/v1/mosques/                # List (?city=, ?search=)
GET  /api/v1/mosques/{id}/
GET  /api/v1/mosques/nearby/?lat=&lng=&radius=  # Haversine

GET  /api/v1/announcements/?mosque_ids=id1,id2
POST /api/v1/announcements/          # auth required

GET  /api/v1/events/?mosque_ids=id1,id2&from_date=YYYY-MM-DD&category=lesson
POST /api/v1/events/                 # auth required

POST /api/v1/push-tokens/            # Register push token (AllowAny — anon registrations supported so the app can receive announcements pre-sign-in; user=None until a later sign-in links the token)

POST /api/v1/donate/checkout/        # Stripe Checkout Session (mobile uses url mode; web no longer calls)
GET  /api/v1/donate/session-status/  # Verify session completion
POST /api/v1/stripe/webhook/         # Signature-verified, idempotent
GET  /api/v1/gift-aid/summary/       # Admin-only

POST /api/v1/contact/                # Contact form
POST /api/v1/feedback/               # User feedback

GET  /api/schema/                    # OpenAPI schema — staff session required
GET  /api/docs/                      # Swagger UI — staff session required

GET  /health/                        # Health check
GET  /admin/                         # Django admin (Unfold)
```

## Models

- **User** — UUID PK, extends `AbstractUser` with `name` field
- **Mosque** — name, address, city, state, country, lat/lng, calculation_method, jumua_time, contact info, photo
- **Announcement** — mosque FK, title, body, priority (normal/urgent/janazah), published_at, expires_at (indexed), author FK
- **Event** — mosque FK, title, description, speaker, event_date, start/end_time, recurring (weekly/monthly), category (lesson/lecture/quran_circle/youth/sisters/community)
- **UserSubscription** — user FK, mosque FK, notify_prayers/announcements/events, prayer_reminder_minutes
- **PushToken** — user FK, token (unique), platform (ios/android)
- **MosqueAdmin** — mosque FK, user FK, role (admin/super_admin)
- **Feedback** — user feedback submissions
- **MosquePrayerTime** — cached prayer times per mosque
- **PasswordResetToken** — password reset flow
- **StripeEvent** — idempotent webhook event log (stripe_event_id, event_type, processed, payload)
- **CharityGiftAidSettings** — HMRC Gift Aid configuration
- **Donation** — amount_pence, currency, frequency (one-time/monthly), source, gift_aid_eligible, Stripe IDs (checkout session, payment intent, customer), donor details
- **GiftAidDeclaration** — donor declarations for HMRC reclaim (linked to Donation)
- **GiftAidClaim** — batched HMRC claim submissions

## Rate Limiting

- Content creation (announcements, events) → `ContentCreationRateThrottle`
- Auth endpoints → 5/min
- Nearby mosques → 30/min

## Commands

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py createsuperuser
python manage.py runserver            # Port 8000
```

**Management commands**
```bash
python manage.py scrape_timetables
python manage.py scrape_all_timetables
python manage.py export_timetable_json
python manage.py fix_prayer_times
python manage.py generate_gift_aid_xml
python manage.py test_push
```

**Operational scripts** (`backend/scripts/`)
```bash
./scripts/deploy.sh                   # Docker-based deploy with rollback
./scripts/backup.sh                   # Database backup
./scripts/restore.sh                  # Restore from backup
./scripts/update-deps.sh              # Update Python dependencies
```

## Stripe Integration

- **Webhooks**: `POST /api/v1/stripe/webhook/` — signature-verified, idempotent via `StripeEvent` model.
- **Events handled**: `checkout.session.completed`, `invoice.payment_succeeded/failed`, `customer.subscription.created/deleted`, `payment_intent.succeeded`, `charge.refunded`.
- **Gift Aid**: Auto-creates `GiftAidDeclaration` on checkout completion when opted in.
- **Receipt emails**: Sent automatically after successful donation.
- **Env**: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
- See `BUSINESS.md` for the donation model itself.

## Admin Panel

- Django admin at `/admin/` with Unfold theme (Sacred Blue brand colours).
- Designed for non-technical users — see `DESIGN.md` § Admin UX.

## API docs access

`/api/docs/` (Swagger UI) and `/api/schema/` (OpenAPI YAML) are **gated behind a Django staff session** (`staff_member_required`). Anonymous and non-staff authenticated requests are redirected to `/admin/login/`.

Why: exposing the schema publicly hands attackers the full endpoint map, including admin-adjacent routes (`/api/v1/gift-aid/summary/`, `/api/v1/auth/admin-roles/`). Developers who need the docs log into `/admin/` first with a staff account, then `/api/docs/` is accessible via the same session cookie.

Both routes are gated because Swagger UI fetches the schema client-side — a public schema endpoint alone defeats the gate on the UI.

## Deployment

The backend runs as a Docker container managed by **Coolify** on the Digital Ocean host. There is exactly one routine deploy pathway; everything else is emergency-only.

### Responsibility split

| System | Owns |
|---|---|
| **GitHub Actions** (`.github/workflows/ci.yml`) | `tsc --noEmit`, `eslint .`, Jest, Django migrate + test, Expo OTA, **triggering the Coolify deploy** |
| **Coolify** | Dockerfile build, env var injection, database connection, migrate-on-boot, rolling container restart |

### Deploy flow (push → prod)

1. Commit pushed to `main`.
2. CI runs `frontend` + `backend` jobs (in parallel).
3. On green from both, the `deploy-backend` job in CI fires a single `curl -X POST` against the Coolify deploy webhook (`secrets.COOLIFY_DEPLOY_WEBHOOK_URL`).
4. Coolify receives the webhook, pulls `main`, rebuilds the image, applies migrations, restarts containers.
5. If CI is red, the webhook is never called → no deploy.

Coolify's own **"auto deploy on push"** toggle is **OFF**. The CI webhook is the sole deploy trigger. This prevents the "two steering wheels" problem where Coolify's git watcher and a separate CI deploy step race each other.

### Webhook configuration

- `COOLIFY_DEPLOY_WEBHOOK_URL` — GitHub Actions secret. Full webhook URL from Coolify → backend app → Settings → Deploy Webhook. The URL embeds the app UUID and auth token in its query string.
- No other deploy secrets in GitHub. (The old `SERVER_HOST` / `SERVER_USER` / `SERVER_SSH_KEY` secrets from the pre-Coolify SSH pipeline should be deleted from the repo settings — they are orphaned.)

### Emergency manual deploy

If Coolify is unreachable and a backend deploy cannot wait for it to come back, `backend/scripts/deploy.sh` is preserved as a manual fallback. It SSHes nowhere by itself — you have to be on the host already. It reproduces what Coolify does (pull, build, migrate, restart) via `docker-compose.prod.yml`. Do not use it as the routine path; if you find yourself running it more than once a quarter, fix the Coolify pipeline instead.
