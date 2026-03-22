# Masjid-Connect Fix Plan — 4 Stages

Based on the 6-team audit (~75-85 real issues out of 109 reported). Organized by priority and dependency.

---

## Stage 1: Security & Auth Hardening (CRITICAL — Do First)
*These are production security vulnerabilities that could be exploited today.*

### Backend Security Fixes
1. **Remove CORS debug endpoint** — Delete `/debug/cors/` route from `backend/config/urls.py`
2. **Fix health endpoint CORS** — Stop reflecting arbitrary `HTTP_ORIGIN` in health response headers
3. **Remove hardcoded SECRET_KEY default** — Change `settings.py` to raise error if SECRET_KEY not in env (no fallback)
4. **Remove CORS_ALLOW_ALL fallback** — Delete the `if DEBUG and not CORS_ALLOWED_ORIGINS` block
5. **Add token expiration** — Implement expiring tokens (django-rest-knox or custom middleware with TTL)
6. **Fix Google OAuth audience bypass** — Raise error instead of disabling `verify_aud` when no client IDs configured
7. **Fix open redirect in donation checkout** — Validate `return_url` against whitelist of allowed domains
8. **Fix rate limit bypass** — Replace `AnonRateThrottle` with `UserRateThrottle` or custom throttle that covers both
9. **Align password validation** — Change frontend minimum to 10 chars to match backend
10. **Add push token format validation** — Validate Expo push token format (`ExponentPushToken[...]`)
11. **Fix SecureStore/AsyncStorage 401 cleanup** — Use `secureDelete()` instead of raw `AsyncStorage.multiRemove()`

### Estimated scope: ~11 targeted fixes across 6 files

---

## Stage 2: Architecture & Data Integrity
*Correctness issues that cause bugs, data inconsistency, or doctrine violations.*

### Backend Fixes
1. **Async push notifications in signals** — Move Expo API calls out of Django signal handlers (use `django-q2`, Celery, or `threading.Thread` as quick fix)
2. **Fix GiftAidSettings singleton bug** — Fix reversed `if not self.pk` logic and add `select_for_update()` for atomicity
3. **Add admin roles API endpoint** — Stop using GDPR export endpoint to check admin status; add dedicated `/api/v1/auth/admin-roles/` endpoint

### Frontend Fixes
4. **Add offline caching for announcements/events** — Cache API responses in AsyncStorage with TTL, serve stale data when offline
5. **Server-side event category filtering** — Pass `selectedCategory` to API instead of client-side filtering
6. **Fix duplicate auth screens** — Remove orphaned `login.tsx` / `register.tsx`, keep `sign-in.tsx` / `sign-up.tsx`
7. **Wire up Sentry error capture** — Add `Sentry.captureException()` in error boundaries, API error handler, and critical catch blocks

### Estimated scope: ~7 fixes across 10 files

---

## Stage 3: UX, Accessibility & Interaction Polish
*User-facing quality issues that affect usability and accessibility.*

### Component Fixes
1. **BottomSheet swipe-to-dismiss** — Add `PanGestureHandler` for drag-down dismissal
2. **BottomSheet exit animation** — Delay unmount until exit animation completes (use animation callback)
3. **Event wizard date picker** — Replace raw `TextInput` with `@react-native-community/datetimepicker`
4. **Button theme fix** — Replace `useColorScheme()` with `useTheme()` in Button component
5. **Fix all `useColorScheme()` usages** — Audit and replace remaining direct `useColorScheme()` calls with `useTheme()`
6. **Add `<StatusBar>` component** — Add themed StatusBar in root layout
7. **Welcome screen reduced motion** — Add `useReducedMotion()` check, skip animations when enabled
8. **Static `Dimensions.get()` fix** — Replace module-level calls with `useWindowDimensions()` hook
9. **Gold text WCAG contrast** — Darken Divine Gold on light backgrounds or add text shadow for AA compliance
10. **RTL layout fixes** — Replace `paddingLeft/marginLeft` with `paddingStart/marginStart` throughout

### Estimated scope: ~10 fixes across 12-15 files

---

## Stage 4: Reliability, Testing & Platform Polish
*Quality-of-life improvements for long-term maintainability.*

### Testing
1. **Add component tests** — At minimum: Button, BottomSheet, PrayerTimeCard, ErrorFallback
2. **Add hook tests** — usePrayerTimes, useEvents, useAnnouncements, useAdminStatus
3. **Add screen smoke tests** — Welcome, SignIn, SignUp, Home (prayer times)
4. **CI coverage threshold** — Add minimum coverage gate in GitHub Actions

### Cleanup & Polish
5. **Remove dead code** — Delete ~1300 lines of identified duplicate/dead code
6. **Remove orphaned duplicate screens** — Clean up any remaining orphaned routes
7. **Fix dark mode elevation** — Add distinct elevation shadows for dark theme
8. **Splash screen dark mode** — Adapt splash animation for dark backgrounds
9. **Add CSP headers** — Configure Content-Security-Policy in Django middleware
10. **Add missing Arabic translations** — Complete `ar.json` admin namespace (~60 keys)
11. **Hardcoded version string** — Extract to single source of truth (app.json)

### Estimated scope: ~11 items across many files

---

## Execution Notes

- **Each stage should be a separate PR** for reviewability
- **Stage 1 is urgent** — security fixes should ship ASAP
- **Stages 2-3 can run in parallel** if different developers handle them
- **Stage 4 is lowest urgency** but highest long-term value
- False positives excluded: duplicate hooks, missing indexes, stale PanResponder, orphaned modal, duplicate privacy screens, missing back navigation
