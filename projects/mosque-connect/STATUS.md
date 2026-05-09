# Status

> Update this file when the situation changes. Keep it short. Older details belong in `DECISIONS.md` or git history.

**Last updated**: 2026-05-09

## Now

- **1.0.2 design refresh shipped** — Sora display, Celestial Ink palette, Apple Liquid Glass on tab bar + toast, Live Community segment. Web live; Android `.aab` submitted to Play (`releaseStatus: draft`); iOS held until Apple Developer Program approval.
- **Version-check infrastructure shipped** (PR #265, commit `1e57a17`) — Django `VersionPolicy` singleton + `GET /api/v1/version-policy/` + mobile soft-banner / blocker UI. Defaults are non-blocking. Activates fully once backend CI is green and the production policy row is set in the admin.
- **Single-masjid pin** (commit `5xxxxxx` 2026-05-09) — `EXPO_PUBLIC_MOSQUE_ID` env-pinned in `eas.json` production. `constants/mosque.ts` resolves env-first, lookup as legacy fallback. DOCTRINE §6 codifies the operational scope.
- **Website store CTAs** (commit `7e30b54`) — Google Play link wired live; App Store badge in disabled "Coming soon" state across all 10 pages. Auto-deployed via Cloudflare Pages.

## Next (launch path)

1. **Fix backend CI** — 4 pre-existing failures in `test_announcements.py` + `test_events.py` block all backend deploys via Coolify. The `version-policy` migration won't reach prod until this clears.
2. **Promote Play 1.0.2 from draft → production** in Play Console (one click; then 1–7 days of Play review).
3. **Donation E2E** — real £1 donation, verify webhook + receipt + DB row + Gift Aid declaration. Stripe is in LIVE mode (publishable key `pk_live_…` in `.env`).
4. **Apple Developer approval follow-up** — chase Apple Developer Support; ADP enrolment 2026-04-12 still pending after ~4 weeks.
5. **Sentry source maps** — `SENTRY_DISABLE_AUTO_UPLOAD=true` was set for the 1.0.2 build to ship without scope. Flip back for the next build so prod errors are symbolicated.

## Parked (post-launch)

- **Path B singletonisation** — drop `mosque_ids` filter, add `/api/v1/masjid/` singleton endpoint, simplify announcement/event reads. ~150 LOC. Council-approved as a 1.0.4 candidate.
- **`KozoPaperBackground` dead code** — references retired `palette.limestone`; zero consumers; safe to delete.
- **Lint warnings in `app/(tabs)/community.tsx`** — unused `alphaColors` and `Ionicons` imports left over from the Glass migration.

## Blockers

- **Apple Developer Program approval** (external) — blocks iOS 1.0.2 ship.
- **Backend CI red** — blocks any backend deploy via the Coolify webhook.

## Recently Shipped

- Sora + Celestial Ink + Apple Liquid Glass + Live segment (commit `e071abc`, 2026-05-09)
- jest mock cleanup unblocking 47 tests (`d32615d`)
- Pages CDN cleanup of stale EB Garamond asset (`f37c2c2`)
- In-app version-check infrastructure (PR #265 / `1e57a17`)
- Website Google Play link + iOS coming-soon badge (`7e30b54`)
- Single-masjid env pin + DOCTRINE §6 lock (this commit)
