# Plan: Fix Native Splash + Redesign Welcome Screen

## 1. Remove Native Splash Screen Image

**Problem**: `app.json` has `splash.image` set to `Masjid_Logo.png`, which shows a raw logo + app name on a plain background before JS loads. This competes with and cheapens the AnimatedSplash.

**Fix**: Keep the splash config but remove the image — just show the warm background color while JS boots, then let AnimatedSplash handle the reveal.

Remove `"image": "./assets/images/Masjid_Logo.png"` from the splash config. The user sees warm limestone (#F8F6F1) for the ~1s native splash, then AnimatedSplash takes over with the gradient + pattern + logo reveal. Clean handoff.

**File**: `app.json`

---

## 2. Redesign Welcome Screen — God-Tier Aesthetic

**Problem**: The current welcome screen uses `expo-linear-gradient` for the background and has no Islamic pattern texture, no Skia atmosphere, no breath-paced animation. It's functional but generic — doesn't match the premium brand language.

**Design**: Three-zone layout reimagined with the full design system:

### Full-Screen Background Layers (behind everything)
- `SkiaAtmosphericGradient` using the default prayer gradient (neutral sky) — full screen
- `IslamicPattern` at 3% opacity over the gradient (Sacred Blue, tileSize 56)
- `SolarLight` for subtle directional warmth (default/dhuhr position)

### Zone 1: Identity (upper portion — generous breathing room)
- `Masjid_Logo.png` centered with generous top padding
- Animate: fade in with gentle scale (0.95 → 1.0) on mount using `springs.gentle`
- Tagline below logo in `subhead` style, secondary text color, also animated fade-in

### Zone 2: Actions (bottom — clear, generous spacing)
- Semi-transparent frosted card behind action buttons for legibility on atmospheric background
- Keep all auth buttons (Google, Apple, Email, Sign In link, Guest)
- Google: Keep official branding (white/dark card with stroke)
- Apple: Keep system Apple style (black/white toggle)
- Email: Sacred Blue outlined on semi-transparent background
- Guest: Barely visible caption at bottom
- Staggered fade-in from bottom (50ms delay between each button), spring animation

### Animation Sequence (on mount)
- Background layers: instant (no animation, already present)
- Logo + tagline: fade in 0→1, scale 0.95→1.0, delay 200ms, springs.gentle
- Each action button: fade in 0→1, translateY 20→0, staggered 60ms apart, starting at 500ms
- All using Reanimated shared values

**File to modify**: `app/(auth)/welcome.tsx`

---

## 3. Implementation Order

1. Fix `app.json` — remove splash image
2. Redesign `welcome.tsx` — full aesthetic overhaul with Skia atmospheric layers + animated entrance
3. Commit and push to `claude/review-design-system-rfZiv`
