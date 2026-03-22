# Plan: Update CLAUDE.md to reflect current codebase

CLAUDE.md is significantly outdated. The project has evolved from a 4-tab MVP to a feature-rich app with donations, admin tools, social auth, error tracking, and more. Below is every section that needs updating and exactly what changes to make.

---

## 1. Tech Stack — Add missing dependencies

**Add these lines:**
- **GPU Graphics**: @shopify/react-native-skia (atmospheric gradients, visual effects)
- **Auth**: expo-secure-store (token storage), expo-apple-authentication, expo-auth-session (social login)
- **Error Tracking**: @sentry/react-native
- **Payments**: Stripe (backend) — donation checkout & Gift Aid
- **Email**: Resend (backend) — contact form & transactional email
- **Location**: expo-location (GPS for nearby mosques)
- **Calendar**: react-native-calendars (event calendar view)
- **Date Picker**: @react-native-community/datetimepicker
- **PDF Processing**: pymupdf + weasyprint (backend, timetable scraping & Gift Aid reports)

**Update existing:**
- **Local Storage**: Change "expo-sqlite" to "expo-secure-store (auth tokens) + AsyncStorage (offline cache)"
- **Auth**: Note token expiration (30-day TTL via ExpiringTokenAuthentication)

---

## 2. Project Structure — Major expansion

### App routes (/(tabs)/)
**Add new tabs:**
- `community.tsx` — Combined announcements + events feed with admin tools
- `support.tsx` — Donation/fundraising (Stripe checkout, Gift Aid, bank details)

**Add root routes:**
- `about.tsx`, `privacy.tsx`, `terms.tsx`, `+not-found.tsx`

### Components
**Add new directories:**
- `/admin` — AdminFAB, QuickPostSheet, EventWizardSheet, PreviewCard
- `/community` — AnnouncementsContent, EventsContent
- `/support` — AmountSelector, BankDetailsSheet
- `/navigation` — AmbientTabIndicator
- `/settings` — SettingsRow, SettingsPickerSheet, ProfileCard, ThemePreviewSheet, ReportIssueSheet, FeatureRequestSheet

**Update existing:**
- `/brand` — Add IslamicPattern, KozoTexture, SkiaAtmosphericGradient, SolarLight, GlowDot
- `/ui` — Add Button, TextInput, Card, GroupedSection, ListRow, Separator, AuthGate, InAppToast, ErrorFallback
- `/prayer` — Add DateNavigator

**Remove stale entries:**
- `/announcements` and `/events` directories → replaced by `/community`

### Lib
**Add new files:**
- `sentry.ts` — Sentry error tracking init
- `hijri.ts` — Hijri calendar utilities
- `breathMotion.ts` — Breathing animation utilities
- `layoutGrid.ts` — Layout grid system
- `prayerGradients.ts` — Prayer-specific gradient definitions
- `staticTimetable.ts` — Static timetable fallback data

### Hooks
**Add new hooks:**
- `useAdminStatus.ts` — Check if user is mosque admin
- `useIslamicSeason.ts` — Islamic season/calendar detection
- `useReadAnnouncements.ts` — Track read/unread announcements

### New directories to document
- `/contexts` — AuthContext.tsx, ThemeContext.tsx, ToastContext.tsx
- `/types` — index.ts (all TypeScript interfaces)

---

## 3. Design System — Color palette corrections

### Divine Gold value
**Change:** `#D4AF37` → `#A68523` (darkened for WCAG AA 4.5:1 contrast on Stone-100)

### Dark mode — complete rewrite
**Old (wrong):** Onyx-950 `#0A0A0C`, Onyx-850 `#1A1A1E`, Onyx-800 `#262628`
**New (actual):** Dark mode uses Sapphire navy family, not near-black:
- Sapphire-950 `#0A1628` — main background (deepest midnight navy)
- Sapphire-900 `#0F1E34` — secondary surface
- Sapphire-850 `#132742` — elevated cards
- Sapphire-800 `#18304E` — grouped list backgrounds
- Sapphire-400 `#6BABE5` — dark mode tint
- Gold Bright `#F0D060` — dark mode gold

**Update description:** Change "near-OLED black" to "midnight navy" — "Sapphire IS the dark mode"

### Add alpha token layer note
Note the existence of the `alpha` RGBA token system in Colors.ts for translucent surfaces.

### Add accessibility gold variants
- `divineGoldText: '#8A7023'` — text on light backgrounds (4.5:1 on white)
- `divineGoldTextDark: '#E0C96B'` — text on dark backgrounds

---

## 4. Backend — Major expansion

### Models
**Add new models:**
- **Feedback** — bug reports & feature requests (type, status workflow, device_info)
- **MosquePrayerTime** — Jama'ah times from PDF timetables (per mosque per date)
- **Donation** — Stripe donations (amount_pence, frequency, source, Gift Aid fields)
- **GiftAidDeclaration** — HMRC-compliant donor declarations
- **GiftAidClaim** — Batch Gift Aid claim submissions
- **CharityGiftAidSettings** — Singleton HMRC config
- **StripeEvent** — Webhook idempotency tracking

### API Endpoints
**Add new endpoints:**
```
POST /api/v1/auth/social/                    # Apple/Google social login
GET  /api/v1/auth/admin-roles/               # User's mosque admin roles
GET  /api/v1/auth/export-data/               # GDPR data export
DELETE /api/v1/auth/delete-account/           # Account deletion (GDPR)

GET/POST /api/v1/feedback/                   # Bug reports & feature requests
GET  /api/v1/mosques/{id}/prayer-times/      # Jama'ah times for mosque
POST /api/v1/contact/                        # Website contact form

POST /api/v1/donate/checkout/                # Create Stripe Checkout Session
GET  /api/v1/donate/session-status/          # Check checkout status
POST /api/v1/stripe/webhook/                 # Stripe webhook receiver
GET  /api/v1/gift-aid/summary/               # Admin Gift Aid summary
```

### Backend structure
**Add to the structure tree:**
- `authentication.py` — ExpiringTokenAuthentication (30-day TTL)
- `signals.py` — Model lifecycle signal handlers
- `push.py` — Push notification service
- `middleware.py` (in config/) — CSP headers middleware
- `dashboard.py` — Custom admin dashboard
- `gift_aid_xml.py` — HMRC R68 XML generation
- `scrapers/` — Timetable PDF scrapers (base.py, wright_street.py)
- `templates/` — Admin & legal page templates

### Management commands
**Add new commands:**
```bash
python manage.py scrape_timetables        # Scrape mosque prayer time PDFs
python manage.py export_timetable_json    # Export timetable to JSON
python manage.py fix_prayer_times         # Prayer time data cleanup
python manage.py generate_gift_aid_xml    # HMRC R68 Gift Aid XML
python manage.py test_push               # Test push notification delivery
```

### Auth changes
**Update:** "Token authentication" → "Expiring Token authentication (30-day TTL, auto-rotate on login)"

### Rate limiting
**Add note about throttles:** Auth 5/min, Nearby 30/min, plus per-scope limits for content creation, feedback, data export, contact, donations.

---

## 5. Minor content fixes

- **Announcement priority:** Add "janazah" as third priority level (normal/urgent/janazah)
- **State Management:** Add "React Context providers: AuthContext, ThemeContext, ToastContext"; change "expo-sqlite" to "AsyncStorage" for offline cache
- **Important Notes:** Add Sentry, secure token storage, social login, Stripe donations, account deletion, Jama'ah times, rate limiting

---

## Execution approach

Single-file rewrite of CLAUDE.md. Preserve existing structure/tone, update each section in-place. No sections removed — only updated and expanded.
