# Mosque Connect — Audit Report Part 1/4
## Technical Council: Auditors 1–6 (Security, API, Database, Offline, Notifications, Code Quality)

**Date:** 2026-03-21 | **Auditors:** 6 | **Total Findings:** 96

---

## Auditor 1 — Security Architect

### CRITICAL

**1.1 IDOR on Stripe Session Lookup**
- `backend/api/views.py:869-917` — `/api/v1/donate/session-status/` is `AllowAny`. Any user can query any checkout session by ID, exposing donor billing info.
- **Fix:** Require auth, validate session ownership, return only status (not amounts).

**1.2 Account Enumeration via Timing**
- `backend/api/views.py:146-159` — Login separates user lookup from password check. Timing difference leaks whether email exists.
- **Fix:** Always call `check_password()` even if user is None (use dummy hash). Constant-time response.

**1.3 Google JWT Audience Verification Disabled**
- `backend/api/views.py:273-284` — When `GOOGLE_CLIENT_ID` env vars are empty, `verify_aud=False` is set. Any valid Google JWT from any app can authenticate.
- **Fix:** Refuse social login if client IDs not configured. Never disable audience verification.

### HIGH

**1.4 No Token Expiry/Rotation**
- DRF TokenAuthentication tokens never expire. Stolen token = permanent access.
- **Fix:** Add token expiry (e.g., 30 days) or switch to JWT with refresh tokens.

**1.5 Push Token Ownership Not Validated**
- `backend/api/views.py` — Push token registration doesn't verify device ownership. User A could register user B's token.
- **Fix:** Validate token uniqueness per user; revoke old tokens on re-registration.

**1.6 Rate Limiting on Auth Endpoints Insufficient**
- `backend/config/settings.py:132-137` — 100/hour anon rate allows ~72,000 login attempts/month.
- **Fix:** Add `LoginThrottle` at 5/hour per IP on auth endpoints specifically.

### MEDIUM

**1.7 Debug CORS Endpoint in Production** — `backend/config/urls.py:30-57` exposes security config at `/debug/cors/`. Remove immediately.

**1.8 CORS Allow All in Debug Mode** — `settings.py:211-212` sets `CORS_ALLOW_ALL_ORIGINS=True` when DEBUG and no origins configured.

**1.9 Mosque Admin Permission Escalation** — No validation that MosqueAdmin role changes require super_admin. Admin could elevate own role.

**1.10 Password Minimum Only 10 Characters** — No complexity requirements (uppercase, numbers, symbols).

---

## Auditor 2 — API Contract Auditor

### CRITICAL

**2.1 Nearby Endpoint Response Format Mismatch**
- `backend/api/views.py:425-433` — Returns paginated `{count, results}` OR raw array depending on result count. Frontend `lib/api.ts:265` expects array only.
- **Risk:** >50 mosques breaks the nearby feature entirely.
- **Fix:** Consistently return unpaginated array for this endpoint, or update frontend.

### HIGH

**2.2 Error Response Inconsistency**
- Serializer errors return `{"field": ["error"]}`, custom errors return `{"detail": "..."}`. Frontend `lib/api.ts:110` only handles `.detail`.
- **Fix:** Wrap all errors in consistent envelope.

**2.3 Missing CRUD in Frontend**
- Backend supports PATCH/DELETE on announcements and events, but `lib/api.ts` has no methods for them. Admins can't edit/delete from app.

**2.4 Stripe Webhook Idempotency Bug**
- `backend/api/views.py:961-992` — `StripeEvent` recorded AFTER processing. If processing fails mid-way, retry creates duplicate donations.
- **Fix:** Record event BEFORE processing, or use `get_or_create()` with status flag.

### MEDIUM

**2.5 No Radius Validation** — Nearby endpoint accepts any float for radius (0, negative, 999999). Add `0.1 <= radius <= 500`.

**2.6 Silent Failures on Bad Input** — Invalid UUIDs in `mosque_ids` silently skipped. Invalid dates return empty results instead of 400.

**2.7 Gift Aid Endpoints Missing from Frontend** — Backend has full donation/Gift Aid pipeline; frontend only has checkout creation.

**2.8 No Pagination in Frontend** — Frontend discards `next` URL, never implements infinite scroll.

### LOW

**2.9 Inconsistent Status Codes** — Login returns 200, register returns 201, contact returns 200 on creation.

**2.10 No Soft Deletes** — Hard deletes lose audit trail. Add `deleted_at` timestamp.

---

## Auditor 3 — Database & Performance Auditor

### CRITICAL

**3.1 Permission Check N+1 Query**
- `backend/api/views.py:106,122` — `IsMosqueAdminOrReadOnly` queries `MosqueAdmin.objects.filter()` per object. List of 50 items = 50+ DB queries.
- **Fix:** Cache user's mosque IDs in `request._cached_user_mosque_ids` at request time.

### HIGH

**3.2 Missing Unique Constraint on stripe_payment_intent_id**
- `backend/core/models.py:382-384` — `db_index=True` but NOT `unique=True`. Race condition can create duplicate donations.
- **Fix:** Add `unique=True`, wrap webhook in `transaction.atomic()`.

**3.3 Serializer N+1 on Gift Aid Declarations**
- `backend/core/models.py:499-504` — `total_donated_pence` and `total_gift_aid_pence` are properties calling `.aggregate()` per object. 20 declarations = 40+ queries.
- **Fix:** Use queryset annotations or denormalized fields.

**3.4 Missing Indexes on Filter Fields**
- No `db_index` on: `Feedback.status`, `Announcement.priority`, `Event.category`, `Donation.gift_aid_eligible`, `Donation.stripe_customer_id`.

**3.5 Missing Connection Pooling**
- `settings.py:83` — No `CONN_MAX_AGE` or pool config. Under load, exhausts DB connections.
- **Fix:** Add `CONN_MAX_AGE: 600`.

### MEDIUM

**3.6 Cascade Delete Risk** — Deleting a Mosque cascades to ALL announcements, events, subscriptions. No soft-delete or archive.

**3.7 Deprecated `unique_together`** — Models use old syntax instead of `UniqueConstraint`. App-level only, bypassable via `bulk_create`.

**3.8 Haversine Not Index-Friendly** — Full table scan with trig calculations. OK for <100 mosques, painful at scale.

**3.9 UUID PKs** — Random UUIDs cause poor B-tree clustering. Monitor performance; consider UUID v6 for new deployments.

### LOW

**3.10 PAGE_SIZE=50** — May be too large for mobile. Consider 20-25 default.

**3.11 Migration Consolidation** — 11 migrations; squash after v1.0.

---

## Auditor 4 — Offline-First & Data Sync Auditor

### CRITICAL

**4.1 No Cache for Announcements/Events**
- `hooks/useAnnouncements.ts:18-31`, `hooks/useEvents.ts:22-37` — Data fetched into component state only, never persisted. Offline = empty screen.
- **Fix:** Cache to AsyncStorage on fetch, load from cache on error.

**4.2 No Offline Queue for Subscription Changes**
- `app/(tabs)/settings.tsx:143-150` — Preference changes saved locally but never synced to backend if offline.
- **Fix:** Implement pending operations queue with retry on reconnect.

### HIGH

**4.3 AsyncStorage vs expo-sqlite Mismatch**
- `package.json` declares `expo-sqlite` but it's never imported anywhere. CLAUDE.md says "expo-sqlite for offline caching" — not implemented.
- **Fix:** Either implement SQLite or remove the dependency and update docs.

**4.4 No Network State Detection**
- No `@react-native-community/netinfo` or equivalent. App blindly makes requests, wastes battery offline.
- **Fix:** Add network monitoring, show offline banner, auto-sync on reconnect.

**4.5 Prayer Time Cache Missing**
- `hooks/usePrayerTimes.ts:89-155` — Fetches fresh every mount. No persistent cache. Date navigation = redundant API calls.
- **Fix:** Cache by date key with 24h TTL.

**4.6 Promise.all Partial Failure**
- `app/(tabs)/settings.tsx:146-150` — If 3 of 5 subscription updates fail, user sees success but state is inconsistent.
- **Fix:** Use `Promise.allSettled()`, show partial failure count, queue retries.

### MEDIUM

**4.7 No Stale Data Indicator** — CLAUDE.md says "show stale data with last updated indicator" — never implemented.

**4.8 AsyncStorage 6MB Limit** — No storage usage monitoring or eviction strategy for Android.

**4.9 Cache Keys Not Versioned** — Schema changes after app update will crash on stale cache JSON.

**4.10 No Error Recovery from Corrupt Cache** — `lib/storage.ts:105` — `JSON.parse(raw)` without try-catch.

---

## Auditor 5 — Push Notification & Scheduling Auditor

### CRITICAL

**5.1 iOS 64 Notification Limit Not Handled**
- `lib/notifications.ts:75-137` — Schedules 10/day (5 prayers × 2). After 6 days without clearing = exceeds iOS limit. Silent failure.
- **Fix:** Check `getAllScheduledNotificationsAsync()` count before scheduling; prune old ones.

**5.2 No Timezone Change Detection**
- `lib/notifications.ts:94-117` — Uses `new Date()` with no timezone awareness. Traveler gets wrong-time notifications.
- **Fix:** Add `react-native-localize` listener; reschedule on timezone change.

### HIGH

**5.3 No DST Handling** — Scheduled notifications don't adjust for daylight saving transitions. 1 hour off 2× per year.

**5.4 Guest Users Can't Receive Push** — `lib/api.ts:482-490` requires auth for token registration. Guests miss urgent announcements.

**5.5 No Duplicate Prevention** — Rapid app background/foreground can schedule same prayer twice. No debounce.

### MEDIUM

**5.6 Badge Count Never Managed** — `shouldSetBadge: false` but no explicit clearing either.

**5.7 Announcement Push Not Rate-Limited** — Admin creating 10 announcements in 1 minute sends 10× push blasts.

**5.8 Mosque Unsubscribe Doesn't Clear Old Reminders** — Prayer notifications from unsubscribed mosque still fire.

**5.9 Adhan Sound File Not Validated** — `'adhan.wav'` hardcoded without checking if asset is bundled.

**5.10 No Permission Denied UX** — If user denies notification permission, no banner or re-request mechanism.

---

## Auditor 6 — TypeScript & Code Quality Auditor

### CRITICAL

**6.1 Non-Null Assertion Chains**
- `hooks/usePrayerTimes.ts:210-223` — `prayers.find(p => p.name === 'fajr')!.time` crashes if prayer not found.
- **Fix:** Validate array completeness or use fallback pattern.

**6.2 Unsafe API Response Mapping**
- `lib/api.ts:228-247` — `raw.id as string`, `(raw.latitude as number) || 0`. No runtime validation. Latitude defaults to 0 = Null Island.
- **Fix:** Add runtime schema validator or type guard.

### HIGH

**6.3 Unguarded JSON.parse** — `lib/storage.ts:18,105`, `lib/api.ts:63` — No try-catch. Corrupt storage = crash.

**6.4 Implicit Error Types in Catch Blocks** — Multiple catch blocks use `err` without `unknown` annotation or instanceof guard.

**6.5 Disabled ESLint exhaustive-deps** — 4 places disable `react-hooks/exhaustive-deps` without justification. Risk of stale closures.

### MEDIUM

**6.6 Large Components** — 8 files exceed 300 lines (announcements.tsx: 655, support.tsx: 634, events.tsx: 620).

**6.7 TODO Comments in Production** — `settings.tsx:291,395` — Buttons with `{/* TODO */}` do nothing on press.

**6.8 Silent Error Swallowing** — `settings.tsx:148-155` catches subscription sync errors with empty catch block.

**6.9 Empty Catch in staticTimetable.ts** — `catch { }` swallows JSON load errors silently.

### LOW

**6.10 Console.log in Production** — Debug logging in hooks/usePrayerTimes.ts, useAnnouncements.ts, useEvents.ts, notifications.ts.

---

## Part 1 Summary

| Auditor | Critical | High | Medium | Low | Total |
|---------|----------|------|--------|-----|-------|
| 1. Security | 3 | 3 | 4 | 0 | 10 |
| 2. API Contract | 1 | 3 | 4 | 2 | 10 |
| 3. Database | 1 | 4 | 4 | 2 | 11 |
| 4. Offline/Sync | 2 | 4 | 4 | 0 | 10 |
| 5. Notifications | 2 | 3 | 5 | 0 | 10 |
| 6. Code Quality | 2 | 3 | 4 | 1 | 10 |
| **TOTAL** | **11** | **20** | **25** | **5** | **61** |
