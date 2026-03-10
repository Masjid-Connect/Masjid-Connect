# Consolidation Implementation Plan

## Mission
Tighten the existing codebase into a disciplined, durable community platform.
No rewrites. No new frameworks. Incremental improvements only.

---

## Stage 1: Anonymous Browsing (Highest Impact)
**Goal**: Allow community members to view prayer times, announcements, and events without creating an account.

### Changes:
1. **Frontend — Root Layout** (`app/_layout.tsx`): Remove hard redirect to login for unauthenticated users. Allow access to `(tabs)` without auth.
2. **Frontend — Auth Context** (`contexts/AuthContext.tsx`): Add `isGuest` state. Hydrate app without requiring a token.
3. **Frontend — Tab Screens**: Prayer times, announcements, events work without auth. Settings tab shows "Login" option for guests.
4. **Frontend — API Client** (`lib/api.ts`): Allow unauthenticated GET requests for mosques, announcements, events, prayer times.
5. **Frontend — Hooks**: `useAnnouncements` and `useEvents` must work without subscriptions (show all or show for a selected mosque).
6. **Frontend — Mosque Selection**: Guests can pick a mosque without subscribing. Store selection in AsyncStorage.
7. **Backend**: Already supports unauthenticated reads (`IsAuthenticatedOrReadOnly`). No backend changes needed.

### Definition of Done:
- User installs app → sees prayer times immediately (no login wall)
- Login is optional, available from Settings tab
- Subscriptions/push notifications still require auth

---

## Stage 2: API Hardening
**Goal**: Make the backend consistent, explicit, and secure.

### Changes:
1. **Explicit permissions** on all function-based views (`logout`, `me`, `register_push_token`) — add `@permission_classes([IsAuthenticated])`.
2. **Paginate `/nearby`** endpoint — use same `PageNumberPagination` as other list endpoints.
3. **Validate `from_date`** parameter in EventViewSet — return 400 on invalid dates.
4. **Stricter rate limiting** for auth endpoints — `5/minute` for login/register (brute-force protection).
5. **Permission checks on update/delete** — ensure only mosque admins can PATCH/DELETE announcements and events.

### Definition of Done:
- All endpoints have explicit permission decorators
- All list endpoints return paginated responses
- Invalid query params return 400 with clear message
- Auth endpoints throttled at 5/minute for anonymous users

---

## Stage 3: Governing Doctrine
**Goal**: Codify the rules that prevent drift, in a single file that future maintainers can enforce.

### Changes:
1. **Add `DOCTRINE.md`** at project root with:
   - Stack rules (single Django service, PostgreSQL only, React Native + Expo, no new frameworks)
   - Dependency rules (no new deps without justification, pin versions)
   - API rules (all config in env vars, versioned API, consistent error format)
   - Feature rules (if it doesn't serve "mosque communicates with community", reject it)
   - Admin UX rules (60-second time-to-first-post, zero jargon)
   - Data rules (PostgreSQL is single source of truth, mosque data isolation at query level)

### Definition of Done:
- DOCTRINE.md exists and is referenced from CLAUDE.md
- Rules are concrete and enforceable (not aspirational)

---

## Stage 4: Empty States & Error Polish
**Goal**: Every screen handles zero-data and error states gracefully.

### Changes:
1. **Prayer times loading** — show skeleton, not just spinner
2. **Network error** — friendly message with retry button on all screens
3. **Guest with no mosque selected** — clear prompt to select a mosque
4. **Consistent error display** — single `ErrorState` component used everywhere

### Definition of Done:
- Every tab screen has a tested empty state
- Network errors show human-readable message + retry
- No raw error objects shown to users
