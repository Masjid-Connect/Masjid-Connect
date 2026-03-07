# Mosque Connect — CLAUDE.md

## Project Overview
Mosque Connect is a premium mobile app serving local mosque communities with prayer time notifications, event/lesson listings, and community announcements. The design philosophy is **god-tier, not SaaS** — a serene, premium experience rooted in Islamic geometric art and calligraphic tradition.

## Tech Stack
- **Framework**: React Native + Expo (SDK 55, managed workflow, TypeScript)
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Django 5 + Django REST Framework (self-hosted on Digital Ocean)
- **Prayer Times**: Aladhan API (primary, free, no key required) + `adhan` (adhan-js, offline-only fallback)
- **Push Notifications**: Expo Notifications + Expo Push Service
- **Local Storage**: expo-sqlite for offline-first caching
- **Animations**: react-native-reanimated
- **SVG**: react-native-svg (brand mark, textures)
- **Haptics**: expo-haptics (splash reveal, meaningful interactions)
- **Date Handling**: date-fns
- **Language**: TypeScript (strict mode)

## Project Structure
```
/app                    # Expo Router file-based routes
  /(tabs)/              # Tab navigator
    index.tsx           # Prayer Times (home tab)
    announcements.tsx   # Announcements feed
    events.tsx          # Events/lessons calendar
    settings.tsx        # Settings & preferences
  /_layout.tsx          # Root layout
/components             # Reusable UI components
  /brand                # Brand identity system (Convergent Arch)
    ConvergentArch.tsx  # The SVG mark — single continuous arch line + gold node
    AnimatedSplash.tsx  # Splash screen with vector-draw reveal animation
    BrandTabIcon.tsx    # Tab bar icon with gold node illumination
    GoldBadge.tsx       # Divine Gold notification badge (not red)
    index.ts            # Re-exports for clean imports
  /ui                   # Base design system components
    KozoPaperBackground.tsx  # Kozo paper texture substrate
  /prayer               # Prayer time components
  /announcements        # Announcement components
  /events               # Event components
/lib                    # Utilities and services
  /api.ts               # Django REST API client (auth, mosques, announcements, events, subscriptions)
  /prayer.ts            # Aladhan API + adhan-js offline fallback
  /notifications.ts     # Push notification logic
  /storage.ts           # Offline cache (AsyncStorage)
/hooks                  # Custom React hooks
/constants              # App constants, enums
/assets                 # Fonts, images, patterns, sounds
  /fonts                # Reem Kufi, Noto Naskh Arabic, Playfair Display, Source Serif 4
  /patterns             # Islamic geometric SVG patterns
  /sounds               # Oud, ney, riq notification sounds
```

## Brand Identity — The Convergent Arch

### The Mark
The central element is a single, unbroken line that simultaneously suggests two things:

- **The Mihrab Niche**: A subtle, inward-curving arch at the base, representing the individual's quiet direction and focus.
- **The Dome**: The line flows upward, arcing to create a simplified suggestion of a dome's interior, representing the community gathered under one roof.

The two curves meet at a single elevated point — the **apex** — creating a unified form that feels both ancient and utterly modern. It is an abstract architectural section, not a literal building.

### Material & Execution
The execution is more crucial than the form. This isn't a digital graphic; it's a rendering of a physical object.

- **The Substrate**: Not just `#FAF7F2`. A digital interpretation of **Kozo paper** — Japanese mulberry paper known for its incredible strength, long fibers, and subtle natural luster. The `KozoPaperBackground` component renders this with barely-visible organic fiber texture.
- **The Line Work**: A single, continuous line in Sacred Blue (`#1B4965`). Consistent weight, suggesting precision and engineering. It feels etched.
- **The Gilding**: At the apex where the two curves meet — a single, matte **gold leaf node** (`#C8A951`). Not decoration; a structural pin, a point of convergence. The gold has the soft, non-reflective quality of gold leaf burnished into paper.
- **The Depth**: A blind emboss sensibility. Soft ambient lighting from above creates the faintest shadows. The gold node sits atop the surface, the only element with its own materiality.

### The Living Identity System

**Animated Splash Screen (The Reveal):**
1. Pure, unadorned Kozo paper background for 1 second. Silence.
2. Haptic `impact(Medium)` triggers. The hair-thin line draws in Sacred Blue over 1.5s — a vector draw, as if an invisible hand traces the geometry.
3. Microscopic pause at completion.
4. Matte gold node fades in at the apex with a soft `spring()` animation.
5. App content subtly fades in around it.

**Tab Bar Icon:**
The full mark at thinnest possible line weight in muted Sacred Blue. Sits quietly. When selected, the gold node gently illuminates and the mark scales subtly.

**Notification Badge:**
A tiny, perfect circle. Not red. **Divine Gold**. Not an error; a glint of light catching attention. A small, precious seal.

**Typography Integration:**
Prayer time numerals use `tabular-nums` font variant with thin, confident weight — designed to feel like an extension of the mark's line work.

### SVG Architecture
The mark is defined as a single cubic Bézier path:
```
M 20 130 C 35 108, 28 48, 50 10 C 72 48, 65 108, 80 130
```
- viewBox: `0 0 100 140`
- Apex (gold node): `(50, 10)`
- Approximate path length: `280` viewBox units
- All components reference constants from `ConvergentArch.tsx`

### Brand Tokens (in `Theme.ts`)
```ts
brand.splash.*       // Animation timing constants
brand.stroke.*       // Line weights per context (splash, tabBar, header)
brand.node.*         // Gold node radii per context
brand.tabIcon.size   // Tab bar icon height
brand.badge.*        // Notification badge sizing
```

## Design System

### Color Palette (from Islamic architectural tradition)
- **Warm Ivory** `#FAF7F2` — Kozo paper substrate
- **Sacred Blue** `#1B4965` — the etched line of the mark (Iznik tile blue)
- **Divine Gold** `#C8A951` — the matte gold leaf node (gilded manuscript)
- **Paradise Green** `#2D6A4F` — success states, prayer indicators (garden of paradise)
- **Moorish Terracotta** `#C44536` — urgent/alert states (Alhambra clay)
- **Deep Charcoal** `#2B2D42` — secondary text
- **Soft Stone** `#E8E4DE` — dividers, card backgrounds

### Typography
- **Arabic**: Reem Kufi (headings), Noto Naskh Arabic (body)
- **English**: Playfair Display (headings), Source Serif 4 (body)
- System monospace for times/numbers
- `tabular-nums` font variant for prayer times — thin, confident, extension of mark line work

### Design Principles
- 30–50% more padding than typical apps (generous whitespace)
- Muqarnas-inspired 3-tier depth system (ground/elevated/floating)
- RTL-native from day one
- Spring-based animations (Reanimated), no linear easing
- Haptic feedback on meaningful interactions (splash reveal, prayer transitions)
- No generic Material/iOS chrome — custom Islamic aesthetic throughout
- Kozo paper texture on light-mode backgrounds via `KozoPaperBackground`
- Notification badges are Divine Gold, never red — a glint, not an error
- Brand mark appears in prayer times header and as the home tab icon

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

GET  /health/                        # Health check
GET  /admin/                         # Django admin (Unfold theme)
```

### Django Models
- **User** — UUID PK, extends AbstractUser with `name` field
- **Mosque** — name, address, city, state, country, lat/lng, calculation_method, jumua_time, contact info, photo
- **Announcement** — mosque FK, title, body, priority (normal/urgent), published_at, expires_at, author FK
- **Event** — mosque FK, title, description, speaker, event_date, start/end_time, recurring (weekly/monthly), category (lesson/lecture/quran_circle/youth/sisters/community)
- **UserSubscription** — user FK, mosque FK, notify_prayers/announcements/events, prayer_reminder_minutes
- **PushToken** — user FK, token (unique), platform (ios/android)
- **MosqueAdmin** — mosque FK, user FK, role (admin/super_admin)

### Backend Commands
```bash
cd backend
pip install -r requirements.txt       # Install dependencies
python manage.py migrate              # Run migrations
python manage.py seed_data            # Seed sample data
python manage.py createsuperuser      # Create admin user
python manage.py runserver            # Start dev server (port 8000)
```

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
- All user-facing strings should support i18n (English + Arabic at minimum)

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
- Use try/catch around API calls and notification scheduling
- Show user-friendly error states, not raw errors
- Offline-first: gracefully degrade when network unavailable

### Offline-First Strategy
- Prayer times: Aladhan API is the **primary source** when online; adhan-js is the **offline-only fallback** — never the primary
- Cache prayer times, announcements, and events in AsyncStorage
- Queue actions (subscription changes) when offline, sync when back online
- Show stale data with "last updated" indicator rather than empty screens

## Important Notes
- **Primary prayer times**: Aladhan API (free, no key required) — `GET https://api.aladhan.com/v1/timings/{date}?latitude={lat}&longitude={lng}&method={method}`
- **Offline fallback only**: adhan-js calculates locally from coordinates when network is unavailable — never used as primary source
- **All times respect user's local timezone** and 12h/24h device locale
- **Django backend** is self-hosted on Digital Ocean (same pattern as Orphanages project)
- **Expo managed workflow** — no native code ejection for MVP
- **Never hardcode prayer times** — always calculate from coordinates + date + method
- Calculation methods: Umm Al-Qura
- Announcements fetched via REST API with pull-to-refresh (no realtime subscriptions)
- Prayer reminders use local scheduled notifications (not server-pushed)
- **API client**: `lib/api.ts` wraps all Django REST calls with token auth
- **Admin panel**: Django admin with Unfold theme at `/admin/` (Sacred Blue brand colors)
