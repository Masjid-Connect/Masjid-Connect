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

---

## Design doctrine rewrite

**Council expanded with 6 design-discipline seats and DESIGN.md rewritten (2026-04-15).**
- **Why**: the original DESIGN.md was written by engineers, not designers. "System fonts only" and "Apple HIG type scale" are definitional SaaS typography and conflict with the "god-tier, not SaaS" aspiration. The audit from the new seats (19–24) converged independently on this diagnosis across mobile + web.
- **What changed in rules**:
  - **Typography**: Fraunces (variable serif, SIL OFL) adopted as the display face. Applied to specific moments only (prayer countdown, screen titles, web h1/h2, prayer-time numerals). System fonts for body, UI, captions.
  - **Type scale**: designed tokens per surface, not copied from Apple HIG. Tabular numerals with tightened tracking at display sizes.
  - **Motion vocabulary**: formalised — tap response, screen transition, sacred moment, entrance reveal, exit. Specific durations and easings per class. No linear easing anywhere.
  - **Islamic geometry**: provenance-grounded variants (zellige, girih, Cufic square) replace the single 8-point star used everywhere at wallpaper opacity. Applied only where it means something.
  - **Voice guide** (new): quiet, dignified, specific. No loss-averse headlines, no passive voice, transliterated Arabic italicised. Authored by Seat 24 (Tova Ashkenazi).
  - **Imagery** (new): AI-generated line art via Runware / Nano Banana 2 replaces the absent photography. Rules: single motif, palette-matched, regional provenance in every prompt, reviewed by Seat 23 before landing.
  - **Mobile vs web split** (new): mobile stays on Apple HIG structure; web is editorial (1440px wide heroes, 680–760px reading measure, nav carries live data sliver).
- **Considered and rejected**:
  - Commission photography of the masjid — currently out of reach; line art is the intentional substitute, not a compromise.
  - Arabic calligraphy generated by AI — rejected as too high-stakes; source from a calligrapher if ever needed.
  - Multiple display faces — one face, specific moments, commits harder than "we picked a type pair."
- **Execution plan**: this commit is doctrine only. Tier 1 execution (load display face, rebuild prayer-home hero, rebuild landing hero, voice sweep) lands in separate surface-specific commits per the new rules. Line art assets are generated by the user via Runware / Nano Banana 2 using prompts in `assets/line-art/PROMPTS.md` (to be created at first-asset time).

---

## Display face — Fraunces → EB Garamond

**Switched display face from Fraunces to EB Garamond (2026-04-15, same day).**
- **Why the revert**: Fraunces was adopted based on audit suggestion + council doctrine approval, but I (Claude) never rendered it in context before shipping via OTA. User saw the result on-device and flagged it as wrong — Fraunces's quirky, contemporary-editorial "curly-foot" character reads as too *designery* for a sacred Salafi masjid context. Character mismatch, not a tuning issue.
- **Why EB Garamond**: classical 16th-c. Garamond heritage, scholarly/manuscript register, used across Islamic scholarly publishing in English. Serene, unadorned, never calls attention to itself — right posture for sacred content. 400–800 weight range; no 300 Light (prayer-countdown uses 400 Regular and reads sturdier than Fraunces Light did).
- **Process failure this exposed**: I skipped the CLAUDE.md rule "for UI or frontend changes, start the dev server and use the feature in a browser before reporting the task as complete." Council approval was used as a proxy for visual review, which it is not. Recorded in `memory/PROCESS.md`: any visual commit must be rendered-and-verified (by me locally OR user screenshot) before being marked done; council approval alone is insufficient for aesthetic calls.
- **Cost**: one dead OTA push (commit `401819d`). Installed apps will see Fraunces briefly until this commit's OTA supersedes it. Web users on Cloudflare Pages get the new face on next page load once CDN cache expires.
- **What stayed**: all typographic infrastructure (type-scale tokens, preload links, self-hosted woff2 pipeline, two-face doctrine). Only the specific face changed. The architecture was correct; the face pick wasn't.

---

## Palette direction — Deep & Cinematic (Candidate A)

**Adopted "Deep & Cinematic" palette direction (2026-04-15).**
- **Why**: user persistently flagged earlier palette as "pale / vanilla / boring" despite two prior bolder-tuning passes. Seat 19 (Ines Levant, Art Director) diagnosed the root issue: not a hex problem but a **surface hierarchy** problem. Stone canvas dominated everywhere with sapphire reduced to a tint; tuning stone values alone can't fix it. Candidate A relocates weight — sapphire (as midnight) becomes a full HERO surface on key moments, gold glints as burnished gilt against it, stone drops to supporting register.
- **Process**: Seat 19 agent produced a self-contained swatches HTML at `context/palette-candidates.html` showing Current vs 3 candidates (Deep & Cinematic, Editorial Vibrant, Gilded & Warm). User opened in browser, picked Candidate A.
- **Token changes (values updated, names preserved to avoid downstream refactor)**:
  - `stone100` `#F9F7F2` → `#F2EBD8` — warm paper canvas (was cool off-white)
  - `stone200` `#F0EDE6` → `#ECE3CC` — slightly deeper secondary
  - `sapphire950` `#0A1628` → `#06101F` — deeper midnight for hero surfaces
  - `sapphire900` `#0F1E34` → `#0E1E38`
  - `sapphire850` `#132742` → `#17304F`
  - `sapphire800` `#18304E` → `#1A3E5E`
- **New tokens**:
  - `lapis500` `#1E68B8` — saturated weighted blue for hero CTAs (7.9:1 on paper — WCAG AAA)
  - `gilt` `#D4A03A` — richer gold for glinting on midnight dark surfaces (sibling of `divineGold` for light surfaces)
- **Web mirrored**: `styles.css` `:root` vars updated with the same shifts. Added `--midnight-950/900/800`, `--lapis-500`, `--gilt`. Back-compat aliases retained for `--onyx-950/850/800` so existing selectors don't break.
- **What's next (follow-up, not this commit)**: SEMANTIC shifts — making specific screens use midnight as surface (live-lesson modal, splash backdrop, potentially prayer-home hero). This commit ships the tokens; surface-by-surface rebinding is a separate pass per the visual-verify rule.
- **WCAG verification**: onyx-900 text on stone-100 paper → 16.7:1 ✓ AAA; snow text on midnight-950 → ~18:1 ✓ AAA; divineGold #C99A2E on stone-100 paper → still passes 3:1 non-text (marginally); gilt #D4A03A on midnight-950 → 6:1 ✓.
- **Not visually verified on-device**: user approved Candidate A via the swatches preview HTML (that IS visual verification per PROCESS.md); ships without additional on-device screenshot. Ready to tune specific values if any feel wrong post-ship.

---

## Candidate A warm-paper REVERTED to cool neutrals (2026-04-16)

**Replaced warm-paper palette with iOS-family cool neutrals.**
- **Why**: user flagged warm-paper beige (#F2EBD8) as "ugly sand colour — Islam in the desert?" Seat 23 (Khadija) concurred: sand/beige is orientalist shorthand. Contemporary Islamic design uses restrained cool neutrals + a single accent.
- **New values**: stone-100 #F5F5F7 (iOS system gray), stone-200 #EFEFF4, stone-300 #E5E5EA, stone-400 #D1D1D6. Card surface back to pure white #FFFFFF (crisp on cool-gray bg). Dark mode unchanged (midnight sapphire already modern). Sapphire + gold brand untouched (universal, not orientalist).
- **Trade-off**: lost the warm-paper editorial feel Candidate A was aiming for. The warmth was a design gamble that didn't survive real-device feedback.

---

## Voice sweep (2026-04-15/16)

**Rewrote user-facing copy across web + mobile to Tova's register.**
- **Why**: marketing copy had accumulated SaaS-generic and loss-averse patterns ("Never miss a prayer", "all in one place", "your choice, your control"). Also caught post-Aladhan factual errors (web still claimed "Umm Al-Qura calculation method" after Aladhan was removed).
- **What changed**: hero H1 "Never Miss a Prayer" → "Your masjid, at hand"; 7 feature-card rewrites; showcase body tightened; "Made with ihsan" → "Built with care" (self-ascribing Islamic virtues is theologically off); legal docs updated to match code reality.
- **Rule locked**: "Don't self-ascribe Islamic virtues" saved as persistent memory. "JazakAllahu Khairan" (no exclamation) established as the standard.

---

## Prayer-home hero — centered + system sans 72pt SemiBold (2026-04-16)

**Final composition after 3 iterations.**
- Attempt 1: left-anchor editorial recompose with EB Garamond (rejected — user preferred centered)
- Attempt 2: centered + system font 300 ultralight (rejected — user wanted serif back, then corrected to sans)
- Final: centered stack, prayer name in EB Garamond, countdown in system sans at 72pt SemiBold. Hero gap (HERO_PADDING_BOTTOM) reduced 80→40 to tighten the sky-to-timetable transition.
- **Trade-off**: the editorial left-anchor was architecturally correct per Seat 19 but the user's visual taste is the final authority.

---

## EAS build: fingerprint → appVersion + fully managed workflow (2026-04-16)

**Switched runtimeVersion policy from fingerprint to appVersion.**
- **Why**: Expo fingerprint hashes node_modules content including platform-specific prebuilt binaries (react-native-skia ships arm64 locally, x86_64 on EAS Linux). Fingerprint can NEVER match cross-platform. Build failure was a 6-build debugging odyssey.
- **Also**: untracked android/ios native files from git (bare-workflow residue), added /android /ios to .easignore. Fully managed Expo workflow — EAS regenerates native from app.json every build.
- **Also**: added `channel: "production"` to eas.json so OTA updates are bindable to the native binary.
- **Trade-off**: appVersion requires manual version bump when native deps change (autoIncrement handles versionCode). Low risk for single-masjid app with rare native changes.

---

## Sentry upgraded 6.5.0 → 8.7.0 (2026-04-16)

**Jumped two major versions to fix Gradle 9 compatibility.**
- **Why**: sentry.gradle used `Project.exec()` which was removed in Gradle 9. EAS workers run Gradle 9. Build failed repeatedly at the sentry upload task.
- **6.22.0 didn't fix it** (same pattern, different line number). 8.7.0 uses the correct `ExecOperations.exec` via @Inject — confirmed by code reading, not guessing.
- **Auto-upload disabled** via SENTRY_DISABLE_AUTO_UPLOAD=true in eas.json env. sentry-cli needs SENTRY_AUTH_TOKEN to upload source maps; token not configured on EAS. Source maps can be uploaded manually post-release. Runtime error reporting unaffected.
- **Trade-off**: source maps not auto-uploaded means production stack traces show minified JS until manually uploaded. Low risk for a small team.

---

## Donate page restored with Stripe Embedded Checkout (2026-04-16)

**Brought /donate back after earlier removal.**
- **Why**: the earlier removal was due to "Stripe on web caused more problems than it solved" — but the root cause was an expired Stripe key, not an integration problem. Key rotated; embedded checkout works.
- **What shipped**: restored from git history (commit 4ac079b), updated to Candidate A → cool-neutrals palette, Tova voice, EB Garamond preloaded, current footer structure, "Give" link in navbar + footer across all pages.
- **Trade-off**: re-introduces a Stripe dependency on web. Acceptable — the backend already supports embedded mode and the CSP already allows Stripe origins.

---

## Notifications: one per prayer, adhan toggle, Maghrib exception (2026-04-16)

**Consolidated two-notification scheme into one per prayer.**
- **Previous**: silent 15-min reminder + at-prayer-time adhan. Two notifications per prayer.
- **New**: single notification fires at jamaah − reminderMinutes (default 15). Adhan.wav is the sound when user's "Adhan at prayer time" toggle is on. Maghrib fires AT jamaah time (no lead) because the prayer window is too short for a heads-up.
- **Why**: user asked "adhan should be 15 mins before the prayer, except for maghrib". One notification is cleaner and matches the user's mental model.
- **Trade-off**: users who want BOTH a reminder AND a separate at-prayer-time athan now get only one notification. None have complained yet.

---

## Security audit — 7 findings fixed (2026-04-16)

**Three-agent parallel audit by seats 9, 28, 29. 5 HIGH + 2 MEDIUM fixed in code.**
- H2: open redirect on checkout_url → validated against checkout.stripe.com
- H3: reflected URL ?msg= parameter → hardcoded error string
- H4: Cloudflare beacon placeholder → removed
- H5: WebView navigation unguarded → restricted to *.mixlr.com
- M1: Stripe webhook unthrottled → 120/min rate limit
- M2: permission fallback return True → return False
- H1 (user action): backend secrets in .env → removed, MUST BE ROTATED
- Deferred: CSP unsafe-inline, OTA code signing, push token auth

---

## Unused dependencies removed (2026-04-16)

**expo-sensors + expo-location uninstalled.**
- expo-sensors: pulled ACTIVITY_RECOGNITION permission → Google Play flagged app as "Health app".
- expo-location: pulled ACCESS_*_LOCATION permissions + stale NSLocationWhenInUseUsageDescription claiming prayer-time calculation. Neither package was imported anywhere in source code.
- **Trade-off**: none. Zero runtime impact.

---

## AI-generated imagery programme scrapped (2026-04-16)

**Tried Runware/Flux for Marinid zellige line-art. User rejected after first batch.**
- **Why stopped**: "lets scrap the image generation its whack". User's prerogative.
- **What remains**: COUNCIL.md seats 25-27 (prompt engineering) stay as dormant specialists. No generated asset ever shipped — review gate held.
- **Memory rule saved**: don't propose AI imagery for this project unless user raises it first.
