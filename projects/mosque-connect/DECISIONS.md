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
