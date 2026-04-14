# Business — Donations & Charity Operations

## Charity Identity

- **Salafi Bookstore & Islamic Centre**
- **Registered Charity No. 1083080**
- The Salafi Masjid is part of this registered entity.
- Bank: Lloyds, Erdington branch, Birmingham.
- 100% of donations go directly to The Salafi Masjid, Birmingham.

## Donation Channels

| Channel | Status | Notes |
|---|---|---|
| Mobile app — Stripe Hosted Checkout | Active | `app/(tabs)/support.tsx` → `POST /api/v1/donate/checkout/` (url mode) → `expo-web-browser` |
| Website — Bank transfer | Active | `/donate` page surfaces UK + International transfer details with tap-to-copy |
| Website — Stripe | **Removed (temporary)** | See `DECISIONS.md` — pending fixes |

## Donation Model (Mobile App)

- **Frequencies**: one-time, monthly.
- **Amounts**: presets £10/£25/£50/£100 + custom (£1–£10,000).
- **Gift Aid** (UK taxpayers, +25%) — auto-creates `GiftAidDeclaration` on checkout completion when opted in.
- **Cover processing fees** — donor option to absorb Stripe fees so the masjid receives the full amount.
- **Receipt emails** — sent automatically post-donation.

## Stripe Integration

- **Payments**: Stripe Checkout (hosted redirect from mobile).
- **Methods**: Card, PayPal, Apple Pay, Google Pay, Pay by Bank — managed via Stripe Dashboard.
- **Webhooks**: `POST /api/v1/stripe/webhook/` — signature-verified, idempotent (`StripeEvent` model).
- **Events handled**: `checkout.session.completed`, `invoice.payment_succeeded/failed`, `customer.subscription.created/deleted`, `payment_intent.succeeded`, `charge.refunded`.
- **Env**: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.

## Gift Aid (HMRC)

- Donor declarations stored as `GiftAidDeclaration` (linked to `Donation`).
- Batched submissions via `GiftAidClaim`.
- XML generation: `python manage.py generate_gift_aid_xml`.
- Admin-only summary endpoint: `GET /api/v1/gift-aid/summary/`.
- Configuration: `CharityGiftAidSettings` model.

## Trust Positioning

- **Visible charity number** on every donation surface.
- **Bank transfer is always presented as a first-class option** — no payment processor friction, fully traceable.
- **Sadaqah jaariyah framing** — donations are continuous reward, not transactional.
- **Daily rotating hadith** on the donation page (only Bukhari, Muslim, or agreed-upon — no weak narrations).
- **No pressure tactics**, no scarcity, no countdowns. Quiet dignity.
