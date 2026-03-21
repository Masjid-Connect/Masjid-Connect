# Mosque Connect — Audit Report Part 2/4
## Technical Council: Auditors 7–12 (Testing, Accessibility, i18n, Infrastructure, Privacy, Dependencies)

**Date:** 2026-03-21 | **Auditors:** 6 | **Total Findings:** 93

---

## Auditor 7 — Testing Auditor

### CRITICAL

**7.1 Frontend Coverage: 2.6%**
- 2 test files out of 77 TS/TSX files. Only `prayer.test.ts` (18 tests) and `storage.test.ts` (18 tests).
- ZERO tests for: API client (490 lines), notifications, all 27 UI components, all 6 hooks, all 15 screens.

**7.2 API Client Completely Untested**
- `lib/api.ts` — Token expiry/retry logic, auth state mutations, SecureStore branching, donation checkout — all untested.

**7.3 Prayer Calculation Edge Cases Missing**
- No DST transition tests, no polar region tests, no midnight boundary tests, no Hijri date rollover tests.

**7.4 Zero Integration Tests**
- No tests connecting frontend ↔ backend (auth flow, subscription → notification, announcement → push).

**7.5 Zero E2E Tests**
- No Detox or device simulation tests. UI bugs only caught in production.

### HIGH

**7.6 Backend Missing Tests** — No tests for: MosquePrayerTime CRUD, MosqueAdmin roles, Feedback model, donation/Stripe integration, signal handlers.

**7.7 Database Constraint Tests Missing** — No negative test for duplicate subscriptions, no cascade delete verification.

**7.8 Auth Token Lifecycle Untested** — No test for expired token access, token revocation on logout, concurrent requests.

**7.9 CI Coverage Not Enforced** — `jest.config.js` has no `coverageThreshold`. Coverage could drop to 0% and CI passes.

**7.10 AsyncStorage Mock Bleeds Between Tests** — `jest.setup.js` defines global `store = {}` never cleared between suites.

### MEDIUM

**7.11 No Snapshot Tests** — UI regression detection absent.

**7.12 No Rate Limiting Tests** — Throttles defined but never verified in tests.

**7.13 No Pagination Tests** — Backend paginates but no test for page 2+ results.

**7.14 Social Login JWT Failure Scenarios** — Tests mock all JWT operations; real failure paths (invalid signature, expired token) untested.

### Backend Coverage (Better But Gaps)
- 10 test files, 78+ test cases covering: auth, announcements, events, mosques, subscriptions, push tokens, prayer times, permissions, push sending.
- Missing: donations, gift aid, feedback, mosque admin roles, constraint validation, signal integration.

---

## Auditor 8 — Accessibility & Inclusivity Auditor

### CRITICAL

**8.1 Unlabeled Interactive Icons (20+)**
- `app/(tabs)/index.tsx:300-305`, `announcements.tsx:197,227,352`, `community.tsx:176-195`, `components/prayer/DateNavigator.tsx:65-114` — Icons with no `accessibilityLabel`. Screen readers announce nothing.

**8.2 Touch Targets Below 44pt Minimum**
- `components/prayer/DateNavigator.tsx:128-134` — Arrow buttons are 36×36pt (below 44pt minimum).
- `components/ui/TextInput.tsx:68` — Eye toggle only 32pt total with hitSlop.
- Tab bar labels at 11px (`caption2`) — too small for elderly.

**8.3 Color Contrast Failures (WCAG AA)**
- Gold `#D4AF37` on Stone-100 `#F9F7F2` = 3.2:1 (needs 4.5:1 for body text). Used for prayer times.
- Onyx-600 `#6B6B70` on Stone-100 = 4.4:1 (borderline fail for normal text at 4.5:1). Used for all secondary text.

### HIGH

**8.4 Missing accessibilityRole on Pressables** — Community segmented control, settings retry button, announcement action buttons — no `accessibilityRole="button"`.

**8.5 No Dynamic Type Support** — All font sizes hardcoded. App ignores iOS/Android system text size preferences. `allowFontScaling` never set.

**8.6 Status Indicators Not Announced** — Prayer active/passed indicators (GlowDot, checkmark) have no accessibilityLabel on their parent View.

**8.7 Text Sizes Too Small for Elderly** — `caption2: 11px`, `caption1: 12px`, `footnote: 13px` throughout. Presbyopia affects 90% of people 65+.

### MEDIUM

**8.8 Haptic Feedback Not Optional** — No preference to disable haptics. Users with vestibular disorders forced to experience vibration.

**8.9 Reduced Motion Incomplete** — `useReducedMotion()` used in some screens but missing from: AmbientTabIndicator, BottomSheet, welcome screen animations.

**8.10 Tab Bar Labels Undefined** — `tabBarAccessibilityLabel` not set on any tab. VoiceOver reads just "Prayer" instead of "Prayer times, tab 1 of 4."

**8.11 RTL Untested** — App claims "RTL-native from day one" but no evidence of VoiceOver/TalkBack testing in Arabic.

**8.12 Form Error Communication** — TextInput errors set as `accessibilityHint`, not live region. Screen readers may not announce validation failures.

**8.13 Badge Size 6-8px** — Unread dots nearly invisible for low vision users. Increase to 10-12px with border.

**8.14 Bottom Sheet Not Accessible** — Has `accessibilityViewIsModal` but no dismiss instructions for screen reader users.

---

## Auditor 9 — i18n & Localization Auditor

### CRITICAL

**9.1 Hardcoded English in Alert Dialogs**
- `app/_layout.tsx:93-100` — OTA update alert: "Update Available", "Later", "Restart" — never translated.
- `components/settings/ReportIssueSheet.tsx:83-91` — Email subject/body hardcoded English.
- `components/settings/FeatureRequestSheet.tsx:71-82` — Same.

### HIGH

**9.2 Hijri Month Always English**
- `lib/prayer.ts:80` — `hijriMonth: json.data.date.hijri.month.en` — always `.en`, never `.ar`. Aladhan API provides both.

**9.3 AM/PM Not Localized**
- `lib/prayer.ts:222,234` — Hardcoded `'AM'`/`'PM'`. Arabic uses different notation.

**9.4 Bank Account Name Hardcoded** — `components/support/BankDetailsSheet.tsx:19` — English only.

### MEDIUM

**9.5 Countdown Units Hardcoded** — `lib/prayer.ts:212-214` — `"2h 45m"` — English abbreviations not translatable.

**9.6 RTL Chevron Icons Not Mirrored** — `chevron-forward` used in SettingsRow, announcements, support — should flip to `chevron-back` in RTL.

**9.7 Prayer Labels Always English** — `lib/prayer.ts:164` — `PRAYER_LABELS[name].en` always used, never checks language.

**9.8 No Arabic-Indic Numerals** — Numbers in Arabic context use Western `0-9` instead of `٠-٩`.

**9.9 Calculation Method Names Hardcoded** — `types/index.ts:125-131` — English labels duplicating locale keys.

### LOW

**9.10 Pluralization Not Used** — Arabic has 6 plural forms; locale files use simple key-value only.

**9.11 Email Templates English-Only** — Bug reports and feature requests always sent in English.

**Translation Parity:** en.json and ar.json have matching keys. Architecture is sound (i18next + RTL support exists). ~60% localization-ready; fixing critical/high issues brings to ~85%.

---

## Auditor 10 — Infrastructure & DevOps Auditor

### CRITICAL

**10.1 Debug CORS Endpoint Exposes Secrets**
- `backend/config/urls.py:30-57` — `/debug/cors/` returns CORS config, CSRF origins, DEBUG status, raw env vars. Unauthenticated. Comment says "Temporary — remove after debugging." Still present.

**10.2 Health Check Doesn't Verify DB**
- `backend/config/urls.py:10-16` — Returns `{"status": "ok"}` without checking database connectivity. Deploy script uses this for rollback decisions.

### HIGH

**10.3 Sentry Frontend DSN Empty** — `.env.example:5` — `EXPO_PUBLIC_SENTRY_DSN=` empty. Frontend errors not tracked. Backend Sentry is configured.

**10.4 Migrations Not Verified Before Deploy** — `deploy.sh:60-61` runs `migrate --plan` with `|| true` (ignores errors).

**10.5 Static Files Collected with Placeholder SECRET_KEY** — `Dockerfile:52` — `SECRET_KEY=build-placeholder` may cause manifest hash mismatch at runtime.

**10.6 Secrets Rotation Not Documented** — No procedure for rotating SECRET_KEY, Stripe keys, DB password.

**10.7 Backup Restore Not Tested** — Backup script exists but no CI job verifies restores work.

**10.8 No Centralized Logging** — Docker json-file driver only. Logs on disk, no aggregation or alerting.

### MEDIUM

**10.9 Deploy Rollback Logic Fragile** — `deploy.sh:48-52,114-132` — Previous image tagging unreliable; rollback may re-tag broken image.

**10.10 Gunicorn Workers Not Tuned** — 2 workers hardcoded; no dynamic scaling based on CPU/memory.

**10.11 Traefik Network Assumes Manual Setup** — `docker-compose.prod.yml:81-83` — `external: true` fails if network not pre-created.

**10.12 Auth Endpoint Rate Limiting Weak** — 100/hour anon allows dictionary attacks on login.

**10.13 ALLOWED_HOSTS Can Be Empty** — Defaults to `[]`; no startup assertion for production.

### LOW

**10.14 CI Uses `--legacy-peer-deps`** — Bypasses peer dependency conflict warnings.

**10.15 Health Check Has Manual CORS Header** — Redundant with corsheaders middleware.

### Positive Notes
- Sentry backend properly configured with PII scrubbing
- Security headers set (HSTS, SSL redirect, X-Frame-Options)
- Docker multi-stage build is efficient
- Backup script has daily/weekly/monthly retention
- Resource limits configured in Docker

---

## Auditor 11 — Privacy & Compliance Auditor

### CRITICAL

**11.1 No Encryption at Rest for Gift Aid PII**
- `backend/core/models.py:445-505` — `donor_name`, `donor_address`, `donor_postcode`, `donor_email` stored as plain CharField. No field-level encryption.
- **Risk:** GDPR Art. 32 breach if DB compromised. ICO fine up to £20M.

**11.2 Donation PII Created Without Consent**
- Stripe webhook auto-creates `Donation` + `GiftAidDeclaration` with full PII from Stripe session. No explicit consent screen. No privacy notice before collection.
- **Risk:** GDPR Art. 6, 13, 14 violations.

**11.3 User Export Endpoint Unrestricted**
- `backend/api/views.py:328-349` — `/api/v1/auth/export-data/` has no rate limit, no audit logging, no confirmation step. Returns all user data including push tokens.

**11.4 No Data Retention Schedules**
- No retention periods defined for any data type. Donations, push tokens, announcements stored indefinitely.
- **Risk:** GDPR Art. 5(1)(e) — storage limitation principle violated.

**11.5 No Audit Logging for Donations**
- Financial operations (create, update, Gift Aid claims) have no audit trail. HMRC requires donor audit trail for Gift Aid.

**11.6 Push Token Orphaning**
- No cleanup mechanism for tokens from uninstalled apps or logged-out users. Grow unbounded.

### HIGH

**11.7 Location Consent Missing UI** — App uses location but no explicit consent dialog beyond OS permission prompt.

**11.8 Youth Events, No Age Verification** — Youth/sisters events imply minors. No age gate (GDPR Art. 8, COPPA).

**11.9 Third-Party Data Sharing Undisclosed** — Data sent to Sentry, Expo, Stripe, Aladhan API without explicit disclosure in privacy policy.

**11.10 Donation Status Endpoint Unauthenticated** — Same as Security finding 1.1.

### MEDIUM

**11.11 No DSAR Workflow** — No formal process for data subject access requests (GDPR Art. 15).

**11.12 No Donation Correction Mechanism** — Can't rectify incorrect donation records (GDPR Art. 16).

**11.13 Sentry May Log PII** — `beforeSend` scrubs some data but email, IP may leak through error messages.

### LOW

**11.14 No security.txt** — No `/.well-known/security.txt` for responsible disclosure.

**11.15 Hardcoded Default Location** — `lib/storage.ts:118` — Falls back to Birmingham coordinates without user choice.

**11.16 No Breach Notification Plan** — No documented procedure for GDPR Art. 33 (72-hour notification).

---

## Auditor 12 — Dependency & Supply Chain Auditor

### CRITICAL

**12.1 Incomplete Python Lock File**
- 7 packages in `requirements.txt` missing from `requirements.lock`: exponent-server-sdk, sentry-sdk, stripe, resend, weasyprint, lxml, pymupdf.
- **Risk:** Non-reproducible builds. Security-sensitive packages (Stripe, Sentry) have unpinned transitive deps.

**12.2 GPL License Contamination**
- `react-native-calendars` depends on `xdate@1.3.1` (license: MIT OR GPL-2.0). If GPL selected, entire app becomes GPL.
- **Risk:** Conflicts with proprietary/premium app model.

### HIGH

**12.3 flatted DoS + Prototype Pollution** — `flatted@3.3.4` has GHSA-25h7-pfq9-p65f (CVSS 7.5). Via jest-expo → jsdom chain. Dev dependency only.

**12.4 `--legacy-peer-deps` in CI** — Bypasses peer dependency security warnings. Masks React/RN version conflicts.

**12.5 React 19 + RN 0.83 = Bleeding Edge** — Newest major versions with limited patch history. Production stability unproven.

**12.6 Expo Router 7 Patches Behind** — Pinned `~55.0.4`, latest SDK 55 is `55.0.11`. Missing 7 bug fix releases.

**12.7 Python Version Mismatch** — CI uses Python 3.12, local dev uses 3.11. Binary wheels may differ.

### MEDIUM

**12.8 Loose Python Version Ranges** — `cryptography>=42.0` with no upper bound. Next install could pull breaking major.

**12.9 cryptography 46.0.5 Extremely New** — Released ~1 month ago. Undiscovered bugs likely.

**12.10 AsyncStorage Pinned Too Tightly** — Exact version `2.2.0` blocks security patches.

### LOW

**12.11 Node 20 in Maintenance Phase** — CI should use Node 22 LTS.

**12.12 Jest 29 Not Latest** — Jest 31 exists with React 19 improvements.

### Dependency Counts
- npm: 39 direct + 9 dev = 48 declared, 1,181 total (transitive)
- Python: 17 locked (7 missing from lock)
- Known vulnerabilities: 6 npm (1 HIGH, 5 LOW)

---

## Part 2 Summary

| Auditor | Critical | High | Medium | Low | Total |
|---------|----------|------|--------|-----|-------|
| 7. Testing | 5 | 5 | 4 | 0 | 14 |
| 8. Accessibility | 3 | 4 | 7 | 0 | 14 |
| 9. i18n | 1 | 3 | 5 | 2 | 11 |
| 10. Infrastructure | 2 | 8 | 5 | 2 | 17 |
| 11. Privacy | 6 | 4 | 3 | 3 | 16 |
| 12. Dependencies | 2 | 5 | 3 | 2 | 12 |
| **TOTAL** | **19** | **29** | **27** | **9** | **84** |
