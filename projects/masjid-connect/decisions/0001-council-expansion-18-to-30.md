# ADR 0001 — Council expansion from 18 to 30 seats

**Status:** Accepted
**Date:** 2026-04-14
**Deciders:** Seat 1 (Architect), Seat 10 (Stripe), Seat 13 (DevOps),
Seat 17 (Privacy/Compliance), Seat 5 (Islamic Domain), Seat 15 (i18n)

## Context

The Council of Experts defined in `/COUNCIL.md` had 18 seats covering
the core tech stack (React Native, Django, TypeScript, API design,
security, DB, performance, DevOps, push, i18n, testing, privacy, web)
plus two domain-adjacent seats (Islamic Domain Expert for fiqh and
terminology, UI/UX Design Lead, Accessibility).

The project had grown to include real concerns that no seat owned:

- **Legal counsel** — only Seat 17 (compliance) existed; no general
  commercial law seat for T&Cs, licensing, trademark.
- **Stripe depth** — Seat 10 covered one-off payments and webhooks;
  recurring billing, SCA, dunning, smart retries had no owner.
- **App Store / Play Store reviews** — launch-critical policies (Apple
  Guideline 3.1.1(b) charity donation exemption, Play Data Safety) had
  no owner.
- **Observability** — CLAUDE.md mandated Sentry logging in every catch
  block but no seat owned Sentry configuration, PII scrubbing, or
  release tracking.
- **Cross-stack generalist** — complex bugs spanning Expo ↔ Django ↔
  Stripe ↔ Cloudflare had no "tie-break" seat.
- **Charity & HMRC specifics** — Gift Aid XML filings, six-year
  retention, Charity Commission obligations went beyond Seat 17's
  general compliance mandate.
- **Prayer-time algorithm maths** — Seat 5's remit was fiqh and
  terminology, not solar equations, high-latitude rules, and Hijri
  conversion accuracy.
- **Editorial/copy ownership** — Seat 15 owned the i18n pipeline but
  no seat owned the English content itself (tone, honorifics,
  microcopy, App Store metadata).
- **Trust, safety & moderation** — safeguarding, abuse reporting, and
  `MosqueAdmin` audit logging had no owner.
- **Backup & disaster recovery** — `backup.sh`/`restore.sh` existed in
  `/backend/scripts/` but RPO/RTO targets, restore rehearsals, and
  GDPR SAR exports had no owner.
- **EAS/OTA specifics** — Seat 13 covered general DevOps; EAS build
  profiles, runtimeVersion fingerprint policy, and OTA rollout strategy
  needed specialist depth.

The user explicitly requested 12 more seats including legal, Stripe,
and "app dev all-knowing". The COUNCIL.md Auto-Expansion rule supports
adding seats when gaps are identified during deliberation.

## Decision

Expand the council from 18 to 30 seats by adding 12 new domain experts,
each with a distinct mandate that does not overlap existing seats:

- Seat 19: Legal Counsel (Commercial)
- Seat 20: Charity Commission & HMRC Gift Aid Specialist
- Seat 21: Stripe Billing & Subscriptions (Deep)
- Seat 22: Senior Full-Stack Tech Lead (Generalist)
- Seat 23: iOS App Store Review Specialist
- Seat 24: Google Play Store Review Specialist
- Seat 25: Expo EAS Build & OTA Update Specialist
- Seat 26: Observability & Sentry Specialist
- Seat 27: Prayer Time Algorithm & Astronomical Calculation Expert
- Seat 28: Editorial & Copy Chief
- Seat 29: Trust, Safety & Community Moderation Lead
- Seat 30: Backup, Disaster Recovery & Data Custodian

Each new seat documented in `/COUNCIL.md` with domain, mandate, and
consult-on fields matching existing format. Growth Log entries added
at the bottom of COUNCIL.md with justification for each addition.

## Consequences

**Better:**
- Every existing audit finding has a clear seat to resolve it.
- Launch-critical policies (App Store review, Play review) have owners.
- `memory/CONSTRAINTS.md` can reference specific seats for each rule.
- Deliberation format stays the same — the protocol does not change.

**Worse:**
- Deliberation overhead rises slightly — more potential consultees
  per change. Mitigated by the existing "consult only relevant seats"
  rule; minimum quorum is still 3.
- Council file grew from 148 to 219 lines. Still well under any cap.

**Accepted:**
- The council is now near its maximum useful size. Further additions
  should be rare and require clear gaps.

## Alternatives considered

1. **Keep at 18 seats** — would force existing seats to stretch outside
   their mandates (Seat 13 DevOps owning EAS specifics, Seat 10 owning
   subscriptions, Seat 17 owning charity law). Rejected because
   stretched mandates produce lower-quality deliberation.
2. **Add only the three user-requested (legal, Stripe, app dev)** —
   would miss real gaps (App Store review, Sentry, backup/DR).
   Rejected because the gaps were identified in deliberation itself.
3. **Split into multiple smaller councils by domain** (Mobile Council,
   Backend Council, Legal Council) — adds coordination overhead and
   fractures the single-authority model. Rejected.

## Revisit triggers

- If deliberation consistently involves fewer than 5 seats across
  changes, the council is over-sized and should be trimmed (by marking
  seats as dormant, not by deletion — COUNCIL.md's append-only rule
  applies).
- If a new major domain emerges (e.g. AI features, new jurisdiction),
  add a seat via Auto-Expansion and update this ADR's "Superseded by"
  pointer if the structure fundamentally changes.

## References

- `/COUNCIL.md` — canonical roster and growth log.
- Commit `f6da401` — the expansion commit.
- `/CLAUDE.md` line 5 — reference updated from "18-seat" to "30-seat".
