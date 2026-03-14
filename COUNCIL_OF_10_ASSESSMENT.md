# Council of 10 — App Store Readiness Assessment

**Date:** 2026-03-14
**Project:** Masjid-Connect (Mosque Connect)
**Stack:** React Native + Expo SDK 55 | Django 5 + DRF | TypeScript

---

## Executive Scorecard

| # | Persona | Domain | Score | Verdict |
|---|---------|--------|:-----:|---------|
| 1 | Apple App Store Reviewer | Store guidelines, config, rejection risks | **42/100** | NOT READY |
| 2 | Security Auditor | OWASP MASVS, auth, data protection | **42/100** | NOT READY |
| 3 | UX/Accessibility Expert | WCAG 2.1 AA, screen readers, touch targets | **35/100** | NOT READY |
| 4 | Performance Engineer | Bundle size, rendering, memory, startup | **62/100** | NEEDS WORK |
| 5 | Backend/API Architect | Django DRF design, queries, scalability | **68/100** | NEEDS WORK |
| 6 | QA Engineer | Test coverage, strategy, edge cases | **28/100** | NOT READY |
| 7 | i18n/RTL Specialist | Arabic translations, RTL layout, plurals | **62/100** | NEEDS WORK |
| 8 | DevOps/CI-CD Engineer | Pipelines, deployment, monitoring | **62/100** | NEEDS WORK |
| 9 | Islamic Domain Expert | Prayer accuracy, terminology, Hijri calendar | **87/100** | GOOD |
| 10 | Privacy/Legal Compliance | GDPR, account deletion, data handling | **22/100** | NOT READY |

### **Weighted Overall Score: 51/100** — NOT READY FOR SUBMISSION

---

## Tier 1 — Submission Blockers (Fix Before Any Store Submission)

These issues will cause **instant rejection** or **legal liability**:

### Legal & Compliance (Privacy/Legal: 22, App Store: 42)
1. **No Privacy Policy** — instant rejection from both stores. Must host at `salafimasjid.app/privacy` and link in app.json
2. **No Terms of Service** — required for apps with user accounts
3. **No Account Deletion** — Apple (2022+) and Google (2024+) mandatory. No backend endpoint, no UI button. Must implement `DELETE /api/v1/auth/delete-account/` and cascade delete all user data
4. **No Data Export** — GDPR Article 20 (right to portability). Need export endpoint
5. **No Consent Checkboxes** at registration — GDPR requires explicit consent before account creation
6. **Apple Sign-In Bundle ID Mismatch** — backend verifies `com.masjidconnect.app` but app.json uses `app.salafimasjid`. Will cause 100% Apple Sign-In failures
7. **EAS Credentials All Placeholders** — `appleId`, `ascAppId`, `appleTeamId` are dummy values. Cannot build or submit
8. **No App Store Screenshots/Metadata** — no description, keywords, category, or screenshots prepared

### Security Critical (Security: 42)
9. **Auth Token in Unencrypted AsyncStorage** — must migrate to `expo-secure-store` (Keychain/Keystore)
10. **Google Token Verification via Network Call** — no JWT signature verification, vulnerable to MITM. Must verify locally with `google-auth` library
11. **CORS_ALLOW_ALL_ORIGINS in DEBUG** — if accidentally deployed with `DEBUG=True`, entire API is open
12. **Apple Token Audience Hardcoded** — not validated against config, tokens from other apps accepted

---

## Tier 2 — Critical Quality Issues (Fix Before Beta)

### Accessibility (Score: 35)
13. **Zero Accessibility Labels** — no `accessibilityLabel`, `accessibilityRole`, or `accessibilityHint` on any interactive element. Screen reader users completely blocked
14. **No Reduced Motion Support** — animations always run, violates WCAG 2.3.3. Must check `AccessibilityInfo`
15. **Color Contrast Failure** — Divine Gold (`#BFA14E`) on white backgrounds = 3.8:1 ratio (WCAG AA requires 4.5:1)
16. **No Focus Management in BottomSheet** — no `accessibilityViewIsModal`, no focus trap
17. **Images Missing Alt Text** — splash logo, auth logo, SVG icons have no accessible labels

### Performance (Score: 62)
18. **Memory Leak: usePrayerTimes Intervals** — two `setInterval` hooks with `prayers` as dependency cause constant timer creation/destruction cycles
19. **Context Value Instability** — ThemeContext and AuthContext create new object references every render, causing 100+ unnecessary re-renders per screen transition. Wrap values in `useMemo`
20. **AsyncStorage Blocking Render** — multiple sequential `await AsyncStorage.getItem()` calls block prayer times screen load (~500ms+)
21. **No FlatList Pagination Tuning** — missing `initialNumToRender`, `maxToRenderPerBatch`. 100+ items all render at once

### Testing (Score: 28)
22. **Only 23 Tests for ~4,600 LOC** — ~15% estimated coverage
23. **Zero Component Tests** — 10 components, 0 tests
24. **Zero Hook Tests** — `usePrayerTimes`, `useAnnouncements`, `useEvents` completely untested
25. **Social Auth Untested** — Apple/Google token verification has no tests and makes real HTTP calls
26. **Subscriptions/Push Tokens Untested** — 5 backend endpoints with zero test coverage
27. **Notification Scheduling Untested** — entire prayer reminder system (173 LOC) has 0 tests

### Backend (Score: 68)
28. **Missing Database Indexes on Foreign Keys** — `Announcement.mosque`, `Event.mosque`, `UserSubscription.user`, etc. will cause full table scans at scale
29. **Haversine in Python, Not SQL** — `Mosque.objects.all()` loads ALL mosques into memory for distance calculation. O(n) memory, unusable at 10k+ mosques
30. **Social Auth Race Condition** — `User.objects.get_or_create()` + `user.save()` not wrapped in `@transaction.atomic()`. Concurrent requests can corrupt data
31. **No Token Expiration** — DRF tokens valid forever. Compromised token cannot be time-limited

---

## Tier 3 — Important Improvements (Fix Before Launch)

### i18n/RTL (Score: 62)
32. **No Language Switching UI** — Arabic translations exist (126/126 keys) but no way for users to switch to Arabic
33. **Date Formatting Without Locale** — `date-fns` format calls have no locale parameter, dates always in English
34. **`formatDistanceToNow` Without Locale** — relative time labels ("2 hours ago") always English
35. **Hardcoded Strings** — 3 instances: "About" in layout, "Mosque Connect" in modal, "Umm Al-Qura (Makkah)" in settings
36. **Fixed Margins Not RTL-Aware** — `marginLeft`/`marginRight` throughout don't mirror in RTL mode

### DevOps (Score: 62)
37. **No Error Monitoring** — zero Sentry, Rollbar, or any crash tracking. Production is blind
38. **No Rollback Strategy** — failed deployment requires manual `git checkout` + redeploy (30-60 min recovery)
39. **Database Migrations Run After Restart** — schema change can crash running app. Must run migrations before container restart
40. **Single Container, No HA** — one `web` container crash = full outage. No replicas
41. **No Staging Environment** — CI deploys directly to production on push to main

### Security Additional
42. **No Certificate Pinning** — standard TLS only, MITM possible with compromised device cert store
43. **ALLOWED_HOSTS defaults to `*`** — accepts requests to any hostname
44. **Email Enumeration** — registration returns "email already exists" (enables account harvesting)
45. **Admin Panel at `/admin/` Without Rate Limiting** — brute-forceable

### Islamic Domain (Score: 87)
46. **Calculation Method Hardcoded** — Umm Al-Qura only, no user selection. Diaspora communities may prefer ISNA/MWL
47. **Jumu'ah Not Featured on Fridays** — stored but not prominently displayed on the prayer times screen on Fridays
48. **No "Jumu'ah" Event Category** — Friday prayer events categorized as "lesson" or "lecture"

---

## Tier 4 — Polish (Post-Launch)

### Accessibility
49. Semantic heading hierarchy (`accessibilityRole="header"`)
50. Loading states not announced (`accessibilityLiveRegion`)
51. High contrast mode support
52. Dynamic Type / font scaling verification

### Performance
53. BottomSheet unmounts children on hide (causes re-mount jank)
54. Sequential API calls in settings (waterfall, should use `Promise.all`)
55. Calendar theme object recreated every render
56. Staggered animation delays compound on large lists (20+ items = 1000ms)

### DevOps
57. Dependency versions loosely pinned (non-reproducible builds)
58. No persistent log storage (lost on container restart)
59. Database backups not tested (only size check, no integrity)
60. No branch protection enforcement

### Testing
61. No E2E tests
62. No coverage thresholds in CI
63. No test data factories (`factory_boy` for backend)
64. No frontend API mocking strategy

### i18n
65. No device language auto-detection
66. Arabic pluralization rules not implemented
67. Number formatting (Arabic-Indic numerals) not used
68. Calendar component RTL untested

---

## What's Done Well (Council Consensus)

The council unanimously praised these aspects:

- **Islamic Domain Correctness (87/100)** — prayer names, Aladhan API integration, adhan-js fallback, Hijri calendar, Jama'ah/Athan distinction, Arabic terminology all excellent
- **Design System Quality** — Convergent Arch brand identity, Kozo paper texture, spring-based animations, Divine Gold badge (not red), and elevation system are professional-grade
- **Architecture Decisions** — Expo managed workflow, Django DRF (not Firebase), offline-first with Aladhan primary + adhan-js fallback, token auth for mobile — all correct choices
- **Translation Completeness** — 126/126 keys with full parity between en.json and ar.json
- **Documentation** — CLAUDE.md, DEPLOY.md (890 lines), and DOCTRINE.md are exceptionally thorough
- **Docker Setup** — multi-stage builds, non-root user, health checks, gthread workers, graceful shutdown
- **Database Backup System** — daily/weekly/monthly rotation with restore scripts
- **API Design** — RESTful URLs, proper `select_related` for N+1 prevention, sensible permissions, good throttling

---

## Remediation Roadmap

### Phase 1: Store Submission Blockers (Week 1-2)
| # | Task | Owner Domain | Effort |
|---|------|-------------|--------|
| 1 | Write & host Privacy Policy + Terms of Service | Legal | 2-3 days |
| 2 | Fix Apple Bundle ID mismatch in backend | Security | 15 min |
| 3 | Implement account deletion endpoint + UI | Legal/Backend | 1-2 days |
| 4 | Fill EAS credentials, create store accounts | DevOps | 1 day |
| 5 | Create app screenshots + store metadata | App Store | 2-3 days |
| 6 | Migrate auth token to expo-secure-store | Security | 2-4 hours |
| 7 | Fix Google token verification (local JWT) | Security | 3-4 hours |
| 8 | Remove CORS_ALLOW_ALL_ORIGINS wildcard | Security | 15 min |

### Phase 2: Critical Quality (Week 2-4)
| # | Task | Owner Domain | Effort |
|---|------|-------------|--------|
| 9 | Add accessibility labels to all interactive elements | Accessibility | 2-3 days |
| 10 | Fix usePrayerTimes interval memory leak | Performance | 2-3 hours |
| 11 | Wrap context values in useMemo | Performance | 1-2 hours |
| 12 | Add missing FK database indexes | Backend | 30 min |
| 13 | Move haversine to SQL | Backend | 1-2 hours |
| 14 | Add social auth tests + subscription tests | QA | 6-8 hours |
| 15 | Add language switcher UI in settings | i18n | 4-6 hours |
| 16 | Add Sentry error monitoring | DevOps | 2-3 hours |
| 17 | Fix Divine Gold contrast ratio for light mode | Accessibility | 1 hour |
| 18 | Add reduced motion support | Accessibility | 2-3 hours |

### Phase 3: Launch Hardening (Week 4-6)
| # | Task | Owner Domain | Effort |
|---|------|-------------|--------|
| 19 | Add date-fns locale support | i18n | 2-3 hours |
| 20 | Fix RTL margins/alignment | i18n | 4-6 hours |
| 21 | Implement rollback strategy | DevOps | 4-6 hours |
| 22 | Run migrations before container restart | DevOps | 1-2 hours |
| 23 | Add usePrayerTimes + notification tests | QA | 8-10 hours |
| 24 | Add component rendering tests | QA | 6-8 hours |
| 25 | Implement token expiration (JWT) | Security | 4-6 hours |
| 26 | Add calculation method selection | Islamic | 2-3 hours |
| 27 | Feature Jumu'ah prominently on Fridays | Islamic | 3-4 hours |

**Total estimated effort to reach store-ready: 4-6 weeks with 1-2 developers**

---

## Council Verdict

> **The app is a beautifully designed, architecturally sound product with excellent Islamic domain knowledge and documentation. However, it has critical gaps in legal compliance, security, accessibility, and testing that prevent store submission today. The foundation is strong — the issues are fixable, not fundamental. With focused remediation (Phase 1-2), the app can be store-ready in 3-4 weeks.**

| Dimension | Current | After Phase 1 | After Phase 2 | After Phase 3 |
|-----------|:-------:|:-------------:|:-------------:|:-------------:|
| App Store | 42 | **75** | 85 | 90 |
| Security | 42 | **70** | 80 | 88 |
| Accessibility | 35 | 40 | **65** | 75 |
| Performance | 62 | 62 | **78** | 85 |
| Backend API | 68 | 72 | **82** | 88 |
| Testing | 28 | 28 | **55** | 70 |
| i18n/RTL | 62 | 62 | **78** | 85 |
| DevOps | 62 | 65 | **75** | 82 |
| Islamic | 87 | 87 | 87 | **92** |
| Legal | 22 | **72** | 82 | 90 |
| **Overall** | **51** | **63** | **77** | **85** |
