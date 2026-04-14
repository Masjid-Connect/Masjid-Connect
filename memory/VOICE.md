# Voice — Masjid Connect

Tone of voice, language discipline, and religious-content conventions for
every user-facing surface: the app, the website, the admin, donation
receipts, push notifications, and App Store / Play Store metadata.

**Owner:** Council Seat 28 — Noor El-Sayed (Editorial & Copy Chief).
**Scope:** All user-facing English. Arabic/other languages inherit these
principles; specifics added when those locales ship.

## 1. Core tone

- **Respectful.** This app serves a worshipping community. Voice is
  measured and sincere.
- **Quietly authoritative.** Prayer times, announcements, and event
  details are matters of record. State them; do not sell them.
- **Never transactional about worship.** Do not frame prayer, Jumuah,
  or religious practice as a product, a habit streak, or a goal. The
  user is not a user journey.
- **Clear over clever.** Plain words over idiom. Short sentences. No
  rhetorical flourish in utility copy.
- **Present and specific.** "Fajr begins at 05:12" not "Let's start
  your day with Fajr."

## 2. Islamic honorifics — non-negotiable

Honorifics in religious content must be used correctly and consistently.
Seat 28 and Seat 5 (Islamic Domain Expert) both block PRs that omit
them in qualifying contexts.

| After mention of | Required honorific | Form in copy |
|------------------|-------------------|--------------|
| The Prophet Muhammad | ﷺ (sallallahu alayhi wa sallam) | Unicode U+FDFA, or the abbreviation `(saw)` only where Unicode cannot render |
| Other prophets (Ibrahim, Musa, Isa, etc.) | (AS) — alayhi as-salaam | Parenthesised after the name |
| Companions (Abu Bakr, Umar, Uthman, Ali, and others) | (RA) — radiyallahu anhu / anha | Parenthesised after the name |
| Allah | — | Capitalise "Allah". Do not substitute "God" in religious content unless the surface is explicitly addressing non-Muslim readers. |

Where honorifics appear in AI-generated or user-generated text, a
linting step (see `memory/CONSTRAINTS.md` § 3) enforces their presence.

## 3. Date and time formatting

- Prayer times use the user's device locale (12h/24h) and local timezone.
- Hijri dates quoted alongside Gregorian where relevant: `14 Ramadan 1447
  (14 April 2026)`. Hijri comes first in religious contexts, Gregorian
  first in civic contexts (contact form, receipts).
- Do not abbreviate "Ramadan" to "Ram." or "Dhul Hijjah" to "DH". Spell
  month names in full.
- No emoji in prayer times, announcements, or Hijri dates.

## 4. Donation and charity language

- Frame donations as sadaqah/zakat/support for the masjid, not as
  "purchases", "contributions to our community product", or similar
  SaaS framing.
- "Gift Aid" is the HMRC scheme name; capitalise consistently.
- Receipts use factual language: date, amount, reference, charity
  number. No "thank you for shopping with us". A simple gratitude
  line is fine: "JazakAllahu khayran for your support."
- Never imply a donor gets anything in return beyond the receipt
  (Apple Review Guideline 3.1.1(b) exemption depends on this).

## 5. Banned phrases

These are either incompatible with the tone or factually misleading.
Copy that contains any of these is blocked in review.

**Marketing hype:**
- "Unlock", "discover", "on your journey", "level up", "pro tips",
  "supercharge", "game-changer", "next-gen", "seamless", "frictionless",
  "delightful" (as a UX adjective), "effortless".

**Streaks and gamification:**
- "Don't break your streak", "keep it up", "you're on fire", "X days
  in a row" — absent in religious context, applied to worship.
- No push notification says anything competitive about another user's
  prayer record. There is no such data.

**False urgency:**
- "Only N left", "last chance", countdown timers on donations,
  "limited time" — unless factually true (e.g. a Ramadan fund with a
  fixed close date).

**Presumptuous intimacy:**
- "Welcome back, brother/sister" as a default login greeting — only
  if the user has set that preference.
- "Your prayers" (possessive about the act itself — prayer is not the
  user's property).

## 6. Error messages and empty states

- Name what happened plainly. "We couldn't load prayer times" not
  "Oops! Something went wrong."
- Offer a next step. "Check your connection and try again" not a
  dead-end.
- Don't apologise twice. One "sorry" maximum, and only when the fault
  is clearly on our side (not a user network issue).
- No humour in error messages near worship-adjacent surfaces (prayer
  times, Qibla, Adhan audio). Humour is fine in low-stakes surfaces
  (feedback form confirmation).

## 7. Accessibility of language

- Target reading age: 12. Congregants include teenagers, non-native
  English speakers, and older members.
- Abbreviations spelt out on first use per screen. "Masjid Administrator
  (admin)" on first appearance; "admin" thereafter.
- Avoid Latin legal abbreviations: use "for example" not "e.g.", "among
  other things" not "inter alia".

## 8. App Store / Play Store metadata

- App name: "Masjid Connect" (two words, both capitalised).
- Subtitle / short description: factual, benefit-led, no marketing
  adjectives. "Prayer times, announcements, and events for The Salafi
  Masjid."
- Screenshots: caption each with a plain noun phrase. No CTAs in
  screenshot captions.
- Do not mention competing apps by name.
- Do not claim endorsements you cannot substantiate.

## 9. Review checklist before merging user-facing copy

A change to any user-facing string passes review when:

- [ ] No banned phrase from § 5 present.
- [ ] Honorifics present where § 2 requires them.
- [ ] Dates formatted per § 3.
- [ ] No transactional framing of worship (§ 1).
- [ ] Reading age ≤ 12 (§ 7).
- [ ] Seat 28 (Editorial) approved. If the copy is religious or
      references scholarship, Seat 5 (Islamic Domain) also approved.
- [ ] If the copy is a donation surface, Seat 20 (Charity/HMRC) and
      Seat 23 (iOS) approved (Guideline 3.1.1(b) compliance).
- [ ] Locale key added to `/constants/locales/en.json` — no
      hardcoded strings.

---

*Codified 2026-04-14. Superseded entries must be dated and retained
below this line (not deleted).*
