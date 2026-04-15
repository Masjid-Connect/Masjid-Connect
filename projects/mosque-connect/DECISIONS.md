# Decisions Log

Append-only record of significant choices and their rationale. When you forget *why*, this is where you look.

Format: short title → decision → why → trade-off accepted.

---

## Stack & Architecture

**Expo managed workflow** for MVP.
- **Why**: avoid native code complexity, keep the team focused on UX.
- **Trade-off**: cannot ship custom native modules without ejecting.

**Django 5 + DRF**, self-hosted on Digital Ocean (Docker + Coolify).
- **Why**: same proven pattern as the Orphanages project. Full control, no vendor lock-in.
- **Trade-off**: ops burden vs a managed platform like Supabase or Firebase.

**No Redux.** React Context + `useState`/`useReducer` only.
- **Why**: keep state surface small. Single mosque means little global state to coordinate.
- **Trade-off**: would need to revisit if app ever becomes multi-mosque.

**Single-mosque app.** No discovery, no multi-mosque subscriptions.
- **Why**: preserves UX purity. Avoids SaaS sprawl. Reduces backend complexity dramatically.
- **Trade-off**: not reusable for other masjids without forking.

---

## Prayer Times

**Static bundled timetable as primary source** (`constants/static-timetable.json`), with an optional backend-API overlay. No calculation-based source.
- **Why**: this is a single local masjid. Prayer jama'ah times are set by the masjid committee, not by any calculation method. Any calculation (Aladhan, adhan-js, Umm Al-Qura) will diverge from the masjid's printed timetable. The static JSON is scraped directly from the masjid's published timetable PDF.
- **Coverage**: 2023-01-01 → 2027-12-31 (1,739 days). Refreshed weekly via the `scrape-timetables` GitHub Action + EAS OTA update.
- **Trade-off**: app is tightly coupled to this single masjid — by design, per `DOCTRINE.md` single-mosque scope.

**Removed Aladhan + adhan-js from prayer-times path (2026-04-14)**.
- **Why**: calculation-based times are wrong for a single local masjid with a committee-set timetable. Original design used Aladhan as primary and static as tier-2 fallback — that inversion meant the app was showing calculated times when online and correct times only when offline.
- **What remains of Aladhan**: Gregorian→Hijri date conversion in `lib/hijri.ts` only. Hijri conversion is astronomical, not jurisprudential.
- **Code removed**: `fetchPrayerTimesFromAPI`, `calculatePrayerTimesOffline`, `getPrayerTimes` in `lib/prayer.ts`; Aladhan fallback in `lib/notifications.ts`; `adhan` npm dependency.
- **Also fixed during this pass**: Aladhan endpoint typo in `lib/hijri.ts` (`/gpiToH/` → `/gToH/`) — latent bug that would have silently returned null.

---

## i18n & Accessibility

**English only for MVP.** Arabic/RTL not shipping.
- **Why**: ship faster. RTL is significant engineering work.
- **Trade-off**: deferred bilingual experience.

**i18n infrastructure in place from day one.**
- **Why**: avoids retrofitting strings later when Arabic ships.

---

## Payments

**Mobile app uses Stripe Hosted Checkout** (redirect via `expo-web-browser`).
- **Why**: PCI offload, all payment methods (card, PayPal, Apple Pay, Google Pay, Pay by Bank) managed in Stripe Dashboard.
- **Trade-off**: brief context switch out of the app.

**Stripe removed from the website (2026-04-14)** — pending fixes.
- **Why**: Stripe on the web caused more problems than it solved.
- **Current state**: `/donate` is bank-transfer-only.
- **Trade-off**: lose card / Apple Pay / Google Pay donations on web until restored. Donors must use their banking app.
- **Plan**: revisit Stripe on web once the underlying problems are diagnosed and fixed.
- **Retained**: Stripe CSP entries in `_headers`, Stripe references in `privacy.html` / `terms.html` (still accurate — mobile uses Stripe).

---

## Caching & Offline

**Stale cache capped at 7 days** (`MAX_STALE_AGE_MS`).
- **Why**: prevent serving months-old data after long offline gaps.
- **Trade-off**: blank state if user has been offline >7 days with no fresh fetch since.

**`hasFreshDataRef` pattern in hooks** — race condition guard between stale-cache delivery and fresh fetch.
- **Why**: previously stale data could overwrite fresh data on slow networks.

---

## Notifications

**Local scheduled notifications for prayer reminders** (not server-pushed).
- **Why**: works fully offline. No server load. No dependency on push delivery latency.
- **Trade-off**: can't change scheduling logic without an app update.

---

## Documentation

**Split CLAUDE.md into per-domain files (2026-04-14).**
- **Why**: single file had grown to ~25KB and was being ignored. Surgical edits became risky.
- **New structure**: `projects/mosque-connect/{PROJECT,MOBILE,BACKEND,WEBSITE,DESIGN,BUSINESS,DECISIONS,STATUS}.md` + `memory/` + minimal `CLAUDE.md`.
- **Trade-off**: more files to navigate, but each file is focused and maintainable.

---

## Website donations surface

**Removed `/donate` page and "Give" navigation entirely (2026-04-15).**
- **Why**: the mobile app handles donations via Stripe Hosted Checkout. The website's donate page had already been stripped of Stripe (2026-04-14) and reduced to bank-transfer-only; keeping it as a dedicated top-level nav item added surface without enough value to justify it.
- **Where bank details live now**: `/about#support` — a "Support the Masjid" section with UK + International transfer details and tap-to-copy. No new route.
- **What went away**: `web/donate.html`, `web/donate.js`, navbar "Give" link, mobile-menu "Give" item, footer "Give" link, sitemap entries (HTML tree + XML), and the sitemap's Donate branch.
- **What stayed**: the backend `/api/v1/donate/*` endpoints (mobile uses them), Stripe CSP entries in `web/_headers` (mobile-relevant + cheap), Stripe references in `privacy.html` / `terms.html` (mobile still uses Stripe). Copy-to-clipboard logic moved from `donate.js` → `script.js` and auto-binds on any page that surfaces bank-sheet controls.
- **Trade-off**: no dedicated donation landing page; giving from the web is one click deeper (About → Support section). Acceptable given mobile is the primary donation surface.

---

## Backend deploy pipeline

**Consolidated backend deploy on Coolify, with CI tests as the gate (2026-04-15).**
- **Why**: two mechanisms were trying to deploy the same backend — a broken SSH `deploy:` job in GitHub Actions (pointing at `/home/mosque/...`, a path that doesn't exist on the box) and Coolify's own git watcher. Having two deploy systems fight each other is how you get silent races, inconsistent prod state, and late-night debugging sessions.
- **New topology**: GitHub Actions owns tests + lint + Expo OTA + **triggering the deploy**. Coolify owns the actual deploy (Dockerfile build, env vars, migrate-on-boot, rolling restart). The CI `deploy-backend` job fires a single `curl -X POST` against Coolify's deploy webhook after `frontend` + `backend` tests pass. Coolify's native "auto deploy on push" is turned OFF; the CI webhook is the sole trigger.
- **What this buys**: tests gate deploy. A red CI means no webhook call means no deploy. Previously Coolify's auto-on-push could have shipped a failing-test commit before CI finished.
- **Considered and rejected**:
  - Pure auto-deploy via Coolify (no CI gate) — Seats 13 and 16 blocked. "No deploying with failing tests" is non-negotiable.
  - Tag-based releases — overkill for a single-mosque app.
  - Ripping Coolify out and doing Docker builds in CI — regresses Coolify's rollback/env-var UI; not worth it.
- **What changed in code**: `.github/workflows/ci.yml` — replaced the SSH `deploy:` job with a two-line `deploy-backend:` webhook job. `backend/scripts/deploy.sh` — re-captioned as emergency-only manual fallback (still works, no longer the routine path).
- **Orphan cleanup (your hands)**: delete `SERVER_HOST` / `SERVER_USER` / `SERVER_SSH_KEY` secrets from GitHub repo settings. They have no consumer left.
