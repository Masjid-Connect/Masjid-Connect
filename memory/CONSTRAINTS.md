# Constraints — Masjid Connect

Hard rules specific to this project, beyond what `/DOCTRINE.md` covers.
DOCTRINE governs the project's identity (mission, stack, API, data).
This file governs **domain-specific prudential rules** — things that are
correct because of the community served and the regulatory context, not
because of the tech stack.

**Owner:** Council Seat 1 (Architect) + the domain seat named in each rule.
**Supersede rule:** Never delete an entry. If a rule changes, add a newer
dated entry below and mark the old one as `SUPERSEDED by § N` in place.

---

## 1. Prayer times are always computed, never hardcoded

Prayer times are calculated from the user's coordinates + the configured
calculation method + the date. No literal times ("Fajr at 05:12") in
code, fixtures, or config — except for unit tests that explicitly
mock the calculation.

**Why:** Prayer times vary by location, season, and method. Hardcoded
values decay silently. CLAUDE.md already requires Aladhan primary +
adhan-js offline fallback; this rule is the test-level corollary.

**Owner:** Seat 27 (Prayer Time Algorithm) + Seat 5 (Islamic Domain).

**Added:** 2026-04-14.

---

## 2. Hijri dates use the Umm al-Qura calendar

Hijri date display follows the Umm al-Qura calendar throughout the app.
Do not silently switch calendars (Tabular Islamic, ISNA variants) based
on availability. If Umm al-Qura data is unavailable for a given date,
show the Gregorian date only and log to Sentry, rather than fall back
to a different Hijri source.

**Why:** This app serves The Salafi Masjid community, whose published
calendar is Umm al-Qura. Inconsistent Hijri display fractures trust in
every other date shown.

**Owner:** Seat 27 (Prayer Time Algorithm) + Seat 5 (Islamic Domain).

**Added:** 2026-04-14.

---

## 3. Islamic honorifics are enforced in religious content

Any text surface that renders religious content (announcements tagged
`religious`, khutbah descriptions, scholarly references) must pass a
lint step that verifies honorifics per `memory/VOICE.md` § 2.

**Implementation:** A CI check (to be added) scans user-facing locale
files, announcement fixtures, and README/marketing copy for bare
mentions of "Prophet Muhammad" not followed by ﷺ / (saw), bare mentions
of named companions not followed by (RA), and bare mentions of other
prophets not followed by (AS).

**Why:** Religious propriety is non-optional in this community. The
lint prevents regressions across contributors.

**Owner:** Seat 28 (Editorial) + Seat 5 (Islamic Domain).

**Added:** 2026-04-14. *Lint implementation is TODO — see
`projects/masjid-connect/STATUS.md`.*

---

## 4. Religious-belief data requires explicit UK GDPR Art 9 consent

The fact that a user installs this app, subscribes to a mosque, or
registers for a religious event constitutes processing of
religious-belief data under UK GDPR Article 9. The legal basis is
Article 9(2)(a) — explicit consent — and that consent must be:

- Separately captured from general T&Cs acceptance.
- Granular (opt-in per category: notifications for prayers, for
  announcements, for events).
- Withdrawable at any time via Settings.
- Logged with timestamp, IP, and the exact wording presented at
  time of consent (for audit).

**Why:** Religious belief is "special category data" under UK GDPR
Art 9. Processing without a lawful condition is a statutory breach.

**Owner:** Seat 17 (Privacy/Compliance) + Seat 19 (Legal).

**Added:** 2026-04-14.

---

## 5. Stripe float interest must be disclosed (riba disclosure)

Donations held transiently in Stripe (between `checkout.session.completed`
and payout to the charity bank account) may accrue interest on Stripe's
side. The donation page and receipts must disclose this factually:

> Donations are processed by Stripe and settled to our charity account
> within 7 days. Any interest accrued during this period is retained by
> Stripe and is not paid to the masjid.

**Why:** Some donors hold riba concerns and are entitled to informed
consent. This does not ban Stripe — Stripe remains the payment rail —
it requires transparency. (Per Seat 20 deliberation: banning outright
would conflict with operational reality; disclosure is the right bar.)

**Owner:** Seat 20 (Charity/HMRC) + Seat 5 (Islamic Domain) +
Seat 21 (Stripe Billing).

**Added:** 2026-04-14.

---

## 6. Deploy freeze during Jumuah; explicit sign-off during Ramadan last 10

- **Jumuah window:** No production deploys between 11:30 and 14:30
  local mosque time on Fridays. CI does not block, but the deploy
  script (`backend/scripts/deploy.sh`) prompts for explicit override.
- **Last 10 nights of Ramadan:** Production deploys require documented
  sign-off from a trustee or super-admin. Not blocked, but gated on a
  written acknowledgement (commit message referencing an approval
  reference).

**Why:** Jumuah is the app's peak real-time usage window; an outage
at 13:00 Friday hurts the most people possible. The last 10 nights
of Ramadan are the highest-traffic period annually. Per Seat 5
deliberation: this is prudential, not doctrinal — hence sign-off
rather than an absolute ban.

**Owner:** Seat 13 (DevOps) + Seat 5 (Islamic Domain).

**Added:** 2026-04-14.

---

## 7. No direct messaging or private channels between users

The data model does not include user-to-user messaging, private
channels, or user profiles visible to other users. Announcements are
broadcast-only (mosque → community). Feedback is user → staff only.

**Why:** Safeguarding minors, reducing moderation surface, and
matching the scope set in DOCTRINE.md § 1 (help masjids communicate
with their communities — not communities chat amongst themselves).
Changing this requires a new ADR and Seat 29 (Trust, Safety &
Moderation) + Seat 19 (Legal) approval.

**Owner:** Seat 29 (Trust, Safety & Moderation).

**Added:** 2026-04-14.

---

## 8. Gift Aid eligibility is never assumed

A `GiftAidDeclaration` is created only when the donor has explicitly
ticked the Gift Aid box on the donation form and attested to UK
taxpayer status. Do not infer eligibility from address, billing
country, or prior donations. Do not pre-tick the Gift Aid checkbox.

**Why:** HMRC requires explicit donor declaration. Claiming Gift Aid
on ineligible donations is a regulatory breach with financial penalty
and reputational risk. (Per CLAUDE.md — the donation flow already
respects this; the rule is codified here to prevent regression.)

**Owner:** Seat 20 (Charity/HMRC).

**Added:** 2026-04-14.

---

*Supersede log follows below this line (newest first). No entries yet.*
