# Status — Masjid Connect

**Phase:** Pre-launch, internal testing (Google Play Internal / TestFlight).
**Live:** Website `salafimasjid.app` (Cloudflare Pages), backend on Digital Ocean.
**Not live:** iOS and Android apps (in EAS build / internal testing).

## Current focus

- Address items in `/AUDIT_REMAINING_ITEMS_FIX_PLAN.md` (22 unfixed
  from audit v3).
- Close out findings in `/SECURITY_AUDIT.md` — critical items per
  `/REMEDIATION_PLAN.md`.
- Complete launch punch list in `/LAUNCH_PLAN.md`.

## Recently shipped

- Council expanded from 18 to 30 seats (commit `f6da401`, 2026-04-14).
- Donations simplified to Stripe Hosted Checkout only (commit `8d33b6f`).
- Premium frosted-glass navbar on website (commit `5d9ae8c`).
- Footer redesign (commits `6847e8b`, `11b63ac`).

## Known gaps tracked here

- Honorifics lint (`memory/CONSTRAINTS.md` § 3) — rule codified,
  implementation TODO.
- End-to-end tests — no Maestro/Detox suite yet (flagged in
  `SECURITY_AUDIT.md`).
- Restore-rehearsal verification (Seat 30 mandate) — backups run,
  restores not yet rehearsed on schedule.

## Next council-gated decisions

- Scope expansion beyond The Salafi Masjid — not planned, would
  require ADR.
- Arabic locale + RTL enablement — not planned for MVP.

---

*Updated 2026-04-14. Update this file when the phase changes
(pre-launch → public launch → post-launch stable). Keep it under
50 lines.*
