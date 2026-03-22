# Masjid Connect — Council Audit Report

> **Date:** 2026-03-22
> **Auditors:** 24 domain experts across 2 councils, 6 teams
> **Scope:** Full-stack audit of mobile app, backend API, web presence, and design system

---

## Executive Summary

**24 expert auditors** conducted a ruthless, systematic audit of the Masjid Connect app across security, infrastructure, backend architecture, data privacy, frontend performance, offline resilience, internationalization, accessibility, testing, UX strategy, mobile interaction, admin flows, dark mode, prayer times domain logic, notifications, API integration, state management, edge case UI, content strategy, device responsiveness, and web presence.


### Master Scoreboard

| # | Auditor | Team | Findings | CRIT | HIGH | MED | LOW |
|---|---------|------|----------|------|------|-----|-----|
| 1 | Security Architect | Alpha | 25 | 3 | 7 | 8 | 7 |
| 2 | DevOps/Infra Engineer | Alpha | 29 | 3 | 7 | 10 | 9 |
| 3 | Backend Architect | Alpha | 27 | 3 | 8 | 8 | 8 |
| 4 | Data & Privacy Counsel | Alpha | 21 | 0 | 6 | 8 | 5 |
| 5 | RN Performance Architect | Bravo | 23 | 3 | 8 | 8 | 4 |
| 6 | Offline/Data Engineer | Bravo | 18 | 3 | 5 | 6 | 4 |
| 7 | i18n/a11y Specialist | Bravo | 30 | 5 | 9 | 10 | 6 |
| 8 | Testing & Quality Lead | Bravo | 27 | 4 | 11 | 9 | 3 |
| 9 | Prayer Times Domain Expert | Charlie | 15 | 2 | 4 | 5 | 4 |
| 10 | Notifications Engineer | Charlie | 18 | 3 | 5 | 6 | 4 |
| 11 | API Integration Specialist | Charlie | 23 | 4 | 7 | 7 | 5 |
| 12 | State & Architecture Lead | Charlie | 19 | 2 | 6 | 6 | 5 |
| D1 | Visual Design Director | Delta | 24 | 4 | 9 | 8 | 3 |
| D2 | Brand Identity Specialist | Delta | 15 | 2 | 5 | 4 | 2 |
| D3 | Typography Lead | Delta | 22 | 2 | 5 | 8 | 7 |
| D4 | Motion/Animation Director | Delta | 19 | 2 | 4 | 7 | 4 |
| D5 | UX Strategist | Echo | 20 | 3 | 5 | 7 | 5 |
| D6 | Mobile UX Specialist | Echo | 22 | 2 | 9 | 6 | 5 |
| D7 | Admin UX Auditor | Echo | 18 | 3 | 4 | 6 | 5 |
| D8 | Dark Mode & Theming Lead | Echo | 12 | 2 | 2 | 4 | 4 |
| D9 | Empty/Error State Designer | Foxtrot | 17 | 3 | 5 | 5 | 4 |
| D10 | Content Strategy Lead | Foxtrot | 28 | 3 | 8 | 9 | 8 |
| D11 | Responsive/Device Auditor | Foxtrot | 20 | 2 | 6 | 8 | 4 |
| D12 | Landing Page & Web Auditor | Foxtrot | 26 | 4 | 7 | 8 | 7 |
| | **GRAND TOTAL** | | **518** | **67** | **156** | **167** | **122** |

### Severity Distribution

| Severity | Count | % |
|----------|-------|---|
| CRITICAL | 67 | 13% |
| HIGH | 156 | 30% |
| MEDIUM | 167 | 32% |
| LOW | 122 | 24% |

### By Council

| Council | Findings | CRIT | HIGH |
|---------|----------|------|------|
| Technical (12 auditors) | 275 | 35 | 87 |
| Design (12 auditors) | 243 | 32 | 69 |

---

## TOP 25 CRITICAL FINDINGS (Immediate Action Required)

These are the most impactful findings across all auditors, deduplicated and prioritized.

### 1. No Mosque Selection / Onboarding Flow
**Auditors:** D5 (UX), D9 (Edge Cases)
**Issue:** After auth, users go directly to tabs with no mosque selection, location permission, or notification permission flow. The entire app value proposition depends on knowing which mosque and where the user is.
**Fix:** Add onboarding steps: location permission → mosque selection → notification permission.

### 2. RTL Layout Never Activated for Arabic Users
**Auditors:** 7 (i18n/a11y)
**Issue:** `configureRTL()` is defined in `lib/rtl.ts` but never called anywhere. Arabic users get LTR layout.
**Fix:** Call `configureRTL()` at app startup and on language change.

### 3. 401 Token Clearing Uses Wrong Storage Backend
**Auditors:** 1 (Security), 6 (Offline), 11 (API)
**Issue:** On 401, tokens cleared from AsyncStorage instead of SecureStore. Token persists in SecureStore, creating infinite auth failure loop.
**Fix:** Replace `AsyncStorage.multiRemove()` with `secureDelete()` calls.

### 4. No Offline Queue for Write Operations
**Auditors:** 6 (Offline)
**Issue:** All write operations (subscriptions, feedback, content creation) are lost if user is offline. CLAUDE.md mandates queuing.
**Fix:** Implement offline action queue with retry-on-reconnect.

### 5. No Network Status Detection
**Auditors:** 6 (Offline), D9 (Edge Cases)
**Issue:** Zero runtime awareness of online/offline state. No offline indicator anywhere.
**Fix:** Integrate `@react-native-community/netinfo` with a `useNetworkStatus` hook.

### 6. Privacy Policy Falsely Denies Using Crash Reporting
**Auditors:** 4 (Privacy)
**Issue:** Policy states "We do not use any crash reporting tools" while Sentry is actively integrated.
**Fix:** Remove false claim, disclose Sentry in privacy policy.

### 7. No Next-Day Prayer Reminder Scheduling
**Auditors:** 10 (Notifications)
**Issue:** Prayer reminders only scheduled for current day. If user doesn't open app, Fajr reminder never fires.
**Fix:** Implement `expo-background-fetch` for daily rescheduling.

### 8. CI Tests Run Against SQLite, Production Uses PostgreSQL
**Auditors:** 2 (DevOps)
**Issue:** Backend CI uses SQLite default. PostgreSQL-specific features untested.
**Fix:** Add PostgreSQL service container to CI pipeline.

### 9. No Backend Dependency Pinning
**Auditors:** 2 (DevOps)
**Issue:** No lock file for Python dependencies. Builds are non-reproducible.
**Fix:** Adopt `pip-tools` with `pip-compile`.

### 10. Scrape Workflow Runs Migrations Against Production from CI
**Auditors:** 2 (DevOps)
**Issue:** GitHub Actions workflow runs `migrate --run-syncdb` directly against production database.
**Fix:** Remove migrations from scrape workflow entirely.

### 11. GoldBadge Has Zero Animation
**Auditors:** D4 (Motion)
**Issue:** CLAUDE.md mandates "Notification badges animate with Divine Gold glint." Component is entirely static.
**Fix:** Add spring entrance animation and breathing pulse.

### 12. InAppToast Uses PanResponder (JS Thread) Instead of Gesture Handler
**Auditors:** D4 (Motion)
**Issue:** Swipe-to-dismiss runs on JS thread causing jank.
**Fix:** Replace with `Gesture.Pan()` from react-native-gesture-handler.

### 13. IslamicPattern Recomputes All Geometry Every Render
**Auditors:** 5 (Performance)
**Issue:** ~180 star trigonometric calculations + Skia paths rebuilt on every render. No memoization.
**Fix:** Wrap in `useMemo` keyed on dimensions.

### 14. ~1800 Lines of Dead Duplicate Code
**Auditors:** 5 (Performance), 12 (Architecture)
**Issue:** Hidden `announcements.tsx` and `events.tsx` tabs duplicate community sub-components entirely.
**Fix:** Delete the hidden standalone tab screens.

### 15. No Pagination — Only First Page Ever Fetched
**Auditors:** 11 (API)
**Issue:** DRF returns paginated responses but frontend never fetches beyond page 1.
**Fix:** Implement load-more or increase `page_size`.

### 16. No E2E Tests Anywhere
**Auditors:** 8 (Testing)
**Issue:** Zero end-to-end tests. Only smoke tests ("renders without crashing") for most screens.
**Fix:** Add Maestro E2E suite for critical flows.

### 17. Prayer Times Error State Has No Retry
**Auditors:** D9 (Edge Cases)
**Issue:** Most-used screen shows error with no retry button and no pull-to-refresh.
**Fix:** Wrap error state in ScrollView with RefreshControl + retry button.

### 18. Terms of Service Brand Mismatch + Not Internationalized
**Auditors:** D10 (Content)
**Issue:** Terms says "Mosque Connect" while app brand is "The Salafi Masjid." Entire page hardcoded English.
**Fix:** Align brand name, extract all strings to i18n locale files.

### 19. Missing robots.txt, sitemap.xml, and 404 Page
**Auditors:** D12 (Web)
**Issue:** Fundamental SEO infrastructure and error recovery completely absent from website.
**Fix:** Create all three files.

### 20. Placeholder App Store IDs in All Download Links
**Auditors:** D12 (Web)
**Issue:** Every download CTA on the website leads to dead links with placeholder IDs.
**Fix:** Replace with real IDs or "Coming Soon" state.

### 21. Dark Mode Palette Deviates from CLAUDE.md Spec
**Auditors:** D1 (Visual), D2 (Brand), D8 (Dark Mode)
**Issue:** Spec says Onyx near-OLED black; implementation uses Sapphire navy. Four core color values differ.
**Fix:** Align spec and implementation — pick one source of truth.

### 22. BottomSheet Scroll/Gesture Conflict
**Auditors:** D6 (Mobile UX)
**Issue:** Pan gesture intercepts all vertical touches, making long content unscrollable in bottom sheets.
**Fix:** Implement `Gesture.Simultaneous()` with scroll position awareness.

### 23. No iPad-Optimized Layout
**Auditors:** D11 (Responsive)
**Issue:** All content stretches full width on iPad with no maxWidth constraint.
**Fix:** Add responsive container with `maxWidth: 600` on wide screens.

### 24. Donation/Gift Aid PII Stored Without Retention Policy
**Auditors:** 4 (Privacy), 3 (Backend)
**Issue:** Donor name, email, address stored indefinitely in plaintext. No GDPR retention schedule.
**Fix:** Implement 6-year retention for Gift Aid data, anonymize after.

### 25. No Server-Side Record of User Consent (ToS/Privacy Acceptance)
**Auditors:** 4 (Privacy)
**Issue:** Sign-up enforces checkboxes client-side but never transmits or persists consent server-side.
**Fix:** Add `privacy_accepted_at`, `terms_accepted_at` fields to User model.

---

## PRIORITIZED REMEDIATION ROADMAP

### Sprint 1: Showstoppers (Week 1-2)
*These block launch or create legal/security liability*

| # | Finding | Category | Effort |
|---|---------|----------|--------|
| 3 | Fix 401 token clearing (SecureStore vs AsyncStorage) | Security | S |
| 6 | Fix privacy policy false claim about crash reporting | Legal | S |
| 25 | Add server-side consent recording | Legal | M |
| 24 | Add data retention policy for donations | Legal | M |
| 10 | Remove production migrations from CI scrape workflow | DevOps | S |
| 18 | Fix Terms of Service brand name + internationalize | Content | M |
| 2 | Call `configureRTL()` at startup | i18n | S |

### Sprint 2: Core UX Gaps (Week 2-3)
*These fundamentally break the user experience*

| # | Finding | Category | Effort |
|---|---------|----------|--------|
| 1 | Add onboarding flow (location → mosque → notifications) | UX | L |
| 7 | Add background task for next-day prayer scheduling | Notifications | M |
| 5 | Add network status detection + offline indicator | Offline | M |
| 17 | Add retry to prayer times error state | Edge Cases | S |
| 22 | Fix BottomSheet scroll/gesture conflict | Mobile UX | M |
| 11 | Animate GoldBadge | Motion | S |

### Sprint 3: Performance & Quality (Week 3-4)
*These affect reliability and perceived quality*

| # | Finding | Category | Effort |
|---|---------|----------|--------|
| 13 | Memoize IslamicPattern geometry | Performance | S |
| 14 | Delete 1800 lines of dead duplicate code | Architecture | S |
| 8 | Add PostgreSQL to CI | DevOps | M |
| 9 | Pin Python dependencies | DevOps | S |
| 15 | Implement pagination traversal | API | M |
| 4 | Implement offline write queue | Offline | L |
| 12 | Replace PanResponder with Gesture Handler in toast | Motion | S |

### Sprint 4: Polish & Web (Week 4-5)
*These affect brand quality and discoverability*

| # | Finding | Category | Effort |
|---|---------|----------|--------|
| 21 | Reconcile dark mode palette with spec | Design | M |
| 23 | Add iPad responsive layout | Responsive | M |
| 19 | Create robots.txt, sitemap.xml, 404.html | Web | S |
| 20 | Fix placeholder App Store IDs | Web | S |
| 16 | Add E2E test suite | Testing | L |

**Effort Key:** S = Small (< 1 day), M = Medium (1-3 days), L = Large (3-5 days)

---

## AUDITOR-SPECIFIC FINDING COUNTS

### Technical Council Detail

**Team Alpha — Security & Infrastructure**
- Auditor 1 (Security): 25 findings — token storage, CORS, rate limiting, injection vectors, CSRF, IDOR
- Auditor 2 (DevOps): 29 findings — CI/CD gaps, no Docker testing, no staging, backup gaps, missing health depth
- Auditor 3 (Backend): 27 findings — N+1 queries, race conditions, SSL disabled in scrapers, missing indexes
- Auditor 4 (Privacy): 21 findings — no consent recording, PII retention, false privacy claims, missing DPAs

**Team Bravo — Frontend & Mobile**
- Auditor 5 (Performance): 23 findings — Skia rebuild every render, inline functions in lists, dead code
- Auditor 6 (Offline): 18 findings — no network detection, no write queue, empty static timetable, no cache TTL
- Auditor 7 (i18n/a11y): 30 findings — RTL never enabled, hardcoded strings, missing a11y labels, touch targets
- Auditor 8 (Testing): 27 findings — 0% coverage on api.ts/notifications.ts, no E2E, smoke-only screen tests

**Team Charlie — Domain & Integration**
- Auditor 9 (Prayer): 15 findings — missing timezone param, double ensurePM, Isha midnight boundary
- Auditor 10 (Notifications): 18 findings — no next-day scheduling, no push cleanup on logout, guest exclusion
- Auditor 11 (API): 23 findings — pagination never traversed, type mismatches FE/BE, no AbortController
- Auditor 12 (Architecture): 19 findings — massive duplication, stale closures, context instability

### Design Council Detail

**Team Delta — Visual & Brand**
- D1 (Visual): 24 findings — palette drift from spec, hardcoded colors, dark mode contrast failures
- D2 (Brand): 15 findings — gold color mismatch web/app, splash bg mismatch, web CSS uses `ease` not springs
- D3 (Typography): 22 findings — fontWeight '500' not in scale (15 locations), missing Arabic variants
- D4 (Motion): 19 findings — static GoldBadge, JS thread gestures, missing haptics on tabs/sheets

**Team Echo — UX & Interaction**
- D5 (UX Strategy): 20 findings — no onboarding, hidden tab dead deep links, no search, no forgot password
- D6 (Mobile UX): 22 findings — BottomSheet scroll conflict, 8+ undersized touch targets, no Android back
- D7 (Admin UX): 18 findings — no FAB tooltip, no publish success feedback, no edit/delete, no drafts
- D8 (Dark Mode): 12 findings — ErrorFallback/Splash bypass theme context, theme flash on startup

**Team Foxtrot — Content & Edge Cases**
- D9 (Edge Cases): 17 findings — no retry on prayer error, no offline indicator, bare spinners (no skeletons)
- D10 (Content): 28 findings — Terms hardcoded English, brand mismatch, inconsistent Islamic terminology
- D11 (Responsive): 20 findings — no iPad maxWidth, fixed 54px countdown, unused font scaling infra
- D12 (Web): 26 findings — missing robots/sitemap/404, dead store links, bank details in HTML, no skip nav

---

*This audit was conducted by 24 parallel expert agents across 3 phases. Each auditor read every file in their domain and produced findings with exact file references and specific remediation guidance. The full detailed findings from each auditor are available in the session transcript.*

