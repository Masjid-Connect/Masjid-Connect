# Plan: Design System Tightening & Logo Background Fix

## Problem
1. **Logo background mismatch**: `Masjid_Logo.png` has a baked-in gray background (~#E0E0E0) that clashes with the app's limestone (#F8F6F1) background on the welcome screen
2. **29 hardcoded colors** across screens instead of using semantic tokens
3. **7 hardcoded spacing values** in tab layout and MosqueCard
4. **Missing `colors.inverseText`** semantic token — most hardcoded #FFFFFF instances are white text on colored buttons

## Scope — What We WILL Do

### Phase 1: Logo Background Fix (welcome screen)
- The logo PNG has a gray background baked in. We cannot edit the PNG programmatically.
- **Fix**: Set the welcome screen logo `Image` component to use a `tintColor` if the logo is single-color (it is — black text only). This makes the PNG render in `colors.text` on the transparent area, and the background becomes the limestone behind it.
- **Alternative if tintColor doesn't work cleanly**: Wrap the logo in a View with `backgroundColor: '#E8E6E1'` (approximate match) — but this is a hack. Better: ask user for a transparent-background PNG.

### Phase 2: Add `inverseText` Semantic Token (Colors.ts)
- Add `inverseText: '#FFFFFF'` to light scheme and `inverseText: '#000000'` to dark scheme
- Add `onPrimary: '#FFFFFF'` for text on brand-colored buttons (same in both themes since Sacred Blue/Divine Gold always need white text)
- Add `backdrop: 'rgba(0,0,0,0.4)'` for bottom sheet overlay

### Phase 3: Replace Hardcoded Colors (13 files)
Replace all 29 hardcoded hex colors with semantic tokens:

| File | Change |
|------|--------|
| `welcome.tsx` | `#FFFFFF` → `colors.inverseText` (5 places), `#000000` → `palette.black`, `#FFFFFF` bg → `colors.card` |
| `settings.tsx` | `#FFFFFF` → `colors.inverseText` (6 places) |
| `events.tsx` | `#FFFFFF` → `colors.inverseText` (2 places) |
| `(tabs)/_layout.tsx` | `#F8F6F1` → `colors.background`, `#000000` → `colors.background`, rgba literals → palette references |
| `MosqueCard.tsx` | `#FFFFFF` → `colors.inverseText` |
| `BottomSheet.tsx` | `rgba(0,0,0,0.4)` → `palette.backdrop` |
| `Button.tsx` | `#FFFFFF` → `colors.inverseText` |
| `GoldBadge.tsx` | `#FFFFFF` → keep (always needs white on gold) |
| `login.tsx` | `#FFF` → `colors.inverseText` |
| `register.tsx` | `#FFF` → `colors.inverseText` |

### Phase 4: Replace Hardcoded Spacing (tab layout + MosqueCard)
| File | Line | Current | Fix |
|------|------|---------|-----|
| `(tabs)/_layout.tsx` | 22 | `paddingTop: 4` | `spacing.xs` |
| `(tabs)/_layout.tsx` | 26 | `paddingBottom: 8` | `spacing.sm` |
| `(tabs)/_layout.tsx` | 31 | `marginTop: 2` | `spacing['2xs']` |
| `(tabs)/_layout.tsx` | 29 | `fontSize: 10` | `typography.caption2.fontSize` |
| `MosqueCard.tsx` | 45 | `marginTop: 2` | `spacing['2xs']` |
| `MosqueCard.tsx` | 49,87 | `marginTop: 4` | `spacing.xs` |

### Phase 5: Fix settings.tsx key warning
The console error in the screenshot: "Each child in a list should have a unique key prop" at `settings.tsx:306:13`. Fix the `.map()` call to use a stable key.

## Scope — What We Will NOT Do (Separate Work)
- **ConvergentArch.tsx SVG component** — requires design decisions (line weight, animation), separate PR
- **KozoPaperBackground texture** — was intentionally removed for performance
- **Brand tokens** (`brand.splash.*`, `brand.stroke.*`) — only useful once ConvergentArch exists
- **Prayer gradient extraction** — those are atmospheric and intentionally inline

## Files Modified
1. `constants/Colors.ts` — add inverseText, onPrimary, backdrop tokens
2. `app/(auth)/welcome.tsx` — fix logo bg + replace hardcoded colors
3. `app/(tabs)/_layout.tsx` — replace hardcoded spacing + colors
4. `app/(tabs)/settings.tsx` — replace hardcoded colors + fix key warning
5. `app/(tabs)/events.tsx` — replace hardcoded colors
6. `components/ui/BottomSheet.tsx` — replace backdrop color
7. `components/ui/Button.tsx` — replace hardcoded white
8. `components/mosque/MosqueCard.tsx` — replace hardcoded spacing + color
9. `app/(auth)/login.tsx` — replace hardcoded white
10. `app/(auth)/register.tsx` — replace hardcoded white
