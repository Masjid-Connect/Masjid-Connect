# Mosque Connect — CLAUDE.md

> **Governing Doctrine**: See [DOCTRINE.md](./DOCTRINE.md) for non-negotiable project rules. All development must comply.

## Project Overview
Mosque Connect is a premium mobile app serving local mosque communities with prayer time notifications, event/lesson listings, and community announcements. The design philosophy is **god-tier, not SaaS** — a serene, premium experience rooted in Islamic geometric art and calligraphic tradition.

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
- **i18n**: i18next + react-i18next (English + Arabic, RTL-ready)
- **Language**: TypeScript (strict mode)
- **CI/CD**: GitHub Actions (TypeScript check, ESLint, Jest, Django tests)

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
  /brand                # Brand identity components
    AnimatedSplash.tsx  # Splash screen animation
    GoldBadge.tsx       # Divine Gold notification badge (not red)
    index.ts            # Re-exports for clean imports
  /ui                   # Base design system components
    BottomSheet.tsx      # Spring-animated bottom sheet (replaces centered modals)
  /prayer               # Prayer time components
  /announcements        # Announcement components
  /events               # Event components
/lib                    # Utilities and services
  /api.ts               # Django REST API client (auth, mosques, announcements, events, subscriptions)
  /prayer.ts            # Aladhan API + adhan-js offline fallback
  /notifications.ts     # Push notification logic
  /storage.ts           # Offline cache (AsyncStorage)
  /i18n.ts              # i18next initialization (en + ar)
  /rtl.ts               # RTL layout configuration
/hooks                  # Custom React hooks
/constants              # App constants, enums
  /locales/en.json      # English translations (100+ keys)
  /locales/ar.json      # Arabic translations (100+ keys)
/assets                 # Fonts, images, patterns, sounds
  /fonts                # SpaceMono (system fonts used for all other text)
  /patterns             # Islamic geometric SVG patterns
  /sounds               # Oud, ney, riq notification sounds
```

## Brand Identity

The app uses the **Masjid_Logo.png** (The Salafi Masjid logo with transparent background) as the primary brand mark. It appears on the welcome screen, auth screens, and splash screen. No custom SVG brand mark — the logo PNG is the identity.

**Notification Badge:** Divine Gold circle, never red.

**Typography:** Prayer time numerals use `tabular-nums` font variant with confident weight.

## Design System

### Color Palette (Apple-inspired with Islamic soul)

**Light mode — "Morning Light in the Musalla":**
- **Limestone** `#F8F6F1` — warm ivory substrate
- **Limestone Secondary** `#F2EFEA` — grouped backgrounds
- **Ink** `#1C1C1E` — primary text (true near-black)
- **Ink Secondary** `#636366` — secondary text
- **Sacred Blue** `#1A5276` — primary tint, tab selection
- **Divine Gold** `#BFA14E` — accent, prayer active indicator, notification badges
- **Paradise Green** `#2D6A4F` — success states
- **Moorish Terracotta** `#C44536` — urgent/alert states
- **Separator** `#E5E5EA` — hairline dividers

**Dark mode — "Midnight in the Masjid" (true black OLED):**
- **Background** `#000000` — true black for OLED efficiency
- **Elevated** `#1C1C1E` — card surfaces, modal backgrounds
- **Grouped** `#2C2C2E` — grouped list backgrounds
- **Text** `#F5F5F7` — snow white primary text
- **Tint** `#6AADDB` — lighter Sacred Blue for dark backgrounds
- **Accent** `#D4B85C` — brighter Divine Gold for dark contrast

### Typography (Apple HIG Type Scale)
- **System fonts** — SF Pro (iOS) / Roboto (Android) with weight variation, no custom font loading
- **14 named styles**: largeTitle (34/700), title1 (28/700), title2 (22/700), title3 (20/600), headline (17/600), body (17/400), callout (16/400), subhead (15/400), footnote (13/400), caption1 (12/400), caption2 (11/400)
- **Special purpose**: prayerCountdown (54/200, ultralight), prayerTime (17/600), sectionHeader (13/600, uppercase + letter-spacing)
- **Arabic**: System Arabic fonts (SF Arabic / Noto) with mirrored scale
- `tabular-nums` font variant for prayer times
- SpaceMono for technical accents only

### Design Principles
- **Apple HIG influence** — system fonts, SF-style type scale, grouped list patterns, checkmarks over radio buttons
- Generous whitespace — 32px screen-edge insets (`spacing['3xl']`)
- 3-tier elevation system: none/sm/md/lg (black shadows only, Apple convention)
- RTL-native from day one via `I18nManager.forceRTL()`
- Spring-based animations (Reanimated `springs.gentle/snappy/bouncy`), no linear easing
- **BottomSheet pattern** — spring-animated, gesture-dismissible sheets replace all centered modals
- Haptic feedback on meaningful interactions (prayer transitions)
- **Ionicons** (outline/filled pairs) for tab bar and UI icons — no FontAwesome
- Notification badges are Divine Gold, never red — a glint, not an error
- **i18n throughout** — all user-facing strings via `t()` calls, English + Arabic locale files

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

GET  /api/schema/                     # OpenAPI schema (drf-spectacular)
GET  /api/docs/                      # Swagger UI (interactive API docs)

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
- All user-facing strings via i18n `t()` calls — never hardcode display text (English + Arabic)

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
