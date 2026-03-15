# The Salafi Masjid App — Landing Page Plan

> **Reference:** [thepillarsapp.com](https://www.thepillarsapp.com/) — but more refined, sacred, and Salafi-rooted.

---

## Council of 8: Expert Perspectives

### 1. Brand Strategist — "Identity & Positioning"
Pillars positions itself as "more than a prayer app" — broad Muslim market. We position **The Salafi Masjid** differently: **your local masjid in your pocket**. Not a generic prayer app — a direct connection to *your* community, *your* imam, *your* masjid. The Salafi identity is the differentiator. Where Pillars is broad, we are specific, rooted, and authentic.

**Proposed tagline:** "Your Masjid. Always With You."
**Subtext:** "Stay connected to prayer times, community announcements, and events from The Salafi Masjid."

### 2. Visual Designer — "Aesthetic Direction"
Pillars uses generic modern SaaS aesthetics (Plus Jakarta Sans, dark gradients). We go **architectural and sacred** — inspired by the existing app's "Timeless Sanctuary" design system:

- **Hero:** Full-bleed atmospheric gradient (Sapphire → Onyx, "Midnight in the Masjid") with subtle Islamic geometric pattern overlay
- **Colors:** Stone (#F9F7F2) backgrounds, Sapphire (#0F2D52) brand, Divine Gold (#D4AF37) accents
- **Typography:** Clean system sans-serif for body, confident weights for headings — elevated, not startup-y
- **Phone mockups:** Floating phones showing Prayer Times (atmospheric gradient), Community, and Qibla screens — angled with subtle shadows
- **No clutter** — clean, confident, serene. Gold accents for CTAs and sacred moments only

### 3. UX Architect — "Page Structure & Flow"

```
┌──────────────────────────────────────────────────┐
│  NAVBAR: Logo  ·  Features  ·  About  ·  Download│
├──────────────────────────────────────────────────┤
│                                                  │
│  HERO SECTION                                    │
│  Sapphire-to-Onyx gradient + geometric pattern   │
│  ┌────────────────────────────────────────┐       │
│  │  Masjid Logo (white/light)            │       │
│  │                                        │       │
│  │  "Your Masjid. Always With You."       │       │
│  │                                        │       │
│  │  Subtext description                   │       │
│  │                                        │       │
│  │  [App Store]  [Google Play]            │       │
│  │                                        │       │
│  │     ┌──────┐    ┌──────┐              │       │
│  │     │Phone │    │Phone │              │       │
│  │     │Mock  │    │Mock  │              │       │
│  │     └──────┘    └──────┘              │       │
│  └────────────────────────────────────────┘       │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  FEATURES GRID (3 columns, Stone background)     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 🕌 Prayer │  │ 📢 Comm- │  │ 🧭 Qibla│       │
│  │  Times    │  │  unity   │  │ Compass  │       │
│  │           │  │          │  │          │       │
│  │ Accurate  │  │ Announce-│  │ Find the │       │
│  │ times,    │  │ ments,   │  │ Qibla    │       │
│  │ beautiful │  │ events & │  │ from     │       │
│  │ gradients │  │ lessons  │  │ anywhere │       │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  APP SHOWCASE (alternating left/right)           │
│                                                  │
│  A) Prayer Times — phone left, text right        │
│     • Atmospheric sky gradients                  │
│     • Umm Al-Qura calculation                    │
│     • Customizable reminders (5–30 min)          │
│     • Hijri calendar integration                 │
│                                                  │
│  B) Community — text left, phone right           │
│     • Announcements from your masjid             │
│     • Events, lessons & Quran circles            │
│     • Urgent Janazah alerts                      │
│                                                  │
│  C) Qibla Compass — phone left, text right       │
│     • Real-time magnetometer compass             │
│     • Works fully offline                        │
│     • Calibration guidance                       │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  TRUST SECTION (centered, Stone-200 bg)          │
│  "Built for the community, by the community."   │
│  3 pillars: Privacy-first · Ad-free · Open       │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  DOWNLOAD CTA (full-width Sapphire gradient)     │
│  "Download The Salafi Masjid"                    │
│  [App Store]  [Google Play]                      │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  FOOTER: Logo · Privacy · Terms · Contact        │
│  © 2026 The Salafi Masjid                        │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 4. Frontend Engineer — "Technical Implementation"
Built as a **static HTML/CSS/JS page** (not React Native Web) for performance and SEO:

- **Single `index.html`** in a `/web` directory
- **Vanilla CSS** with CSS custom properties mapping the existing design tokens
- **Minimal JS** — smooth scroll, intersection observer fade-in animations, mobile nav toggle
- **No framework** — fast, lightweight, Lighthouse 95+
- **Responsive** — mobile-first, breakpoints at 768px and 1200px
- **Phone mockups** — Pure CSS device frames with gradient placeholders (real screenshots can replace later)
- **Target:** Under 100KB total page weight

**File structure:**
```
/web/
  index.html          # Complete landing page
  styles.css          # All styles with CSS custom properties
  script.js           # Minimal interactions (~50 lines)
```

### 5. Islamic Scholar Advisor — "Authenticity & Sensitivity"
- **Bismillah** subtly in the footer — quiet acknowledgment
- **Prayer names** use proper transliteration: Fajr, Dhuhr, 'Asr, Maghrib, 'Isha
- **No images of people** — geometric patterns, architectural motifs, calligraphy only
- **Language:** Respectful, not preachy. "Stay connected to your masjid" not "become a better Muslim"
- **Salafi identity** expressed through design: clean, unadorned, purposeful — simplicity IS the statement
- **No music references** — notification tones described as "custom notification sounds"

### 6. Conversion Optimizer — "Drive Downloads"
- **Two CTA placements:** Hero (above fold) + bottom banner (after all features)
- **Feature benefits, not features:** "Never miss a Janazah announcement" not "push notifications"
- **Single clear action:** Download. No email signup, no distractions
- **Mobile visitors** get prominent app store buttons that deep-link to stores
- **Social proof:** "Serving the community of The Salafi Masjid, Birmingham"

### 7. Accessibility Expert — "Inclusive Design"
- **WCAG 2.1 AA** — all text meets 4.5:1 contrast ratio
- **Semantic HTML:** `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`, proper headings
- **Alt text** on all images and mockups
- **Reduced motion** — respect `prefers-reduced-motion` media query
- **Minimum 16px body text** — generous line height for older congregants
- **Keyboard navigable** with visible focus indicators

### 8. Performance & SEO Specialist — "Discoverability"
- **Meta tags:** Open Graph, Twitter Card, proper title/description
- **Structured data:** JSON-LD `MobileApplication` schema
- **Canonical URL:** `https://salafimasjid.app/`
- **No frameworks** — inline critical CSS, lazy-load below-fold images
- **Apple Smart Banner:** `<meta name="apple-itunes-app">` for iOS Safari
- **Favicon** from existing assets

---

## Implementation Steps

| Step | Task | Details |
|------|------|---------|
| 1 | Create `/web` directory | Set up file structure |
| 2 | Build `index.html` | All 7 sections, semantic HTML, meta tags, Open Graph, JSON-LD |
| 3 | Build `styles.css` | Map design tokens to CSS properties, responsive layout, Islamic geometric SVG pattern, atmospheric gradient, phone mockup frames |
| 4 | Build `script.js` | Smooth scroll, intersection observer animations, mobile nav, prefers-reduced-motion |
| 5 | Polish & test | Responsive check, accessibility, contrast ratios |
| 6 | Commit & push | To `claude/design-app-page-Wmo1D` branch |

---

## Key Differences from Pillars

| Aspect | Pillars | The Salafi Masjid |
|--------|---------|-------------------|
| **Positioning** | Generic prayer app | Your masjid's app |
| **Aesthetic** | Modern SaaS | Sacred & architectural |
| **Colors** | Dark generic gradients | Jewel & Stone (Sapphire, Gold, Stone) |
| **Tone** | "Empower yourself" | "Stay connected" |
| **Community** | Generic features | Specific masjid connection |
| **Identity** | Broad Muslim market | Salafi, rooted, authentic |
| **Design density** | Feature-heavy, busy | Serene, confident, breathing room |
| **Trust signals** | Press logos, review counts | Community-first, privacy, ad-free |
