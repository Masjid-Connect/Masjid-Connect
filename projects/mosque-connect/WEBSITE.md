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

## Deployment

- **Cloudflare Pages** at `salafimasjid.app`.
- Static assets cached aggressively (1 year, immutable, `?v=` query strings for busting).
- HTML: short cache, must-revalidate.
- CSP whitelists Stripe domains (kept for mobile + future web restoration).
