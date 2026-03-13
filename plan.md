# "Timeless Sanctuary" Palette Elevation — Implementation Plan

## The Honest Assessment

Your feedback is right: the current palette is competent but generic. Sacred Blue (#1A5276) reads as "corporate dashboard," not "house of worship." The proposed Emerald-700 (#064E3B) is a dramatically better brand primary — it carries centuries of Islamic visual heritage without being cliché.

However, not everything from the council's roadmap belongs in this codebase. The DOCTRINE says: "If a dependency can be replaced by 20 lines of code, write the code instead." Box/Text/Stack/Surface primitives add an abstraction layer on top of React Native's already-clean StyleSheet pattern. That's framework-building, not product-building. Same with Ramadan Mode — beautiful idea, but premature without a user base asking for it.

**What we WILL do:** Transform the visual identity through the palette swap, add a thin semantic alias layer, and update every downstream reference.

**What we WON'T do (yet):** Primitive component library, adaptive theming infrastructure, ESLint governance plugin. These are Phase 2+ concerns once the palette proves itself in production.

---

## Phase 1: Core Palette Rewrite (`constants/Colors.ts`)

### New Raw Palette Values

| Token | Current Hex | New Hex | Why |
|-------|-----------|---------|-----|
| `limestone` → `stone100` | `#F8F6F1` | `#F9F7F2` | Warmer marble — nearly identical, subtle shift |
| `limestoneSecondary` → `stone200` | `#F2EFEA` | `#F0EDE6` | Slightly warmer secondary |
| `limestoneTertiary` → `stone300` | `#EDEAE4` | `#E5E0D3` | Sand-200 — warmer grouped bg |
| `ink` → `onyx900` | `#1C1C1E` | `#121216` | Softer near-black, less harsh |
| `inkSecondary` → `onyx600` | `#636366` | `#6B6B70` | Slightly warmer gray |
| `inkTertiary` | `#AEAEB2` | `#A8A8AD` | Matched warmth |
| `sacredBlue` → `emerald700` | `#1A5276` | `#064E3B` | **THE big change** — brand primary becomes deep emerald |
| `sacredBlueLight` → `emerald400` | `#6AADDB` | `#34D399` | Light emerald for dark mode tint |
| `divineGold` | `#BFA14E` | `#D4AF37` | Richer, more confident gold |
| `divineGoldBright` | `#D4B85C` | `#E5C14B` | Brighter variant for dark mode |
| `paradiseGreen` → `emerald600` | `#2D6A4F` | `#047857` | Success green, now part of emerald family |
| `moorishTerracotta` → `crimson600` | `#C44536` | `#B91C1C` | Deeper, more authoritative alert |
| `steelBlue` → `slate500` | `#5B7FA5` | `#64748B` | Neutral info color (no longer blue-biased) |
| `black` → `onyx950` | `#000000` | `#0A0A0C` | Not pure black — easier on OLED at night |
| `darkElevated` → `onyx850` | `#1C1C1E` | `#1A1A1E` | Slightly warmer elevated surface |
| `darkGrouped` → `onyx800` | `#2C2C2E` | `#262628` | Warmer grouped background |

### Palette Naming Strategy

Old names (`sacredBlue`, `limestone`, `ink`) become aliases pointing to new values during the migration, then get removed in a cleanup pass. New canonical names use the Stone/Onyx/Emerald taxonomy.

### Semantic Alias Layer

Add a `semantic` object that maps intent to palette values. This is the "Vercel tier 2" from the council, but implemented as a simple typed object — no new runtime abstraction:

```typescript
export const semantic = {
  surface: {
    main: { light: palette.stone100, dark: palette.onyx950 },
    card: { light: palette.white, dark: palette.onyx850 },
    grouped: { light: palette.stone300, dark: palette.onyx800 },
  },
  text: {
    primary: { light: palette.onyx900, dark: palette.snow },
    secondary: { light: palette.onyx600, dark: palette.snowSecondary },
    onBrand: { light: palette.white, dark: palette.white },
  },
  status: {
    activePrayer: { light: palette.divineGold, dark: palette.divineGoldBright },
    upcoming: { light: palette.divineGold, dark: palette.divineGoldBright },
    urgent: { light: palette.crimson600, dark: palette.crimson400 },
    success: { light: palette.emerald600, dark: palette.emerald400 },
  },
  brand: {
    primary: { light: palette.emerald700, dark: palette.emerald400 },
    accent: { light: palette.divineGold, dark: palette.divineGoldBright },
  },
} as const;
```

The existing `Colors.light` / `Colors.dark` objects and `getColors()` accessor remain the primary API. Components keep using `colors.tint`, `colors.accent`, etc. The semantic map serves as documentation and a future hook point for theme variants (Ramadan Mode).

### Updated Alpha Tokens

All `rgba()` values in the `alpha` map get recalculated for the new palette:
- Urgent backgrounds: Crimson-600 base instead of Terracotta
- Prayer active backgrounds: Gold-500 base (slightly richer)
- Frosted backgrounds: Stone-100 / Onyx-850 base

### Files changed: 1
- `constants/Colors.ts`

---

## Phase 2: Prayer Gradient Recalibration (`lib/prayerGradients.ts`)

The atmospheric gradients shift from blue-tinted to green/warm-tinted:

- **Light mode bottom stop**: `#F8F6F1` → `#F9F7F2` (new stone100)
- **Fajr**: Cool dawn stays cool but the bottom anchors to warmer stone
- **Dhuhr**: Bright sky gains a whisper of emerald warmth
- **Asr/Maghrib**: Already warm — minimal change
- **Dark mode bottom stop**: `#000000` → `#0A0A0C` (new onyx950)

### Files changed: 1
- `lib/prayerGradients.ts`

---

## Phase 3: Solar Light Warmth Adjustment (`components/brand/SolarLight.tsx`)

Solar light tint colors are atmospheric (not brand-colored), but we warm the neutral tones slightly to match the new palette's organic character:
- Dhuhr neutral white: `#F5F0E8` → `#F5F0E6` (barely perceptible)
- Minor adjustments to sunrise/asr warmth

### Files changed: 1
- `components/brand/SolarLight.tsx`

---

## Phase 4: Navigation Theme Update (`app/_layout.tsx`)

React Navigation theme objects reference palette values directly:

**MosqueLight:**
- `primary`: sacredBlue → emerald700
- `background`: limestone → stone100
- `text`: ink → onyx900
- `notification`: divineGold → updated hex

**MosqueDark:**
- `primary`: divineGoldBright → updated hex
- `background`: black → onyx950
- `card`: darkElevated → onyx850

Modal `headerTintColor`: sacredBlue → emerald700

### Files changed: 1
- `app/_layout.tsx`

---

## Phase 5: Settings Icon Colors (`app/(tabs)/settings.tsx`)

Settings rows use direct palette references for icon backgrounds:
- `palette.sacredBlue` → `palette.emerald700` (announcements, share icons)
- `palette.paradiseGreen` → `palette.emerald600` (notifications, time, contact icons)
- `palette.divineGold` → updated hex (events, rate icons)
- `palette.moorishTerracotta` → `palette.crimson600` (danger zone icons)

### Files changed: 1
- `app/(tabs)/settings.tsx`

---

## Phase 6: ThemePreviewSheet Colors (`components/settings/ThemePreviewSheet.tsx`)

Mini-preview cards have hardcoded hex values:
- Light preview accent: `#BFA14E` → `#064E3B` (brand primary)
- Light preview bg: `#F8F6F1` → `#F9F7F2`
- Dark preview accent: `#D4B85C` → `#34D399` (light emerald)
- Dark preview bg: `#000000` → `#0A0A0C`

### Files changed: 1
- `components/settings/ThemePreviewSheet.tsx`

---

## Phase 7: Islamic Pattern Color References

Three call sites pass `palette.sacredBlue` / `palette.sacredBlueLight` to IslamicPattern:

| File | Change |
|------|--------|
| `app/(tabs)/index.tsx:122` | `sacredBlue` → `emerald700`, `sacredBlueLight` → `emerald400` |
| `app/(tabs)/events.tsx:238` | Same swap |
| `components/brand/AnimatedSplash.tsx:203` | Same swap |

### Files changed: 3

---

## Phase 8: Event Category Colors (`types/index.ts`)

`EVENT_CATEGORY_COLORS` map references palette colors for category accent strips. These shift to the emerald/warm family.

### Files changed: 1
- `types/index.ts`

---

## Phase 9: Expo Config (`app.json`)

Splash screen background color: `#F8F6F1` → `#F9F7F2` (if present)
Android adaptive icon background: update if referencing old limestone

### Files changed: 1
- `app.json`

---

## Phase 10: Documentation (`CLAUDE.md`)

Update the design system color section to reflect:
- New palette names (Stone/Onyx/Emerald/Gold/Crimson taxonomy)
- New hex values
- Philosophy shift ("Timeless Sanctuary" over "Apple-inspired with Islamic soul")
- Semantic alias documentation

### Files changed: 1
- `CLAUDE.md`

---

## Total Scope

- **12 files modified** (no new files created)
- **Zero new dependencies**
- **Zero new runtime abstractions** — same `getColors()` API, same `palette.*` imports
- **Backwards compatible** — old palette names become aliases during transition

## What We're NOT Doing (and Why)

| Council Suggestion | Decision | Reason |
|-------------------|----------|--------|
| Box/Text/Stack/Surface primitives | **Skip** | StyleSheet.create() + typography tokens is already idiomatic RN. `<Box p="md">` adds indirection without readability gain for a 4-screen app. |
| Ramadan Mode / adaptive theming | **Skip** | The semantic alias layer makes this possible later. Building infrastructure now violates "no hypothetical future requirements." |
| ESLint no-inline-styles plugin | **Skip** | Good governance, but it's dev tooling — not design elevation. Can add anytime. |
| ClockFace / StatusBadge domain primitives | **Skip** | We have 4 screens. Custom domain primitives are warranted at 10+ screens sharing patterns. |
| Three-tier token architecture | **Partial** | We add the semantic layer (tier 2) as a typed object. Tier 3 (component overrides) is unnecessary — components already reference tokens directly. |

## Execution Order

1. Phase 1 (Colors.ts) — the foundation everything depends on
2. Phases 2–3 (gradients, solar light) — atmospheric system
3. Phases 4–9 (all consumers) — can be done in parallel
4. Phase 10 (docs) — final pass
