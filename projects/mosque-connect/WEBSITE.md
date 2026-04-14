# Website — salafimasjid.app

Static HTML/CSS/JS deployed to Cloudflare Pages.

## Structure

```
/web
  index.html            # Landing
  donate.html           # Bank transfer details (Stripe removed — see DECISIONS.md)
  donate.js             # Hadith rotation + tap-to-copy bank details
  prayer-times.html     # Prayer timetable
  features.html         # App features showcase
  about.html            # About the masjid
  contact.html          # Contact form (POSTs to /api/v1/contact/)
  download.html         # App download links
  privacy.html
  terms.html
  sitemap.html
  styles.css            # Global styles
  script.js             # Shared site JS — nav, scroll reveal, dark mode, prefetch, spam protection
  site.webmanifest      # PWA manifest
  _headers              # Cloudflare Pages headers (CSP, cache control)
  /data                 # Static data (e.g. timetable.json)
  /images
```

## Donation Flow (Website)

**Current state: bank transfer only.** Stripe was removed pending fixes — see `DECISIONS.md`.

1. User visits `/donate`.
2. Page shows bank transfer details (UK + International) with tap-to-copy.
3. "Where your donation goes" card explains charitable use.
4. Daily rotating hadith provides spiritual framing (deterministic by day-of-year).

The Stripe CSP entries in `_headers` and Stripe references in `privacy.html` / `terms.html` are intentionally retained — the mobile app still uses Stripe, and Stripe will return to the website once the issues are resolved.

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
