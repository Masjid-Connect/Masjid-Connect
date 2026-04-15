# Website — salafimasjid.app

Static HTML/CSS/JS deployed to Cloudflare Pages.

## Structure

```
/web
  index.html            # Landing
  prayer-times.html     # Prayer timetable
  features.html         # App features showcase
  about.html            # About the masjid — includes "Support the Masjid" section (bank transfer details)
  contact.html          # Contact form (POSTs to /api/v1/contact/)
  download.html         # App download links
  privacy.html
  terms.html
  sitemap.html
  styles.css            # Global styles
  script.js             # Shared site JS — nav, scroll reveal, dark mode, prefetch, spam protection, bank-detail tap-to-copy
  site.webmanifest      # PWA manifest
  _headers              # Cloudflare Pages headers (CSP, cache control)
  /data                 # Static data (e.g. timetable.json)
  /images
```

## Donations (Website)

**The website has no dedicated donation page.** There is no `/donate` route and no "Give" navigation item. Anyone who wants to donate via the web does so through the **"Support the Masjid"** section on `/about#support` — a bank-transfer-only block with UK + International account details and tap-to-copy.

History: `/donate` existed as a Stripe embedded checkout, then as a bank-transfer-only page, and was removed entirely on 2026-04-15. See `DECISIONS.md`.

The Stripe CSP entries in `_headers` and Stripe references in `privacy.html` / `terms.html` are intentionally retained — the mobile app still uses Stripe, and web Stripe may return later.

## Donation Flow (Mobile App)

Lives in the mobile app, not the website — documented here for the full picture.

1. Support tab (`app/(tabs)/support.tsx`) — amount / frequency / Gift Aid / fees UI.
2. "Donate Now" → `donations.createCheckoutUrl()` calls `POST /api/v1/donate/checkout/` (redirect mode, no `ui_mode`).
3. Backend returns Stripe Hosted Checkout URL → app opens via `expo-web-browser`.
4. On return → confirmation bottom sheet.

## Typography

**EB Garamond** (classical serif, SIL OFL) is the display face for `h1`, `h2`, section hero titles, prayer-time numerals on `/prayer-times`, and principle numerals on `/about`. System fonts carry body text, buttons, and UI.

Loaded via `@font-face` + `<link rel="preload">` from `/web/fonts/eb-garamond-v32-latin.woff2` (41KB, variable weight 400–800 axis) with `font-display: swap`.

The type scale in `styles.css` uses named `--fs-*` custom properties — no arbitrary `font-size` values in individual rules. See `DESIGN.md` § Typography for the full scale.

## Imagery

The site ships **no stock photography**. Where images are called for, they're **AI-generated line art** — simple, palette-matched, regional-provenance-grounded. Generated via Runware or Google's Nano Banana 2 (Gemini 3 Pro Image), stored in `web/images/line-art/` (mirrors the mobile `assets/line-art/` folder).

Candidate uses:
- Full-bleed editorial moments on `/index.html` and `/about.html`
- `/404.html` — a single calligraphic fragment or architectural detail
- Section dividers where a visual pause is earned

Prompt library lives in `assets/line-art/PROMPTS.md` (shared between mobile and web). See `DESIGN.md` § Imagery for generation rules.

## Deployment

- **Cloudflare Pages** at `salafimasjid.app`.
- Static assets cached aggressively (1 year, immutable, `?v=` query strings for busting).
- HTML: short cache, must-revalidate.
- CSP whitelists Stripe domains (kept for mobile + future web restoration).
- Font files (`/fonts/*.woff2`) served with 1-year immutable cache.
