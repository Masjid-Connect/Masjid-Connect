# Mosque Connect — CLAUDE.md

## Project Overview
Mosque Connect is a premium mobile app serving local mosque communities with prayer time notifications, event/lesson listings, and community announcements. The design philosophy is **god-tier, not SaaS** — a serene, premium experience rooted in Islamic geometric art and calligraphic tradition.

## Tech Stack
- **Framework**: React Native + Expo (SDK 52+, managed workflow, TypeScript)
- **Navigation**: Expo Router (file-based routing)
- **Backend**: PocketBase (self-hosted on Digital Ocean droplet via Coolify)
- **Prayer Calculation**: `adhan` (adhan-js) — offline calculation, no external API dependency
- **Push Notifications**: Expo Notifications + Expo Push Service
- **Local Storage**: expo-sqlite for offline-first caching
- **Animations**: react-native-reanimated
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
  /ui                   # Base design system components
  /prayer               # Prayer time components
  /announcements        # Announcement components
  /events               # Event components
/lib                    # Utilities and services
  /pocketbase.ts        # PocketBase client & helpers
  /prayer.ts            # adhan-js prayer calculation
  /notifications.ts     # Push notification logic
  /storage.ts           # Offline cache (expo-sqlite)
  /theme.ts             # Design tokens & theme
/hooks                  # Custom React hooks
/constants              # App constants, enums
/assets                 # Fonts, images, patterns, sounds
  /fonts                # Reem Kufi, Noto Naskh Arabic, Playfair Display, Source Serif 4
  /patterns             # Islamic geometric SVG patterns
  /sounds               # Oud, ney, riq notification sounds
```

## Design System

### Color Palette (from Islamic architectural tradition)
- **Warm Ivory** `#FAF7F2` — primary background (parchment)
- **Sacred Blue** `#1B4965` — primary text, headers (Iznik tile blue)
- **Divine Gold** `#C8A951` — accents, highlights (gilded manuscript)
- **Paradise Green** `#2D6A4F` — success states, prayer indicators (garden of paradise)
- **Moorish Terracotta** `#C44536` — urgent/alert states (Alhambra clay)
- **Deep Charcoal** `#2B2D42` — secondary text
- **Soft Stone** `#E8E4DE` — dividers, card backgrounds

### Typography
- **Arabic**: Reem Kufi (headings), Noto Naskh Arabic (body)
- **English**: Playfair Display (headings), Source Serif 4 (body)
- System monospace for times/numbers

### Design Principles
- 30–50% more padding than typical apps (generous whitespace)
- Muqarnas-inspired 3-tier depth system (ground/elevated/floating)
- RTL-native from day one
- Spring-based animations (Reanimated), no linear easing
- Haptic feedback on meaningful interactions
- No generic Material/iOS chrome — custom Islamic aesthetic throughout

## Backend — PocketBase Collections

### mosques
`id, name, address, city, latitude, longitude, calculation_method (int, default 2), jumua_time, contact_phone, website, created, updated`

### announcements
`id, mosque (rel→mosques), title, body, priority (normal|urgent), published_at, expires_at, author (rel→users)`

### events
`id, mosque (rel→mosques), title, description, speaker, event_date, start_time, end_time, location, recurring (null|weekly|monthly), category (lesson|lecture|quran_circle|youth|sisters|community), author (rel→users)`

### user_subscriptions
`id, user (rel→users), mosque (rel→mosques), notify_prayers, notify_announcements, notify_events, prayer_reminder_minutes (default 15)`

### push_tokens
`id, user (rel→users), token, platform (ios|android), created, updated`

### mosque_admins
`id, mosque (rel→mosques), user (rel→users), role (admin|super_admin)`

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
- Use try/catch around PocketBase calls and notification scheduling
- Show user-friendly error states, not raw errors
- Offline-first: gracefully degrade when network unavailable

### Offline-First Strategy
- Prayer times calculated locally with adhan-js — never depend on network for prayer times
- Cache announcements and events in expo-sqlite
- Queue actions (subscription changes) when offline, sync when back online
- Show stale data with "last updated" indicator rather than empty screens

## Important Notes
- **No external prayer API** — use adhan-js to calculate locally from coordinates
- **All times respect user's local timezone** and 12h/24h device locale
- **PocketBase is self-hosted** on the same Digital Ocean droplet as other services, deployed via Coolify
- **Expo managed workflow** — no native code ejection for MVP
- **Never hardcode prayer times** — always calculate from coordinates + date + method
- Calculation methods: ISNA (2), MWL (3), Umm Al-Qura (4), Egyptian (5), Karachi (1)
- Announcements update in real-time via PocketBase realtime subscriptions
- Prayer reminders use local scheduled notifications (not server-pushed)
