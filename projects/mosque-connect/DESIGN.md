# Design System

Premium, serene, rooted in Islamic geometric art and calligraphic tradition. **God-tier, not SaaS.** Apple HIG influence throughout.

## Brand Identity

- **Logo**: `Masjid_Logo.png` (The Salafi Masjid logo, transparent background) is the primary brand mark. Used on welcome, auth, and splash screens. **No custom SVG brand mark** — the PNG is the identity.
- **Notification badge**: Divine Gold circle, never red. `GoldBadge` auto-selects `divineGoldBright` in dark mode for contrast.
- **Prayer numerals**: `tabular-nums` font variant with confident weight.

## Colour Palette — "Timeless Sanctuary"

**Taxonomy**: Stone (backgrounds), Onyx (dark), Sapphire (brand), Gold (accent), Sage (success), Crimson (urgent), Slate (info). High-contrast for older congregants, calm for daily use.

### Light — "Morning Light in the Musalla"

| Token | Hex | Use |
|---|---|---|
| Stone-100 | `#F9F7F2` | Main background — clean masjid marble |
| Stone-200 | `#F0EDE6` | Secondary surfaces |
| Stone-300 | `#E5E0D3` | Grouped backgrounds — sand-toned |
| Onyx-900 | `#121216` | Primary text — organic near-black, not harsh |
| Onyx-600 | `#6B6B70` | Secondary text |
| Sapphire-700 | `#0F2D52` | Brand primary, tab selection, links |
| Divine Gold | `#D4AF37` | Accent, prayer active indicator, notification badges |
| Sage-600 | `#2D6A4F` | Success states |
| Crimson-600 | `#B91C1C` | Urgent (Janazah, immediate announcements) |
| Separator | `#E2DFD8` | Warm hairline dividers |

### Dark — "Midnight in the Masjid" (near-OLED)

| Token | Hex | Use |
|---|---|---|
| Onyx-950 | `#0A0A0C` | Main background — not pure black |
| Onyx-850 | `#1A1A1E` | Elevated card surfaces |
| Onyx-800 | `#262628` | Grouped list backgrounds |
| Snow | `#F5F5F7` | Primary text |
| Sapphire-400 | `#5B9BD5` | Lighter sapphire for dark backgrounds |
| Gold Bright | `#E5C14B` | Brighter Divine Gold for dark contrast |

**Semantic layer**: Colours are mapped through `semantic.*` tokens in `Colors.ts` (surface, text, status, brand) for future theme variants (e.g. Ramadan Mode).

## Typography (Apple HIG Type Scale)

- **System fonts** — SF Pro (iOS) / Roboto (Android) via weight variation. **No custom font loading.**
- **14 named styles**: largeTitle (34/700), title1 (28/700), title2 (22/700), title3 (20/600), headline (17/600), body (17/400), callout (16/400), subhead (15/400), footnote (13/400), caption1 (12/400), caption2 (11/400).
- **Special purpose**: prayerCountdown (54/200, ultralight), prayerTime (17/600), sectionHeader (13/600, uppercase + letter-spacing).
- `tabular-nums` for prayer times.
- SpaceMono — technical accents only.

## Design Principles

- **Apple HIG influence** — system fonts, SF-style type scale, grouped list patterns, checkmarks over radio buttons.
- Generous whitespace — 32px screen-edge insets (`spacing['3xl']`).
- 3-tier elevation: none / sm / md / lg (black shadows only — Apple convention).
- LTR only — Arabic/RTL not shipping for MVP.
- Spring-based animations (`Reanimated` `springs.gentle/snappy/bouncy`). **No linear easing.**
- **Button** — 4 variants: primary, secondary, ghost, destructive. Loading spinner matches text height (no layout jank). Compact variant available.
- **BottomSheet** pattern — spring-animated, gesture-dismissible. Replaces all centred modals.
- Haptic feedback only on meaningful interactions (e.g. prayer transitions).
- **Ionicons** (outline/filled pairs) for tabs + UI. **No FontAwesome.**
- Notification badges: Divine Gold, never red — *a glint, not an error*.
- `i18n` everywhere — all user-facing strings via `t()`. No hardcoded English.

## Admin UX — Non-Technical User First

Mosque administrators (imams, board members, volunteers) are often **not tech-savvy**. Every admin-facing surface follows these rules:

- **Zero jargon** — "Add an announcement" not "Create a record".
- **Guided flows** — step-by-step wizards for complex tasks, not raw forms.
- **Sensible defaults** — pre-fill dates, times, calculation methods. Minimise required fields.
- **Inline help** — brief contextual hints on every form field.
- **Forgiving input** — accept times in any reasonable format, auto-correct obvious mistakes.
- **Confirmation dialogs** — always confirm before destructive actions (delete, unpublish).
- **Visual feedback** — clear success/error states with human-readable messages, not codes.
- **Mobile-first admin** — must work on phones, not just desktop.
- **Minimal training** — a volunteer who has never used the app should post an announcement within 60 seconds of opening the admin panel.

Applies to Django admin customisations, in-app admin screens, and any mosque management flows.
