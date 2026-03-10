# Mosque Connect — Architecture

## Overview
Fully self-hosted architecture on a Digital Ocean droplet managed by Coolify. No third-party cloud dependencies beyond Expo Push Service (free) and app store distribution.

```
                          ┌──────────────┐
                          │  Aladhan API  │  ← Primary prayer times (free, no key)
                          │  (external)   │
                          └──────┬───────┘
                                 │
┌────────────────────────────────┼────────────┐
│              Digital Ocean Droplet           │
│                  (via Coolify)                │
│                                              │
│  ┌──────────────┐    ┌────────────────────┐  │
│  │   Django 5    │    │  Expo Push Service │  │
│  │  + DRF       │    │  (external, free)  │  │
│  │               │    │                    │  │
│  │  - PostgreSQL │    │  - FCM/APNs       │  │
│  │  - Token Auth │    │  - Triggered by    │  │
│  │  - REST API   │    │    Django signals  │  │
│  │  - Unfold     │    └────────────────────┘  │
│  │    Admin UI   │                            │
│  └──────┬───────┘                            │
│         │ :8000                               │
└─────────┼────────────────────────────────────┘
          │
          │ HTTPS (Coolify reverse proxy)
          │
    ┌─────┴──────────┐
    │     Client      │
    │   (Expo App)    │
    │                 │
    │ - Aladhan API   │  ← primary prayer times
    │ - adhan-js      │  ← offline-only fallback
    │ - AsyncStorage  │  ← offline cache
    │ - REST polling  │  ← pull-to-refresh
    └─────────────────┘
```

---

## Django Models (Full Schema)

### User (extends AbstractUser)
UUID primary key. Extended fields:
- `name` (CharField) — display name

### Mosque
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID | auto | uuid4 | Primary key |
| name | CharField | yes | | Mosque name |
| address | CharField | no | | Full street address |
| city | CharField | no | | City for search |
| state | CharField | no | | State/province |
| country | CharField | no | | Country code |
| latitude | FloatField | no | 0 | GPS latitude |
| longitude | FloatField | no | 0 | GPS longitude |
| calculation_method | IntegerField | no | 4 | Aladhan method code (4 = Umm Al-Qura) |
| jumua_time | TimeField | no | | Friday prayer override |
| contact_phone | CharField | no | | |
| contact_email | EmailField | no | | |
| website | URLField | no | | |
| photo | ImageField | no | | Mosque photo |
| created | DateTimeField | auto | | |
| updated | DateTimeField | auto | | |

**Permissions:** List/View = public (AllowAny). Create/Update/Delete = authenticated + mosque admin.

### Announcement
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID | auto | uuid4 | |
| mosque | FK(Mosque) | yes | | CASCADE |
| title | CharField | yes | | |
| body | TextField | yes | | Rich text |
| priority | CharField | no | "normal" | "normal", "urgent" |
| published_at | DateTimeField | auto | auto_now_add | |
| expires_at | DateTimeField | no | | Auto-hide after |
| author | FK(User) | no | | SET_NULL |

**Permissions:** List/View = public. Create/Update/Delete = authenticated.

### Event
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID | auto | uuid4 | |
| mosque | FK(Mosque) | yes | | CASCADE |
| title | CharField | yes | | |
| description | TextField | no | | |
| speaker | CharField | no | | Speaker/teacher name |
| event_date | DateField | yes | | |
| start_time | TimeField | yes | | |
| end_time | TimeField | no | | |
| location | CharField | no | | Defaults to mosque address |
| recurring | CharField | no | | "weekly", "monthly", or blank |
| category | CharField | yes | "lesson" | "lesson", "lecture", "quran_circle", "youth", "sisters", "community" |
| author | FK(User) | no | | SET_NULL |
| created | DateTimeField | auto | | |
| updated | DateTimeField | auto | | |

**Permissions:** Same as announcements.

### UserSubscription
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID | auto | uuid4 | |
| user | FK(User) | yes | | CASCADE |
| mosque | FK(Mosque) | yes | | CASCADE |
| notify_prayers | BooleanField | no | true | |
| notify_announcements | BooleanField | no | true | |
| notify_events | BooleanField | no | true | |
| prayer_reminder_minutes | IntegerField | no | 15 | Minutes before athan |
| created | DateTimeField | auto | | |

**Permissions:** Authenticated only. Queryset scoped to `user=request.user`.

**Unique constraint:** `(user, mosque)`

### PushToken
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID | auto | uuid4 | |
| user | FK(User) | yes | | CASCADE |
| token | CharField | yes | | Expo push token (unique) |
| platform | CharField | yes | | "ios", "android" |
| created | DateTimeField | auto | | |
| updated | DateTimeField | auto | | |

**Permissions:** Authenticated only.

### MosqueAdmin
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID | auto | uuid4 | |
| mosque | FK(Mosque) | yes | | CASCADE |
| user | FK(User) | yes | | CASCADE |
| role | CharField | no | "admin" | "admin", "super_admin" |
| created | DateTimeField | auto | | |

**Unique constraint:** `(mosque, user)`

### Admin UX Principle
Mosque admins (imams, board members, volunteers) are often **not tech-savvy**. All admin-facing interactions should be wrapped in guided, jargon-free UI flows. Target: a volunteer can post an announcement within 60 seconds. The Django admin uses the Unfold theme with Sacred Blue brand colors.

---

## API Endpoints

```
POST /api/v1/auth/register/          # Register + get token
POST /api/v1/auth/login/             # Login + get token
POST /api/v1/auth/logout/            # Invalidate token
GET  /api/v1/auth/me/                # Current user

GET  /api/v1/mosques/                # List mosques (?city=, ?search=)
GET  /api/v1/mosques/{id}/           # Mosque detail
GET  /api/v1/mosques/nearby/?lat=&lng=&radius=  # Nearby mosques (haversine)

GET  /api/v1/announcements/?mosque_ids=id1,id2   # Announcements for mosques
POST /api/v1/announcements/          # Create announcement (auth required)

GET  /api/v1/events/?mosque_ids=id1,id2&from_date=YYYY-MM-DD&category=lesson
POST /api/v1/events/                 # Create event (auth required)

GET  /api/v1/subscriptions/          # User's subscriptions (auth required)
POST /api/v1/subscriptions/          # Subscribe to mosque
DELETE /api/v1/subscriptions/{id}/   # Unsubscribe
PATCH /api/v1/subscriptions/{id}/    # Update notification preferences

POST /api/v1/push-tokens/            # Register push token

GET  /health/                        # Health check
GET  /admin/                         # Django admin (Unfold theme)
```

---

## Push Notification Architecture

### Token Registration Flow
```
App Launch → expo-notifications.getExpoPushTokenAsync()
           → POST /api/v1/push-tokens/
           → { token: "ExponentPushToken[xxx]", platform: "ios" }
```

### Remote Notification Flow (Announcements/Events)
```
Admin creates announcement via API or Django admin
  → Django signal (post_save) fires
  → Signal queries UserSubscription WHERE mosque = announcement.mosque
                                     AND notify_announcements = true
  → Signal queries PushToken WHERE user IN subscribed_users
  → Signal calls Expo Push API: POST https://exp.host/--/api/v2/push/send
  → Payload: { to: [tokens], title, body, data: { type, id }, priority }
```

### Local Prayer Notifications
```
App foreground / midnight trigger
  → Fetch today's prayer times from Aladhan API
    (fall back to adhan-js if offline)
  → Cancel previous scheduled notifications
  → For each prayer:
    → scheduleNotificationAsync({
        content: { title: "Fajr", body: "Prayer time in 15 minutes" },
        trigger: { date: prayerTime - reminderMinutes }
      })
```

---

## Offline-First Strategy

### Cache Layer
Currently using AsyncStorage with key-value pairs:
- `PRAYER_TIMES` — serialized prayer times (ISO strings)
- `PRAYER_DATE` — date key to check cache validity
- `SUBSCRIBED_MOSQUES` — array of mosque IDs
- `USER_LOCATION` — {latitude, longitude}
- `CALCULATION_METHOD` — method code
- `REMINDER_MINUTES` — minutes before prayer for reminder
- `USE_24H` — boolean for time format

### Sync Strategy
1. **Prayer times** — Aladhan API is the **primary source**; adhan-js is the **offline-only fallback** when network is unavailable. Cached in AsyncStorage with date stamp.
2. **Pull phase** — on app launch + pull-to-refresh, fetch latest announcements/events from Django REST API, update local cache.
3. **Push phase** — process pending subscription changes when connectivity returns.
4. **No realtime** — announcements use pull-to-refresh (Django REST doesn't use WebSockets).
5. **Stale indicator** — show "Last updated: X ago" when serving from cache.

---

## Deployment

### Django + Gunicorn + PostgreSQL
```yaml
# docker-compose.yml
services:
  web:
    build: ./backend
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000
    ports:
      - "8000:8000"
    env_file: ./backend/.env
    volumes:
      - media_data:/app/media
      - static_data:/app/staticfiles
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: masjid_connect
      POSTGRES_USER: masjid
      POSTGRES_PASSWORD: ${DB_PASSWORD}

volumes:
  pg_data:
  media_data:
  static_data:
```

### Coolify Configuration
- **Service type**: Docker Compose
- **Domain**: `api.salafimasjid.app` → port 8000
- **Database**: PostgreSQL 16 (persistent volume)
- **Static files**: WhiteNoise (served by Django directly)
- **Media files**: Persistent volume for uploaded images
- **SSL**: Auto via Coolify (Let's Encrypt)
- **Backups**: Coolify scheduled backup of PostgreSQL volume

### Resource Estimates
| Service | RAM | CPU | Storage |
|---------|-----|-----|---------|
| Django + Gunicorn | ~100-200MB | Minimal | — |
| PostgreSQL | ~100-200MB | Minimal | ~500MB |
| Coolify overhead | ~512MB | Minimal | — |
| **Total** | **~800MB** | **1 vCPU** | **1GB** |

Fits comfortably on a $12/mo droplet (1GB RAM) or shares your existing droplet.

### Backend Dependencies
```
Django>=5.1,<5.2
djangorestframework>=3.15,<4
django-environ>=0.11
django-cors-headers>=4.3
django-filter>=24.1
gunicorn>=22
whitenoise>=6.7
Pillow>=10
django-unfold>=0.40
psycopg[binary]>=3.2
```
