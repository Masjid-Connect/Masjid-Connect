# Mosque Connect — Build Prompt

## Vision
Build a premium mobile app called **Mosque Connect** using React Native with Expo and PocketBase as the self-hosted backend. The app serves local mosque communities with prayer time notifications, event/lesson listings, and community announcements.

**Design philosophy**: God-tier, not SaaS. A serene, premium experience rooted in Islamic geometric art and calligraphic tradition. Better than an Apple experience.

---

## Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| Cross-platform framework | React Native + Expo (SDK 55) | Single codebase → iOS, Android, web |
| Navigation | Expo Router | File-based routing, deep linking, typed routes |
| Backend / Database | PocketBase (self-hosted) | Single Go binary, SQLite, realtime, auth, admin UI |
| Hosting | Digital Ocean droplet + Coolify | Self-hosted, full control, no vendor lock-in |
| Prayer times (primary) | Aladhan API | Free, no key required, accurate times + Hijri date |
| Prayer times (fallback) | adhan-js | Offline-only fallback — local calculation when no network |
| Push notifications | Expo Notifications + Expo Push Service | Free, abstracts FCM/APNs |
| Local storage | AsyncStorage | Offline-first caching layer |
| Animations | react-native-reanimated | 60fps spring-based animations |
| SVG / Brand | react-native-svg | Convergent Arch mark, Kozo paper textures |
| Haptics | expo-haptics | Splash reveal, meaningful interactions |
| Date handling | date-fns | Lightweight date formatting |
| Language | TypeScript (strict) | Type safety across frontend and backend |

---

## Design System

### Color Palette — Islamic Architectural Tradition

| Name | Hex | Inspiration | Usage |
|------|-----|-------------|-------|
| Warm Ivory | `#FAF7F2` | Kozo paper, limestone | Substrate background |
| Sacred Blue | `#1B4965` | Iznik tilework, lapis lazuli | Brand mark line, primary text |
| Divine Gold | `#C8A951` | Gilded Quranic manuscripts | Gold node, accents, notification badges |
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
- **Haptic vocabulary** — light tap for navigation, medium for prayer alert / splash reveal, heavy for urgent
- **Acoustic design** — oud string pluck for prayer, ney breath for transitions (optional, not synthetic)
- **Splash reveal** — Kozo paper silence → haptic trigger → vector-draw arch in Sacred Blue → gold node spring fade-in → content crossfade

### Brand Identity — The Convergent Arch
The mark is a single, unbroken cubic Bézier line suggesting both the mihrab niche (inward base curve) and the dome (outward apex arc). The two curves meet at a single gold leaf node — a structural point of convergence.

**Components:**
- `ConvergentArch.tsx` — static SVG mark with configurable stroke / gold node
- `AnimatedSplash.tsx` — full reveal sequence with haptic feedback and spring animations
- `BrandTabIcon.tsx` — tab bar icon with gold node illumination on focus
- `GoldBadge.tsx` — Divine Gold notification badge (not red)
- `KozoPaperBackground.tsx` — Kozo paper fiber texture overlay for backgrounds

**The SVG path:**
```
M 20 130 C 35 108, 28 48, 50 10 C 72 48, 65 108, 80 130
```
viewBox: `0 0 100 140`, apex at `(50, 10)`, path length ~280 units.

### Layout Principles
- 30-50% more whitespace than typical apps
- Full-bleed cards with generous internal padding (20-24px)
- RTL-native from day one — use `I18nManager`, `flexDirection: 'row'` flips automatically
- Content-first — no chrome-heavy headers, let the content breathe
- Kozo paper texture on light-mode backgrounds via `KozoPaperBackground`
- Notification badges are Divine Gold, never red — a glint of light, not an error

---

## App Screens (Expo Router Tabs)

### Tab 1: Prayer Times (Home)
- Show today's 5 prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) + Sunrise
- **Active prayer card** — elevated, golden glow, countdown to next prayer
- Hijri date display alongside Gregorian
- Aladhan API as primary source; adhan-js offline-only fallback
- Cache locally in AsyncStorage
- Pull-to-refresh fetches fresh from API
- Brand mark (Convergent Arch) in header alongside title
- Kozo paper texture background

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
- Fetch prayer times from Aladhan API (fall back to adhan-js if offline)
- Schedule local notifications via `Notifications.scheduleNotificationAsync()`
- Reschedule at midnight or when preferences change
- Configurable offset: at time, 5/10/15/30 min before

### Announcement/event alerts (remote)
- PocketBase hook on `announcements` INSERT → calls Expo Push API
- Store push tokens in `push_tokens` collection
- Filter recipients by `user_subscriptions` (notify_announcements = true)
- Urgent announcements get high priority + sound

---

## Admin Panel — Non-Technical User First

Mosque administrators (imams, board members, community volunteers) are often **not tech-savvy**. The admin experience must be ultra-friendly:

- Screens behind auth gate (check `mosque_admins` collection)
- Login with PocketBase email/password auth
- **Guided step-by-step flows** for creating announcements and events — not raw forms
- **Zero jargon** — plain language labels ("Add an announcement", not "Create record")
- **Sensible defaults** — pre-fill dates, times, calculation methods; minimize required fields
- **Inline contextual help** on every form field
- **Forgiving input** — accept times in any reasonable format, auto-correct obvious mistakes
- **Confirmation dialogs** before any destructive action (delete, unpublish)
- **Clear visual feedback** — human-readable success/error messages, not status codes
- **Mobile-first** — admin features must work on phones, not just desktop browsers
- Simple dashboard showing subscriber count
- A volunteer should be able to post an announcement **within 60 seconds** of opening the admin panel
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

### Aladhan API (Primary Prayer Source)
```
GET https://api.aladhan.com/v1/timings/{DD-MM-YYYY}
    ?latitude={lat}&longitude={lng}&method={method}

Response: { data: { timings: { Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha }, date: { hijri } } }
```
Free, no API key required. Returns accurate times + Hijri date.

### adhan-js (Offline-Only Fallback)
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
Only used when network is unavailable. Aladhan API is always preferred.

### Calculation Methods
| Code | Method |
|------|--------|

| UmmAlQura | Umm Al-Qura (Saudi) |


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
