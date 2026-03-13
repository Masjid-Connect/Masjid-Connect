# Qibla Direction Feature — Research & Implementation Plan

## Executive Summary

A Qibla compass is a natural, high-value addition to Mosque Connect. It fits perfectly alongside prayer times as a core daily-use utility — users already open the app for prayer schedules, and knowing which direction to face is the immediate next need. This plan covers how it fits architecturally, what the UX should look like, and a step-by-step implementation path.

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
| **Qibla calculation** | `adhan-js` `Qibla()` — already installed |
| **Compass** | `expo-sensors` Magnetometer + Reanimated spring animation |
| **Compass visual** | Custom SVG compass rose with Divine Gold Qibla needle |
| **Offline** | Fully offline — pure math + device sensors |
| **Location** | Mosque coordinates default, device GPS enhancement |
| **Alignment feedback** | Haptic + gold glow when pointing at Qibla (±3°) |
| **Fallback** | Static bearing text when no magnetometer available |
| **i18n** | Full English + Arabic translations |
| **Backend changes** | None |
