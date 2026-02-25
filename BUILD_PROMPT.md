# Mosque Connect — Build Prompt

## Vision
Build a premium mobile app called **Mosque Connect** using React Native with Expo and PocketBase as the self-hosted backend. The app serves local mosque communities with prayer time notifications, event/lesson listings, and community announcements.

**Design philosophy**: God-tier, not SaaS. A serene, premium experience rooted in Islamic geometric art and calligraphic tradition. Better than an Apple experience.

---

## Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| Cross-platform framework | React Native + Expo (SDK 52+) | Single codebase → iOS, Android, web |
| Navigation | Expo Router | File-based routing, deep linking |
| Backend / Database | PocketBase (self-hosted) | Single Go binary, SQLite, realtime, auth, admin UI |
| Hosting | Digital Ocean droplet + Coolify | Self-hosted, full control, no vendor lock-in |
| Prayer calculation | adhan-js | Offline calculation, no external API dependency |
| Push notifications | Expo Notifications + Expo Push Service | Free, abstracts FCM/APNs |
| Local storage | expo-sqlite | Offline-first caching |
| Animations | react-native-reanimated | 60fps spring-based animations |
| Date handling | date-fns | Lightweight date formatting |
| Language | TypeScript (strict) | Type safety across frontend and backend |

---

## Design System

### Color Palette — Islamic Architectural Tradition

| Name | Hex | Inspiration | Usage |
|------|-----|-------------|-------|
| Warm Ivory | `#FAF7F2` | Aged parchment, limestone | Primary background |
| Sacred Blue | `#1B4965` | Iznik tilework, lapis lazuli | Primary text, headers |
| Divine Gold | `#C8A951` | Gilded Quranic manuscripts | Accents, highlights, active states |
| Paradise Green | `#2D6A4F` | Garden of paradise imagery | Success, prayer indicators |
| Moorish Terracotta | `#C44536` | Alhambra clay, zellige | Urgent/alert states |
| Deep Charcoal | `#2B2D42` | Calligraphic ink | Secondary text |
| Soft Stone | `#E8E4DE` | Carved marble | Dividers, card backgrounds |

### Dark Mode Palette

| Name | Hex | Usage |
|------|-----|-------|
| Night Sky | `#0D1117` | Background |
| Midnight Blue | `#161B22` | Card backgrounds |
| Muted Gold | `#B8952E` | Accents |
| Soft White | `#E6E1D8` | Primary text |

### Typography

**Arabic script:**
- Headings: **Reem Kufi** — geometric Kufic, bold architectural feel
- Body: **Noto Naskh Arabic** — elegant, highly readable

**Latin script:**
- Headings: **Playfair Display** — high contrast serif, editorial elegance
- Body: **Source Serif 4** — warm, readable, pairs with Playfair

**Functional:**
- Times/numbers: System monospace or **Tabular Lining** figures
- UI labels: System font (for native feel on controls)

### Type Scale

| Name | Size | Weight | Use |
|------|------|--------|-----|
| Display | 34 | Bold | Prayer time countdown |
| Title 1 | 28 | Semibold | Screen titles |
| Title 2 | 22 | Semibold | Section headers |
| Title 3 | 18 | Medium | Card titles |
| Body | 16 | Regular | Content text |
| Callout | 14 | Medium | Labels, badges |
| Caption | 12 | Regular | Timestamps, metadata |

### Spacing System (8pt grid, generous)

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4 | Inline icon gaps |
| sm | 8 | Tight element spacing |
| md | 16 | Default padding |
| lg | 24 | Section spacing |
| xl | 32 | Screen padding horizontal |
| 2xl | 48 | Section separation |
| 3xl | 64 | Major visual breaks |

### Depth System — Muqarnas-Inspired 3-Tier

| Layer | Elevation | Shadow | Use |
|-------|-----------|--------|-----|
| Ground | 0 | None | Background, dividers |
| Elevated | 1 | `0 2 8 rgba(27,73,101,0.08)` | Cards, inputs |
| Floating | 2 | `0 8 24 rgba(27,73,101,0.12)` | Modals, active prayer card |

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| sm | 8 | Buttons, badges |
| md | 12 | Cards |
| lg | 16 | Modal sheets |
| full | 9999 | Avatars, prayer indicator |

### Animation Principles
- **Spring physics** — never linear easing. Damping 15-20, stiffness 150-180
- **Meaningful motion** — prayer card lifts and glows as time approaches
- **Haptic vocabulary** — light tap for navigation, medium for prayer alert, heavy for urgent
- **Acoustic design** — oud string pluck for prayer, ney breath for transitions (optional, not synthetic)
- **Geometric reveal** — octagram/arabesque patterns animate in as decorative accents

### Layout Principles
- 30-50% more whitespace than typical apps
- Full-bleed cards with generous internal padding (20-24px)
- RTL-native from day one — use `I18nManager`, `flexDirection: 'row'` flips automatically
- Content-first — no chrome-heavy headers, let the content breathe
- Islamic geometric patterns as subtle background textures, not decoration

---

## App Screens (Expo Router Tabs)

### Tab 1: Prayer Times (Home)
- Show today's 5 prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) + Sunrise
- **Active prayer card** — elevated, golden glow, countdown to next prayer
- Hijri date display alongside Gregorian
- Calculation from adhan-js based on user coordinates + preferred method
- Cache locally in expo-sqlite
- Pull-to-refresh recalculates
- Subtle geometric pattern header (octagram)

### Tab 2: Announcements
- Real-time feed from PocketBase (realtime subscription on `announcements` collection)
- Cards with title, body, timestamp, mosque name
- **Urgent announcements** — terracotta badge, pinned at top with subtle pulse
- Filter by subscribed mosques
- Tap to expand full text
- Empty state with calligraphic bismillah illustration

### Tab 3: Events / Lessons
- Calendar view (react-native-calendars) + list view toggle
- Filter by category (lessons, youth, sisters, community, quran_circle)
- Category color-coded badges
- Each event card: title, speaker, date/time, mosque name, category
- Tap for full details + "Add to Calendar" button
- Recurring event indicators (weekly dot pattern)

### Tab 4: Settings
- **Mosque selection** — search by city or detect nearby via expo-location
- **Notification preferences** per mosque (prayers, announcements, events)
- **Prayer reminder timing** — at athan, 5/10/15/30 min before
- **Calculation method** picker (ISNA, MWL, Umm Al-Qura, Egyptian, Karachi)
- **Theme** — dark/light/system
- **Time format** — 12h/24h (default from device locale)
- **Language** — English/Arabic

---

## Notification Logic

### Prayer reminders (local)
- Calculate all 5 prayer times daily using adhan-js
- Schedule local notifications via `Notifications.scheduleNotificationAsync()`
- Reschedule at midnight or when preferences change
- Configurable offset: at time, 5/10/15/30 min before

### Announcement/event alerts (remote)
- PocketBase hook on `announcements` INSERT → calls Expo Push API
- Store push tokens in `push_tokens` collection
- Filter recipients by `user_subscriptions` (notify_announcements = true)
- Urgent announcements get high priority + sound

---

## Admin Panel
- Screens behind auth gate (check `mosque_admins` collection)
- Login with PocketBase email/password auth
- Forms to create/edit announcements and events
- Simple dashboard showing subscriber count
- Can be web-only screens via Expo Router

---

## Week 1 MVP Day-by-Day

| Day | Focus |
|-----|-------|
| 1 | Project setup, PocketBase schema, adhan-js integration, Prayer Times screen |
| 2 | Auth (email sign-up), mosque selection, user subscriptions |
| 3 | Announcements feed with PocketBase Realtime |
| 4 | Events/lessons calendar + list view |
| 5 | Push notifications (local prayer reminders + remote announcements) |
| 6 | Admin panel (web forms), settings screen, theme system |
| 7 | Testing on devices, bug fixes, EAS build for TestFlight/Play Store |

---

## Key API Reference

### adhan-js Prayer Calculation
```typescript
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

const coordinates = new Coordinates(40.7128, -74.0060);
const params = CalculationMethod.NorthAmerica(); // ISNA
const date = new Date();
const prayerTimes = new PrayerTimes(coordinates, date, params);

console.log(prayerTimes.fajr);    // Date object
console.log(prayerTimes.dhuhr);   // Date object
console.log(prayerTimes.asr);     // Date object
console.log(prayerTimes.maghrib); // Date object
console.log(prayerTimes.isha);    // Date object
```

### Calculation Methods
| Code | Method |
|------|--------|
| NorthAmerica | ISNA (North America) |
| MuslimWorldLeague | Muslim World League |
| UmmAlQura | Umm Al-Qura (Saudi) |
| Egyptian | Egyptian General Authority |
| Karachi | University of Islamic Sciences, Karachi |

### PocketBase API
```
Base URL: https://pb.mosqueconnect.app/api/

GET    /collections/mosques/records          # List mosques
GET    /collections/announcements/records    # List announcements
POST   /collections/announcements/records    # Create announcement (admin)
GET    /collections/events/records           # List events
POST   /collections/events/records           # Create event (admin)
POST   /collections/users/auth-with-password # Login
POST   /collections/users/records            # Register
```
