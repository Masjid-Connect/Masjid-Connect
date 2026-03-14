# LAUNCH PLAN — Masjid-Connect

**Created:** 2026-03-14
**Goal:** Get from 51/100 to 85+/100 and submit to App Store + Google Play
**Based on:** Council of 10 Assessment (`COUNCIL_OF_10_ASSESSMENT.md`)
**Estimated Timeline:** 5 weeks (1-2 developers)

---

## How to Read This Plan

Each task has:
- **ID** — for tracking (e.g., `S1.1`)
- **Priority** — P0 (blocker), P1 (critical), P2 (important), P3 (polish)
- **Effort** — XS (<30min), S (1-2h), M (3-6h), L (1-2 days), XL (3+ days)
- **Depends on** — task IDs that must complete first
- **Files** — primary files to modify

Tasks are grouped into **Sprints** aligned with the remediation phases.

---

## Sprint 1 — Store Submission Blockers (Week 1-2)

> **Goal:** Remove every reason Apple/Google would auto-reject the app.

### S1: Legal Documents & Store Compliance

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S1.1 | **Write Privacy Policy document** — Cover: data collected (email, name, location, push tokens, preferences), purpose (prayer times, notifications, community), third-party sharing (Aladhan API gets coordinates, Expo gets push tokens), retention periods, user rights (access, deletion, portability), contact info. Host at `salafimasjid.app/privacy` | P0 | L | — | External web page |
| S1.2 | **Write Terms of Service document** — Cover: user obligations, content liability (mosque admins), account termination, IP rights, age requirement (13+), service disclaimer, modification clause. Host at `salafimasjid.app/terms` | P0 | L | — | External web page |
| S1.3 | **Add Privacy Policy in-app screen** — Create route `app/privacy.tsx` with WebView or ScrollView rendering the privacy policy. Link from Settings screen | P0 | S | S1.1 | `app/privacy.tsx`, `app/(tabs)/settings.tsx` |
| S1.4 | **Add Terms of Service in-app screen** — Same pattern as S1.3 | P0 | S | S1.2 | `app/terms.tsx`, `app/(tabs)/settings.tsx` |
| S1.5 | **Add privacy/terms URLs to app.json** — Add `privacyUrl` and `termsUrl` fields for store metadata | P0 | XS | S1.1, S1.2 | `app.json` |
| S1.6 | **Add consent checkboxes to registration** — Before creating account, user must check "I agree to Privacy Policy" and "I agree to Terms of Service" with links. Store consent timestamp on backend | P0 | M | S1.3, S1.4 | `app/(auth)/sign-up.tsx`, `backend/api/serializers.py`, `backend/core/models.py` |
| S1.7 | **Add consent to guest mode** — Show brief privacy notice before `continueAsGuest()` | P1 | S | S1.1 | `app/(auth)/welcome.tsx` |

### S2: Account Deletion (Apple/Google Mandatory)

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S2.1 | **Create account deletion backend endpoint** — `DELETE /api/v1/auth/delete-account/`. Must: require re-authentication (password or token), cascade delete User + UserSubscription + PushToken records, anonymize authored Announcements/Events (set author=NULL), return 204 | P0 | M | — | `backend/api/views.py`, `backend/api/urls.py` |
| S2.2 | **Add account deletion UI in Settings** — "Delete Account" button at bottom of Settings, red/destructive styling. Show confirmation dialog explaining what gets deleted. Require password entry. On success, clear local storage and redirect to welcome screen | P0 | M | S2.1 | `app/(tabs)/settings.tsx`, `lib/api.ts`, `contexts/AuthContext.tsx` |
| S2.3 | **Add data export endpoint** — `GET /api/v1/auth/export-data/`. Returns JSON with user record + all subscriptions + preferences + authored content | P1 | M | — | `backend/api/views.py`, `backend/api/urls.py`, `backend/api/serializers.py` |
| S2.4 | **Add "Download My Data" button in Settings** — Triggers export, saves JSON file or displays in-app | P1 | S | S2.3 | `app/(tabs)/settings.tsx`, `lib/api.ts` |
| S2.5 | **Write backend tests for account deletion** — Test cascade delete, test re-auth requirement, test orphaned content | P1 | S | S2.1 | `backend/api/tests/test_auth.py` |

### S3: Authentication Fixes

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S3.1 | **Fix Apple Bundle ID mismatch** — Change `audience=["com.masjidconnect.app"]` to `audience=[env("APPLE_BUNDLE_ID")]` with default `"app.salafimasjid"`. Add to `.env.example` | P0 | XS | — | `backend/api/views.py`, `backend/.env.example` |
| S3.2 | **Fix Google token verification** — Replace network-based `tokeninfo` endpoint call with local JWT signature verification using `google-auth` library. Verify `aud`, `iss`, and `exp` claims locally | P0 | M | — | `backend/api/views.py`, `backend/requirements.txt` |
| S3.3 | **Wrap social auth user creation in transaction.atomic()** — Prevent race condition on concurrent `get_or_create` + `save` | P0 | XS | — | `backend/api/views.py` |
| S3.4 | **Install expo-secure-store** — `npx expo install expo-secure-store` | P0 | XS | — | `package.json` |
| S3.5 | **Migrate auth token to SecureStore** — Replace `AsyncStorage.getItem/setItem(AUTH_TOKEN)` with `SecureStore.getItemAsync/setItemAsync`. Keep AsyncStorage for non-sensitive data (preferences, cache) | P0 | S | S3.4 | `lib/api.ts`, `lib/storage.ts`, `contexts/AuthContext.tsx` |
| S3.6 | **Remove CORS_ALLOW_ALL_ORIGINS wildcard** — Replace with explicit `CORS_ALLOWED_ORIGINS` from env. Raise error if empty in production | P0 | XS | — | `backend/config/settings.py` |
| S3.7 | **Fix ALLOWED_HOSTS default** — Change from `["*"]` to empty list, require explicit configuration | P0 | XS | — | `backend/config/settings.py` |
| S3.8 | **Remove email enumeration** — Change "A user with this email already exists" to generic "Unable to complete registration" | P1 | XS | — | `backend/api/serializers.py` |
| S3.9 | **Remove username fallback in login** — Use email-only authentication, remove `User.objects.get(username=email)` fallback | P1 | XS | — | `backend/api/views.py` |
| S3.10 | **Add Django security headers** — `SECURE_HSTS_SECONDS`, `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `X_FRAME_OPTIONS = 'DENY'`, `SECURE_CONTENT_TYPE_NOSNIFF` | P1 | XS | — | `backend/config/settings.py` |
| S3.11 | **Strengthen password validation** — Use Django's `validate_password` in serializer, increase min to 10 chars | P1 | XS | — | `backend/api/serializers.py` |

### S4: Store Configuration

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S4.1 | **Fill EAS credentials** — Replace placeholder `appleId`, `ascAppId`, `appleTeamId`, `projectId` with real values. Create Google service account key file | P0 | M | — | `eas.json` |
| S4.2 | **Add app metadata to app.json** — `description`, `keywords`, `primaryCategory` (Lifestyle or Utilities) | P0 | S | — | `app.json` |
| S4.3 | **Set age rating** — Declare 4+ (no objectionable content) | P0 | XS | — | `app.json` |
| S4.4 | **Add export compliance declaration** — Declare HTTPS encryption usage for iOS | P0 | XS | — | `app.json` |
| S4.5 | **Create App Store screenshots** — 6.7" (iPhone 15 Pro Max), 6.5" (iPhone 11 Pro Max), 5.5" (iPhone 8 Plus). Show: Prayer Times, Announcements, Events, Settings. Both light and dark mode | P0 | L | — | External assets |
| S4.6 | **Create Google Play screenshots** — Phone (1080x1920) + 7" tablet. Same screens as iOS | P0 | L | — | External assets |
| S4.7 | **Prepare App Store description** — Short (80 chars) + full (4000 chars). Localize for EN + AR | P1 | M | — | External / store listing |
| S4.8 | **Complete Apple Privacy Nutrition Labels** — Declare: email (linked), name (linked), location (linked), device ID (linked to push token) | P0 | S | S1.1 | App Store Connect |
| S4.9 | **Complete Google Play Data Safety form** — Same data as S4.8 in Google format | P0 | S | S1.1 | Google Play Console |
| S4.10 | **Remove duplicate splash-logo.png.png** — Delete the `.png.png` duplicate in assets | P1 | XS | — | `assets/images/` |
| S4.11 | **Verify Google OAuth redirect URIs** — Ensure Google Cloud Console OAuth client has correct redirect URI for Expo scheme `salafimasjid://` | P0 | S | — | Google Cloud Console |

---

## Sprint 2 — Critical Quality (Week 2-3)

> **Goal:** Fix the worst accessibility, performance, backend, and testing issues.

### S5: Accessibility — Phase 1 (Critical)

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S5.1 | **Add accessibilityLabel + accessibilityRole to Button component** — `accessibilityRole="button"`, `accessibilityLabel={title}`, `accessibilityState={{ disabled }}` | P0 | XS | — | `components/ui/Button.tsx` |
| S5.2 | **Add accessibilityLabel to TextInput component** — Label prop maps to `accessibilityLabel`, error announced via `accessibilityHint` | P0 | XS | — | `components/ui/TextInput.tsx` |
| S5.3 | **Add accessibilityViewIsModal to BottomSheet** — Plus focus trap when visible | P0 | S | — | `components/ui/BottomSheet.tsx` |
| S5.4 | **Add accessibility to BrandTabIcon** — `accessibilityLabel` on SVG, mark decorative elements as `accessible={false}` | P0 | XS | — | `components/brand/BrandTabIcon.tsx` |
| S5.5 | **Add accessibility to AnimatedSplash** — Logo image `accessibilityLabel="Masjid Connect"`, mark decorative elements appropriately | P1 | XS | — | `components/brand/AnimatedSplash.tsx` |
| S5.6 | **Add accessibility to prayer times screen** — Prayer rows: `accessibilityLabel="{prayer name}, {time}"`. Active prayer indicator. Header as `accessibilityRole="header"` | P0 | M | — | `app/(tabs)/index.tsx` |
| S5.7 | **Add accessibility to announcements screen** — Items: `accessibilityLabel="{title}{urgent ? ', urgent' : ''}"`. Loading: `accessibilityLiveRegion="polite"` | P0 | S | — | `app/(tabs)/announcements.tsx` |
| S5.8 | **Add accessibility to events screen** — Event items, category filters, calendar component | P0 | S | — | `app/(tabs)/events.tsx` |
| S5.9 | **Add accessibility to settings screen** — Section headers as `accessibilityRole="header"`, toggles, delete confirmations | P0 | M | — | `app/(tabs)/settings.tsx` |
| S5.10 | **Add accessibility to auth screens** — Form inputs, social login buttons, guest mode | P1 | S | — | `app/(auth)/welcome.tsx`, `app/(auth)/sign-up.tsx`, `app/(auth)/login.tsx` |
| S5.11 | **Mark decorative SVGs as non-accessible** — GoldDivider, KozoPaperBackground fiber dots: `accessible={false}` | P1 | XS | — | `app/(tabs)/index.tsx`, `components/ui/KozoPaperBackground.tsx` |
| S5.12 | **Fix Divine Gold contrast** — Darken `#BFA14E` to `#9A8230` or similar for text on white backgrounds (must achieve 4.5:1). Keep original gold for decorative/non-text elements | P1 | S | — | `constants/Colors.ts` or `constants/Theme.ts` |
| S5.13 | **Add reduced motion support** — Check `AccessibilityInfo.isReduceMotionEnabled()`. Skip staggered `FadeInDown` animations, skip splash animation, reduce BottomSheet spring to instant | P1 | M | — | `components/brand/AnimatedSplash.tsx`, `app/(tabs)/announcements.tsx`, `app/(tabs)/index.tsx`, `components/ui/BottomSheet.tsx` |
| S5.14 | **Add haptic feedback fallback** — Wrap `Haptics.impactAsync()` in try/catch, provide visual feedback (opacity change) when haptics unavailable | P2 | S | — | `components/ui/Button.tsx`, `components/brand/AnimatedSplash.tsx` |

### S6: Performance Fixes

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S6.1 | **Fix usePrayerTimes interval memory leak** — Store interval IDs in `useRef`, use stable dependencies. Separate countdown interval from prayer check. Don't recreate intervals when `prayers` array updates unless date changes | P0 | M | — | `hooks/usePrayerTimes.ts` |
| S6.2 | **Wrap ThemeContext value in useMemo** — Memoize `{ themePreference, setThemePreference, effectiveScheme }` | P0 | XS | — | `contexts/ThemeContext.tsx` |
| S6.3 | **Wrap AuthContext value in useMemo** — Memoize the entire provider value object. Stabilize function references with useCallback | P0 | S | — | `contexts/AuthContext.tsx` |
| S6.4 | **Batch AsyncStorage reads in usePrayerTimes** — Use `AsyncStorage.multiGet()` instead of 3 sequential `getItem()` calls | P1 | S | — | `hooks/usePrayerTimes.ts`, `lib/storage.ts` |
| S6.5 | **Add FlatList performance props** — `initialNumToRender={10}`, `maxToRenderPerBatch={5}`, `updateCellsBatchingPeriod={50}`, `windowSize={5}` to announcements and events lists | P1 | XS | — | `app/(tabs)/announcements.tsx`, `app/(tabs)/events.tsx` |
| S6.6 | **Memoize filteredEvents** — Wrap in `useMemo` with `[items, selectedCategory]` deps | P1 | XS | — | `app/(tabs)/events.tsx` |
| S6.7 | **Parallelize mosque API calls in settings** — Replace sequential `for` loop with `Promise.all(ids.map(...))` | P1 | XS | — | `app/(tabs)/settings.tsx` |
| S6.8 | **Cap staggered animation delays** — Max 300ms total delay regardless of list length (e.g., `Math.min(index * 50, 300)`) | P2 | XS | — | `app/(tabs)/announcements.tsx`, `app/(tabs)/events.tsx` |

### S7: Backend Fixes

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S7.1 | **Add database indexes on foreign keys** — Create migration adding `db_index=True` to: `Announcement.mosque`, `Announcement.author`, `Event.mosque`, `Event.author`, `UserSubscription.user`, `UserSubscription.mosque`, `PushToken.user`, `MosqueAdmin.user`, `MosqueAdmin.mosque`, `MosquePrayerTime.mosque` | P0 | S | — | `backend/core/models.py`, new migration |
| S7.2 | **Add composite indexes for common queries** — `(mosque_id, published_at DESC)` on Announcement, `(mosque_id, event_date)` on Event, `(mosque_id, date)` on MosquePrayerTime | P0 | S | S7.1 | New migration |
| S7.3 | **Move haversine to SQL** — Replace Python loop over `Mosque.objects.all()` with raw SQL distance calculation at DB layer. Filter at DB level before returning. Use PostgreSQL `earth_distance` if available, or raw SQL haversine formula | P1 | M | — | `backend/api/views.py` |
| S7.4 | **Add token expiration** — Install `djangorestframework-simplejwt`. Replace Token auth with JWT: 1-hour access token + 7-day refresh token. Add refresh endpoint | P1 | L | — | `backend/requirements.txt`, `backend/config/settings.py`, `backend/api/views.py`, `backend/api/urls.py`, `lib/api.ts` |
| S7.5 | **Add UUID validation on mosque_ids query param** — Validate each ID is a valid UUID before passing to ORM filter | P1 | XS | — | `backend/api/views.py` |
| S7.6 | **Add timezone field to Mosque model** — `timezone_name = CharField(max_length=50, default="UTC")` for DST-aware prayer times | P2 | S | — | `backend/core/models.py`, new migration |
| S7.7 | **Add rate limiting to nearby endpoint** — Custom throttle or `@throttle_classes` on the `nearby()` action (10/hour per user) | P1 | XS | — | `backend/api/views.py` |
| S7.8 | **Add rate limiting to admin login** — Use `django-axes` or custom middleware for admin brute force protection | P2 | S | — | `backend/requirements.txt`, `backend/config/settings.py` |
| S7.9 | **Improve admin UX** — Replace `raw_id_fields` with `autocomplete_fields` for Mosque and User FK fields in admin | P2 | S | — | `backend/core/admin.py` |

### S8: Testing — Phase 1 (Critical Paths)

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S8.1 | **Add social auth backend tests** — Mock Apple JWT verification (use `responses` library). Mock Google tokeninfo. Test: valid token creates user, existing user returns token, invalid token returns 401, expired token returns 401, wrong audience returns 401, unverified Google email returns 401 | P0 | M | S3.2 | `backend/api/tests/test_auth.py`, `backend/requirements.txt` |
| S8.2 | **Add subscription backend tests** — Test: list (authenticated), create subscription, duplicate subscription fails, delete subscription, update preferences (PATCH), unauthenticated returns 401 | P0 | M | — | `backend/api/tests/test_subscriptions.py` |
| S8.3 | **Add push token backend tests** — Test: register token (iOS), register token (Android), update existing token, unauthenticated returns 401 | P0 | S | — | `backend/api/tests/test_push_tokens.py` |
| S8.4 | **Add account deletion backend tests** — Test: delete cascades (subscriptions, tokens gone), authored content orphaned, re-auth required, unauthenticated returns 401 | P0 | S | S2.1 | `backend/api/tests/test_auth.py` |
| S8.5 | **Add mosque admin permission tests** — Test: admin can create announcement, non-admin cannot, staff can bypass | P1 | S | — | `backend/api/tests/test_permissions.py` |
| S8.6 | **Mock external APIs in backend tests** — Install `responses` library. Mock Apple JWKS endpoint and Google tokeninfo in all auth tests so tests don't make real HTTP calls | P0 | S | — | `backend/requirements.txt`, `backend/api/tests/test_auth.py` |
| S8.7 | **Add jest.setup.js mocks for Expo modules** — Mock `expo-notifications`, `expo-device`, `expo-haptics`, `expo-secure-store`, `react-native-reanimated` | P0 | S | — | `jest.setup.js` |
| S8.8 | **Add API client tests (lib/api.ts)** — Mock fetch. Test: token loading, auth header sent, error handling (4xx, 5xx), each endpoint method | P1 | M | S8.7 | `lib/__tests__/api.test.ts` |
| S8.9 | **Add notification scheduling tests** — Mock `expo-notifications`. Test: 5 prayers scheduled, correct times, skip past prayers, respect reminder minutes, cancel old reminders | P1 | M | S8.7 | `lib/__tests__/notifications.test.ts` |
| S8.10 | **Add usePrayerTimes hook test** — Use `@testing-library/react-hooks`. Mock API, storage, notifications. Test: initial load from cache, API fetch updates state, offline fallback, countdown updates, 24h format | P1 | L | S8.7 | `hooks/__tests__/usePrayerTimes.test.ts` |

---

## Sprint 3 — i18n & DevOps (Week 3-4)

> **Goal:** Complete Arabic experience, harden deployment.

### S9: i18n & RTL Completion

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S9.1 | **Add language preference to storage** — New key `LANGUAGE` in storage.ts with get/set functions | P0 | XS | — | `lib/storage.ts` |
| S9.2 | **Add language switcher UI in Settings** — Dropdown or segmented control: English / العربية. On change: update i18n language, persist to storage, call `configureRTL()`, restart app (or hot-reload if possible) | P0 | M | S9.1 | `app/(tabs)/settings.tsx`, `lib/i18n.ts`, `lib/rtl.ts` |
| S9.3 | **Add device language auto-detection** — On first launch, detect device locale via `getLocales()`. If Arabic, default to Arabic. Otherwise English | P1 | S | S9.1 | `lib/i18n.ts` |
| S9.4 | **Add locale to date-fns format calls** — Import `ar` locale from `date-fns/locale`. Pass `{ locale }` option to all `format()` and `formatDistanceToNow()` calls based on current i18n language | P0 | M | — | `app/(tabs)/events.tsx`, `app/(tabs)/announcements.tsx` |
| S9.5 | **Fix hardcoded strings** — Replace "About" (layout.tsx), "Mosque Connect" (modal.tsx), "Umm Al-Qura (Makkah)" (settings.tsx) with `t()` calls. Add keys to en.json and ar.json | P0 | S | — | `app/_layout.tsx`, `app/modal.tsx`, `app/(tabs)/settings.tsx`, `constants/locales/en.json`, `constants/locales/ar.json` |
| S9.6 | **Fix RTL-hardcoded margins** — Replace `marginLeft`/`marginRight` with `marginStart`/`marginEnd` throughout. Replace `paddingLeft`/`paddingRight` with `paddingStart`/`paddingEnd` | P1 | M | — | `app/(auth)/welcome.tsx`, `app/(tabs)/settings.tsx`, `app/(tabs)/events.tsx`, `app/(tabs)/announcements.tsx` |
| S9.7 | **Test calendar component in RTL** — Verify `react-native-calendars` renders correctly in Arabic. Add RTL theme props if needed | P1 | S | S9.2 | `app/(tabs)/events.tsx` |
| S9.8 | **Add Arabic pluralization** — Configure i18next pluralization for Arabic (zero, one, two, few, many, other). Update keys that need plural forms (e.g., "X events", "X minutes") | P2 | M | — | `lib/i18n.ts`, `constants/locales/en.json`, `constants/locales/ar.json` |
| S9.9 | **Review Arabic translations with native speaker** — Flag unnatural phrasing, fix machine-translation artifacts | P2 | M | — | `constants/locales/ar.json` |

### S10: DevOps & Deployment Hardening

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S10.1 | **Install Sentry** — Add `@sentry/react-native` to frontend, `sentry-sdk` to backend. Initialize with DSN from env. Capture unhandled exceptions | P0 | M | — | `package.json`, `app/_layout.tsx`, `backend/requirements.txt`, `backend/config/settings.py` |
| S10.2 | **Fix migration ordering in deploy.sh** — Run `migrate --noinput` BEFORE `docker compose up -d`, not after. Add migration dry-run check (`migrate --plan`) | P0 | S | — | `backend/scripts/deploy.sh` |
| S10.3 | **Add automated rollback to deploy.sh** — Tag previous Docker image before build. On health check failure, immediately restart with previous image | P1 | M | — | `backend/scripts/deploy.sh` |
| S10.4 | **Add persistent Docker logging** — Configure `json-file` log driver with `max-size: 100m` and `max-file: 10` | P1 | XS | — | `docker-compose.prod.yml` |
| S10.5 | **Pin backend dependency versions** — Run `pip freeze` and lock exact versions in `requirements.lock`. Reference from Dockerfile | P1 | S | — | `backend/requirements.txt`, `backend/requirements.lock` |
| S10.6 | **Add cron health check** — Every 5 minutes, curl health endpoint. Alert on failure (email or webhook) | P1 | S | — | Server crontab |
| S10.7 | **Add Docker image cleanup to deploy** — `docker system prune -f` after successful deployment | P2 | XS | — | `backend/scripts/deploy.sh` |
| S10.8 | **Add coverage threshold to CI** — Jest: fail if below 40% (raise to 60% later). Backend: add `coverage` package, fail below 50% | P2 | S | — | `jest.config.js`, `.github/workflows/ci.yml` |
| S10.9 | **Add branch protection rules** — Require PR reviews, require CI to pass, prevent direct push to main | P2 | S | — | GitHub Settings |
| S10.10 | **Create staging environment** — Second Docker compose with staging DB. Deploy on PR merge to `develop` branch | P2 | L | — | `docker-compose.staging.yml`, `.github/workflows/ci.yml` |

---

## Sprint 4 — Islamic Features & Testing Depth (Week 4-5)

> **Goal:** Elevate Islamic domain features, deepen test coverage, polish remaining items.

### S11: Islamic Domain Enhancements

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S11.1 | **Add calculation method selection** — Settings screen: dropdown with ISNA (1), MWL (3), Umm Al-Qura (4), Egyptian (5), Karachi (2). Persist to storage. Pass to Aladhan API and adhan-js | P1 | M | — | `app/(tabs)/settings.tsx`, `lib/storage.ts`, `hooks/usePrayerTimes.ts`, `lib/prayer.ts` |
| S11.2 | **Feature Jumu'ah on Fridays** — On prayer times screen, if today is Friday and subscribed mosque has `jumua_time`, show Jumu'ah prominently between Dhuhr and Asr with gold highlight | P1 | M | — | `app/(tabs)/index.tsx`, `hooks/usePrayerTimes.ts` |
| S11.3 | **Add Jumu'ah reminder notification** — If Friday, schedule notification for Jumu'ah time with configurable reminder | P2 | S | S11.2 | `lib/notifications.ts` |
| S11.4 | **Add "Jumu'ah" event category** — Add to Django Event.Category choices. Update frontend category list and color mapping | P2 | S | — | `backend/core/models.py`, `constants/locales/en.json`, `constants/locales/ar.json`, new migration |
| S11.5 | **Clean up unused SunnahTimes import** — Remove unused import from `lib/prayer.ts` | P3 | XS | — | `lib/prayer.ts` |

### S12: Testing — Phase 2 (Coverage Depth)

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S12.1 | **Add Button component test** — Render, press handler, disabled state, loading state, haptic trigger | P1 | S | S8.7 | `components/ui/__tests__/Button.test.tsx` |
| S12.2 | **Add TextInput component test** — Render with label, error display, password toggle, focus/blur | P1 | S | S8.7 | `components/ui/__tests__/TextInput.test.tsx` |
| S12.3 | **Add BottomSheet component test** — Open/close, backdrop dismiss, accessibility modal | P1 | S | S8.7 | `components/ui/__tests__/BottomSheet.test.tsx` |
| S12.4 | **Add useAnnouncements hook test** — Mock API, test loading/error/success states, refresh | P2 | M | S8.7 | `hooks/__tests__/useAnnouncements.test.ts` |
| S12.5 | **Add useEvents hook test** — Mock API, test category filtering, date filtering | P2 | M | S8.7 | `hooks/__tests__/useEvents.test.ts` |
| S12.6 | **Add prayer times screen integration test** — Render screen, verify prayer list, countdown display | P2 | M | S8.7, S8.10 | `app/(tabs)/__tests__/index.test.tsx` |
| S12.7 | **Add mosque prayer times backend test** — GET endpoint, date filter, invalid date handling | P1 | S | — | `backend/api/tests/test_prayer_times.py` |
| S12.8 | **Add edge case tests** — Midnight prayer boundary, DST transitions, empty mosque list, invalid coordinates | P2 | M | — | Multiple test files |
| S12.9 | **Add announcement/event CRUD backend tests** — Create, update, delete with admin permissions. Non-admin rejection | P1 | M | — | `backend/api/tests/test_announcements.py`, `backend/api/tests/test_events.py` |
| S12.10 | **Add test data factories** — Install `factory_boy`. Create UserFactory, MosqueFactory, AnnouncementFactory, EventFactory | P2 | M | — | `backend/api/tests/factories.py`, `backend/requirements.txt` |

### S13: Remaining Polish

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S13.1 | **Add semantic heading hierarchy** — `accessibilityRole="header"` on screen titles, section headers | P2 | S | — | All screen files |
| S13.2 | **Add loading state announcements** — `accessibilityLiveRegion="polite"` on loading spinners | P2 | XS | — | All screen files |
| S13.3 | **BottomSheet: don't unmount children** — Use opacity/translateY instead of `return null` to avoid re-mount cost | P2 | S | — | `components/ui/BottomSheet.tsx` |
| S13.4 | **Add HTTPS scheme validation** — `if (!API_URL.startsWith('https://')) throw` in api.ts | P2 | XS | — | `lib/api.ts` |
| S13.5 | **Sanitize error messages** — Don't expose raw API response bodies in thrown errors. Show generic user-facing messages | P2 | S | — | `lib/api.ts` |
| S13.6 | **Add monthly database vacuum cron** — Schedule `VACUUM ANALYZE` on production PostgreSQL | P3 | XS | — | Server crontab |
| S13.7 | **Test on iPad** — Verify layout works with `supportsTablet: true` declared | P1 | M | — | Manual testing |
| S13.8 | **Test on real iOS device** — Verify Apple Sign-In, push notifications, haptics | P0 | M | S3.1, S3.5 | Manual testing |
| S13.9 | **Test on real Android device** — Verify Google Sign-In, notification channels, location | P0 | M | — | Manual testing |

---

## Sprint 5 — Final Submission (Week 5)

### S14: Build & Submit

| ID | Task | Priority | Effort | Depends | Files |
|----|------|----------|--------|---------|-------|
| S14.1 | **Run full CI pipeline** — TypeScript check, ESLint, Jest (frontend), Django tests (backend). All must pass | P0 | S | All previous | — |
| S14.2 | **EAS Build iOS** — `eas build --platform ios --profile production` | P0 | M | S4.1, S14.1 | — |
| S14.3 | **EAS Build Android** — `eas build --platform android --profile production` | P0 | M | S4.1, S14.1 | — |
| S14.4 | **Submit iOS to App Store Connect** — Upload build, fill metadata, screenshots, privacy labels, review notes | P0 | M | S14.2, S4.5, S4.8 | App Store Connect |
| S14.5 | **Submit Android to Google Play Console** — Upload AAB, fill listing, screenshots, data safety, content rating questionnaire | P0 | M | S14.3, S4.6, S4.9 | Google Play Console |
| S14.6 | **Verify backend production is healthy** — Health check, database connectivity, API responsiveness | P0 | S | — | — |
| S14.7 | **Monitor App Store review** — Respond to any reviewer questions within 24h. iOS review: 1-7 days. Google review: hours to 3 days | P0 | — | S14.4, S14.5 | — |

---

## Task Dependency Graph (Critical Path)

```
S1.1 (Privacy Policy) ──→ S1.3 (In-app screen) ──→ S1.6 (Consent checkboxes)
S1.2 (ToS)            ──→ S1.4 (In-app screen) ──↗
S3.1 (Bundle ID fix)  ──→ S13.8 (iOS device test)
S3.4 (SecureStore)     ──→ S3.5 (Migrate tokens) ──→ S13.8
S2.1 (Delete endpoint) ──→ S2.2 (Delete UI) ──→ S8.4 (Delete tests)
S3.2 (Google JWT fix)  ──→ S8.1 (Social auth tests)
S8.7 (Jest mocks)     ──→ S8.8, S8.9, S8.10 (Frontend tests)
S4.1 (EAS creds)      ──→ S14.2, S14.3 (Builds)
S14.2, S14.3           ──→ S14.4, S14.5 (Submissions)
```

**Critical path duration:** ~4 weeks (S1 → S3 → S5 → S8 → S13.8 → S14)

---

## Task Count Summary

| Sprint | Tasks | P0 | P1 | P2 | P3 |
|--------|:-----:|:--:|:--:|:--:|:--:|
| Sprint 1 — Store Blockers | 33 | 22 | 10 | 0 | 1 |
| Sprint 2 — Critical Quality | 32 | 14 | 14 | 4 | 0 |
| Sprint 3 — i18n & DevOps | 19 | 4 | 8 | 7 | 0 |
| Sprint 4 — Islamic & Tests | 15 | 0 | 6 | 8 | 1 |
| Sprint 5 — Build & Submit | 7 | 7 | 0 | 0 | 0 |
| **Total** | **106** | **47** | **38** | **19** | **2** |

---

## Definition of Done (Per Task)

- [ ] Code changes implemented and compiling (TypeScript strict, no errors)
- [ ] All existing tests still pass
- [ ] New tests written (for P0/P1 tasks)
- [ ] i18n: any new user-facing strings added to both en.json and ar.json
- [ ] Accessibility: any new interactive elements have `accessibilityLabel`
- [ ] Code committed with descriptive message
- [ ] PR reviewed (if team > 1)

## Definition of Launch-Ready

- [ ] All P0 tasks complete
- [ ] All P1 tasks complete (or explicitly deferred with justification)
- [ ] CI pipeline passes (TypeScript + ESLint + Jest + Django tests)
- [ ] Test coverage > 40% frontend, > 50% backend
- [ ] Tested on real iOS device (iPhone)
- [ ] Tested on real Android device
- [ ] Tested on iPad (tablet layout)
- [ ] Privacy Policy hosted and accessible
- [ ] Terms of Service hosted and accessible
- [ ] App Store screenshots created
- [ ] EAS credentials configured
- [ ] Backend production server healthy
- [ ] Sentry monitoring active
- [ ] All store metadata filled (descriptions, keywords, categories, privacy labels, data safety)
