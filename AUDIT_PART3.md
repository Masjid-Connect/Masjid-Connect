# Mosque Connect — Audit Report Part 3/4
## Design Council: Auditors 1–4 (Visual Identity, Navigation, Interaction & Motion, Typography)

**Date:** 2026-03-21 | **Auditors:** 4 | **Total Findings:** 48

---

## Design Auditor 1 — Visual Identity & Brand

### CRITICAL

**D1.1 Dark Mode Sapphire-400 Contrast Failure**
- `Colors.ts:41,135,185` — `#5B9BD5` on `#0A1628` (sapphire950) fails WCAG AA. Used for links, active indicators, prayer countdown in dark mode.
- **Fix:** Brighten to `#7DB8E8` or use Gold Bright as primary dark-mode tint.

**D1.2 Logo PNG Scaling Artifacts**
- `app/(auth)/welcome.tsx:390-392` — 513KB PNG loaded at 280×168px. No WebP variant. No responsive sizes (2x/3x).
- `components/brand/AnimatedSplash.tsx:225-227` — Same large PNG without format negotiation.
- **Fix:** Serve WebP for Android, provide @2x/@3x variants, document logo usage.

### HIGH

**D1.3 Rogue Hardcoded Colors (15+ instances)**
- `app/(tabs)/support.tsx:288,294` — `'#fff'` instead of `colors.card`.
- `components/settings/ReportIssueSheet.tsx`, `FeatureRequestSheet.tsx`, `ErrorFallback.tsx` — `"#FFFFFF"` hardcoded.
- `components/brand/SolarLight.tsx:51-90` — Fixed hex colors for solar system.
- **Fix:** Map all to semantic tokens.

**D1.4 Gold Accent Overused — Lost Divine Signal**
- Used for: active prayer (correct), badges (correct), BUT ALSO: unread dots, Quran School category, tab glow, prayer active bar.
- `types/index.ts:136` — `quran_school: '#D4AF37'`.
- **Fix:** Reserve Gold ONLY for active prayer state and notification badges. Use Sapphire for event categories.

**D1.5 Semantic Color Layer Never Consumed**
- `Colors.ts:115-138` — `semantic` object defined but never imported by any component. Zero enforcement.
- **Fix:** Export `useSemanticColors()` hook; lint against direct color access.

### MEDIUM

**D1.6 Event Category Colors Lack Dark Mode Variants** — `types/index.ts:133-140` — Fixed colors, no dark-mode awareness. Sapphire on sapphire = invisible.

**D1.7 Islamic Pattern Opacity Inconsistent** — Splash screen forces `opacity={1}`, prayer screen uses `0.06-0.10`.

**D1.8 Gold Text Legibility Borderline** — `divineGoldText: '#8A7023'` at 4.5:1 on white — bare minimum for elderly users in sunlight.

**D1.9 Tab Bar Glow Inconsistent** — Gold in dark mode, Sapphire in light mode. Should be Gold in both per CLAUDE.md.

### LOW

**D1.10 Elevation System Under-Utilized** — Defined (sm/md/lg) but announcements have no elevation applied.

### Brand Differentiation Risk
- Gold + Blue + Geometric Patterns = common Islamic app trope.
- **Differentiator:** The atmospheric gradients and solar light system are genuinely original. Lean into "sky-as-interface" as the brand signature.

---

## Design Auditor 2 — Information Architecture & Navigation

### HIGH

**D2.1 "Community" Tab Name Obscures Content**
- `app/(tabs)/community.tsx:25-160` — Mixes Announcements + Events under one label. Users expecting "Events" or "Calendar" won't find it.
- Muslim mental model: Prayer → News → Calendar → Giving → Settings. "Community" implies forums/groups, not mosque broadcasts.
- **Fix:** Rename to "Announcements" or split into separate Announcements + Events tabs.

### MEDIUM

**D2.2 Hidden Tabs Create Dead Routes**
- `_layout.tsx:77-79` — Announcements, Events, Qibla tabs have `href: null` but screens exist. Push notification deep links route to these hidden tabs and fail.
- **Fix:** Either restore as visible tabs or update deep links to route through Community tab with segment parameter.

**D2.3 Qibla Feature Hidden & Undiscoverable**
- Fully implemented at `app/(tabs)/qibla.tsx` but hidden from tab bar with no alternative access path.
- **Fix:** Add Qibla button in Prayer times header, or restore as 5th tab.

**D2.4 Announcements/Events Require 3+ Taps**
- Community tab → Segmented control → Content. Apple HIG recommends critical features within 2 taps.
- **Fix:** Promote to separate tabs.

**D2.5 Settings Cognitive Overload**
- `app/(tabs)/settings.tsx:59-498` — 5 sections, 17+ interactive rows, 4 bottom sheets.
- **Fix:** Split into Settings + Help, or use nested navigation.

**D2.6 Auth Flow Has Redundant Screens**
- `app/(auth)/_layout.tsx` declares: welcome, sign-in, sign-up, login, register. sign-in/login and sign-up/register are synonyms.
- **Fix:** Consolidate to welcome → sign-in → register.

**D2.7 Onboarding Not Defined**
- App checks `hasCompletedOnboarding` but journey is undefined. No mosque selection guidance.

### LOW

**D2.8 Swipe Navigation Undiscoverable** — Prayer screen swipe-to-change-date works but is not indicated in UI.

### Recommended Tab Structure
```
Prayer (home) → Announcements → Events → Support/Donate → Settings
```
- Move Qibla to header button on Prayer tab
- Delete community.tsx (split into separate tabs)
- Consolidate auth screens

---

## Design Auditor 3 — Interaction & Motion

### HIGH

**D3.1 Bottom Sheet Missing Pan-to-Dismiss Gesture**
- `components/ui/BottomSheet.tsx:38-104` — Has backdrop tap-to-dismiss but NO pan gesture responder. Grabber handle is visual-only. Users expect to drag down to close.
- **Fix:** Add PanResponder with velocity-based dismiss threshold.

**D3.2 Animation Performance Untested**
- All animations use Reanimated 3 (good), but no FPS profiling or telemetry. Multiple overlapping layers on splash (gradient + pattern + logo) may jank on low-end devices.
- **Fix:** Profile on iPhone SE / low-end Android. Add Reanimated Profiler in dev.

### MEDIUM

**D3.3 No Skeleton/Shimmer Loaders**
- All loading states use plain `ActivityIndicator`. No contextual loading (announcements skeleton, prayer time pulse).
- `app/(tabs)/index.tsx:114-119`, `announcements.tsx:172-184`, `events.tsx:220` — All identical spinners.
- **Fix:** Implement skeleton screens for lists, breathing pulse for prayer hero.

**D3.4 springs.bouncy Config Defined But Unused**
- `Theme.ts:307-311` — `bouncy: { damping: 12, stiffness: 200, mass: 0.6 }` exists but never used. If accidentally applied, would feel toy-like.
- **Fix:** Remove or document when appropriate (celebration states only).

**D3.5 Transition Pattern Inconsistency**
- Lists use `FadeInDown.delay(index * 40).springify()`. Welcome uses custom `AnimatedButton` with timing delays. Not unified.

### LOW

**D3.6 useReducedMotion Missing from Splash** — Tab bar, bottom sheet, welcome animations don't check reduced motion.

### Positive Notes
- Spring parameters are premium-grade (gentle/snappy, not default bouncy)
- Atmospheric gradients beautifully encode prayer time data
- Empty and error states are well-designed with semantic icons
- Haptic feedback is intentional and hierarchical (Light → Medium → Warning)
- Pull-to-refresh uses themed tint color
- **Grade: A- (Excellent with refinements needed)**

---

## Design Auditor 4 — Typography & Readability

### CRITICAL

**D4.1 Prayer Countdown Unreadable for Elderly**
- `Theme.ts:199-204` — `prayerCountdown: fontSize 54, fontWeight '200', letterSpacing -1.5`. Ultralight at aggressive negative tracking = whisper on older LCD screens.
- **Fix:** Increase to weight-300 minimum. Reduce letterSpacing to -0.8.

### HIGH

**D4.2 Arabic Typography Scale Incomplete**
- `Theme.ts:245-262` — Only 3 Arabic styles (heading, body, caption) vs 11+ English styles. English `headline` (17/600) has no Arabic counterpart — falls back to `body` (16/400). Weight distinction lost.
- **Fix:** Expand `arabicTypography` to match English tier structure.

**D4.3 Secondary Text Contrast Borderline**
- Onyx-600 `#6B6B70` on Stone-100 at 15px (subhead) = borderline for presbyopia. Announcements body preview, category labels, section headers all use this.
- **Fix:** Boost to Onyx-700 `#555558` for body text. Reserve Onyx-600 for captions only.

### MEDIUM

**D4.4 14 Type Styles, Only 11 Distinct**
- `prayerTime` (17/600) is identical to `headline` (17/600). `categoryLabel` differs from `caption2` only in weight. `sectionHeader` used 1-2 times.
- **Fix:** Collapse redundant styles. Document 4-tier hierarchy (Display → Heading → Body → Meta).

**D4.5 Line Height Inconsistency**
- `announcements.tsx:481` overrides theme lineHeight (22 → 26 = 1.53× for 17pt, excessively loose).
- `prayerCountdown` at 1.11× ratio (tightest).
- No documented ratio rule.
- **Fix:** Establish ratios: Display 1.1-1.15×, Heading 1.2-1.3×, Body 1.4-1.45×, Meta 1.3-1.4×.

**D4.6 Text Truncation Strategy Undefined**
- Announcements: `numberOfLines={2}` with no "Read more" affordance.
- Events: No `numberOfLines` set — titles can wrap to 3+ lines.
- **Fix:** Create `<TruncatedText />` component with consistent rules.

**D4.7 Heading Hierarchy Unclear**
- `title3` (20/600) and `headline` (17/600) both weight-600. Section headers (13/600) visually lighter than list items (17/600).
- **Fix:** Boost title3 to 700, sectionHeader to 700.

**D4.8 Dark Mode Divider Contrast**
- Separator `#1E3B5A` on `#0A1628` = 2.1:1 contrast. WCAG requires 3:1 for graphical elements.
- **Fix:** Change to `#2A4A6F`.

### LOW

**D4.9 Letter Spacing Aggressive on Display**
- `prayerCountdown: letterSpacing -1.5` (2.8% negative) on 54pt ultralight compounds readability risk.
- `prayerName: letterSpacing 0.4` (positive) — opposite philosophy for similar context.
- **Fix:** Use positive tracking above 20pt per Apple HIG.

**D4.10 Tabular Nums Not Universal** — Applied to prayer times but not event times, timestamps, or reminder minutes.

### Positive Notes
- Apple HIG type scale alignment is strong
- Tabular numerals correctly applied where used
- Light mode primary text contrast (17.3:1) exceeds WCAG AAA
- i18n strings are complete — no hardcoded English in UI text

---

## Part 3 Summary

| Auditor | Critical | High | Medium | Low | Total |
|---------|----------|------|--------|-----|-------|
| D1. Visual Identity | 2 | 3 | 4 | 1 | 10 |
| D2. Navigation | 0 | 1 | 6 | 1 | 8 |
| D3. Interaction & Motion | 0 | 2 | 3 | 1 | 6 |
| D4. Typography | 1 | 2 | 5 | 2 | 10 |
| **TOTAL** | **3** | **8** | **18** | **5** | **34** |
