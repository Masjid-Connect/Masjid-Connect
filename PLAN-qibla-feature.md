# Mosque Connect — Competitive Redesign & Qibla Feature Plan

## Executive Summary

After analyzing Pillars (the UK's most popular Muslim prayer app), Mosque Connect has a strong technical foundation but reads as "clinical" rather than "alive." This plan addresses the core visual storytelling gap, restructures navigation, removes unnecessary friction (sign-up), and adds the Qibla compass — all while preserving our differentiator: **mosque-specific community features that Pillars doesn't have.**

The guiding principle: **steal what works, beat them where it matters, keep what makes us different.**

---

## 0. Technology Evaluation — Is adhan-js the Best Option?

### What adhan-js `Qibla()` Actually Does

The `Qibla(coordinates)` function is a **single-purpose great-circle bearing calculator**. It takes a `Coordinates(lat, lng)` object and returns degrees from **True North** to the Kaaba (21.4225°N, 39.8262°E). The math is derived from "Astronomical Algorithms" by Jean Meeus, the same reference used by the U.S. Naval Observatory.

**What it gives you:**
- A single number: bearing in degrees from True North (e.g., `119.2`)

**What it does NOT give you:**
- No compass/magnetometer integration
- No magnetic declination correction (True North ≠ Magnetic North)
- No device heading
- No UI components
- No distance to Kaaba
- No cardinal direction label (you calculate "SE" yourself)
- No smoothing, filtering, or animation

It is a **math utility**, not a compass solution.

### Alternatives Evaluated

| Library | What It Does | Pros | Cons | Verdict |
|---|---|---|---|---|
| **adhan-js `Qibla()`** | Pure bearing calculation (True North) | Already installed; zero new deps; high-precision astronomy math; battle-tested across Swift/Kotlin/Dart/JS; offline | Bearing only — no compass, no sensors, no UI | **Use for bearing calculation** |
| **react-native-qibla-compass** | Full hook: compass heading + Qibla rotation + location + loading/error states | Turnkey `useQiblaCompass` hook returns `compassRotate`, `kabaRotate`, `compassDirection`, `error`, `isLoading`; 100K+ npm downloads | Only 18 commits, 18 stars; low maintenance (no releases in 12+ months); 100% JS (no native optimizations); peer deps on expo-location + expo-sensors anyway; black-box Qibla math we can't verify | **Do not use** — we'd still need expo-sensors, and we lose control over smoothing, animation, and the calculation itself |
| **expo-sensor-fusion** | Kalman-filtered sensor fusion (accel + gyro + magnetometer) | Most accurate heading via sensor fusion; `useCompass` hook | Extra dependency (kalmanjs + ahrs); heavier than needed; overkill for a flat-phone compass | **Not needed for MVP** — consider for v2 if accuracy complaints arise |
| **@russellio/react-native-compass** | Reanimated-based compass with smooth 60fps animation | Spring physics, 0°/360° wrap handling, TypeScript | Another dependency to maintain; doesn't include Qibla logic | **Not needed** — we already have Reanimated and can handle wrap ourselves |
| **Manual haversine/bearing calc** | Write our own `calculateQiblaBearing()` | Zero dependencies; full control | Reinventing what adhan-js already does perfectly; risk of precision bugs | **No reason** — adhan-js is already installed and correct |

### The Google Qibla Finder — What It Does and What We Can Learn

Google's Qibla Finder (qiblafinder.withgoogle.com) is a **web-based AR experience** launched during Ramadan 2017 by Google Brand Studio + Phantom Studios. It was a deliberate departure from traditional compass UIs.

**How Google's version works:**
1. Gets user location via browser GPS
2. Calculates great-circle bearing to Kaaba (21.4224779, 39.8251832) using the haversine formula
3. On Android: activates camera + device orientation → draws a **bright blue line** through the camera feed pointing toward Mecca, with a Kaaba emoji that enlarges as you align + distance to Kaaba displayed
4. On iOS: falls back to a **2D compass view** with the blue directional line (no camera/AR — Safari didn't support WebXR at launch)
5. When aligned: the line brightens, the Kaaba icon enlarges — clear "you found it" moment

**Google's key UX insight:** "Many existing tools still look like a compass and don't utilize the many advancements smartphones have made. It would be a lot easier to simply hold up your phone and have it tell you the right direction."

### Can We Do Google-Style AR?

**Honest assessment: Not for MVP, and here's why.**

| Requirement | Google Qibla Finder | Mosque Connect Feasibility |
|---|---|---|
| Camera access | Browser WebRTC | Requires `expo-camera` — new dependency, new permission |
| AR rendering | WebGL overlay on camera feed | Requires ViroReact or expo-three — **breaks Expo managed workflow** or needs dev builds |
| Device orientation | Browser DeviceOrientation API | `expo-sensors` Magnetometer — we have this |
| Platform parity | Android AR, iOS compass fallback | We'd need both paths anyway |
| Complexity | Built by Google's engineering team | Significant scope for a community mosque app |
| Doctrine compliance | N/A | "No new dependencies without written justification" — AR adds 2-3 heavy deps |

**The AR camera overlay is not practical for our MVP** because:
1. ViroReact requires ejecting from Expo managed workflow (or complex dev builds)
2. It adds significant bundle size (3D rendering engine)
3. The iOS fallback would be a compass anyway — so we'd build two UIs
4. Camera permission is a friction point for a mosque app (users may be uncomfortable)
5. The Doctrine says to avoid unnecessary dependencies

### What We CAN Take From Google's Approach

Even without AR, Google's design philosophy has elements we should adopt:

1. **The "blue line" directional indicator** — Instead of a traditional compass rose, consider a cleaner design with a single prominent directional line/arrow pointing to Qibla. Less clutter, more clarity.

2. **The "found it" moment** — Google enlarges the Kaaba icon and brightens the line when aligned. We can do this with our Divine Gold glow + haptic feedback + a satisfying animation.

4. **Minimal chrome** — Google's UI is almost empty: just the line, the distance, and the Kaaba icon. No compass rose, no degree numbers cluttering the view. We should lean toward simplicity over traditional compass aesthetics.

5. **No calibration anxiety** — Google doesn't front-load a scary "calibrate your compass" screen. It just works, and suggests calibration only if accuracy is low. We should do the same.

### Recommended Approach: adhan-js + expo-sensors (Build Our Own)

**Use adhan-js for the bearing math. Build our own compass UI with expo-sensors + Reanimated.**

This is the right call because:
- adhan-js `Qibla()` is already installed, proven, and uses the same haversine/great-circle math as Google
- `expo-sensors` Magnetometer gives us the raw heading — we need this regardless of which library we use
- `react-native-reanimated` (already installed) gives us 60fps spring animations for the compass
- `react-native-svg` (already installed) gives us the visual compass
- We control the smoothing algorithm (low-pass filter), the animation feel (spring constants), and the "aligned" detection threshold
- Zero risk of abandoned third-party compass libraries
- Only 1 new dependency: `expo-sensors` (official Expo SDK)

**What we build ourselves (and why):**
- **Heading smoothing** — Low-pass filter on magnetometer data (prevents jitter). ~15 lines of code.
- **Magnetic declination** — adhan-js returns True North bearing, but the magnetometer reads Magnetic North. The difference varies by location (e.g., ~1° in Birmingham, up to 20° in Alaska). We can either: (a) ignore it for UK-based users (negligible), or (b) use the World Magnetic Model (WMM) lookup from NOAA — but this adds complexity. **Recommendation: ignore for v1** since the Salafi Masjid users are in Birmingham where declination is ~1°, well within the ±3° alignment threshold.
- **0°/360° wrap handling** — When heading crosses 359° → 1°, naive interpolation spins 358° the wrong way. We handle this with shortest-path angle interpolation. ~10 lines.

### Future Enhancement: AR Mode (v2+)

If user demand warrants it, a future version could add an AR camera mode using:
- `expo-camera` for the camera feed
- A simple overlay (not full 3D AR) — just the directional line rendered on top of the camera preview
- This would be the "Google-style" experience without needing ViroReact
- Toggle between compass mode (default) and AR mode (opt-in)

This is explicitly out of scope for v1 but architecturally possible without rewriting the compass logic.

---

## 1. Structural Decisions (What Changes)

### 1.1 Remove Sign-Up Requirement

**Decision: No authentication required to use the app.**

Pillars has no sign-up. Users download and immediately get prayer times. This is correct because:

- **Push notifications don't need auth** — Expo push tokens are device-scoped. `getExpoPushTokenAsync()` returns a unique device token without any user account. We store it server-side keyed by the token itself.
- **Mosque subscriptions can be anonymous** — A device can subscribe to a mosque's notifications without an account. We associate the push token with mosque IDs.
- **Auth is only needed for admin features** — Posting announcements, managing events. Regular congregants never need to sign in.
- **Friction kills adoption** — Every sign-up screen loses 30-50% of potential users. A mosque community app needs maximum adoption.

**What changes:**
- Remove sign-up/login from the onboarding flow
- The app opens directly to prayer times after a brief mosque selection (or auto-detect)
- Push token registration happens silently on first launch
- `PushToken` model no longer requires a `user` FK — keyed by token + mosque subscription
- Profile card in Settings becomes optional ("Sign in to manage your mosque" for admins only)
- Auth screens remain but are accessed only from Settings → "Mosque Admin"

### 1.2 Merge Announcements + Events into "Community" Tab

**Decision: 4 tabs — Prayer, Qibla, Community, Settings**

Pillars uses 5 tabs (Prayer, Qibla, Ramadan, Tracker, Settings) where Ramadan is seasonal and Tracker is a feature we'll never need. Our differentiator is mosque-specific community content. Merging announcements and events into a single "Community" tab gives us:

- **4 clean tabs** (Apple HIG sweet spot)
- **Qibla gets its own tab** (one-tap access, matches Pillars' proven UX)
- **Community tab** is our unique selling point — the thing Pillars doesn't have
- **No wasted tabs** on features that don't serve the mosque community

**New tab structure:**

| Tab | Icon | Content |
|---|---|---|
| **Prayer** | `time` / `time-outline` | Prayer times, sun arc, date navigation |
| **Qibla** | `compass` / `compass-outline` | Full Qibla compass experience |
| **Community** | `people` / `people-outline` | Announcements + Events (segmented control or sections) |
| **Settings** | `settings` / `settings-outline` | Preferences, sharing, admin access |

**Community tab layout:**
```
┌─────────────────────────────────────┐
│  Community                          │
│                                     │
│  ┌──────────────┬────────────────┐  │
│  │ Announcements │    Events     │  │  ← Segmented control
│  └──────────────┴────────────────┘  │
│                                     │
│  [Announcement/Event list below]    │
│                                     │
└─────────────────────────────────────┘
```

### 1.3 "Share the Reward" — Prominent, Not Hidden

**Decision: Move sharing from buried Settings to a visible, persistent element.**

Pillars puts "Share the Reward" on multiple screens. We should have it:
- **Settings screen** — prominent card near the top (not buried in "About")
- **Community tab** — share button in the header area
- **Onboarding completion** — "Invite others from your mosque" prompt

The share text should be mosque-specific: "Join [Mosque Name] on Mosque Connect — get prayer times, announcements, and events for our community."

---

## 2. Prayer Times Screen — The Big Redesign

This is where we close the gap with Pillars and surpass them. The current screen is technically impressive but reads as clinical. We're adding **visual storytelling**.

### 2.1 Islamic Geometric Patterns — Make Them Visible

**Current:** 3% opacity — barely perceptible. This undermines the entire purpose.

**Fix:** Bump to **8-12% opacity** in light mode, **6-10%** in dark mode. The pattern should be felt as a subtle architectural presence — like tilework in a real masjid. Not invisible, not loud. The user should notice it on first use and then it becomes ambient.

Additionally, consider varying the pattern density or style per prayer window — denser/more complex during Isha (night architecture), more open/airy during Dhuhr (midday openness). This would be unique to us.

```typescript
// layoutGrid.ts
export const patterns = {
  tileSize: 56,
  opacity: 0.10,        // was 0.03 — now visible as architectural element
  opacityDark: 0.08,    // slightly less in dark mode to avoid noise
};
```

### 2.2 Sun Arc — Three Ways to Beat Pillars

Pillars' sun arc is their killer feature: an orange parabolic curve with prayer dots showing the sun's journey. It's beautiful and functional. We need to match it AND surpass it.

**What Pillars does:** A static orange arc (half-ellipse) with white dots for each prayer time. The sun's current position is shown. Below/above the horizon is dimmed. Simple, effective.

**How we beat it:**

#### Option A: "Living Sky Arc" — Atmospheric Gradient Arc (RECOMMENDED)

Instead of Pillars' flat orange line on a dark background, our arc IS the sky. The arc itself is a gradient that shifts color based on the prayer window — Fajr blues/pinks, Dhuhr bright sky blue, Asr warm gold, Maghrib deep orange/crimson, Isha deep navy/violet. The arc becomes a **miniature sky map**.

```
┌─────────────────────────────────────┐
│                                     │
│           ╭─── ● ───╮              │  ← Arc colored as sky gradient
│          ╱  Dhuhr    ╲             │     (blue→gold→orange→navy)
│     ●  ╱    ●    ●    ╲  ●        │
│   Fajr╱   Asr  Mgrb    ╲Isha     │  ← Prayer dots ON the arc
│  ─────╱─────────────────╲─────    │  ← Horizon line
│  ☀ Sun position (animated glow)    │  ← Current position pulses gently
│                                     │
│  TODAY  ·  Birmingham               │
│  < Friday 13 March           >     │  ← Date navigation
│    25 Ramadan 1447                  │  ← Hijri date, prominent
│                                     │
└─────────────────────────────────────┘
```

**What makes this better than Pillars:**
- The arc isn't just a line — it's a **sky gradient**. You see dawn colors on the left, midday blue at the peak, sunset orange on the right, night navy at the edges.
- **Animated sun position** — Not just a dot, but a glowing orb (Skia RadialGradient) that moves along the arc. The glow color matches the current prayer window.
- **Below-horizon treatment** — Left of Fajr and right of Isha, the arc fades into Onyx-950 (night). This creates a natural "underground" feel for nighttime.
- **Islamic pattern texture** — The arc itself has a very subtle geometric pattern (our 8-point star) at 5% opacity, giving it an architectural quality that Pillars' flat line lacks.
- **Seasonal arc height** — In summer, the arc is taller (longer days, sun higher). In winter, it's flatter (shorter days, sun lower). This is astronomically accurate and visually interesting — Pillars' arc is always the same shape.
- **Built on our existing Skia infrastructure** — We already render atmospheric gradients. This extends the same system.

#### Option B: "Celestial Ring" — Circular Prayer Clock

Instead of a parabolic arc, use a **full circle** (like a 12-hour clock face) with prayer times marked as wedge segments. The current prayer window is highlighted with a glowing arc. This would be more unique than Pillars' approach but less immediately intuitive.

```
        ╭── Fajr ──╮
       ╱             ╲
    Isha     12:00    Dhuhr
      ╲              ╱
       ╲   ╱ Sun ╲  ╱
        ╰── Maghrib ─╯
            Asr
```

**Pros:** Unique, shows all 24 hours, looks premium
**Cons:** Less intuitive than a horizon arc, harder to read at a glance, doesn't tell the "sunrise/sunset" story as naturally

#### Option C: "Horizon Panorama" — Full-Width Skyline

A full-width illustration showing an abstract horizon/skyline with the sky above changing color per prayer time. Prayer times are marked along the bottom as time markers. The sun moves across the sky from left to right.

```
┌─────────────────────────────────────┐
│  🌅 ····☀️···························│  ← Sky gradient shifts L-to-R
│  ▓▓▓▓░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓ │  ← Abstract minaret silhouette
│  Fajr  Dhuhr  Asr  Maghrib  Isha  │  ← Time markers along bottom
└─────────────────────────────────────┘
```

**Pros:** Most atmospheric, feels like looking out a window, could incorporate a subtle mosque silhouette
**Cons:** More complex to build, potentially less precise for reading individual prayer times

### Recommendation: Option A — "Living Sky Arc"

Option A is the strongest because:
1. It's **immediately recognizable** to Pillars users (same mental model: arc = sun journey)
2. It's **objectively better** (gradient arc > flat line, animated sun > static dot, seasonal height > fixed shape)
3. It builds on our **existing Skia infrastructure** (SkiaAtmosphericGradient, SolarLight)
4. It's the **most practical to implement** (SVG path + gradient fill + animated position)
5. It maintains the **"Timeless Sanctuary" aesthetic** — the arc becomes part of the atmospheric sky, not a UI widget

### 2.3 Date Navigation — Better Than Pillars

**Pillars:** `< Friday 13 March / 25 Ramadan 1447 >` with left/right arrows.

**How we beat it:**
- **Swipe gesture** (not just arrow buttons) — swipe the entire hero area left/right to change dates. More natural on mobile.
- **"TODAY" pill** — When swiped away from today, show a floating "TODAY" pill to jump back (like iOS Calendar)
- **Hijri date is a headline, not a subtitle** — Show it at `title3` size (20px/600), not buried as footnote text. The Islamic date is spiritually significant, not metadata.
- **Haptic on date change** — Light haptic on each swipe to confirm the action
- **Prayer times update instantly** — adhan-js calculates for any date, so swiping to tomorrow shows tomorrow's times immediately (no API call needed if offline)

```
┌─────────────────────────────────────┐
│                                     │
│  TODAY  ·  Birmingham               │
│                                     │
│  < Friday 13 March           >     │  ← Swipeable + arrow buttons
│    25 Ramadan 1447                  │  ← Hijri at title3 (20px, 600wt)
│                                     │
└─────────────────────────────────────┘
```

### 2.4 Prayer List — Cleaner Than Pillars

**Current problems:**
- GlowDot is a subtle indicator that doesn't provide enough visual separation
- Hairline separators + gold tint background = clinical
- No per-prayer notification control

**Changes:**

1. **Rounded border for active prayer** (steal from Pillars) — Replace the gold-tinted background + glow dot with a clean rounded border (1.5px, Divine Gold) around the next prayer row. More elegant, more scannable.

```
┌─────────────────────────────────────┐
│  Fajr                      04:53   │  (dimmed — passed)
├─────────────────────────────────────┤
│  Sunrise                   06:27   │  (dimmed — passed)
├─────────────────────────────────────┤
│  Dhuhr                     12:22   │  (dimmed — passed)
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Asr                      15:25 🔔│ │  ← Active: rounded border
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│  Maghrib                   18:12  🔔│
├─────────────────────────────────────┤
│  Isha                      19:28  🔔│
└─────────────────────────────────────┘
```

2. **Per-prayer notification bells** (steal from Pillars) — Bell icon on each remaining/future prayer row. Tap to toggle that prayer's notification. No digging through Settings. Bell is muted (outline) when off, filled when on. Color: `textTertiary` when off, `accent` (Divine Gold) when on.

3. **Jamaah time display** — Keep our advantage over Pillars. Show both calculated time AND jamaah time when available. Jamaah time is the primary (bold), calculated time is secondary (caption, below).

4. **Warmer row treatment** — Soften the transition between the atmospheric hero and the prayer list. Instead of a hard cut from gradient to flat Stone-100, let the background fade from the gradient's bottom color into the list background over 32-48px. This removes the "clinical" hard edge.

### 2.5 Hero Section Rework

**Current hero:** Gradient + solar light + pattern + mosque name + hijri date + "upcoming" label + prayer name (40px) + time (54px) + countdown.

**New hero (incorporating sun arc):**

```
┌─────────────────────────────────────┐
│  The Salafi Masjid                  │  ← Mosque name (caption, uppercase)
│                                     │
│         Isha                        │  ← Current/next prayer (bold, 34px)
│         19:28                       │  ← Time (ultralight, 48px)
│    8 hrs 36 mins until Fajr         │  ← Countdown (subhead)
│                                     │
│         ╭─── ● ───╮               │  ← Living Sky Arc
│        ╱  ●    ●   ╲              │
│   ●  ╱    ●    ●    ╲  ●☀        │  ← Sun at current position
│  ────╱─────────────────╲────      │  ← Horizon
│                                     │
│  TODAY  ·  Birmingham               │
│  < Friday 13 March           >     │  ← Date nav
│    25 Ramadan 1447                  │  ← Hijri headline
│                                     │
└─────────────────────────────────────┘
│  PRAYER SCHEDULE       Mosque Times │  ← Section header
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Isha                   19:28  🔔│ │  ← Active row with border
│ └─────────────────────────────────┘ │
│  Fajr (tmrw)             04:53   🔔│
│  ...                                │
```

This layout puts the prayer identity at the top (what's current), the visual storytelling in the middle (where is the sun), and the practical timetable below (what's coming).

---

## 3. Qibla Tab — Dedicated, One Tap Away

### Decision: Qibla is a tab, not a sub-screen.

Pillars gives Qibla a dedicated tab. For something Muslims need 5x daily, one-tap access is essential. Our plan previously had it as a sub-screen — that was wrong.

**Route:** `app/(tabs)/qibla.tsx` (tab screen, not a stack push)

### Qibla Screen Layout (Pillars-Inspired, Improved)

```
┌─────────────────────────────────────┐
│                                     │
│  LOCATION                           │
│  ┌──────────────┐                  │
│  │ Birmingham   │                  │  ← Location pill
│  └──────────────┘                  │
│                                     │
│         ┌─────────────┐            │
│        /    N           \           │
│       │  W    ▲    E    │          │  ← Compass ring rotates
│       │      ╱ ╲        │          │     with device heading
│       │     ╱   ╲       │          │
│       │    ╱ 🕋  ╲      │          │  ← Kaaba icon on ring
│        \  S        /    │          │     at Qibla bearing
│         └─────────────┘            │
│                                     │
│     Turn to your right              │  ← Human instruction
│                                     │
└─────────────────────────────────────┘
```

### Key Improvements Over Pillars

1. **"Turn to your left/right"** — Steal this directly. It's the best UX decision in their Qibla screen. Non-technical users don't think in degrees.

2. **Warmer compass** — Pillars uses a white/cream circle with a peach teardrop. We use our Sapphire ring + Divine Gold arrow. Both warm, ours is more branded.

4. **"Qibla Found" celebration** — When aligned within ±3°:
   - Arrow turns full Divine Gold with Skia glow
   - Haptic pulse (Medium impact)
   - "Qibla Found" text replaces "Turn to your..."
   - Kaaba icon scales up slightly (spring animation)
   - Gentle gold particle effect (subtle, not cheesy)

5. **No "Autopilot" toggle** — Pillars has this because they support manual location override. We default to GPS with mosque-coordinates fallback. Simpler.

### Technical Architecture (unchanged from previous plan)

| Dependency | Status | Purpose |
|---|---|---|
| `adhan` (adhan-js) | Already installed | `Qibla(coordinates)` — calculates bearing to Mecca |
| `expo-location` | Already installed | Get user's GPS coordinates |
| `expo-sensors` | **Needs install** | `Magnetometer` API for compass heading |
| `react-native-reanimated` | Already installed | Spring-animated compass rotation |
| `react-native-svg` | Already installed | Compass ring SVG rendering |
| `expo-haptics` | Already installed | Alignment feedback |

**Only 1 new dependency: `expo-sensors`**

### New Files for Qibla

```
/app/(tabs)/qibla.tsx                  # Qibla compass TAB screen
/components/qibla/QiblaCompass.tsx     # Compass ring + arrow component
/components/qibla/CalibrationPrompt.tsx # Figure-8 calibration (lazy, on-demand)
/components/qibla/index.ts            # Re-exports
/hooks/useQiblaCompass.ts             # Hook: magnetometer + qibla calc + direction text
/hooks/useDeviceHeading.ts            # Hook: raw compass heading from magnetometer
/lib/qibla.ts                         # Cardinal direction, bearing utils
```

---

## 4. Community Tab — Our Differentiator

### Merging Announcements + Events

The Community tab combines both feeds with a **segmented control** at the top:

```
┌─────────────────────────────────────┐
│  Community                 🔗 Share │
│                                     │
│  ┌───────────────┬─────────────┐   │
│  │ Announcements │   Events    │   │  ← Segmented control
│  └───────────────┴─────────────┘   │
│                                     │
│  [Urgent] Janazah — Br. Ahmad      │  ← Urgent announcements always first
│  Tomorrow at 2:00 PM                │
│                                     │
│  Friday Khutbah Topic              │
│  The Salafi Masjid · 2 hours ago   │
│                                     │
│  Tafseer Class Cancelled           │
│  The Salafi Masjid · Yesterday     │
│                                     │
└─────────────────────────────────────┘
```

**Why this works better than separate tabs:**
- Most mosques post announcements infrequently — a dedicated tab would often look empty
- Events are also sparse outside Ramadan — same problem
- Combined, the tab always has content, feels alive
- Users get both types of community info in one place
- We save a tab slot for Qibla

### File changes
- Existing `app/(tabs)/announcements.tsx` content moves into a component
- Existing `app/(tabs)/events.tsx` content moves into a component
- New `app/(tabs)/community.tsx` hosts both via segmented control
- Delete standalone `announcements.tsx` and `events.tsx` tab files

---

## 5. Push Notifications Without Auth

### How it works

```
App Launch
  → Call getExpoPushTokenAsync() (no auth needed)
  → Get unique device token (e.g., "ExponentPushToken[xxxxxx]")
  → POST /api/v1/push-tokens/ { token, platform, mosque_ids }
  → Server stores token → mosque subscription mapping
  → Server sends notifications to all tokens subscribed to a mosque
```

### Backend changes needed

- `PushToken` model: Remove required `user` FK, add optional `user` FK (for admin features later)
- Add `mosque_ids` field to push token registration (which mosques this device follows)
- `UserSubscription` model: Allow anonymous subscriptions (no user, just push token + mosque)
- New endpoint: `POST /api/v1/device-subscribe/` — subscribe a device token to a mosque without auth

### Per-prayer notification preferences

Stored **locally on device** (AsyncStorage/expo-sqlite), not on server:
```json
{
  "prayer_notifications": {
    "fajr": true,
    "sunrise": false,
    "dhuhr": false,
    "asr": true,
    "maghrib": true,
    "isha": true
  },
  "reminder_minutes": 15
}
```

When a bell icon is tapped on the prayer list, it toggles the local preference and schedules/cancels the local notification for that prayer. These are **local scheduled notifications** (not server-pushed), so they work completely offline and need zero auth.

---

## 6. Visual Warmth Fixes

### 6.1 Gradient-to-List Transition

**Current:** Hard cut from atmospheric gradient hero to flat Stone-100 list background.
**Fix:** Add a 48px fade zone where the gradient's bottom color blends into the list background. Use a Skia LinearGradient overlay at the hero's bottom edge that transitions from the gradient's terminal color to transparent. This removes the clinical hard edge.

### 6.2 Card Treatment

**Current:** Flat rows with hairline separators.
**Fix:** Prayer rows get slightly rounded backgrounds (borderRadius: 12) with 4px vertical padding increase. Not full cards with shadows — just enough softness to feel less like a spreadsheet.

### 6.3 Color Temperature

**Current palette is correct** — no need to change the foundational colors. The issue is application:
- Divine Gold is used too sparingly (only glow dots and badges)
- Sapphire dominates, which reads as corporate
- **Fix:** Use Divine Gold more liberally — date navigation arrows, section headers, the sun position indicator. Gold becomes the "warmth" accent throughout, not just for sacred moments.

---

## 7. Internationalization

New and updated i18n keys needed in both `en.json` and `ar.json`:

```json
{
  "tabs": {
    "prayer": "Prayer",
    "qibla": "Qibla",
    "community": "Community",
    "settings": "Settings"
  },
  "prayer": {
    "today": "TODAY",
    "dateNavHint": "Swipe to change date",
    "backToToday": "Back to today",
    "notificationOn": "Notification on",
    "notificationOff": "Notification off"
  },
  "qibla": {
    "title": "Qibla Direction",
    "location": "LOCATION",
    "turnLeft": "Turn to your left",
    "turnRight": "Turn to your right",
    "turnSlightLeft": "Turn slightly left",
    "turnSlightRight": "Turn slightly right",
    "qiblaFound": "Qibla Found",
    "calibrationNeeded": "Move your device in a figure-8 to calibrate",
    "noSensor": "Compass not available on this device",
    "bearing": "{{degrees}}° {{cardinal}}",
    "N": "N", "NE": "NE", "E": "E", "SE": "SE",
    "S": "S", "SW": "SW", "W": "W", "NW": "NW"
  },
  "community": {
    "title": "Community",
    "announcements": "Announcements",
    "events": "Events",
    "shareReward": "Share the Reward",
    "shareMessage": "Join {{mosqueName}} on Mosque Connect"
  }
}
```

---

## 8. Accessibility & Edge Cases

- **No magnetometer** (emulators, very old devices): Show static bearing with "Turn to your left/right" + distance to Kaaba. No compass animation — just clear text and an arrow illustration.
- **Low accuracy**: Show calibration prompt (figure-8 animation) inline, not as a blocking overlay.
- **Magnetic interference**: Note in UI that metallic objects or cases can affect accuracy.
- **Location denied**: Fall back to mosque coordinates (still useful for local congregation).
- **RTL (Arabic)**: Compass is inherently directional (cardinal directions are universal), but all text labels flip. "Turn to your left" becomes mirrored appropriately. Cardinal abbreviations use Arabic equivalents.
- **VoiceOver/TalkBack**: Announce "Turn to your left" / "Qibla Found" as live text. Announce prayer times and notification status per row.
- **Date navigation**: VoiceOver announces "Friday 13 March, 25 Ramadan 1447. Swipe to change date."

---

## 9. Privacy Considerations

- Location is used **only** for Qibla calculation and prayer times — never sent to the backend
- Magnetometer data stays on-device
- Push token is the only device identifier sent to the server
- No analytics on compass usage
- No tracking of which prayers users enable notifications for (local only)
- Anonymous by default — no personal data collected unless user chooses to sign in as admin

---

## 10. Implementation Steps

### Phase 1: Structural Changes
1. Remove auth requirement from app onboarding (keep auth for admin screens)
2. Update `PushToken` model to support anonymous device tokens
3. Merge Announcements + Events into Community tab with segmented control
4. Update tab layout to 4 tabs: Prayer, Qibla, Community, Settings
5. Delete standalone `announcements.tsx` and `events.tsx` tab screens

### Phase 2: Prayer Times Visual Overhaul
6. Bump Islamic pattern opacity from 3% to 10% (light) / 8% (dark)
7. Build Living Sky Arc component (Skia gradient arc + prayer dots + animated sun)
8. Add date navigation (swipe + arrows + "TODAY" pill)
9. Make Hijri date prominent (title3 size)
10. Add gradient-to-list fade transition (48px blend zone)
11. Replace GlowDot + gold-tint with rounded border for active prayer
12. Add per-prayer notification bell icons to prayer rows

### Phase 3: Qibla Tab
13. Install `expo-sensors`
14. Create `useDeviceHeading` hook (magnetometer + smoothing)
15. Create `useQiblaCompass` hook (heading + bearing + "turn left/right" text)
16. Create `QiblaCompass` SVG component (ring + arrow + Kaaba icon)
17. Create `app/(tabs)/qibla.tsx` tab screen
18. Add distance-to-Kaaba calculation
19. Add "Qibla Found" celebration (gold glow + haptic + scale animation)

### Phase 4: Polish & Warmth
20. Soften prayer row treatment (rounded backgrounds, more padding)
21. Expand Divine Gold usage (date arrows, section headers, sun indicator)
22. Add "Share the Reward" button to Settings + Community header
23. Add all new i18n keys (en + ar)
24. Handle all edge states (no sensor, location denied, calibration, offline)
25. Test on physical device (magnetometer + GPS require real hardware)

---

## 11. What This Does NOT Include

- No AR camera overlay (v2+ consideration)
- No Prayer Tracker (never needed — gamifying worship is not our philosophy)
- No Ramadan mode (next year — seasonal feature, out of scope)
- No Tasbih counter
- No social features beyond sharing
- No theme customization beyond light/dark/system (v2 if demanded)

---

## 12. Summary

| Aspect | Decision |
|---|---|
| **Tab structure** | 4 tabs: Prayer, Qibla, Community, Settings |
| **Authentication** | Removed for regular users. Anonymous push tokens. Auth only for mosque admins |
| **Announcements + Events** | Merged into "Community" tab with segmented control |
| **Sun Arc** | "Living Sky Arc" — gradient-colored arc with prayer dots, animated sun, seasonal height. Beats Pillars' flat orange line |
| **Islamic patterns** | Opacity bumped from 3% to 10%/8%. Visible as architectural presence |
| **Date navigation** | Swipe gesture + arrows + "TODAY" pill + haptic. Better than Pillars' arrows-only |
| **Hijri date** | Promoted to title3 (20px/600) — spiritual significance, not metadata |
| **Active prayer** | Rounded border (Divine Gold, 1.5px) replaces glow dot + tinted background |
| **Per-prayer notifications** | Bell icon on each prayer row. Local scheduled notifications, no auth needed |
| **Gradient transition** | 48px fade zone from hero gradient to list background. Removes clinical hard edge |
| **Qibla** | Dedicated tab. Compass with "Turn to your left/right" instruction |
| **Qibla calculation** | adhan-js `Qibla()` + expo-sensors Magnetometer |
| **Compass visual** | Sapphire ring + Divine Gold arrow + Kaaba icon. "Qibla Found" celebration with haptic + gold glow |
| **Share the Reward** | Prominent button on Settings + Community header. Mosque-specific share text |
| **Warmth fixes** | More Divine Gold usage, softer row treatments, warmer transitions, visible patterns |
| **New dependencies** | Only `expo-sensors` (official Expo SDK) |
| **Backend changes** | PushToken supports anonymous devices. New device-subscribe endpoint |
| **What we keep** | Jamaah times (Pillars doesn't have), mosque-specific community (our moat), Skia infrastructure, existing design system |
| **What Pillars has that we skip** | Prayer Tracker (never), Ramadan tab (next year), Themes marketplace |
