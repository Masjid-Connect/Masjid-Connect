# Business Model — Masjid Connect

How the project is funded, what money flows through it, and the
regulatory framing that governs those flows. This file exists because
no root document currently codifies the business model end-to-end.

**Owner:** Council Seat 20 (Charity Commission & HMRC) for charity
framing; Seat 21 (Stripe Billing) for payment mechanics; Seat 1
(Architect) for system-level alignment with DOCTRINE.

## 1. What the app is, commercially

Masjid Connect is a **single-mosque app for The Salafi Masjid**. It is
not a SaaS product, not multi-tenant, not sold to other mosques. It
has no subscription tiers for end users. It has no paid unlocks. It
has no advertising.

Its only monetary flow is **donations to the masjid charity**, which
the app and website facilitate as a service to the community.

## 2. Revenue flows

| Flow | Direction | Purpose |
|------|-----------|---------|
| Donations (one-off) | Donor → Stripe → Masjid bank | Sadaqah to the masjid |
| Donations (monthly) | Donor → Stripe → Masjid bank | Recurring sadaqah |
| Gift Aid reclaim | HMRC → Masjid bank | +25% on eligible donations |
| Bank transfer | Donor → Masjid bank | Stripe-bypass alternative |

There are no other revenue flows. The app itself is free to install
and use on iOS, Android, and web. No data is sold, shared, or monetised.

## 3. Charity structure

- **Registered charity:** The Salafi Masjid (UK). Charity number is
  displayed on `/web/` legal pages and in donation receipts.
- **Trustees:** Listed in the Charity Commission public register.
- **Governing document:** The masjid's constitution / trust deed,
  held by the trustees. Not in this repo.
- **Annual returns:** Submitted to the Charity Commission by the
  trustees. Not automated by this app.

## 4. Gift Aid mechanics

- Donors declare UK taxpayer status via an explicit checkbox on the
  donation form (never pre-ticked — see `memory/CONSTRAINTS.md` § 8).
- A `GiftAidDeclaration` record is created on `checkout.session.completed`
  only if the donor opted in.
- `CharityGiftAidSettings` holds charity metadata for HMRC filings.
- `GiftAidClaim` batches declarations for submission via the
  `generate_gift_aid_xml` management command, producing
  Charities Online schema-compliant XML.
- **Six-year retention:** All donation records preserved per HMRC
  requirements.

Gift Aid increases the effective donation by 25p per £1 for eligible
donations.

## 5. Payment rails — Stripe

- **Checkout:** Stripe Checkout (embedded on web, hosted redirect in app).
- **Payment methods** (Stripe Dashboard managed): card, PayPal, Apple Pay,
  Google Pay, Pay by Bank.
- **Webhooks:** `/api/v1/stripe/webhook/` — signature-verified, idempotent
  via `StripeEvent` model.
- **PCI scope:** SAQ-A (all card data handled by Stripe; no card data
  touches our servers).
- **Riba disclosure:** `memory/CONSTRAINTS.md` § 5. Donors are informed
  that interest accrued on Stripe-held float is retained by Stripe.

### Apple Review Guideline 3.1.1(b) — charity donation exemption

Apple permits charitable donations via Stripe (instead of In-App Purchase)
for **registered charities** where:

- The donor receives nothing in return beyond a receipt.
- The charity's registration is verifiable.
- The flow does not gate any app functionality behind the donation.

Masjid Connect's donation flow must stay within this exemption. Any
proposal that offers donors something in exchange (e.g. "premium
announcements", "priority Jumuah seats") breaks the exemption and
requires conversion to IAP on iOS, which would fundamentally change
the business model. Seat 23 (iOS App Store Review) blocks any such
change.

## 6. Bank transfer alternative

A bank transfer route is offered alongside Stripe for:

- Donors avoiding Stripe's float-interest entirely.
- Large donations where Stripe's fee percentage matters.
- Donors without a card / preference for direct bank transfer.

Bank details (sort code, account number, reference format) are shown
in a bottom sheet in the app and on `/web/donate.html`. No automated
reconciliation — the charity treasurer reconciles bank receipts
manually.

## 7. Cost structure

| Cost | Bearer | Typical |
|------|--------|---------|
| Stripe processing fee | Charity (or donor, if they tick "cover fees") | 1.5% + 20p domestic, more for Amex/international |
| Digital Ocean hosting | Charity | ~$12/mo droplet |
| Cloudflare Pages | Free tier | — |
| Domain (salafimasjid.app) | Charity | ~£10/yr |
| App Store / Play Store fees | Charity | £79/yr Apple, $25 one-off Google |
| Sentry | Free tier / charity plan | — |

The "Cover Processing Fees" checkbox on the donation form adds the
Stripe fee to the donor's charge so the masjid receives the full
intended amount.

## 8. Reporting obligations

- **Annual return to Charity Commission** — trustees, not the app.
- **Gift Aid claims to HMRC** — the app generates the XML; the
  trustee/treasurer submits it.
- **Accounts** — trustees prepare; the app exposes donation data via
  admin for that purpose.
- **Financial year:** set by the trustees (check Charity Commission
  register for the registered year-end).

## 9. What this business model forbids

Because it is an entirely charitable, single-community app:

- **No user-to-user fee collection.** No splitting restaurant bills,
  tuition fees between attendees, etc.
- **No marketplace behaviour.** No one can list anything for sale.
- **No sponsored content.** Announcements are not monetised.
- **No analytics resale.** User behaviour is not sold or shared for
  commercial purposes.
- **No commercial partnerships that use the app as a distribution
  channel** without a trustee resolution on record.

## 10. What could change this model

Any of the following requires an ADR under
`projects/masjid-connect/decisions/` plus council approval (Seats 1,
19, 20, 22, 23, 24):

- Expanding beyond The Salafi Masjid to other mosques (breaks DOCTRINE.md § 1 scope).
- Adding any paid feature (breaks § 5 Apple exemption).
- Accepting donations from outside the UK at scale (Gift Aid implications).
- Introducing any form of advertising (breaks § 1 and § 9).

---

*Codified 2026-04-14 on branch `claude/review-migration-docs-cY9ne`.
Based on the donation flow as documented in CLAUDE.md and the charity
context explicit in DOCTRINE.md § 1.*
