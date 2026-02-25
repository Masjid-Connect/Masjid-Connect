# Mosque Connect — Architecture

## Overview
Fully self-hosted architecture on a Digital Ocean droplet managed by Coolify. No third-party cloud dependencies beyond Expo Push Service (free) and app store distribution.

```
┌─────────────────────────────────────────────────┐
│              Digital Ocean Droplet               │
│                  (via Coolify)                    │
│                                                  │
│  ┌──────────────┐    ┌────────────────────────┐  │
│  │  PocketBase   │    │  Push Notification     │  │
│  │  (Go binary)  │    │  Worker (Node.js)      │  │
│  │               │    │                        │  │
│  │  - SQLite DB  │◄──►│  - Listens PB hooks    │  │
│  │  - Auth       │    │  - Calls Expo Push API │  │
│  │  - Realtime   │    │  - Schedules delivery  │  │
│  │  - Admin UI   │    └────────────────────────┘  │
│  │  - API        │                               │
│  └──────┬───────┘                               │
│         │                                        │
│         │ :8090                                   │
└─────────┼────────────────────────────────────────┘
          │
          │ HTTPS (Coolify reverse proxy)
          │
    ┌─────┴─────┐
    │   Client   │
    │  (Expo App)│
    │            │
    │ - adhan-js │  ← offline prayer calculation
    │ - SQLite   │  ← offline cache
    │ - Realtime │  ← PocketBase subscriptions
    └────────────┘
```

---

## PocketBase Collections (Full Schema)

### users (built-in auth collection)
PocketBase provides this automatically. Extended fields:
- `name` (text) — display name
- `avatar` (file) — profile photo
- `preferred_language` (text, default "en") — "en" or "ar"
- `time_format` (text, default "12h") — "12h" or "24h"

### mosques
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| name | text | yes | | Mosque name |
| address | text | no | | Full street address |
| city | text | yes | | City for search |
| state | text | no | | State/province |
| country | text | yes | | Country code |
| latitude | number | yes | | GPS latitude |
| longitude | number | yes | | GPS longitude |
| calculation_method | text | no | "NorthAmerica" | adhan-js method name |
| jumua_time | text | no | | Friday prayer override "HH:MM" |
| contact_phone | text | no | | |
| contact_email | text | no | | |
| website | url | no | | |
| photo | file | no | | Mosque photo |

**API Rules:**
- List/View: public (no auth required)
- Create/Update/Delete: `@request.auth.id != "" && @collection.mosque_admins.user ?= @request.auth.id && @collection.mosque_admins.mosque ?= id && @collection.mosque_admins.role ?= "super_admin"`

### announcements
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| mosque | relation(mosques) | yes | | |
| title | text | yes | | |
| body | editor | yes | | Rich text |
| priority | select | no | "normal" | "normal", "urgent" |
| published_at | date | no | now() | |
| expires_at | date | no | | Auto-hide after |
| author | relation(users) | yes | | |

**API Rules:**
- List/View: public
- Create/Update/Delete: user must be in `mosque_admins` for this mosque

### events
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| mosque | relation(mosques) | yes | | |
| title | text | yes | | |
| description | editor | no | | |
| speaker | text | no | | Speaker/teacher name |
| event_date | date | yes | | |
| start_time | text | yes | | "HH:MM" format |
| end_time | text | no | | "HH:MM" format |
| location | text | no | | Defaults to mosque address |
| recurring | select | no | null | null, "weekly", "monthly" |
| category | select | yes | | "lesson", "lecture", "quran_circle", "youth", "sisters", "community" |
| author | relation(users) | yes | | |

**API Rules:** Same as announcements

### user_subscriptions
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| user | relation(users) | yes | | |
| mosque | relation(mosques) | yes | | |
| notify_prayers | bool | no | true | |
| notify_announcements | bool | no | true | |
| notify_events | bool | no | true | |
| prayer_reminder_minutes | number | no | 15 | Minutes before athan |

**API Rules:**
- List/View/Create/Update/Delete: `@request.auth.id = user`

**Unique index:** `(user, mosque)`

### push_tokens
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| user | relation(users) | yes | | |
| token | text | yes | | Expo push token |
| platform | select | yes | | "ios", "android" |

**API Rules:**
- Create/Update/Delete: `@request.auth.id = user`
- List/View: admin only

**Unique index:** `(user, token)`

### mosque_admins
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| mosque | relation(mosques) | yes | | |
| user | relation(users) | yes | | |
| role | select | no | "admin" | "admin", "super_admin" |

**API Rules:**
- List/View: `@request.auth.id = user` OR super_admin of mosque
- Create/Delete: super_admin only

**Unique index:** `(mosque, user)`

### prayer_adjustments
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| mosque | relation(mosques) | yes | | |
| prayer | select | yes | | "fajr", "dhuhr", "asr", "maghrib", "isha" |
| adjustment_minutes | number | no | 0 | +/- minutes from calculated time |
| override_time | text | no | | "HH:MM" absolute override |
| effective_date | date | no | | Start date for override |
| expires_date | date | no | | End date for override |

---

## Push Notification Architecture

### Token Registration Flow
```
App Launch → expo-notifications.getExpoPushTokenAsync()
           → POST /api/collections/push_tokens/records
           → { user: authId, token: "ExponentPushToken[xxx]", platform: "ios" }
```

### Remote Notification Flow (Announcements/Events)
```
Admin creates announcement
  → PocketBase afterCreate hook fires
  → Hook queries user_subscriptions WHERE mosque = announcement.mosque
                                     AND notify_announcements = true
  → Hook queries push_tokens WHERE user IN subscribed_users
  → Hook calls Expo Push API: POST https://exp.host/--/api/v2/push/send
  → Payload: { to: [tokens], title, body, data: { type, id }, priority }
```

### Local Prayer Notifications
```
App foreground / midnight trigger
  → Calculate today's prayer times with adhan-js
  → Cancel previous scheduled notifications
  → For each prayer:
    → scheduleNotificationAsync({
        content: { title: "Fajr", body: "Prayer time in 15 minutes" },
        trigger: { date: prayerTime - reminderMinutes }
      })
```

### PocketBase Hook (pb_hooks/push.js)
```javascript
// pb_hooks/push.js — runs inside PocketBase's JSVM
onRecordAfterCreateRequest((e) => {
    const record = e.record;
    const mosqueId = record.get("mosque");

    // Get subscribed users
    const subs = $app.dao().findRecordsByFilter(
        "user_subscriptions",
        `mosque = "${mosqueId}" && notify_announcements = true`
    );

    const userIds = subs.map(s => s.get("user"));

    // Get push tokens
    const tokens = [];
    for (const uid of userIds) {
        const recs = $app.dao().findRecordsByFilter(
            "push_tokens",
            `user = "${uid}"`
        );
        recs.forEach(r => tokens.push(r.get("token")));
    }

    if (tokens.length === 0) return;

    // Call Expo Push API
    const res = $http.send({
        url: "https://exp.host/--/api/v2/push/send",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokens.map(token => ({
            to: token,
            title: record.get("title"),
            body: record.get("body").substring(0, 200),
            data: { type: "announcement", id: record.getId() },
            priority: record.get("priority") === "urgent" ? "high" : "default",
            sound: record.get("priority") === "urgent" ? "default" : null,
        }))),
    });
}, "announcements");
```

---

## Offline-First Strategy

### SQLite Local Cache Schema
```sql
-- Cached prayer times (recalculated daily)
CREATE TABLE cached_prayers (
    date TEXT PRIMARY KEY,       -- "YYYY-MM-DD"
    fajr TEXT NOT NULL,          -- ISO timestamp
    sunrise TEXT NOT NULL,
    dhuhr TEXT NOT NULL,
    asr TEXT NOT NULL,
    maghrib TEXT NOT NULL,
    isha TEXT NOT NULL,
    method TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL
);

-- Cached announcements
CREATE TABLE cached_announcements (
    id TEXT PRIMARY KEY,
    mosque_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    published_at TEXT NOT NULL,
    expires_at TEXT,
    synced_at TEXT NOT NULL
);

-- Cached events
CREATE TABLE cached_events (
    id TEXT PRIMARY KEY,
    mosque_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    speaker TEXT,
    event_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    category TEXT NOT NULL,
    synced_at TEXT NOT NULL
);

-- Pending actions queue (outbox pattern)
CREATE TABLE outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,           -- "subscribe", "unsubscribe", "update_prefs"
    payload TEXT NOT NULL,          -- JSON
    created_at TEXT NOT NULL,
    status TEXT DEFAULT 'pending'   -- "pending", "synced", "failed"
);
```

### Sync Strategy
1. **Prayer times** — calculated locally with adhan-js, never depend on network
2. **Pull phase** — on app launch + periodic background, fetch latest announcements/events from PocketBase, update SQLite cache
3. **Push phase** — process outbox queue, send pending subscription changes to PocketBase
4. **Realtime** — when online, subscribe to PocketBase realtime for announcements (instant updates)
5. **Stale indicator** — show "Last updated: X ago" when serving from cache

---

## Coolify Deployment

### PocketBase Service
```yaml
# docker-compose.yml for PocketBase
services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    ports:
      - "8090:8090"
    volumes:
      - pb_data:/pb/pb_data
      - ./pb_hooks:/pb/pb_hooks
      - ./pb_migrations:/pb/pb_migrations
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:8090/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  pb_data:
```

### Coolify Configuration
- **Service type**: Docker Compose
- **Domain**: `pb.mosqueconnect.app` → port 8090
- **Persistent volume**: pb_data for SQLite database
- **Mount hooks**: `./pb_hooks` for JSVM push notification hooks
- **SSL**: Auto via Coolify (Let's Encrypt)
- **Backups**: Coolify scheduled backup of pb_data volume

### Resource Estimates
| Service | RAM | CPU | Storage |
|---------|-----|-----|---------|
| PocketBase | ~50-100MB | Minimal | ~500MB (SQLite) |
| Coolify overhead | ~512MB | Minimal | — |
| **Total** | **~700MB** | **1 vCPU** | **1GB** |

Fits comfortably on a $12/mo droplet (1GB RAM) or shares your existing droplet.
