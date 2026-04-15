# Design System

Premium, serene, rooted in Islamic geometric art and calligraphic tradition. **God-tier, not SaaS.** Apple HIG as a *starting* influence for mobile, not a ceiling; editorial craft for web. Reference quality bar: Linear, Apple Weather, Rauno Freiberg, Teenage Engineering, boutique editorial — not Notion, not Material, not generic iOS Settings.

## Brand Identity

- **Logo**: `Masjid_Logo.png` (The Salafi Masjid logo, transparent background) is the primary brand mark. Used on welcome, auth, and splash screens. **No custom SVG brand mark** — the PNG is the identity.
- **Notification badge**: Divine Gold circle, never red. `GoldBadge` auto-selects `divineGoldBright` in dark mode for contrast.
- **Prayer numerals**: tabular, tightened tracking, set in the display face (see Typography).

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

**Semantic layer**: Colours mapped through `semantic.*` tokens in `Colors.ts` (surface, text, status, brand) for future theme variants (e.g. Ramadan Mode).

## Typography

**Two-face system — one display, one body.** System fonts alone are definitional SaaS typography and incompatible with the "god-tier" aspiration. One carefully-chosen display face carries the moments of elevation; system fonts carry body and UI for performance and familiarity.

### Display face — **Fraunces** (variable)

- **Why Fraunces**: free (SIL Open Font License), variable axes (weight + optical size + softness), contemporary yet serif-traditional, holds up at 54px prayer-countdown and at 28px title size. Roughly 80KB per variable-font file. Loaded once, cached.
- **Loaded via**: `expo-font` on mobile (at `assets/fonts/Fraunces-VariableFont_SOFT,WONK,opsz,wght.ttf`), `@font-face` + `<link rel="preload">` on web (woff2 served from `/web/fonts/`). `font-display: swap` so first paint isn't blocked.
- **Applied at** (and nowhere else):
  - Mobile: `prayerCountdown`, `prayerName`, `largeTitle`, `title1`, `title2` (hero/screen titles only — not list rows, not buttons, not body copy).
  - Web: `h1`, `h2`, section hero titles, prayer-time numerals on `/prayer-times`, principle numerals on `/about`.

### Body / UI — system fonts

- SF Pro (iOS) / Roboto (Android) / system-ui (web). Unchanged from before.
- Used for: body text, buttons, list rows, captions, navigation, form labels.

### Type scale (designed tokens, not copied from Apple HIG)

Named tokens live in `constants/Theme.ts` (mobile) and as `--fs-*` CSS custom properties (web). Each token has a specific job; no arbitrary `fontSize` values in components.

| Token | Mobile size / weight | Web size / weight | Face | Use |
|---|---|---|---|---|
| `prayerCountdown` | 54 / 250, tracking -2.5 | — | Fraunces | Active-prayer countdown (single most-viewed numeral) |
| `prayerTimeLarge` | — | clamp(32, 4vw, 48) / 300, tabular | Fraunces | Web `/prayer-times` jama'ah times |
| `largeTitle` | 34 / 600 | clamp(44, 6vw, 72) / 500 | Fraunces | Screen / page titles |
| `title1` | 28 / 600 | 32 / 500 | Fraunces | Section titles |
| `title2` | 22 / 600 | 24 / 500 | Fraunces | Subsections |
| `title3` | 20 / 600 | 20 / 500 | Fraunces | Card titles, picker headers |
| `headline` | 17 / 600 | 17 / 600 | System | Row headlines, emphasised body |
| `body` | 17 / 400 | 17 / 400, line-height 1.6 | System | Default paragraph |
| `callout` | 16 / 400 | 16 / 400 | System | Secondary paragraph |
| `subhead` | 15 / 400 | 15 / 400 | System | Captions above content |
| `footnote` | 13 / 400 | 13 / 400 | System | Muted metadata |
| `caption` | 12 / 400 | 12 / 400 | System | Tiny labels |

Tabular numerals + tightened tracking (`-2.5`) at `prayerCountdown` and `prayerTimeLarge`. Default tracking elsewhere.

## Motion Vocabulary

Motion is a language with a fixed grammar. No motion-for-motion's-sake, no linear easing, no spring-bounce on exit (bounces on entry read as life; bounces on exit read as rubber).

| Class | Duration | Curve | Use |
|---|---|---|---|
| **Tap response** | 120–180ms | Ease-out | Button press, list row flash, toggle commit |
| **Screen transition** | 320–450ms | `springs.snappy` (critically damped, no overshoot) | Navigation push/pop, tab switch |
| **Sacred moment** | 800–1000ms | Multi-element choreographed sequence | Prayer change (countdown dissolves → name cross-fades w/ 200ms nudge → gradient re-interpolates → gold bloom last). See `hooks/usePrayerTimes` transition. |
| **Entrance reveal** | 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` | First-load card reveals. **Skip on return visits** — content should be *there*, not *arriving*. |
| **Exit** | 280ms | Apple emphasized-accelerate `cubic-bezier(0.32, 0.72, 0, 1)` | Sheet dismiss, modal close, view pop. Timing, not spring. |
| **Ambient** | Slow pulse (2.4s cycle) | Gentle sine | GoldPulse, LIVE indicator (note: replaces the red broadcast-TV LIVE badge; see Imagery) |
| **Haptic accompaniment** | Concurrent | Light impact | Prayer transition only. Nowhere else. |

Forbidden: linear easing anywhere; `springs.gentle` on horizontal travel >200pt (overshoots noticeably); stagger on return visits; motion that fires on every re-render.

## Imagery — AI-generated line art doctrine

The app has no photography of the masjid and no immediate pipeline to commission one. Rather than ship a template without imagery, the aesthetic commits to **simple, distinctive line art** generated via Runware and Nano Banana 2 (Gemini 3 Pro Image). Line art is cheaper than photography, more distinctive than stock, and consistent with the serene/editorial register.

### When line art is appropriate

- Islamic geometric patterns (3 variants — zellige, girih strapwork, Cufic square)
- Architectural moments the masjid can't / won't photograph (exterior silhouette, mihrab detail, minbar, open Qur'an)
- 404 and other editorial pauses (a single calligraphic fragment or architectural detail, not functional content)

### When line art is NOT appropriate

- The brand logo (`Masjid_Logo.png` is locked)
- Functional UI icons (need semantic consistency — hand-drawn SVG Ionicons-replacement, not AI)
- Arabic calligraphy as content (too high-stakes — authenticity matters; source from a calligrapher, not an AI)
- Photography substitutes where literal photography is preferable (staff portraits — don't fake a teacher's face)

### Generation rules (for the prompts, wherever they run)

1. **Regional provenance named in every pattern prompt**. "Zellige geometric pattern, Moroccan Fez style, 8-fold symmetry" — not "Islamic pattern, ornate."
2. **Line weight explicit**. "1.5px stroke on warm off-white ground, no fill, no gradient, no shading."
3. **One motif per image**. Single commanding element, not a collage.
4. **Palette-matched**. Sapphire-700 (`#0F2D52`) line on Stone-100 (`#F9F7F2`), or Divine Gold (`#D4AF37`) line at low-alpha on dark Sapphire. No full-colour illustration, no rainbow.
5. **Output**: PNG/WebP at 2× intended display resolution, transparent background preferred. Vectorise later if worth the effort (potrace / Vectorizer.AI); raster is acceptable for MVP.
6. **Seat 23 (Khadija Benali) must review** any Islamic-tradition asset before it lands in the repo. Generic or culturally-confused assets get rejected.

### Prompt library

Authoritative prompts for each asset live in `assets/line-art/PROMPTS.md` (to be created alongside the first generated asset). Each prompt is versioned — if an asset gets regenerated, the prompt delta is tracked.

### Naming convention

```
assets/line-art/
  pattern-zellige-fez.png            # Moroccan zellige variant
  pattern-girih-isfahan.png          # Persian girih strapwork
  pattern-kufic-square.png           # Cufic calligraphic square
  masjid-exterior-line.png           # Full-bleed About page
  mihrab-arch-line.png               # 404 page
  minbar-silhouette-line.png         # About section break
```

## Voice & Content — Tova's guide

Voice is interface. Rules:

- **Quiet, dignified, informative**. Never chirpy, never guilt-inducing, never loss-averse ("Never miss a prayer" is forbidden).
- **Specificity over inspiration**. "Every electricity bill, every new copy of *Riyādh aṣ-Ṣāliḥīn*" > "Support our work."
- **Specific verbs in CTAs**. "Donate now" > "Submit." "Remind me 15 minutes before Fajr" > "Save."
- **No passive voice**, no "we'd love to…" hedges, no "we're sorry but…" apologies.
- **Transliterated Arabic terms italicised**: *ihsan*, *jama'ah*, *sadaqah jaariyah*, *Jumu'ah*, *adhān*. Inline gloss in English once per page.
- **No emojis in copy**. Ever.
- **Error copy must name the condition** ("We couldn't reach our payment partner. Try once more, or give directly via bank transfer.") — not "Something went wrong."
- **Notification copy respects its context**. Prayer reminders land on a lock screen at dawn. Write for that moment.

Authoritative voice examples in `projects/mosque-connect/VOICE_EXAMPLES.md` (created on first major copy rewrite).

## Mobile vs Web — distinct disciplines

### Mobile

- Apple HIG structural grid (44pt headers, grouped lists, chevron disclosure).
- Bottom sheets replace centred modals.
- Tab bar navigation (4 tabs, bespoke glyphs — see Iconography).
- Screen-edge inset: 32px (`spacing['3xl']`).
- **Not** "iOS Settings with one gold accent." Commit to the editorial direction on at least one signature surface (prayer home).

### Web

- Editorial grid. Wide heroes up to 1440px (`--max-width-wide`); reading columns 680–760px (`--max-width-reading`).
- Navigation carries a live data sliver (next prayer time visible in the navbar), not a utility strip.
- Full-bleed atmospheric moments earn their weight — landing hero is a single editorial typographic statement, not a phone-mockup lockup.
- One signature pattern (hairline-gold leading edge on section titles, or a 1px gold keyline under the navbar).
- Reveal motion is additive polish, not a prerequisite.
- Progressive enhancement: the site must work and look intentional without JavaScript.

## Iconography

- **Mobile UI icons** (list rows, toggles, form fields): Ionicons outline/filled pairs remain, at 1.5px stroke where customisable.
- **Tab bar glyphs**: bespoke SVG, 1.25–1.5px strokes, one for each tab — crescent for prayer, dotted-cluster for community, open-hand for support, rule-and-dot for settings. Not Ionicons.
- **Editorial iconography** (impact cards, principle markers): commissioned or drawn SVG, consistent weight, one family across the app.
- **Forbidden**: Material Icons, FontAwesome, emoji-as-icon.

## Component principles (unchanged, condensed)

- Generous whitespace — 32px screen-edge insets (`spacing['3xl']`).
- 3-tier elevation: none / sm / md / lg. Black shadows only.
- **Button** — 4 variants: primary, secondary, ghost, destructive. Loading spinner matches text height.
- **BottomSheet** — gesture-dismissible. Entrance uses `springs.snappy`; exit uses timing curve per Motion Vocabulary.
- **GoldRule** (the `—◆—` divider used on `about.tsx`) — promoted to a signature pattern. Acceptable between major sections on any editorial surface.
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
