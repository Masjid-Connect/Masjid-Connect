# Security Audit Remediation Plan

Based on the Council of 12 audit (SECURITY_AUDIT.md), verified against actual codebase state on 2026-03-23.

**Items already resolved** (removed from plan): account deletion, consent checkboxes, ensurePM() prayer-awareness, hasFreshDataRef race condition prevention.

---

## Phase 1: Immediate Risk Containment (Day 1)

### 1.1 Fix privacy policy — disclose Sentry usage
- **File:** `web/privacy.html`
- **What:** Section 6 says "We do not use any social media SDKs, crash reporting tools, or analytics platforms." This is false — `@sentry/react-native` is installed.
- **Fix:** Add Sentry to the third-party services list. Change the closing paragraph to reflect reality.
- **Difficulty:** 15 minutes

### 1.2 Configure mobile Sentry DSN
- **File:** `.env`
- **What:** `EXPO_PUBLIC_SENTRY_DSN` is empty — mobile crashes are invisible.
- **Fix:** Generate a Sentry DSN from the Sentry dashboard and set it in `.env`. Verify errors appear.
- **Difficulty:** 15 minutes (requires Sentry project)

### 1.3 Add Sentry token scrubbing (beforeBreadcrumb)
- **File:** `lib/sentry.ts`
- **What:** `beforeSend` scrubs email/IP but auth tokens in request breadcrumbs leak to Sentry.
- **Fix:** Add `beforeBreadcrumb` handler that strips `Authorization` header from HTTP breadcrumbs.
- **Difficulty:** 15 minutes

### 1.4 Set TOKEN_TTL explicitly in Django settings
- **File:** `backend/config/settings.py`
- **What:** TOKEN_TTL relies on `getattr` default in `authentication.py`. Should be explicit.
- **Fix:** Add `TOKEN_TTL = timedelta(days=30)` to settings.py.
- **Difficulty:** 5 minutes

### 1.5 Add offsite backup sync
- **File:** `backend/scripts/backup.sh`
- **What:** All backups stored on the same droplet. Disk failure = total data loss.
- **Fix:** Add post-backup step to sync to DigitalOcean Spaces (or S3-compatible).
- **Difficulty:** 1-2 hours (requires Spaces bucket + API keys)

---

## Phase 2: Security Hardening (Day 2)

### 2.1 Validate Turnstile token server-side
- **Files:** `backend/api/views.py`, `backend/api/serializers.py`, `backend/config/settings.py`
- **What:** Contact form sends Turnstile token but backend never validates it with Cloudflare.
- **Fix:** Add `cf_turnstile_token` field to ContactSerializer. POST to Cloudflare siteverify API before processing.
- **Difficulty:** 1 hour

### 2.2 Install django-axes for admin brute-force protection
- **Files:** `backend/requirements.txt`, `backend/config/settings.py`
- **What:** Django admin at `/admin/` has no failed login tracking.
- **Fix:** Add `django-axes` to requirements, INSTALLED_APPS, MIDDLEWARE. Configure 5 failed attempts → 30 min lockout.
- **Difficulty:** 30 minutes

### 2.3 Add CSP headers to website
- **File:** `web/_headers` (new file)
- **What:** Static website on Cloudflare Pages has no Content Security Policy.
- **Fix:** Create `_headers` file with CSP directives tailored for the static site.
- **Difficulty:** 30 minutes

### 2.4 Add database connectivity to health check
- **File:** `backend/api/views.py` (health endpoint)
- **What:** `/health/` returns "ok" without checking database.
- **Fix:** Add `connection.ensure_connection()` to health check.
- **Difficulty:** 15 minutes

### 2.5 Add request correlation ID middleware
- **File:** `backend/config/middleware.py`, `backend/config/settings.py`
- **What:** No trace ID per request for debugging.
- **Fix:** Create middleware that generates `X-Request-ID` UUID and attaches to log entries.
- **Difficulty:** 30 minutes

---

## Phase 3: Observability & Analytics (Day 3)

### 3.1 Add centralized logging documentation
- **What:** Docker logs lost on container restart.
- **Fix:** Document setup for Betterstack (free tier) or Loki. Add necessary config.
- **Difficulty:** 1-2 hours (requires external account)

### 3.2 Add Sentry browser SDK to website
- **File:** `web/script.js` or HTML pages
- **What:** Website has zero error tracking. Broken donation flow invisible.
- **Fix:** Add lightweight Sentry browser SDK initialization.
- **Difficulty:** 30 minutes

### 3.3 Add donation funnel events on website
- **File:** `web/donate.js`
- **What:** No tracking of donation flow drop-off.
- **Fix:** Add basic custom events using Sentry breadcrumbs.
- **Difficulty:** 1 hour

### 3.4 Add privacy-friendly web analytics recommendation
- **What:** Zero analytics means zero product insight.
- **Fix:** Document recommendation for Plausible. Add script tag placeholder.
- **Difficulty:** 15 minutes

---

## Phase 4: Backend Hardening (Day 4)

### 4.1 Add --dry-run flag to scraper command
- **File:** `backend/core/management/commands/scrape_all_timetables.py`
- **What:** Scraper modifies production database directly without validation.
- **Fix:** Add `--dry-run` argument that logs changes without writing.
- **Difficulty:** 1 hour

### 4.2 Add jitter to API client retry logic
- **File:** `lib/api.ts`
- **What:** Exponential backoff without jitter causes thundering herd.
- **Fix:** Add `delay * (0.5 + Math.random())` jitter.
- **Difficulty:** 5 minutes

### 4.3 Improve deploy health check
- **File:** `backend/scripts/deploy.sh`
- **What:** 10-second grace period too short; rollback can fail if cleanup ran.
- **Fix:** Increase to 30 seconds with 3 retries. Keep last 2 Docker images.
- **Difficulty:** 30 minutes

### 4.4 Restrict .env.prod file permissions
- **What:** Production secrets readable by any user on droplet.
- **Fix:** Document `chmod 600 .env.prod` in DEPLOY.md.
- **Difficulty:** 5 minutes

### 4.5 Add donation data retention clause to privacy policy
- **File:** `web/privacy.html`
- **What:** No mention of HMRC 6-year Gift Aid record retention requirement.
- **Fix:** Add retention clause to Section 7.
- **Difficulty:** 15 minutes

---

## Phase 5: UX & Growth Fixes (Day 5-6)

### 5.1 Build onboarding flow
- **Files:** New files in `app/`, modifications to `_layout.tsx`, `contexts/AuthContext.tsx`
- **What:** Users land directly in tabs with no context.
- **Fix:** 3-step onboarding: (1) Select your mosque, (2) Enable notifications, (3) See prayer times.
- **Difficulty:** 2-3 days (largest single task)

### 5.2 Implement password reset
- **Files:** Backend views + serializers, mobile sign-in screen
- **What:** No "Forgot password" flow anywhere.
- **Fix:** Django PasswordResetView + Resend for email delivery. Add link on sign-in.
- **Difficulty:** 4 hours

### 5.3 Add empty states for list screens
- **Files:** Announcements, events, subscriptions screens
- **What:** Empty lists show blank screens.
- **Fix:** Add empty state components with helpful text and icons.
- **Difficulty:** 2 hours

### 5.4 Link Terms of Service in settings
- **File:** `app/(tabs)/settings.tsx`
- **What:** Links to Privacy Policy but not Terms.
- **Fix:** Add Terms link next to Privacy Policy link.
- **Difficulty:** 15 minutes

### 5.5 Show RTL restart warning on language change
- **What:** Changing to Arabic requires app restart but no warning shown.
- **Fix:** Show alert explaining restart is needed.
- **Difficulty:** 15 minutes

---

## Phase 6: Infrastructure & QA (Day 7-8)

### 6.1 Add staging environment
- **Fix:** Create docker-compose.staging.yml with separate database.
- **Difficulty:** 2-3 hours

### 6.2 Enable GitHub branch protection
- **Fix:** Require 1 approval + passing CI before merge.
- **Difficulty:** 15 minutes (GitHub settings)

### 6.3 Add automated backup validation
- **Fix:** Weekly cron that restores to staging DB and verifies.
- **Difficulty:** 1-2 hours (depends on 6.1)

### 6.4 Increase test coverage thresholds
- **File:** `jest.config.js`
- **Fix:** Increase to 60% statements / 50% branches. Write tests to meet thresholds.
- **Difficulty:** 2-3 days (ongoing)

### 6.5 Add DST transition test for prayer times
- **File:** `lib/__tests__/prayer.test.ts`
- **Fix:** Add test case for last Sunday of March/October.
- **Difficulty:** 1 hour

### 6.6 Update DOCTRINE.md for donation exception
- **File:** `DOCTRINE.md`
- **What:** Section 6 says "No payments" but donation system exists.
- **Fix:** Add explicit exception.
- **Difficulty:** 10 minutes

---

## Summary

| Phase | Items | Estimated Effort | Key Outcome |
|-------|-------|-----------------|-------------|
| 1 — Risk Containment | 5 tasks | 2-3 hours | Backups safe, Sentry working, legal exposure closed |
| 2 — Security Hardening | 5 tasks | 3 hours | Admin protected, Turnstile validated, CSP on website |
| 3 — Observability | 4 tasks | 2-3 hours | Error tracking everywhere, analytics groundwork |
| 4 — Backend Hardening | 5 tasks | 2 hours | Safer deployments, better retry logic |
| 5 — UX & Growth | 5 tasks | 3-4 days | Onboarding, password reset, empty states |
| 6 — Infrastructure & QA | 6 tasks | 3-4 days | Staging, testing maturity, backup validation |

**Total: ~30 tasks across 6 phases, roughly 8-10 working days.**

Phases 1-4 are code changes I can implement directly. Phase 5 is heaviest (onboarding). Phase 6 requires some infrastructure access.
