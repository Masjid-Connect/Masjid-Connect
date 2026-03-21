# Masjid-Connect Audit Report

**Date:** 2026-03-21
**Auditors:** 19 autonomous agents (12 Technical, 7 Design)
**Methodology:** Ruthless codebase analysis with file:line evidence

---

## Executive Summary

| Council | Auditors | Critical | High | Medium | Low | Total |
|---------|----------|----------|------|--------|-----|-------|
| **Technical** | 12 | 22 | 52 | 58 | 25 | 157 |
| **Design** | 7 | 8 | 22 | 30 | 12 | 72 |
| **TOTAL** | 19 | **30** | **74** | **88** | **37** | **229** |

---

## CRITICAL FINDINGS (Must Fix Before Production)

### Security

| # | Finding | File:Line | Fix |
|---|---------|-----------|-----|
| S1 | **Token never rotated on login** — `get_or_create` returns same token forever. Stolen token = permanent access. | `backend/api/views.py:136,158,213` | Delete old token before creating new one; add expiry |
| S2 | **Push token hijacking** — User A can POST User B's Expo token to `/push-tokens/` and steal their notifications | `backend/api/views.py:540-544` | Validate token ownership; use composite unique constraint |
| S3 | **Debug CORS endpoint exposed** — `/debug/cors/` returns DEBUG flag, ALLOWED_HOSTS, env vars to anyone | `backend/config/urls.py:30-57` | Remove entirely |
| S4 | **Open redirect on donations** — `return_url` taken from client, enables phishing via Stripe redirect | `backend/api/views.py:753,839-847` | Whitelist allowed return URLs |
| S5 | **Gift Aid PII exposed via IsAdminUser** — Any Django staff user can access donor names, addresses, postcodes | `backend/api/views.py:1191-1243` | Create mosque-scoped permission class |

### Database

| # | Finding | File:Line | Fix |
|---|---------|-----------|-----|
| D1 | **Migration 0007 removed ALL indexes from 0004** — City, country, mosque, date indexes all gone | `backend/core/migrations/0007:39-88` | Re-add indexes in new migration |
| D2 | **N+1 query in permission class** — `IsMosqueAdminOrReadOnly` runs DB query per object in list views | `backend/api/views.py:106,122` | Cache mosque_admin_ids per request |

### Privacy & Compliance

| # | Finding | File:Line | Fix |
|---|---------|-----------|-----|
| P1 | **No age verification for under-13** — Privacy policy says "not for children" but no gate exists | `app/(auth)/register.tsx` | Add DOB field + age gate |
| P2 | **Gift Aid PII stored unencrypted** — Donor names, addresses, postcodes in plaintext | `backend/core/models.py:445-505` | Add field-level encryption |
| P3 | **Gift Aid consent not timestamped** — No audit trail of when/how donor consented | `backend/core/models.py:363-443` | Add consent_recorded_at + consent_method fields |
| P4 | **Orphaned push tokens never cleaned** — Tokens not revoked from Expo on account deletion | `backend/core/models.py:154-177` | Revoke from Expo API before DB deletion |

### Infrastructure

| # | Finding | File:Line | Fix |
|---|---------|-----------|-----|
| I1 | **Health check doesn't verify DB** — Returns `{"status":"ok"}` even when database is down | `backend/config/urls.py:10-16` | Add `connection.ensure_connection()` check |
| I2 | **SECRET_KEY has fallback default** — `"change-me-in-production"` used if .env missing | `backend/config/settings.py:18` | Remove default; raise error if not set |
| I3 | **ALLOWED_HOSTS defaults to empty/wildcard** — Host header injection if misconfigured | `backend/config/settings.py:15-16` | Require explicit hosts in production |

### API

| # | Finding | File:Line | Fix |
|---|---------|-----------|-----|
| A1 | **Nearby endpoint returns raw array** — All other list endpoints return paginated `{count, results}` | `backend/api/views.py:425-433` | Always return paginated response |

### Notifications

| # | Finding | File:Line | Fix |
|---|---------|-----------|-----|
| N1 | **iOS 64 notification limit unguarded** — Schedules 10/day with no limit check; silently drops older ones | `lib/notifications.ts:105-134` | Check count before scheduling |
| N2 | **Permission denial silent** — User never knows notifications are disabled | `lib/notifications.ts:41-42` | Show feedback; store denial state |

### Offline

| # | Finding | File:Line | Fix |
|---|---------|-----------|-----|
| O1 | **No offline queue for subscriptions** — Comment says "retry on next open" but no queue exists | `app/(tabs)/settings.tsx:143-173` | Create offline queue in AsyncStorage |

### Code Quality

| # | Finding | File:Line | Fix |
|---|---------|-----------|-----|
| C1 | **Non-null assertions on .find()** — Runtime crash if prayer not found in array | `hooks/usePrayerTimes.ts:210-222` | Add null checks |
| C2 | **Unsafe API response casting** — `as string` casts on unknown API data with no validation | `lib/api.ts:228-246` | Add runtime validation |
| C3 | **Memory leak: setTimeout without cleanup** — State set on unmounted components | `components/support/BankDetailsSheet.tsx:41` | Store timeout ref; clear in useEffect cleanup |

---

## HIGH FINDINGS (Fix This Sprint)

### Security (6)
- **Email enumeration via timing** — Login checks user existence before password (`views.py:146-159`)
- **Race condition in social login** — Token creation outside transaction (`views.py:199-213`)
- **No rate limiting on Gift Aid endpoints** — Staff can hammer donation data (`views.py:1192`)
- **Haversine accepts invalid lat/lng** — No bounds validation, radius can be negative (`views.py:400-408`)
- **Stripe webhook TOCTOU race** — exists() + create() not atomic (`views.py:961,987-992`)
- **Gift Aid reference collision** — Sequential counter not atomic (`views.py:1066-1075`)

### Database (5)
- **Missing indexes** on gift_aid_declaration FK, donation_date, gift_aid_eligible, GiftAidDeclaration.status
- **Expensive @property aggregates** — `total_donated_pence` runs SUM query every access (`models.py:498-504`)

### API (2)
- **No announcements/events CRUD in frontend** — Backend supports full CRUD but `lib/api.ts` is read-only
- **No token refresh mechanism** — Tokens never expire; stolen token = permanent access

### Notifications (6)
- **No cleanup on mosque unsubscribe** — Old prayer notifications keep firing
- **No Android notification grouping** — 10+ individual notifications clutter drawer
- **Expo push error handling incomplete** — Valid tokens pruned on transient failures (`core/push.py:67-88`)
- **No duplicate push prevention** — Same announcement can trigger multiple notifications
- **Unguarded async in permission flow** — Channel setup can crash auth flow
- **Only schedules for today** — If app closed 2 days, no prayers scheduled for tomorrow

### Offline (3)
- **No caching for announcements/events** — Network failure = empty screen
- **No "last updated" indicator** — User doesn't know data is stale
- **Prayer times not cached between sessions** — Same day fetched repeatedly

### Testing (DEVASTATING)
- **Frontend: ~5% test coverage** — 0 screen tests, 0 component tests, 0 hook tests (except 1)
- **Backend: Feedback & Donations completely untested** — 0 tests for Stripe webhooks, Gift Aid
- **No offline scenario tests** — Zero tests for network failure behavior
- **No DST/timezone edge case tests** — Prayer times at clock change untested

### Code Quality (3)
- **4 exhaustive-deps suppressions** without documentation
- **console.error in production** — Debug logging in hooks/useAnnouncements, usePrayerTimes, useEvents
- **Unsafe storage type cast** — Theme preference cast without validation (`lib/storage.ts:64`)

### Accessibility (5 critical + 12 high)
- **Gold text on stone fails WCAG AA** — #D4AF37 on #F9F7F2 = 3.2:1 (needs 4.5:1). Fix exists: `divineGoldText` defined but unused
- **60% of interactive elements lack accessibility labels** — Auth buttons, DateNavigator, community segments
- **DateNavigator arrows 36x36** — Below 44pt minimum touch target
- **Welcome screen animations ignore useReducedMotion()**
- **Support screen animations ignore useReducedMotion()**

### i18n (1 critical + 4 high)
- **OTA update alert hardcoded in English** (`app/_layout.tsx:93-99`)
- **25+ RTL violations** — `marginLeft/paddingLeft` instead of `marginStart/paddingStart`
- **Event categories not using translation keys** — `item.category.replace('_', ' ')` instead of `t()`
- **Missing translation keys** — `error.*` namespace, `about.*` keys don't exist
- **Arabic date locale imported but not passed** to `formatDistanceToNow()`

### Infrastructure (8)
- **CORS_ALLOW_ALL_ORIGINS in debug** — Opens all origins if DEBUG accidentally true
- **DB password visible in docker-compose URL**
- **Deploy script has no pre-flight validation**
- **Rollback mechanism is brittle** — Broken docker tag syntax
- **No automated backup verification**
- **Frontend Sentry may not be initialized** — `initSentry()` defined but call not confirmed in _layout
- **No request logging** — Console only, lost on container restart
- **No connection pooling** — Default Django connections, no CONN_MAX_AGE

### Privacy (5)
- **Location retention period not documented**
- **Notification consent not timestamped**
- **Data export format/SLA not documented** (GDPR Article 20)
- **Feedback device info collection not disclosed** in privacy policy
- **No rate limit on data export endpoint**

---

## DESIGN COUNCIL FINDINGS

### Information Architecture (3 high)
- **3 hidden tab screens as dead code** — announcements.tsx, events.tsx, qibla.tsx defined but `href: null`
- **Qibla fully implemented but unreachable** — No entry point from any screen
- **Duplicate auth screens** — Both login.tsx/register.tsx AND sign-in.tsx/sign-up.tsx exist

### Visual Identity (1 critical, 5 high)
- **Hardcoded RGBA values bypass color system** — 10+ inline rgba() in tabs instead of `getAlpha()`
- **Dark mode tertiary text fails WCAG AA** — #636366 on #0A1628 = 3.2:1
- **SolarLight prayer colors outside design system** — 6 hex values not in Colors.ts
- **Non-8pt grid violations** — marginTop: 2, 3, 4, 5 in 5+ files
- **GoldBadge never imported** — Component exists but zero usage despite CLAUDE.md mandate

### Interaction & Motion (3 critical, 4 high)
- **BottomSheet has no swipe-to-dismiss** — Only backdrop tap dismissal
- **BottomSheet missing keyboard avoidance** — Inputs covered by keyboard
- **No skeleton loading screens** — Bare ActivityIndicator on all loading states
- **DateNavigator arrows have no press feedback**
- **Button uses TouchableOpacity** — JS thread animations, not native

### Typography (5 medium)
- **Arabic typography defined but never used** — `arabicTypography` in Theme.ts, zero imports
- **Body line-height too tight** — 22px (1.29x) should be 26px (1.5x) for elderly readability
- **Prayer countdown weight too light** — 200wt may be unreadable for elderly at distance
- **No dynamic font scaling** — Ignores iOS Accessibility text size settings
- **Secondary text contrast borderline** — 4.95:1, claims "high-contrast for older congregants"

### Component Consistency
- **GoldBadge is dead code** — Never imported despite being the mandated notification badge
- **No unified card component** — Announcements, events, prayers all use different patterns
- **SettingsRow has 9 props** — Should use sub-components (Disclosure, Toggle, Label)

### Spiritual & Emotional UX (1 critical, 1 high)
- **Adhan sound exists but never plays** — `adhan.wav` in assets, notification channel configured, but no playback system
- **Janazah gets generic "urgent" treatment** — Funeral announcements deserve solemn reverence, not red dot

### Admin UX (2 critical, 5 high)
- **Zero field help text in Django admin** — DOCTRINE.md promises "inline help on every field"
- **raw_id_fields for mosque** — Imam must copy-paste UUIDs to select their mosque
- **No in-app admin features** — Must use Django admin in browser
- **No mosque-scoped admin views** — Admin sees ALL mosques' data
- **60-second announcement goal NOT met** — Takes 5+ minutes through Django admin
- **Author field not auto-filled** in admin
- **No bulk operations** for announcements/events

---

## PRIORITY MATRIX

### Week 1 — Security & Compliance (Block Production)
1. Remove `/debug/cors/` endpoint
2. Implement token rotation on login
3. Fix push token hijacking
4. Validate donation return_url
5. Remove SECRET_KEY default
6. Add age verification gate
7. Encrypt Gift Aid PII

### Week 2 — Data Integrity & Reliability
1. Re-add indexes removed by migration 0007
2. Fix N+1 permission query
3. Add DB connectivity to health check
4. Fix Stripe webhook race condition
5. Add iOS 64-notification limit check
6. Implement offline queue for subscriptions

### Week 3 — Accessibility & i18n
1. Use `divineGoldText` for gold text on light backgrounds
2. Add accessibility labels to all interactive elements
3. Fix 25+ RTL margin/padding violations
4. Replace hardcoded English in OTA alerts
5. Pass Arabic locale to date-fns calls
6. Increase touch targets to 44pt minimum

### Week 4 — Testing & Quality
1. Add frontend tests (hooks, screens, components)
2. Add backend tests for donations/feedback/Gift Aid
3. Add offline scenario tests
4. Add DST/timezone edge case tests
5. Enable CI coverage thresholds

### Week 5+ — Design Polish
1. Add swipe-to-dismiss on BottomSheet
2. Implement skeleton loading screens
3. Delete dead code (hidden tabs, unused auth screens)
4. Build in-app admin panel
5. Implement adhan playback system
6. Add Janazah-specific announcement treatment

---

## WHAT'S WORKING WELL

Despite the ruthless audit, the foundation is strong:

- **Prayer-first architecture** — Correct tab hierarchy for Muslim users
- **Atmospheric gradients** — Sky-accurate, prayer-time-aware color system
- **Spring animation system** — Premium motion feel, not toy-like
- **Color system architecture** — Semantic tokens, dark mode, alpha layer
- **Backend API design** — Clean REST, proper pagination, versioned
- **Django admin guides** — Excellent documentation (just not linked from forms)
- **Offline prayer fallback** — 3-tier: static → API → adhan-js calculation
- **InAppToast accessibility** — Proper `accessibilityRole="alert"` + live regions
- **Expo SDK 55 ecosystem** — All packages aligned, 0 npm vulnerabilities
- **Sentry integration** — Error tracking on both frontend and backend
- **Gift Aid HMRC compliance** — XML export, R68 schema, charity settings

---

*Generated by 19 autonomous audit agents running in parallel against the full codebase.*
