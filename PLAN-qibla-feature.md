# Qibla Direction Feature — Research & Implementation Plan

## Executive Summary

A Qibla compass is a natural, high-value addition to Mosque Connect. It fits perfectly alongside prayer times as a core daily-use utility — users already open the app for prayer schedules, and knowing which direction to face is the immediate next need. This plan covers how it fits architecturally, what the UX should look like, and a step-by-step implementation path.

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

2. **Distance to Kaaba** — Google shows "X,XXX km to Kaaba." This is a one-line addition using the haversine formula and adds emotional resonance. adhan-js doesn't provide this, but it's ~10 lines of math.

3. **The "found it" moment** — Google enlarges the Kaaba icon and brightens the line when aligned. We can do this with our Divine Gold glow + haptic feedback + a satisfying animation.

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
- **Distance to Kaaba** — Haversine distance formula. ~10 lines. Adds the Google-style "8,200 km to Kaaba" emotional element.

### Future Enhancement: AR Mode (v2+)

If user demand warrants it, a future version could add an AR camera mode using:
- `expo-camera` for the camera feed
- A simple overlay (not full 3D AR) — just the directional line rendered on top of the camera preview
- This would be the "Google-style" experience without needing ViroReact
- Toggle between compass mode (default) and AR mode (opt-in)

This is explicitly out of scope for v1 but architecturally possible without rewriting the compass logic.

---

## 1. How It Fits Into the App

### Option A: Dedicated Tab (Recommended Against)
Adding a 5th tab would crowd the tab bar and violate the "4 tabs max" HIG guideline. Qibla is a utility, not a content feed — it doesn't warrant its own persistent navigation slot.

### Option B: Standalone Screen via Prayer Times Tab (Recommended)
The Qibla compass lives as a **sub-screen accessible from the Prayer Times (home) tab**. This is the strongest fit because:

- **Contextual proximity** — Users checking prayer times naturally need Qibla direction next
- **No tab bar changes** — Preserves the clean 4-tab layout
- **Discoverable entry point** — A prominent "Qibla" button/card on the home screen, positioned between the prayer hero section and the timetable
- **Route**: `app/qibla.tsx` (a stack screen pushed from the home tab, not a tab itself)

### Option C: Settings/Tools Sub-section
Burying it in Settings would hurt discoverability. Qibla is a primary use-case, not a preference.

**Verdict: Option B** — a full-screen compass experience launched from the prayer times home screen.

---

## 2. Entry Point Design

On the Prayer Times home screen (`app/(tabs)/index.tsx`), add a **Qibla Direction card** below the prayer hero and above the timetable:

```
┌─────────────────────────────────────┐
│  [Atmospheric gradient hero]        │
│  Next prayer: Asr                   │
│  15:42  ·  2h 30m remaining         │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🧭  Qibla Direction     →    │  │
│  │ 119.2° SE from your location  │  │
│  └───────────────────────────────┘  │
│                                     │
│  PRAYER SCHEDULE                    │
│  Fajr ........... 05:12   05:30    │
│  ...                                │
└─────────────────────────────────────┘
```

The card would:
- Show the calculated Qibla bearing (static, from `adhan-js`)
- Use a small compass icon (Ionicons: `compass-outline`)
- Tapping navigates to the full Qibla compass screen
- Render in the app's Stone/Onyx card style with subtle elevation

---

## 3. Qibla Compass Screen — Full UX

### Layout (Full-screen, immersive)

```
┌─────────────────────────────────────┐
│  ← Qibla Direction                  │  (header with back button)
│                                     │
│         ┌─────────────┐            │
│        /               \           │
│       │    Compass      │          │
│       │    Rose with    │          │
│       │    Qibla        │          │
│       │    Indicator    │          │
│        \               /           │
│         └─────────────┘            │
│                                     │
│         119.2° SE                   │  (bearing + cardinal direction)
│                                     │
│   ┌─────────────────────────────┐  │
│   │ Hold your device flat and   │  │
│   │ point the arrow toward      │  │
│   │ the Qibla direction         │  │
│   └─────────────────────────────┘  │
│                                     │
│   Accuracy: High ●                  │  (sensor accuracy indicator)
│                                     │
└─────────────────────────────────────┘
```

### Visual Design Principles (matching "Timeless Sanctuary")

- **Compass rose**: Custom SVG drawn with `react-native-svg`, using Sapphire-700 (light) / Sapphire-400 (dark) for the ring, Stone colors for tick marks
- **Qibla indicator**: A Divine Gold arrow/marker pointing toward Mecca — the gold accent naturally draws attention
- **North indicator**: Subtle Crimson marker for cardinal North
- **Background**: Clean Stone-100 / Onyx-950 — no gradient noise competing with the compass
- **Typography**: Bearing displayed in `prayerCountdown` style (54pt ultralight) for visual consistency with the prayer time display
- **Animation**: Spring-based rotation via `react-native-reanimated` (using `springs.gentle` for smooth compass movement, no linear easing)
- **Haptic**: Light haptic pulse when the device aligns within ±3° of Qibla (meaningful feedback)

### States

1. **Loading** — Requesting location permission + acquiring GPS fix
2. **Calibration needed** — Magnetometer accuracy is low; show figure-8 calibration prompt
3. **Active** — Compass rotating in real-time, Qibla indicator visible
4. **Aligned** — Device pointing within ±3° of Qibla; Divine Gold glow + haptic + "Qibla Found" label
5. **Error** — No magnetometer (emulator/old device) or location denied; show static bearing + manual instructions
6. **Offline** — Works fully offline (adhan-js Qibla calculation + device sensors = no network needed)

---

## 4. Technical Architecture

### Dependencies

| Dependency | Status | Purpose |
|---|---|---|
| `adhan` (adhan-js) | Already installed | `Qibla(coordinates)` — calculates bearing to Mecca |
| `expo-location` | Already installed (unused) | Get user's GPS coordinates |
| `expo-sensors` | **Needs install** | `Magnetometer` API for compass heading |
| `react-native-reanimated` | Already installed | Spring-animated compass rotation |
| `react-native-svg` | Already installed | Compass rose SVG rendering |
| `expo-haptics` | Already installed | Alignment feedback |

**Only 1 new dependency: `expo-sensors`** — this is an official Expo SDK package, well within the Doctrine's spirit (it's part of the Expo managed workflow).

### Qibla Bearing Calculation (Already Solved)

The `adhan` library already provides this:

```typescript
import { Coordinates, Qibla } from 'adhan';

const coordinates = new Coordinates(52.4694, -1.8712); // Birmingham
const qiblaBearing = Qibla(coordinates); // ~119° (SE direction)
```

This is a **pure math calculation** — no network needed, works offline, high precision (derived from "Astronomical Algorithms" by Jean Meeus).

### Compass Heading (New)

```typescript
import { Magnetometer } from 'expo-sensors';

// Subscribe to magnetometer updates
Magnetometer.addListener(({ x, y, z }) => {
  // Calculate heading from magnetic field components
  let heading = Math.atan2(y, x) * (180 / Math.PI);
  if (heading < 0) heading += 360;
  // Apply smoothing (low-pass filter) to reduce jitter
});
```

### Qibla Needle Rotation

```
needleRotation = qiblaBearing - compassHeading
```

When `needleRotation ≈ 0°`, the device is pointing toward Qibla.

### New Files

```
/app/qibla.tsx                          # Qibla compass screen (stack route)
/components/qibla/QiblaCompass.tsx       # Compass rose + needle component
/components/qibla/QiblaCard.tsx          # Entry point card for home screen
/components/qibla/CalibrationPrompt.tsx  # Figure-8 calibration overlay
/components/qibla/index.ts              # Re-exports
/hooks/useQiblaCompass.ts               # Hook: magnetometer + qibla calculation
/hooks/useDeviceHeading.ts              # Hook: raw compass heading from magnetometer
```

### Data Flow

```
User opens app
  → Home screen shows QiblaCard with static bearing (from adhan-js + stored coordinates)
  → User taps QiblaCard
    → Navigate to /qibla
    → Request location permission (if not granted)
    → Get GPS coordinates (or use cached/default mosque coordinates)
    → Calculate Qibla bearing via adhan-js Qibla()
    → Subscribe to Magnetometer via expo-sensors
    → Animate compass rose rotation (Reanimated spring)
    → When aligned (±3°): haptic + gold glow + "Qibla Found"
    → On unmount: unsubscribe from Magnetometer
```

---

## 5. Location Strategy

Currently the app hardcodes The Salafi Masjid coordinates. For Qibla, this creates a decision point:

### Approach: Use Mosque Coordinates as Default, Device GPS as Enhancement

- **Default**: Calculate Qibla from the subscribed mosque's coordinates (already known). For Birmingham, this is ~119° SE. This is accurate enough for anyone in the Birmingham area.
- **Enhancement**: If the user grants location permission, use their actual GPS coordinates for higher precision. This matters more for users far from their mosque.
- **Fallback chain**: Device GPS → Cached user location → Subscribed mosque coordinates → Default mosque coordinates

This approach means the Qibla card on the home screen works **immediately with zero permissions**, showing the bearing from the mosque's location. The full compass screen requests location only if the user hasn't already granted it.

---

## 6. Internationalization

New i18n keys needed in both `en.json` and `ar.json`:

```json
{
  "qibla": {
    "title": "Qibla Direction",
    "bearing": "{{degrees}}° {{cardinal}}",
    "fromLocation": "from your location",
    "holdFlat": "Hold your device flat and point the arrow toward the Qibla direction",
    "qiblaFound": "Qibla Found",
    "calibrationNeeded": "Compass needs calibration",
    "calibrationInstructions": "Move your device in a figure-8 motion to calibrate the compass",
    "accuracyHigh": "Accuracy: High",
    "accuracyLow": "Accuracy: Low",
    "noSensor": "Compass sensor not available on this device",
    "manualBearing": "The Qibla direction is {{degrees}}° {{cardinal}} from your location",
    "locationDenied": "Location access needed for precise Qibla direction",
    "cardTitle": "Qibla Direction",
    "N": "N", "NE": "NE", "E": "E", "SE": "SE",
    "S": "S", "SW": "SW", "W": "W", "NW": "NW"
  }
}
```

Arabic translations would mirror these with appropriate directional terminology.

---

## 7. Accessibility & Edge Cases

- **No magnetometer** (emulators, very old devices): Show static bearing with cardinal direction text. No compass animation — just a clear "Qibla is 119° Southeast" message with an arrow illustration.
- **Low accuracy**: Show calibration prompt (figure-8 animation) before displaying compass.
- **Magnetic interference**: Note in UI that metallic objects or cases can affect accuracy.
- **Location denied**: Fall back to mosque coordinates (still useful for local congregation).
- **RTL (Arabic)**: Compass is inherently directional (cardinal directions are universal), but all text labels flip. Cardinal abbreviations use Arabic equivalents.
- **VoiceOver/TalkBack**: Announce bearing and cardinal direction as text. Announce "Qibla found" when aligned.

---

## 8. Privacy Considerations

Per best practices:
- Location is used **only** for Qibla calculation — never sent to the backend or stored beyond the session
- Magnetometer data stays on-device
- No analytics on compass usage
- Location permission description already exists in `app.json` (for prayer times), so no new permission dialogs needed if already granted

---

## 9. Implementation Steps

### Phase 1: Foundation
1. Install `expo-sensors` dependency
2. Create `useDeviceHeading` hook (magnetometer subscription, heading calculation, smoothing)
3. Create `useQiblaCompass` hook (combines device heading + adhan-js Qibla bearing)
4. Add i18n keys to `en.json` and `ar.json`

### Phase 2: UI Components
5. Create `QiblaCard` component (home screen entry point showing static bearing)
6. Create `QiblaCompass` component (animated SVG compass rose + Qibla needle)
7. Create `CalibrationPrompt` component (figure-8 animation overlay)

### Phase 3: Screen & Navigation
8. Create `app/qibla.tsx` screen (full compass experience)
9. Add `QiblaCard` to home screen (`app/(tabs)/index.tsx`)
10. Wire up navigation from card tap → qibla screen

### Phase 4: Polish
11. Add haptic feedback on Qibla alignment
12. Add "Qibla Found" gold glow animation
13. Handle all error/edge states (no sensor, location denied, calibration)
14. Test on physical device (magnetometer requires real hardware)

---

## 10. What This Does NOT Include (Keeping Scope Tight)

Per Doctrine:
- No AR camera overlay (would require `expo-camera`, adds complexity, niche use)
- No "Qibla map" with satellite imagery (unnecessary for direction-finding)
- No backend changes (everything is client-side)
- No new tab (stays as a sub-screen)
- No social/sharing features ("share your Qibla" makes no sense)
- No Tasbih counter or other unrelated features bundled in

---

## 11. Summary

| Aspect | Decision |
|---|---|
| **Where it lives** | Sub-screen from Prayer Times tab, route: `/qibla` |
| **Entry point** | QiblaCard on home screen showing bearing |
| **New dependencies** | Only `expo-sensors` (official Expo package) |
| **Qibla calculation** | `adhan-js` `Qibla()` — already installed, same haversine math as Google |
| **Why not react-native-qibla-compass** | Low maintenance (18 commits, no releases in 12mo), black-box math, still needs expo-sensors anyway |
| **Why not AR (Google-style camera)** | Requires ejecting Expo managed workflow or heavy deps (ViroReact); camera permission friction; builds two UIs. Deferred to v2+ |
| **What we take from Google** | Clean single-line indicator (not busy compass rose), distance to Kaaba, strong "found it" moment, minimal chrome |
| **Compass heading** | `expo-sensors` Magnetometer + low-pass filter smoothing |
| **Compass visual** | Custom SVG — prominent Qibla arrow (Divine Gold) + minimal compass ring (Sapphire) |
| **Compass animation** | `react-native-reanimated` spring physics with 0°/360° wrap handling |
| **Distance to Kaaba** | Haversine formula (~10 lines) — e.g., "8,200 km to the Kaaba" |
| **Magnetic declination** | Ignored for v1 (~1° in Birmingham, within ±3° threshold). WMM lookup possible in v2 |
| **Offline** | Fully offline — pure math + device sensors, zero network |
| **Location** | Mosque coordinates default, device GPS enhancement |
| **Alignment feedback** | Haptic + Divine Gold glow + enlarging Kaaba icon when within ±3° |
| **Fallback (no sensor)** | Static bearing text + arrow illustration + distance |
| **i18n** | Full English + Arabic translations |
| **Backend changes** | None |
| **Future (v2)** | AR camera overlay (expo-camera + simple line overlay, not full 3D), sensor fusion (expo-sensor-fusion), magnetic declination correction |
