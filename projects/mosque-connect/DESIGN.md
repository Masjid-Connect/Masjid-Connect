# Design System

Premium, serene, rooted in Islamic geometric art and calligraphic tradition. **God-tier, not SaaS.** Apple HIG as a *starting* influence for mobile, not a ceiling; editorial craft for web. Reference quality bar: Linear, Apple Weather, Rauno Freiberg, Teenage Engineering, boutique editorial — not Notion, not Material, not generic iOS Settings.

## Brand Identity

**Two distinct brand marks — use the right one for the surface.**

### 1. Square icon mark — `Masjid-Logo-App.svg`

- Square SVG, viewBox 495.5×495.5. Sapphire `#133244` background, cream `#efe7d4` Arabic/Latin typography ("المسجد السلفي / Salafi Masjid" stacked).
- Used wherever the brand needs to sit in a **square or near-square container**: mobile splash, About screen hero, Settings header anchor, iOS home-screen icon, Android adaptive icon, native pre-JS splash.
- On mobile loaded as a React component via `react-native-svg-transformer`:
  ```ts
  import MasjidLogo from '@/assets/images/Masjid-Logo-App.svg';
  <MasjidLogo width={140} height={140} />
  ```
- On the **native splash** (pre-JS), the PNG sibling `Masjid-Logo-App.png` is referenced from `app.json`'s `splash.image` on a `#0A1628` sapphire-950 background — RN's native splash requires raster.
- On **web**, the square icon may be used where a square container is called for (favicon, PWA icon) — but **not** the navbar/footer. See the wordmark below.

### 2. Horizontal wordmark — `Masjid_Logo.png`

- Wide horizontal wordmark, dark charcoal typography on transparent background. Aspect ~4:1 ("المسجد السلفي / The Salafi Masjid" side by side).
- Used **on the web** for the navbar logo, footer logo, and landing hero — places where a horizontal strip is the natural container.
- CSS: `.navbar__logo-img { height: 28px; width: auto; }` + `filter: brightness(0) invert(1)` for white-on-dark hero state, removed on `.navbar.is-scrolled` for dark-on-light state.
- **Do NOT use the square icon in the web navbar** — a square sapphire-filled logo fights the horizontal-strip container and the hero gradient. The wordmark is the right pattern.

### Sizing

- **JS splash (mobile)**: logo sized at `min(viewport-width × 0.7, short-edge × 0.85, 520px)`. Square SVG scales cleanly at any size.
- **About screen hero (mobile)**: 140×140.
- **Settings anchor (mobile)**: 56×56.
- **Web navbar**: 28px tall, width auto.
- **Web footer**: 36px tall, width auto.

### Other

- **Notification badge**: Divine Gold circle, never red. `GoldBadge` auto-selects `divineGoldBright` in dark mode for contrast.
- **Prayer numerals**: tabular, tightened tracking, set in the display face (see Typography).

## Colour Palette — "Timeless Sanctuary"

**Taxonomy**: Stone (backgrounds), Onyx (dark), Sapphire (brand), Gold (accent), Sage (success), Crimson (urgent), Slate (info). High-contrast for older congregants, calm for daily use.

### Light — "Morning Light in the Musalla"

| Token | Hex | Use |
|---|---|---|
| Stone-100 | `#F9F7F2` | Main background — clean masjid marble |
| Stone-200 | `#F0EDE6` | Secondary surfaces |
| Stone-300 | `#D9D0B9` | Grouped backgrounds — warmer sand (bolder pass 2026-04-15) |
| Stone-400 | `#BFB49A` | NEW — accent surfaces / editorial dividers (2026-04-15) |
| Onyx-900 | `#121216` | Primary text — organic near-black, not harsh |
| Onyx-600 | `#6B6B70` | Secondary text |
| Sapphire-700 | `#0F2D52` | Brand primary, tab selection, links |
| Sapphire-500 | `#2B5580` | NEW — saturated mid-tone for icon bgs, filled pills, hover (2026-04-15) |
| Divine Gold | `#C99A2E` | Accent, prayer active indicator, notification badges (bolder pass) |
| Sage-600 | `#2D6A4F` | Success states |
| Crimson-600 | `#B91C1C` | Urgent (Janazah, immediate announcements) |
| Separator | `#B3AD9C` | Visible drawn line — warm stone (bolder pass) |

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

### Display face — **EB Garamond** (variable)

- **Why EB Garamond**: free (SIL Open Font License), variable weight axis 400–800, classical Garamond heritage (16th-c. Claude Garamond), scholarly/manuscript register. Used across Islamic scholarly publishing in English. Serene, unadorned, never designery. Does not call attention to itself — which for sacred content is the right stance. ~40KB woff2 latin subset.
- **Loaded via**: `@expo-google-fonts/eb-garamond` on mobile (static faces at 400/500/600 + 400 italic), `@font-face` + `<link rel="preload">` on web (self-hosted variable woff2 at `/web/fonts/eb-garamond-v32-latin.woff2`). `font-display: swap` so first paint isn't blocked.
- **Historical note**: Fraunces was adopted briefly (2026-04-15) but its quirky, contemporary-editorial character read as too "designery" for a sacred context and was reverted the same day. Recorded in `DECISIONS.md`.
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
| `prayerCountdown` | 54 / 400, tracking -1.5 | — | EB Garamond | Active-prayer countdown (single most-viewed numeral) |
| `prayerTimeLarge` | — | clamp(32, 4vw, 48) / 400, tabular | EB Garamond | Web `/prayer-times` jama'ah times |
| `largeTitle` | 34 / 600 | clamp(44, 6vw, 72) / 500 | EB Garamond | Screen / page titles |
| `title1` | 28 / 600 | 32 / 500 | EB Garamond | Section titles |
| `title2` | 22 / 600 | 24 / 500 | EB Garamond | Subsections |
| `title3` | 20 / 600 | 20 / 500 | EB Garamond | Card titles, picker headers |
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
