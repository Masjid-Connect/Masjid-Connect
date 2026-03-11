# Design System Enhancement Plan

Build 5 elements: Breath Motion, Sacred Grid, Solar Light, Ambient Tab Indicator, plus codify the visual doctrine.

---

## Element 1 — Breath Animation System
**File:** `lib/breathMotion.ts`

Create a utility that exports breathing-rhythm timing configs for ambient animations. These complement (not replace) the existing spring configs in Theme.ts.

**Exports:**
- `breath.inhale` — 900ms ease-in curve (expansion, brightening)
- `breath.hold` — 200ms plateau
- `breath.exhale` — 1100ms ease-out curve (contraction, dimming)
- `breath.full` — 2200ms full cycle duration
- `withBreathing(sharedValue)` — Reanimated helper that runs a shared value through inhale→hold→exhale→hold cycle on repeat (0→1→1→0)
- `breathEasing` — custom cubic bezier that follows inhale/exhale feel

**Integration points (modify existing files):**
- `GlowDot.tsx` — replace the 2400ms linear pulse with breathing rhythm (inhale brightens, exhale dims)
- `AnimatedSplash.tsx` — use breath timing for the pattern fade-in phase

---

## Element 2 — Sacred Grid System
**File:** `lib/layoutGrid.ts`

Centralize all layout constants that are currently scattered or inline. Single source of truth.

**Exports:**
- `GRID = 8` — base unit
- `layout` object with: screenInset (32), heroHeight (320), rowHeight (64), prayerRowHeight (52), cardRadius (14), sectionSpacing (32), tabBarHeight per platform
- `VISUAL_DOCTRINE` — the rules that make the system self-designing (sky=time, paper=information, gold=divine signal, geometry=structure, motion=breathing)

**Integration:** Update `app/(tabs)/_layout.tsx` to reference `layout.tabBarHeight` instead of inline magic numbers.

---

## Element 3 — Solar Light System
**File:** `components/brand/SolarLight.tsx`

A Skia radial gradient overlay that simulates directional sunlight based on the current prayer.

**Behavior per prayer:**
| Prayer   | Light position       | Opacity |
|----------|---------------------|---------|
| Fajr     | Bottom-left (horizon) | 0.03  |
| Sunrise  | Bottom-center        | 0.04  |
| Dhuhr    | Top-center           | 0.05  |
| Asr      | Right-center         | 0.04  |
| Maghrib  | Bottom-right         | 0.03  |
| Isha     | None (no light)      | 0     |

**Implementation:**
- Skia Canvas with RadialGradient
- Center point shifts based on prayer name
- Color tint varies (cool white for fajr, warm amber for asr/maghrib)
- Maximum 5% opacity — barely perceptible
- In dark mode, opacity halved
- Props: `prayer`, `width`, `height`, `isDark`

---

## Element 4 — Ambient Tab Indicator
**File:** `components/navigation/AmbientTabIndicator.tsx`

Custom tab bar replacing the default with a soft gradient undertone that glides between tabs.

**Implementation:**
- Custom `tabBar` prop on `<Tabs>` component
- Render tabs manually with same Ionicons/labels
- Animated gradient "pill" behind active tab using Skia RadialGradient
- Sacred Blue (light) / Divine Gold Bright (dark) at ~8% opacity
- Horizontal position animated with `springs.gentle`
- Same dimensions/padding as current tab bar

**Integration:** Modify `app/(tabs)/_layout.tsx` to use `tabBar={(props) => <AmbientTabBar {...props} />}`

---

## Element 5 — Barrel Export Updates
- `components/brand/index.ts` — add SolarLight
- `components/navigation/index.ts` (new) — export AmbientTabBar

---

## Implementation Order
1. `lib/breathMotion.ts` — standalone utility
2. `lib/layoutGrid.ts` — standalone constants
3. Update `GlowDot.tsx` — integrate breath motion
4. `components/brand/SolarLight.tsx` — Skia light system
5. `components/navigation/AmbientTabIndicator.tsx` — custom tab bar
6. Update `app/(tabs)/_layout.tsx` — layout grid + ambient tab bar
7. Update barrel exports
8. Update `AnimatedSplash.tsx` — breath timing for pattern phase

## Files Modified (existing)
- `components/brand/GlowDot.tsx`
- `components/brand/AnimatedSplash.tsx`
- `components/brand/index.ts`
- `app/(tabs)/_layout.tsx`

## Files Created (new)
- `lib/breathMotion.ts`
- `lib/layoutGrid.ts`
- `components/brand/SolarLight.tsx`
- `components/navigation/AmbientTabIndicator.tsx`
- `components/navigation/index.ts`
