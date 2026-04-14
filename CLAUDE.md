# Mosque Connect — CLAUDE.md

> **Governing Doctrine**: See [DOCTRINE.md](./DOCTRINE.md) for non-negotiable project rules. All development must comply.

> **Council of Experts**: See [COUNCIL.md](./COUNCIL.md) for the 30-seat expert council. **All changes must pass council deliberation before implementation.** This is non-negotiable.

## Council Enforcement

Before making **any** change to this project — code, config, design, architecture, dependencies, or documentation — you **must** run a council deliberation:

1. Identify which council seats are relevant to the change.
2. Simulate each expert's review from their domain perspective, applying their specific mandate.
3. Output the deliberation in the format defined in COUNCIL.md.
4. **Only proceed if the verdict is APPROVED.** If any member blocks or raises concerns, address them first and re-deliberate.
5. If no existing council seat covers a domain needed for the review, **auto-add a new expert seat** to COUNCIL.md and include them in the deliberation.

The council is the top-level authority. No exceptions.

## Project Overview
Mosque Connect is a premium mobile app **exclusively for The Salafi Masjid** community, providing prayer time notifications, event/lesson listings, and community announcements. This is a **single-mosque app** — there is no mosque selection, discovery, or multi-mosque subscription flow. The design philosophy is **god-tier, not SaaS** — a serene, premium experience rooted in Islamic geometric art and calligraphic tradition.

## Tech Stack
- **Framework**: React Native + Expo (SDK 55, managed workflow, TypeScript)
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Django 5 + Django REST Framework (self-hosted on Digital Ocean)
- **API Documentation**: drf-spectacular (OpenAPI schema at `/api/schema/`, Swagger UI at `/api/docs/`)
- **Prayer Times**: Aladhan API (primary, free, no key required) + `adhan` (adhan-js, offline-only fallback)
- **Push Notifications**: Expo Notifications + Expo Push Service
- **Local Storage**: expo-sqlite for offline-first caching
- **Animations**: react-native-reanimated
- **SVG**: react-native-svg
- **Haptics**: expo-haptics (meaningful interactions)
- **Icons**: @expo/vector-icons/Ionicons (outline/filled pairs)
- **Date Handling**: date-fns
- **i18n**: i18next + react-i18next (English only — Arabic not shipping for MVP)
- **Payments**: Stripe Checkout (embedded on web, hosted redirect in app) + Stripe.js
- **In-app Browser**: expo-web-browser (for Stripe Hosted Checkout in app)
- **Website**: Static HTML/CSS/JS on Cloudflare Pages (salafimasjid.app)
- **Language**: TypeScript (strict mode)
- **CI/CD**: GitHub Actions (TypeScript check, ESLint, Jest, Django tests, version increment check)

## Project Structure
```
/app                    # Expo Router file-based routes
  /(tabs)/              # Tab navigator
    index.tsx           # Prayer Times (home tab)
    community.tsx       # Announcements + Events (combined community tab)
    support.tsx         # Donations/Give tab (Stripe checkout + bank transfer)
    settings.tsx        # Settings & preferences
  /_layout.tsx          # Root layout
/components             # Reusable UI components
  /brand                # Brand identity components
    AnimatedSplash.tsx  # Splash screen animation
    GoldBadge.tsx       # Divine Gold notification badge (not red)
    IslamicPattern.tsx  # Sacred geometric pattern backgrounds
    index.ts            # Re-exports for clean imports
  /ui                   # Base design system components
    BottomSheet.tsx      # Spring-animated bottom sheet (replaces centered modals)
    ErrorFallback.tsx   # Sentry error boundary fallback
  /navigation           # Tab bar and navigation components
    AmbientTabIndicator.tsx  # Custom ambient tab bar
  /prayer               # Prayer time components
  /community            # Announcements + Events components
    AnnouncementsContent.tsx
    EventsContent.tsx
  /support              # Donation components
    AmountSelector.tsx  # Preset + custom amount picker
    BankDetailsSheet.tsx # Bank transfer details bottom sheet
    DonationConfirmationSheet.tsx # Post-donation confirmation
    TrustBadge.tsx      # Security/charity badge
/lib                    # Utilities and services
  /api.ts               # Django REST API client (auth, mosques, announcements, events, subscriptions)
  /prayer.ts            # Aladhan API + adhan-js offline fallback
  /notifications.ts     # Push notification logic
  /storage.ts           # Offline cache (AsyncStorage)
  /i18n.ts              # i18next initialization (English only)
/hooks                  # Custom React hooks
/constants              # App constants, enums
  /locales/en.json      # English translations (100+ keys)
/assets                 # Fonts, images, patterns
  /fonts                # SpaceMono (system fonts used for all other text)
  /patterns             # Islamic geometric SVG patterns
/scripts                # Project-level scripts
  bump-version.sh       # Bump semver in package.json + app.json in sync
/backend/scripts        # Backend operational scripts
  deploy.sh             # Docker-based production deployment with rollback
  backup.sh             # Database backup
  restore.sh            # Database restore
  update-deps.sh        # Dependency updates
```

## Brand Identity

The app uses the **Masjid_Logo.png** (The Salafi Masjid logo with transparent background) as the primary brand mark. It appears on the welcome screen, auth screens, and splash screen. No custom SVG brand mark — the logo PNG is the identity.

**Notification Badge:** Divine Gold circle, never red. `GoldBadge` auto-selects `divineGoldBright` in dark mode for contrast.

**Typography:** Prayer time numerals use `tabular-nums` font variant with confident weight.

## Design System

### Color Palette — "Timeless Sanctuary" (Jewel & Stone philosophy)

**Palette taxonomy:** Stone (backgrounds), Onyx (dark tones), Sapphire (brand primary), Gold (divine accent), Sage (success), Crimson (urgent), Slate (info). High-contrast for older congregants, calm for daily use.

**Light mode — "Morning Light in the Musalla":**
- **Stone-100** `#F9F7F2` — main background, clean masjid marble
- **Stone-200** `#F0EDE6` — secondary surfaces
- **Stone-300** `#E5E0D3` — grouped backgrounds, sand-toned
- **Onyx-900** `#121216` — primary text (organic near-black, not harsh)
- **Onyx-600** `#6B6B70` — secondary text
- **Sapphire-700** `#0F2D52` — brand primary tint, tab selection, links (deep blue)
- **Divine Gold** `#D4AF37` — accent, prayer active indicator, notification badges
- **Sage-600** `#2D6A4F` — success states
- **Crimson-600** `#B91C1C` — urgent/alert states (Janazah, immediate announcements)
- **Separator** `#E2DFD8` — warm hairline dividers

**Dark mode — "Midnight in the Masjid" (near-OLED black):**
- **Onyx-950** `#0A0A0C` — main background (not pure black, easier on eyes)
- **Onyx-850** `#1A1A1E` — elevated card surfaces
- **Onyx-800** `#262628` — grouped list backgrounds
- **Snow** `#F5F5F7` — primary text
- **Sapphire-400** `#5B9BD5` — lighter sapphire tint for dark backgrounds
- **Gold Bright** `#E5C14B` — brighter Divine Gold for dark contrast

**Semantic layer:** Colors are mapped through `semantic.*` tokens in Colors.ts (surface, text, status, brand) for future theme variants (e.g., Ramadan Mode).

### Typography (Apple HIG Type Scale)
- **System fonts** — SF Pro (iOS) / Roboto (Android) with weight variation, no custom font loading
- **14 named styles**: largeTitle (34/700), title1 (28/700), title2 (22/700), title3 (20/600), headline (17/600), body (17/400), callout (16/400), subhead (15/400), footnote (13/400), caption1 (12/400), caption2 (11/400)
- **Special purpose**: prayerCountdown (54/200, ultralight), prayerTime (17/600), sectionHeader (13/600, uppercase + letter-spacing)
- `tabular-nums` font variant for prayer times
- SpaceMono for technical accents only

### Design Principles
- **Apple HIG influence** — system fonts, SF-style type scale, grouped list patterns, checkmarks over radio buttons
- Generous whitespace — 32px screen-edge insets (`spacing['3xl']`)
- 3-tier elevation system: none/sm/md/lg (black shadows only, Apple convention)
- LTR only (Arabic/RTL not shipping for MVP)
- Spring-based animations (Reanimated `springs.gentle/snappy/bouncy`), no linear easing
- **Button component** — 4 variants: primary, secondary, ghost, destructive. Loading spinner matches text height to prevent layout jank. Compact variant available.
- **BottomSheet pattern** — spring-animated, gesture-dismissible sheets replace all centered modals
- Haptic feedback on meaningful interactions (prayer transitions)
- **Ionicons** (outline/filled pairs) for tab bar and UI icons — no FontAwesome
- Notification badges are Divine Gold, never red — a glint, not an error
- **i18n throughout** — all user-facing strings via `t()` calls, English locale file

## Backend — Django REST Framework

The backend lives in `/backend/` and uses Django 5 + DRF with Token authentication.

### Project Structure
```
/backend
  /config/              # Django settings, URLs, WSGI
    settings.py         # Main settings (env-based via django-environ)
    urls.py             # Root URL config
  /core/                # Models and admin
    models.py           # User, Mosque, Announcement, Event, UserSubscription, PushToken, MosqueAdmin
    admin.py            # Unfold-themed admin (Sacred Blue brand)
    management/commands/seed_data.py  # Sample data seeder
  /api/                 # REST API
    serializers.py      # DRF serializers
    views.py            # ViewSets and auth views
    urls.py             # API URL routing
  manage.py
  requirements.txt
  .env / .env.example
```

### API Endpoints
```
POST /api/v1/auth/register/          # Register + get token
POST /api/v1/auth/login/             # Login + get token
POST /api/v1/auth/logout/            # Invalidate token
GET  /api/v1/auth/me/                # Current user

GET  /api/v1/mosques/                # List mosques (?city=, ?search=)
GET  /api/v1/mosques/{id}/           # Mosque detail
GET  /api/v1/mosques/nearby/?lat=&lng=&radius=  # Nearby mosques (haversine)

GET  /api/v1/announcements/?mosque_ids=id1,id2   # Announcements for mosques
POST /api/v1/announcements/          # Create announcement (auth required)

GET  /api/v1/events/?mosque_ids=id1,id2&from_date=YYYY-MM-DD&category=lesson
POST /api/v1/events/                 # Create event (auth required)

GET  /api/v1/subscriptions/          # User's subscriptions (auth required)
POST /api/v1/subscriptions/          # Subscribe to mosque
DELETE /api/v1/subscriptions/{id}/   # Unsubscribe
PATCH /api/v1/subscriptions/{id}/    # Update notification preferences

POST /api/v1/push-tokens/            # Register push token

POST /api/v1/donate/checkout/        # Create Stripe Checkout Session (embedded or redirect)
GET  /api/v1/donate/session-status/  # Verify checkout session completion
POST /api/v1/stripe/webhook/         # Stripe webhook (signature-verified)
GET  /api/v1/gift-aid/summary/       # Gift Aid summary (admin-only)

POST /api/v1/contact/                # Contact form submission
POST /api/v1/feedback/               # User feedback

GET  /api/schema/                     # OpenAPI schema (drf-spectacular)
GET  /api/docs/                      # Swagger UI (interactive API docs)

GET  /health/                        # Health check
GET  /admin/                         # Django admin (Unfold theme)
```

### Django Models
- **User** — UUID PK, extends AbstractUser with `name` field
- **Mosque** — name, address, city, state, country, lat/lng, calculation_method, jumua_time, contact info, photo
- **Announcement** — mosque FK, title, body, priority (normal/urgent/janazah), published_at, expires_at (indexed), author FK
- **Event** — mosque FK, title, description, speaker, event_date, start/end_time, recurring (weekly/monthly), category (lesson/lecture/quran_circle/youth/sisters/community)
- **UserSubscription** — user FK, mosque FK, notify_prayers/announcements/events, prayer_reminder_minutes
- **PushToken** — user FK, token (unique), platform (ios/android)
- **MosqueAdmin** — mosque FK, user FK, role (admin/super_admin)
- **Feedback** — user feedback submissions
- **MosquePrayerTime** — cached prayer times per mosque
- **PasswordResetToken** — password reset flow tokens
- **StripeEvent** — idempotent webhook event log (stripe_event_id, event_type, processed, payload)
- **CharityGiftAidSettings** — HMRC Gift Aid configuration for the charity
- **Donation** — amount_pence, currency, frequency (one-time/monthly), source (stripe), gift_aid_eligible, Stripe IDs (checkout session, payment intent, customer), donor details
- **GiftAidDeclaration** — donor declarations for HMRC Gift Aid reclaim (linked to donations)
- **GiftAidClaim** — batched HMRC Gift Aid claim submissions

### Backend Commands
```bash
cd backend
pip install -r requirements.txt       # Install dependencies
python manage.py migrate              # Run migrations
python manage.py seed_data            # Seed sample data
python manage.py createsuperuser      # Create admin user
python manage.py runserver            # Start dev server (port 8000)
```

### Backend Management Commands
```bash
cd backend
python manage.py scrape_timetables        # Scrape prayer timetables
python manage.py scrape_all_timetables    # Scrape all mosque timetables
python manage.py export_timetable_json    # Export timetables as JSON
python manage.py fix_prayer_times         # Fix/correct prayer time data
python manage.py generate_gift_aid_xml    # Generate HMRC Gift Aid XML
python manage.py test_push                # Test push notifications
```

### Backend Operational Scripts
```bash
cd backend
./scripts/deploy.sh                   # Docker-based deploy with rollback
./scripts/backup.sh                   # Database backup
./scripts/restore.sh                  # Database restore from backup
./scripts/update-deps.sh              # Update Python dependencies
```

## Website — Static Landing & Donation Pages

The marketing website lives in `/web/` and is deployed to Cloudflare Pages at `salafimasjid.app`.

### Website Structure
```
/web
  index.html            # Landing page
  donate.html           # Donation page (Stripe Embedded Checkout)
  donate.js             # Donation page logic (amount, fees, Gift Aid, Stripe)
  features.html         # App features showcase
  about.html            # About the masjid
  contact.html          # Contact form (submits to API)
  download.html         # App download links
  privacy.html          # Privacy policy
  terms.html            # Terms of service
  sitemap.html          # Sitemap
  styles.css            # Global styles
  script.js             # Shared site JS (nav, scroll reveal, dark mode, prefetch, spam protection)
  site.webmanifest      # PWA manifest
  _headers              # Cloudflare Pages headers
```

### Donation Flow (Website)
1. User selects frequency (one-time/monthly) + amount on `donate.html`
2. Optional: Gift Aid checkbox (UK taxpayers, +25%), Cover Processing Fees checkbox
3. "Donate Now" → `fetch()` creates Stripe Checkout Session via `POST /api/v1/donate/checkout/` with `ui_mode: 'embedded'`
4. Stripe.js mounts Embedded Checkout inline (no redirect)
5. On completion → success state with verification via `/api/v1/donate/session-status/`
6. Fallback: if embedded fails → form POST redirect to Stripe Hosted Checkout
7. Alternative: "Bank Transfer" opens bottom sheet with Lloyds bank details

### Donation Flow (Mobile App)
1. Support tab (`app/(tabs)/support.tsx`) — same amount/frequency/Gift Aid/fees UI
2. "Donate Now" → `donations.createCheckoutUrl()` calls `POST /api/v1/donate/checkout/` with redirect mode (no `ui_mode`)
3. Backend returns 303 redirect → app opens Stripe Hosted Checkout via `expo-web-browser`
4. On return → confirmation bottom sheet shown

### Stripe Integration
- **Payments**: Stripe Checkout (embedded on web, hosted redirect in app)
- **Payment methods**: Card, PayPal, Apple Pay, Google Pay, Pay by Bank — managed via Stripe Dashboard
- **Webhooks**: `POST /api/v1/stripe/webhook/` — signature-verified, idempotent (StripeEvent model)
- **Webhook events handled**: `checkout.session.completed`, `invoice.payment_succeeded/failed`, `customer.subscription.created/deleted`, `payment_intent.succeeded`, `charge.refunded`
- **Gift Aid**: Auto-creates GiftAidDeclaration on checkout completion when opted in
- **Receipt emails**: Sent automatically after successful donation
- **Environment**: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` in server env

## Commands

### Development
```bash
npx expo start                    # Start dev server
npx expo start --clear            # Start with cache clear
npx expo run:ios                  # Run on iOS simulator
npx expo run:android              # Run on Android emulator
```

### Testing
```bash
npm test                          # Run Jest tests
npm run test:watch                # Watch mode
npm run lint                      # ESLint + Prettier check
npm run typecheck                 # TypeScript type checking
```

### Building
```bash
eas build --platform ios          # iOS build
eas build --platform android      # Android build
eas build --platform all          # Both platforms
```

### Testing (Google Play Internal / Apple TestFlight)
```bash
# ── Android Internal Testing ──
eas build --platform android --profile production    # Build .aab
eas submit --platform android --profile internal     # Submit to internal testing track

# ── iOS TestFlight ──
eas build --platform ios --profile production        # Build .ipa
eas submit --platform ios --profile production       # Submit to TestFlight
```

**Google Play testing tracks** (configured in `eas.json` submit profiles):
- **Internal testing** — up to 100 testers, no review needed, instant availability
- **Closed testing** — invite-only, brief Google review
- **Open testing** — anyone with the link, full Google review
- **Production** — public on Play Store

**Android internal testing workflow:**
1. Build: `eas build --platform android --profile production`
2. Submit: `eas submit --platform android --profile internal`
   - Or manually: download `.aab` from EAS build URL → upload in Play Console
3. In Play Console → **Testing > Internal testing > Testers** → add tester email addresses
4. Share the opt-in link with testers — they install via Play Store
5. Promote to Closed/Open/Production when ready

### Version Management
```bash
./scripts/bump-version.sh patch       # 1.0.0 → 1.0.1 (bug fix)
./scripts/bump-version.sh minor       # 1.0.0 → 1.1.0 (new feature)
./scripts/bump-version.sh major       # 1.0.0 → 2.0.0 (breaking change)
./scripts/bump-version.sh 2.3.1      # Set explicit version
./scripts/bump-version.sh            # Show current versions
# Or via npm:
npm run version:bump -- patch         # Same as above via npm
```

**Versioning rules:**
- `package.json` and `app.json` versions must always match (CI enforces this on PRs)
- EAS auto-increments build numbers for production builds (`eas.json` → `autoIncrement: true`)
- OTA updates use `runtimeVersion: { policy: "fingerprint" }` — no manual version needed
- App Store / Play Store submissions require a semver bump; OTA-only updates do not
- CI workflow `.github/workflows/check-version.yml` validates version sync, format, and non-regression on PRs

## Admin Experience — Non-Technical User First

Mosque administrators (imams, board members, community volunteers) are often **not tech-savvy**. Every admin-facing surface must be designed with this in mind:

- **Zero jargon** — use plain language everywhere ("Add an announcement" not "Create a record")
- **Guided flows** — step-by-step wizards for complex tasks, not raw forms
- **Sensible defaults** — pre-fill dates, times, calculation methods; minimize required fields
- **Inline help** — brief contextual hints on every form field explaining what it does
- **Forgiving input** — accept times in any reasonable format, auto-correct obvious mistakes
- **Confirmation dialogs** — always confirm before destructive actions (delete, unpublish)
- **Visual feedback** — clear success/error states with human-readable messages, not codes
- **Mobile-first admin** — admin features must work on phones, not just desktop browsers
- **Minimal training** — a volunteer who has never used the app should be able to post an announcement within 60 seconds of opening the admin panel

This principle applies to Django admin customizations, in-app admin screens, and any mosque management flows.

## Code Conventions

### General
- TypeScript strict mode — no `any` types
- Functional components only, no class components
- Named exports (not default exports) for components
- Use `const` arrow functions for components: `export const PrayerCard = () => {}`
- Colocate styles with components using StyleSheet.create()
- All user-facing strings via i18n `t()` calls — never hardcode display text (English only for MVP)

### Naming
- Components: PascalCase (`PrayerTimeCard.tsx`)
- Hooks: camelCase with `use` prefix (`usePrayerTimes.ts`)
- Utilities: camelCase (`formatPrayerTime.ts`)
- Constants: SCREAMING_SNAKE_CASE
- Files match their primary export name

### State Management
- React Context for global state (theme, user preferences, subscriptions)
- Local state with useState/useReducer for component state
- No Redux — keep it simple
- expo-sqlite for persistent offline cache

### Error Handling
- Validate at system boundaries only (API responses, user input)
- Use try/catch around API calls and notification scheduling — always log to Sentry with context
- Show user-friendly error states, not raw errors
- Offline-first: gracefully degrade when network unavailable
- **Error boundaries**: Tab navigator wrapped in `Sentry.ErrorBoundary` with `ErrorFallback` component
- **No silent catches** — all catch blocks must either log to Sentry or have a comment justifying silence

### Pagination
- All list endpoints use DRF `PageNumberPagination` (50 items per page)
- API client returns `{ items, totalItems, hasMore }` from paginated endpoints
- Hooks expose `loadMore()` + `isLoadingMore` + `hasMore` for infinite scroll
- First page loads on mount; subsequent pages append via `loadMore()`

### Accessibility
- All interactive elements (Pressable, TouchableOpacity) must have `accessibilityRole` and `accessibilityLabel`
- Radio-style selectors use `accessibilityRole="radio"` with `accessibilityState={{ selected }}`
- Toggle buttons include `accessibilityState={{ expanded }}` where applicable
- FAB menu items use `accessibilityRole="menuitem"`
- All accessibility labels use i18n `t()` calls — never hardcode English

### Offline-First Strategy
- Prayer times: Aladhan API is the **primary source** when online; adhan-js is the **offline-only fallback** — never the primary
- Cache prayer times, announcements, and events in AsyncStorage
- Queue actions (subscription changes) when offline, sync when back online
- Show stale data with "last updated" indicator rather than empty screens
- **Stale cache capped at 7 days** — `allowStale` mode in `getCachedData()` enforces `MAX_STALE_AGE_MS` to prevent serving months-old data
- Stale cache race condition prevented with `hasFreshDataRef` pattern in hooks

## Important Notes
- **Primary prayer times**: Aladhan API (free, no key required) — `GET https://api.aladhan.com/v1/timings/{date}?latitude={lat}&longitude={lng}&method={method}`
- **Offline fallback only**: adhan-js calculates locally from coordinates when network is unavailable — never used as primary source
- **All times respect user's local timezone** and 12h/24h device locale — `parseTimeString` validates input and falls back gracefully on malformed Aladhan responses
- **Django backend** is self-hosted on Digital Ocean (same pattern as Orphanages project)
- **Expo managed workflow** — no native code ejection for MVP
- **Never hardcode prayer times** — always calculate from coordinates + date + method
- Calculation methods: Umm Al-Qura
- Announcements fetched via REST API with pull-to-refresh (no realtime subscriptions)
- Prayer reminders use local scheduled notifications (not server-pushed)
- **API client**: `lib/api.ts` wraps all Django REST calls with token auth
- **Error tracking**: Sentry (`@sentry/react-native`) — all catch blocks log with context metadata
- **Rate limiting**: Content creation endpoints (announcements, events) throttled via `ContentCreationRateThrottle`; auth endpoints at 5/min; nearby at 30/min
- **Gunicorn**: 2 workers, 2 threads, 30s timeout, 1000 max requests with jitter
- **Admin panel**: Django admin with Unfold theme at `/admin/` (Sacred Blue brand colors)

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

**Available skills:** `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`
