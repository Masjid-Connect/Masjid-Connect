<h1 align="center">
  <br>
  <sub>بسم الله الرحمن الرحيم</sub>
  <br><br>
  <img src="assets/images/splash-mosque.png" alt="Mosque Connect — Islamic Geometric Arabesque" width="280" />
  <br><br>
  Mosque Connect
  <br>
  <sup><sub>صِلَة المسجد</sub></sup>
</h1>

<p align="center">
  <em>A serene, premium mobile experience for local mosque communities.</em>
  <br>
  <em>Prayer times. Announcements. Events. One beautiful app.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-55-000020?style=flat-square&logo=expo" alt="Expo SDK 55" />
  <img src="https://img.shields.io/badge/React_Native-0.83-61DAFB?style=flat-square&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Django_5-DRF-092E20?style=flat-square&logo=django" alt="Django REST Framework" />
  <img src="https://img.shields.io/badge/License-MIT-C8A951?style=flat-square" alt="MIT License" />
</p>

<br>

<p align="center">
  <code>god-tier, not SaaS</code> — rooted in Islamic geometric art and calligraphic tradition
</p>

---

<br>

## The Vision

Most mosque apps feel like an afterthought — generic Material UI shells with hardcoded prayer times and clip-art minarets. **Mosque Connect** is different.

Every pixel draws from centuries of Islamic artistic tradition: the deep blues of İznik tilework, the warm gold of gilded Quranic manuscripts, the terracotta warmth of the Alhambra. Typography pairs classical Arabic Kufic script with refined Latin serifs. Animations breathe with spring physics, never the harsh linearity of factory software.

This is an app your community _deserves_.

<br>

### The Convergent Arch — Brand Identity

The mark is a single, unbroken line that simultaneously suggests two things: the **mihrab niche** (inward-curving base) and the **dome** (outward arc at top). The two curves meet at a single elevated apex — a matte **gold leaf node** that is not decoration, but a structural point of convergence.

```
            ╭── gold node ──╮
            │       •       │
           ╱                 ╲       The SVG path:
          ╱    dome curve     ╲      M 20 130 C 35 108, 28 48, 50 10
         │                     │     C 72 48, 65 108, 80 130
          ╲  mihrab curve    ╱
           ╲               ╱        viewBox: 0 0 100 140
            ╰             ╯         Apex: (50, 10)
```

**The Animated Splash (The Reveal):**
1. Pure Kozo paper background for 1 second. Silence.
2. Haptic `impact(Medium)`. Line draws in Sacred Blue over 1.5s.
3. Microscopic pause. Gold node fades in with spring physics.
4. App content crossfades in.

**Material language:** The substrate is Kozo paper — Japanese mulberry paper with barely-visible organic fiber texture. The line feels etched. The gold has the soft quality of burnished gold leaf. Notification badges are Divine Gold, never red.

<br>

### Splash Screen

<p align="center">
  <img src="assets/images/splash-mosque.png" alt="Splash Screen — Islamic geometric arabesque in Sacred Blue and Divine Gold on Warm Ivory" width="320" />
</p>

<p align="center">
  <sub>Islamic geometric arabesque — Sacred Blue <code>#1B4965</code> · Divine Gold <code>#C8A951</code> · Warm Ivory <code>#FAF7F2</code></sub>
  <br>
  <sub>Used as the app splash screen, app icon, and adaptive icon across all platforms.</sub>
</p>

<br>

## Features

<table>
<tr>
<td width="50%" valign="top">

### 🕌 Prayer Times  ·  أوقات الصلاة
- Aladhan API (primary) with adhan-js offline-only fallback
- Next prayer countdown with golden glow
- Hijri date display alongside Gregorian
- 5 calculation methods (ISNA, MWL, Umm Al-Qura, Egyptian, Karachi)
- Brand mark in header, Kozo paper background

</td>
<td width="50%" valign="top">

### 📢 Announcements  ·  إعلانات
- Feed via Django REST API with pull-to-refresh
- Urgent announcements pinned with terracotta badge
- Multi-mosque support — see updates from all your communities
- Bismillah empty state (not a sad face icon)

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📅 Events & Lessons  ·  الفعاليات والدروس
- Calendar + list view toggle
- 6 category filters with color-coded badges
- Speaker, time, location, recurring indicators
- Tap to expand, add to device calendar

</td>
<td width="50%" valign="top">

### ⚙️ Settings  ·  الإعدادات
- GPS location detection for accurate prayer times
- Per-mosque notification preferences
- Reminder timing: at athan, 5/10/15/30 min before
- 12h/24h time format, dark mode, RTL-ready

</td>
</tr>
</table>

<br>

## Design System

> _"Geometry is the language in which God has written the universe."_

### Palette — From Islamic Architectural Tradition

```
  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  │   ██████  Warm Ivory      #FAF7F2   Aged parchment         │
  │   ██████  Sacred Blue     #1B4965   İznik tilework          │
  │   ██████  Divine Gold     #C8A951   Gilded manuscripts      │
  │   ██████  Paradise Green  #2D6A4F   Garden of paradise      │
  │   ██████  Terracotta      #C44536   Alhambra clay           │
  │   ██████  Deep Charcoal   #2B2D42   Calligraphic ink        │
  │   ██████  Soft Stone      #E8E4DE   Carved marble           │
  │                                                             │
  │   Dark Mode                                                 │
  │   ██████  Night Sky       #0D1117                           │
  │   ██████  Muted Gold      #B8952E                           │
  │   ██████  Soft White      #E6E1D8                           │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
```

### Typography

| Context | Arabic | Latin |
|---------|--------|-------|
| **Headings** | Reem Kufi — geometric Kufic | Playfair Display — editorial serif |
| **Body** | Noto Naskh Arabic — elegant naskh | Source Serif 4 — warm readability |
| **Numbers** | Tabular lining figures | System monospace |

### Depth — Muqarnas-Inspired 3-Tier System

```
  ╔══════════════════════════════╗  ← Floating    shadow 0 8 24  (modals, active prayer)
  ║                              ║
  ║   ┌──────────────────────┐   ║  ← Elevated   shadow 0 2 8   (cards, inputs)
  ║   │                      │   ║
  ║   │   ░░░░░░░░░░░░░░░░   │   ║  ← Ground     no shadow      (background, dividers)
  ║   │                      │   ║
  ║   └──────────────────────┘   ║
  ║                              ║
  ╚══════════════════════════════╝
```

### Spacing — 8pt Grid, Generous Whitespace

```
  xs ·    4px   Inline icon gaps
  sm ··   8px   Tight element spacing
  md ···  16px  Default padding
  lg ···· 24px  Section spacing
  xl ····· 32px  Screen padding
  2xl ······ 48px  Section separation
  3xl ······· 64px  Major visual breaks
```

> 30–50% more padding than typical apps. Let the content breathe.

<br>

## Architecture

```
                    ┌──────────────────────────┐
                    │     Digital Ocean         │
                    │     (via Coolify)         │
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │    Django 5 + DRF   │  │
                    │  │    ─────────────    │  │
                    │  │    PostgreSQL       │  │
                    │  │    Token Auth       │  │
                    │  │    REST API         │  │
                    │  │    Unfold Admin     │  │
                    │  │    Push signals     │  │
                    │  └────────┬───────────┘  │
                    │           │ :8000        │
                    └───────────┼──────────────┘
                                │
                        HTTPS   │   Let's Encrypt
                                │
              ┌─────────────────┴──────────────────┐
              │          Mosque Connect App          │
              │                                      │
              │  ┌────────┐ ┌────────┐ ┌──────────┐ │
              │  │ Prayer │ │ Announ │ │  Events  │ │
              │  │ Times  │ │ cements│ │ /Lessons │ │
              │  └───┬────┘ └───┬────┘ └────┬─────┘ │
              │      │          │           │        │
              │  ┌───┴──────────┴───────────┴─────┐ │
              │  │       Service Layer             │ │
              │  │                                 │ │
              │  │  Aladhan API → Prayer Times     │ │
              │  │  adhan-js   → Offline Fallback  │ │
              │  │  Django API → Data (REST)       │ │
              │  │  AsyncStorage → Offline Cache   │ │
              │  │  Expo Notifs → Reminders        │ │
              │  └─────────────────────────────────┘ │
              └──────────────────────────────────────┘
```

<br>

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | React Native + Expo SDK 55 | Single codebase, managed workflow, OTA updates |
| **Navigation** | Expo Router | File-based routing, deep links, typed routes |
| **Backend** | Django 5 + DRF (self-hosted) | Python, PostgreSQL, token auth, Unfold admin UI |
| **Prayer Times** | Aladhan API (primary) + adhan-js (offline fallback) | API for accuracy + Hijri dates; local calc when no network |
| **Notifications** | Expo Notifications | Abstracts FCM/APNs, local scheduling |
| **Storage** | AsyncStorage | Offline-first caching layer |
| **Animations** | Reanimated | 60fps spring physics on the UI thread |
| **SVG / Brand** | react-native-svg | Convergent Arch mark, Kozo paper textures |
| **Haptics** | expo-haptics | Splash reveal, meaningful interaction feedback |
| **Dates** | date-fns | Lightweight, tree-shakeable formatting |
| **Language** | TypeScript (strict) | Zero `any` types, full inference |

<br>

## Project Structure

```
mosque-connect/
├── app/                          # Expo Router — file-based screens
│   ├── _layout.tsx               # Root layout (themes, fonts, AnimatedSplash)
│   ├── +not-found.tsx            # 404 screen
│   └── (tabs)/                   # Bottom tab navigator
│       ├── _layout.tsx           # Tab bar config (BrandTabIcon on home)
│       ├── index.tsx             # ☪ Prayer Times (home)
│       ├── announcements.tsx     # 📢 Community announcements
│       ├── events.tsx            # 📅 Events & lessons calendar
│       └── settings.tsx          # ⚙ Preferences & mosque selection
│
├── components/                   # Reusable UI components
│   ├── brand/                    # Brand identity system (Convergent Arch)
│   │   ├── ConvergentArch.tsx    # SVG mark — arch line + gold node
│   │   ├── AnimatedSplash.tsx    # Splash reveal (vector-draw + spring)
│   │   ├── BrandTabIcon.tsx      # Tab icon with gold illumination
│   │   ├── GoldBadge.tsx         # Divine Gold notification badge
│   │   └── index.ts             # Re-exports
│   └── ui/                       # Base design system components
│       └── KozoPaperBackground.tsx # Kozo paper fiber texture
│
├── lib/                          # Core services
│   ├── api.ts                    # Django REST API client (auth, CRUD)
│   ├── prayer.ts                 # Aladhan API + adhan-js offline fallback
│   ├── notifications.ts          # Push tokens, prayer reminders
│   └── storage.ts                # AsyncStorage cache layer
│
├── hooks/                        # React hooks
│   ├── usePrayerTimes.ts         # Prayer data, countdown, Hijri date
│   ├── useAnnouncements.ts       # Feed + pull-to-refresh
│   └── useEvents.ts              # Events + category filtering
│
├── constants/                    # Design tokens
│   ├── Colors.ts                 # Islamic palette (light + dark)
│   └── Theme.ts                  # Spacing, elevation, typography, brand tokens
│
├── types/                        # TypeScript definitions
│   └── index.ts                  # Mosque, Announcement, Event, Prayer types
│
├── assets/                       # Static resources
│   ├── fonts/                    # SpaceMono (+ Arabic/serif fonts to add)
│   └── images/                   # App icons, splash screen
│
├── BUILD_PROMPT.md               # Comprehensive build specification
├── ARCHITECTURE.md               # Backend, deployment, push notifications
├── CLAUDE.md                     # AI development conventions & brand identity
└── .env.example                  # Environment template
```

<br>

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npx expo`)
- iOS Simulator (macOS) or Android Emulator, or Expo Go on a physical device

### Installation

```bash
# Clone the repository
git clone https://github.com/Masjid-Connect/Masjid-Connect.git
cd Masjid-Connect

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
```

### Development

```bash
# Start the dev server
npx expo start

# Or target a specific platform
npx expo start --ios
npx expo start --android
npx expo start --web

# Clear cache if needed
npx expo start --clear
```

### Type Checking

```bash
npx tsc --noEmit
```

<br>

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Django REST API base URL | `https://api.mosqueconnect.app/api/v1` |

<br>

## Prayer Time Calculation

Mosque Connect uses a two-tier approach to ensure prayer times are always available:

```
┌─────────────────────────────────────────────────┐
│  1. Aladhan API  (PRIMARY — always preferred)   │
│     GET /v1/timings/{date}                      │
│     ?latitude={lat}&longitude={lng}&method={m}  │
│     → Accurate times + Hijri date               │
│     → Free, no API key required                 │
├─────────────────────────────────────────────────┤
│  2. adhan-js     (OFFLINE FALLBACK ONLY)        │
│     Local calculation from GPS coordinates      │
│     → Used only when network is unavailable     │
│     → Never used as primary source              │
└─────────────────────────────────────────────────┘
```

**Supported calculation methods:**

| Method | Code | Common In |
|--------|------|-----------|
| ISNA | 2 | North America |
| Muslim World League | 3 | Europe, Far East |
| Umm Al-Qura | 4 | Saudi Arabia |
| Egyptian | 5 | Africa, Middle East |
| Karachi | 1 | Pakistan, South Asia |

<br>

## Offline-First Philosophy

> _The app should work in a basement with no signal just as well as on fiber._

1. **Prayer times** — Aladhan API is the **primary source** when online; adhan-js is the **offline-only fallback** for when there is no network. Cached in AsyncStorage.
2. **Cache everything** — announcements and events stored in AsyncStorage with date stamps
3. **Stale is better than empty** — show cached data with a "Last updated" indicator
4. **Queue and sync** — subscription changes queue locally, sync when connectivity returns

<br>

## Backend — Django REST Framework

<details>
<summary><strong>View full schema</strong></summary>

<br>

**`Mosque`** — Registered mosque profiles
```
id (UUID), name, address, city, state, country,
latitude, longitude, calculation_method,
jumua_time, contact_phone, contact_email, website, photo
```

**`Announcement`** — Community updates
```
id (UUID), mosque FK, title, body, priority (normal|urgent),
published_at, expires_at, author FK
```

**`Event`** — Lessons, lectures, community events
```
id (UUID), mosque FK, title, description, speaker,
event_date, start_time, end_time, location,
recurring (weekly|monthly|blank),
category (lesson|lecture|quran_circle|youth|sisters|community),
author FK
```

**`UserSubscription`** — Per-mosque notification preferences
```
id (UUID), user FK, mosque FK,
notify_prayers, notify_announcements, notify_events,
prayer_reminder_minutes (default: 15)
```

**`PushToken`** — Device push notification tokens
```
id (UUID), user FK, token (Expo push token, unique), platform (ios|android)
```

**`MosqueAdmin`** — Admin access control
```
id (UUID), mosque FK, user FK, role (admin|super_admin)
```

</details>

<br>

## Design Principles

| Principle | Implementation |
|-----------|---------------|
| **God-tier, not SaaS** | No generic Material/iOS chrome. Custom Islamic aesthetic throughout. |
| **The Convergent Arch** | Single continuous line (mihrab + dome) with gold node. Lives in splash, tab bar, headers. |
| **Kozo paper substrate** | Warm Ivory background with barely-visible organic fiber texture. |
| **Divine Gold, not red** | Notification badges are gold — a glint of light, not an error. |
| **Breathe** | 30–50% more whitespace than typical apps. Content first. |
| **Spring physics** | Reanimated springs (damping 15–20). Never linear easing. |
| **Meaningful motion** | Splash reveal, prayer card glow, gold node illumination on tab focus. |
| **Haptic vocabulary** | Light tap for nav, medium for splash reveal / prayer alert, heavy for urgent. |
| **RTL-native** | Built for Arabic from day one. Layouts flip automatically. |
| **Offline-first** | Aladhan API primary, adhan-js fallback. Always functional. |
| **Admin-friendly** | Mosque admins are often non-technical. Zero jargon, guided flows, 60-second time-to-first-post. |

<br>

## Roadmap

- [x] Expo project scaffold with TypeScript
- [x] Islamic design system (colors, spacing, elevation, typography)
- [x] Prayer times screen with Aladhan API + adhan-js offline fallback
- [x] Announcements feed with pull-to-refresh
- [x] Events calendar with category filters
- [x] Settings (location, method, reminders, time format)
- [x] Django REST API backend with full CRUD
- [x] Django admin with Unfold theme (Sacred Blue brand)
- [x] Push notification infrastructure
- [x] Offline-first storage layer
- [x] Convergent Arch brand identity (SVG mark, animated splash, tab icon, gold badge)
- [x] Kozo paper texture background system
- [ ] Custom Arabic/serif font loading (Reem Kufi, Playfair Display)
- [ ] Django deployment on Coolify
- [ ] User authentication flow (sign up / sign in)
- [ ] Mosque search & nearby detection
- [ ] Admin panel for mosque managers (non-technical-admin-first: guided flows, zero jargon, 60s to first post)
- [ ] Notification sound customization (oud, ney, riq)
- [ ] i18n (English ↔ Arabic)
- [ ] EAS Build for TestFlight & Play Store

<br>

## Contributing

Contributions are welcome and deeply appreciated. Whether you're fixing a typo or building a major feature, you're helping mosques serve their communities better.

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes, then
npx tsc --noEmit          # Ensure no type errors
git commit -m "Add meaningful description"
git push origin feature/your-feature-name
```

<br>

## License

MIT — free for all mosques, everywhere.

<br>

---

<p align="center">
  <sub>Built with ❤️ for the ummah</sub>
  <br>
  <sub>اللهم تقبل منا</sub>
</p>
