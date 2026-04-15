# Status

> Update this file when the situation changes. Keep it short. Older details belong in `DECISIONS.md` or git history.

**Last updated**: 2026-04-15

## Now

- **Mobile OTA shipped** (2026-04-15) — commit `9f14822` published to the `production` EAS branch. iOS update group `1d4bc891-59ec-4bd3-856f-61b24010682c`, Android `e43ae185-7919-4b70-8f91-e153dabc7655`. Installed apps pick it up on next open.
- App Store Connect submission with Apple — review pending (submitted 2026-04-12).
- Google Play status: unknown / not yet confirmed.
- Website: `/donate` page + "Give" nav removed. Bank-transfer details now live on `/about#support`. Cloudflare Pages auto-deploys from `origin/main`.

## Next

- Fix `EXPO_TOKEN` in GitHub secrets so future CI pushes can publish OTAs automatically (currently requires manual `eas update` from local). Instructions in conversation log.
- Fix backend deploy SSH secrets (`SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`) so backend deploys automate. Instructions in conversation log.
- Address lint warnings (77 pre-existing, non-blocking) in a dedicated cleanup pass.
- Assess the 12 npm audit vulnerabilities for reachability.

## Blockers

- Awaiting Apple App Store review verdict (submitted 2026-04-12).

## Recently Shipped

- Static timetable as primary prayer-times source — removed Aladhan from the prayer path; kept only for Hijri date lookup. `adhan-js` dep removed.
- English-only code lock — deleted `ar.json`, `rtl.ts`, language picker; `lib/i18n.ts` pinned to `lng: 'en'`.
- Release-readiness fixes — unbroke TypeScript (routing + typography), unbroke CI lint (flat-config compat, ESLint bump to 9.39.4).
- Accessibility sweep on 8 genuine interactive-element gaps.
- Backend test suite fully green — 89/89 passing after realigning tests to shipped single-mosque behaviour + adding Postgres service container to CI.
- Decoupled mobile OTA from backend CI — mobile ships on mobile-test success only.
- Premium frosted-glass navbar at top of page.
- Premium two-tier footer redesign.
- Documentation restructure — split CLAUDE.md into focused per-domain files.
