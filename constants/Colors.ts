/**
 * Mosque Connect — "Timeless Sanctuary" Color System
 *
 * Jewel & Stone philosophy: organic, stone-inspired tones replace
 * harsh pure whites and generic blues. High-contrast for older
 * congregants, calm for daily use.
 *
 * Light mode: "Morning Light in the Musalla" — stone backgrounds, onyx text
 * Dark mode: "Midnight in the Masjid" — sapphire navy surfaces, snow text
 *
 * Palette taxonomy:
 *   Stone    — warm marble backgrounds (light mode)
 *   Onyx     — organic dark tones for text on light backgrounds
 *   Sapphire — brand primary AND dark mode surfaces (midnight navy)
 *   Gold     — divine accent, prayer signal
 *   Crimson  — urgent/alert states
 *   Sage     — success states (muted green)
 *   Slate    — neutral info
 */

export const palette = {
  // ─── Stone: warm paper backgrounds (light mode) ─────────────────
  // Deep & Cinematic pass (Candidate A, 2026-04-15): canvas deepened
  // from cool off-white #F9F7F2 to warm paper #F2EBD8. Gives surfaces
  // more presence and a real cream character. Seat 19's diagnosis:
  // the "pale" complaint was a hierarchy problem — stone couldn't
  // dominate AND feel weighted; warming the canvas lets it carry
  // weight without fighting darker accents.
  stone100: '#F2EBD8',      // Main background — warm paper (was #F9F7F2)
  stone200: '#ECE3CC',      // Secondary surface — slightly deeper
  stone300: '#D9D0B9',      // Grouped/tertiary
  stone400: '#BFB49A',      // Bolder accent surface

  // ─── Onyx: organic dark tones for light-mode text ───────────────
  onyx900: '#121216',       // Primary text on light backgrounds
  onyx600: '#6B6B70',       // Secondary text on light backgrounds
  onyx400: '#A8A8AD',       // Tertiary text / disabled on light backgrounds

  // ─── Sapphire: deep blue — brand primary & dark mode surfaces ───
  // Sapphire IS the dark mode. "Midnight in the Masjid" = midnight navy,
  // not black. Every dark surface lives in the sapphire family.
  // Deep & Cinematic pass: midnight values are deeper + more
  // saturated than the previous sapphire-navy tier. These surfaces
  // are meant to carry HERO moments (splash, live lesson, prayer
  // countdown backdrop, support hadith card) as full surfaces, not
  // just tints. Token names preserved to avoid a downstream rename.
  sapphire950: '#06101F',   // Dark mode canvas — deepest midnight (was #0A1628)
  sapphire900: '#0E1E38',   // Dark mode secondary surface
  sapphire850: '#17304F',   // Dark mode elevated cards
  sapphire800: '#1A3E5E',   // Dark mode grouped list backgrounds
  sapphire700: '#0F2D52',   // Brand primary (light mode tint, tab selection)
  sapphire600: '#1A3F6B',   // Slightly lighter for interactive states
  sapphire500: '#2B5580',   // Saturated mid-tone for icon bgs, filled pills, hover states. 7.9:1 on white (WCAG AAA).
  sapphire400: '#6BABE5',   // Dark mode tint (lighter for dark backgrounds, WCAG AA on sapphire850+)
  // Deep & Cinematic accent — saturated, weighted blue for hero CTAs
  // and moments that need to feel "lit." Distinct from sapphire-500
  // (which is a surface accent).
  lapis500: '#1E68B8',      // NEW — Deep & Cinematic saturated accent (Candidate A)
  sapphireLight: '#EBF2FA', // Tint background (light mode)
  sapphireSeparator: '#1E3B5A', // Dark mode dividers — visible on navy

  // ─── Sage: success states (muted green) ───────────────────────
  sage600: '#2D6A4F',       // Success states (light mode)
  sage400: '#6BCB9B',       // Success states (dark mode)

  // ─── Gold: divine accent, prayer signal ─────────────────────────
  // Two gold variants for the Deep & Cinematic direction (Candidate A):
  //   - `divineGold` stays at #C99A2E for accents on LIGHT (paper) surfaces
  //     — maintains 3.18:1 on stone-100 (WCAG 3:1 non-text).
  //   - `gilt` is the new richer gilt for gold glinting on MIDNIGHT dark
  //     surfaces (hero moments, live lesson, splash). Brighter, lifts
  //     against the deep-sapphire backgrounds where #C99A2E disappears.
  divineGold: '#C99A2E',    // Warm gold for light-surface accents
  divineGoldBright: '#E6C24A', // Dark-mode variant for existing gold usage
  gilt: '#D4A03A',          // NEW — gold-on-midnight hero accent (Candidate A)
  divineGoldGlow: 'rgba(201, 154, 46, 0.10)', // Warm glow (tracks divineGold)
  divineGoldText: '#8A7023',        // Darker gold for text on light backgrounds (4.5:1 contrast on white)
  divineGoldTextDark: '#E0C96B',    // Lighter gold for text on dark backgrounds (4.5:1 contrast on black)

  // ─── Crimson: urgent/alert states ───────────────────────────────
  crimson600: '#B91C1C',    // Janazah, immediate announcements (light)
  crimson400: '#F87171',    // Alert for dark mode

  // ─── Slate: neutral info ────────────────────────────────────────
  slate500: '#64748B',      // Info states (light mode)
  slate400: '#94A3B8',      // Info states (dark mode)

  // ─── Separators ─────────────────────────────────────────────────
  separatorLight: '#B3AD9C', // Warm stone — visible drawn line (was #C8C3B8, too whispy to register as a divider)
  separatorDark: '#1E3B5A',  // Dark mode divider — sapphire navy

  // ─── Tab bar ────────────────────────────────────────────────────
  tabInactive: '#8E8E93',

  // ─── Dark mode text ─────────────────────────────────────────────
  snow: '#F5F5F7',
  snowSecondary: '#8E8E93',
  snowTertiary: '#636366',

  // ─── Fixed colors (theme-independent) ───────────────────────────
  white: '#FFFFFF',
  paperCard: '#FAF4E0',     // Card surface for light mode — warm off-white, sits softly above stone-100 paper bg rather than the stark white-on-beige look (2026-04-16)
  googleBlue: '#4285F4',
  backdrop: 'rgba(0,0,0,0.4)',
  darkCardBorder: '#1E3B5A',

  // ─── Legacy aliases (map old names to new values) ───────────────
  // These exist for gradual migration. Prefer canonical names above.
  limestone: '#F9F7F2',
  limestoneSecondary: '#F0EDE6',
  limestoneTertiary: '#E5E0D3',
  ink: '#121216',
  inkSecondary: '#6B6B70',
  inkTertiary: '#A8A8AD',
  sacredBlue: '#0F2D52',
  sacredBlueLight: '#5B9BD5',
  paradiseGreen: '#2D6A4F',
  paradiseGreenLight: '#6BCB9B',
  moorishTerracotta: '#B91C1C',
  moorishTerracottaLight: '#F87171',
  steelBlue: '#64748B',
  steelBlueLight: '#94A3B8',
  tintLight: '#EBF2FA',
  black: '#0A1628',
  darkElevated: '#132742',
  darkGrouped: '#18304E',
  // Legacy emerald aliases → sapphire
  emerald700: '#0F2D52',
  emerald600: '#2D6A4F',
  emerald400: '#6BABE5',

  // ─── External brand colors (mandated by third parties) ───
  googleBgLight: '#FFFFFF',
  googleBgDark: '#131314',
  googleBorderLight: '#747775',
  googleBorderDark: '#8E918F',
  googleTextLight: '#1F1F1F',
  googleTextDark: '#E3E3E3',
} as const;

/**
 * Semantic token layer — maps intent to palette values.
 *
 * Components continue using `getColors()` for runtime access.
 * This layer documents the "why" behind each color choice and
 * serves as a future hook point for theme variants (e.g., Ramadan Mode).
 */
export const semantic = {
  surface: {
    main: { light: palette.stone100, dark: palette.sapphire950 },
    card: { light: palette.white, dark: palette.sapphire850 },
    grouped: { light: palette.stone300, dark: palette.sapphire800 },
    frosted: { light: 'rgba(249, 247, 242, 0.85)', dark: 'rgba(10, 22, 40, 0.85)' },
  },
  text: {
    primary: { light: palette.onyx900, dark: palette.snow },
    secondary: { light: palette.onyx600, dark: palette.snowSecondary },
    tertiary: { light: palette.onyx400, dark: palette.snowTertiary },
    onBrand: { light: palette.white, dark: palette.white },
  },
  status: {
    activePrayer: { light: palette.divineGold, dark: palette.divineGoldBright },
    urgent: { light: palette.crimson600, dark: palette.crimson400 },
    success: { light: palette.sage600, dark: palette.sage400 },
    info: { light: palette.slate500, dark: palette.slate400 },
  },
  brand: {
    primary: { light: palette.sapphire700, dark: palette.sapphire400 },
    accent: { light: palette.divineGold, dark: palette.divineGoldBright },
  },
} as const;

// ─── Runtime theme objects ──────────────────────────────────────────

const Colors = {
  light: {
    text: palette.onyx900,
    textSecondary: palette.onyx600,
    textTertiary: palette.onyx400,
    background: palette.stone100,
    backgroundSecondary: palette.stone200,
    backgroundGrouped: palette.stone300,
    card: palette.paperCard,
    cardBorder: palette.separatorLight,
    tint: palette.sapphire700,
    tintLight: palette.sapphireLight,
    accent: palette.divineGold,
    accentText: palette.divineGoldText,
    success: palette.sage600,
    urgent: palette.crimson600,
    info: palette.slate500,
    tabIconDefault: palette.tabInactive,
    tabIconSelected: palette.sapphire700,
    divider: palette.separatorLight,
    prayerActive: palette.divineGold,
    prayerActiveGlow: palette.divineGoldGlow,
    separator: palette.separatorLight,
    inverseText: palette.white,
    onPrimary: palette.white,
  },
  dark: {
    text: palette.snow,
    textSecondary: palette.snowSecondary,
    textTertiary: palette.snowTertiary,
    background: palette.sapphire950,
    backgroundSecondary: palette.sapphire900,
    backgroundGrouped: palette.sapphire800,
    card: palette.sapphire850,
    cardBorder: palette.sapphireSeparator,
    tint: palette.sapphire400,
    tintLight: 'rgba(15, 45, 82, 0.18)',
    accent: palette.divineGoldBright,
    accentText: palette.divineGoldTextDark,
    success: palette.sage400,
    urgent: palette.crimson400,
    info: palette.slate400,
    tabIconDefault: palette.snowSecondary,
    tabIconSelected: palette.divineGoldBright,
    divider: palette.sapphireSeparator,
    prayerActive: palette.divineGoldBright,
    prayerActiveGlow: 'rgba(240, 208, 96, 0.15)',
    separator: palette.sapphireSeparator,
    inverseText: palette.sapphire950,
    onPrimary: palette.white,
  },
};

/**
 * Semantic alpha backgrounds — RGBA tokens for translucent surfaces.
 * Single source of truth for every `rgba()` value used across the app.
 * Keyed by semantic purpose, valued per color scheme.
 */
export const alpha = {
  /** Urgent/alert tinted backgrounds (announcement rows, badges) */
  urgentBg: {
    light: 'rgba(185, 28, 28, 0.10)',
    dark: 'rgba(248, 113, 113, 0.12)',
  },
  /** Stronger urgent emphasis (badge fills) */
  urgentBgEmphasis: {
    light: 'rgba(185, 28, 28, 0.14)',
    dark: 'rgba(248, 113, 113, 0.15)',
  },
  /** Prayer active row highlight */
  prayerActiveBg: {
    light: 'rgba(166, 133, 35, 0.08)',
    dark: 'rgba(240, 208, 96, 0.06)',
  },
  /** Frosted navigation / sheet backgrounds (tab bar, bottom zones) */
  frostedBg: {
    light: 'rgba(249, 247, 242, 0.85)',
    dark: 'rgba(10, 22, 40, 0.85)',
  },
  /** Subtle frosted border on translucent surfaces */
  frostedBorder: {
    light: 'rgba(0, 0, 0, 0.08)',
    dark: 'rgba(255, 255, 255, 0.08)',
  },
  /** Action button / interactive surface tint (sheets, options) */
  actionBg: {
    light: 'rgba(0, 0, 0, 0.05)',
    dark: 'rgba(255, 255, 255, 0.06)',
  },
  /** Gold-tinted pill/chip backgrounds (e.g. "Today" pill in DateNavigator) */
  accentPill: {
    light: 'rgba(166, 133, 35, 0.15)',
    dark: 'rgba(240, 208, 96, 0.15)',
  },
  /** Janazah announcement — respectful gold tint (not alarm red) */
  janazahBg: {
    light: 'rgba(166, 133, 35, 0.10)',
    dark: 'rgba(240, 208, 96, 0.08)',
  },
  /** Stronger janazah emphasis (badge fills in detail sheet) */
  janazahBgEmphasis: {
    light: 'rgba(166, 133, 35, 0.16)',
    dark: 'rgba(240, 208, 96, 0.14)',
  },
  /** Gold-tinted feature icon backgrounds (welcome screen, community share) */
  goldIconBg: {
    light: 'rgba(166, 133, 35, 0.14)',
    dark: 'rgba(240, 208, 96, 0.12)',
  },
  /** Gold-tinted empty state icon circles (announcements, community) */
  goldEmptyBg: {
    light: 'rgba(166, 133, 35, 0.10)',
    dark: 'rgba(240, 208, 96, 0.08)',
  },
  /** Sapphire-tinted icon backgrounds (admin FAB, events empty state) */
  sapphireIconBg: {
    light: 'rgba(15, 45, 82, 0.12)',
    dark: 'rgba(107, 171, 229, 0.15)',
  },
  /** Sapphire-tinted empty state icon circles (events) */
  sapphireEmptyBg: {
    light: 'rgba(15, 45, 82, 0.10)',
    dark: 'rgba(107, 171, 229, 0.10)',
  },
  /** Active prayer row highlight (prayer times screen) */
  prayerActiveRowBg: {
    light: 'rgba(212, 175, 55, 0.12)',
    dark: 'rgba(229, 193, 75, 0.10)',
  },
  /** Prayer progress bar fill */
  prayerProgressFill: {
    light: 'rgba(212, 175, 55, 0.30)',
    dark: 'rgba(229, 193, 75, 0.35)',
  },
  /** Community share card background */
  communityShareBg: {
    light: 'rgba(212, 175, 55, 0.10)',
    dark: 'rgba(229, 193, 75, 0.08)',
  },
  /** Community share card border */
  communityShareBorder: {
    light: 'rgba(212, 175, 55, 0.20)',
    dark: 'rgba(229, 193, 75, 0.20)',
  },
  /** Sage-tinted option card backgrounds (gift aid) */
  sageBg: {
    light: 'rgba(45, 106, 79, 0.10)',
    dark: 'rgba(45, 106, 79, 0.12)',
  },
  /** Sage-tinted subtle background (gift aid unchecked) */
  sageBgSubtle: {
    light: 'rgba(45, 106, 79, 0.06)',
    dark: 'rgba(45, 106, 79, 0.06)',
  },
  /** Sage-tinted border */
  sageBorder: {
    light: 'rgba(45, 106, 79, 0.18)',
    dark: 'rgba(45, 106, 79, 0.20)',
  },
  /** Sapphire-tinted option card backgrounds (cover fees) */
  sapphireBg: {
    light: 'rgba(15, 45, 82, 0.10)',
    dark: 'rgba(15, 45, 82, 0.12)',
  },
  /** Sapphire-tinted subtle background (cover fees unchecked) */
  sapphireBgSubtle: {
    light: 'rgba(15, 45, 82, 0.06)',
    dark: 'rgba(15, 45, 82, 0.06)',
  },
  /** Sapphire-tinted border */
  sapphireBorder: {
    light: 'rgba(15, 45, 82, 0.18)',
    dark: 'rgba(91, 155, 213, 0.20)',
  },
  /** Sapphire hadith card border */
  sapphireHadithBorder: {
    light: 'rgba(15, 45, 82, 0.14)',
    dark: 'rgba(91, 155, 213, 0.12)',
  },
} as const;

export type ColorScheme = 'light' | 'dark';

/** Safe accessor — maps any useColorScheme() result to 'light' | 'dark' */
export function getColors(scheme: string | null | undefined) {
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

/** Safe accessor for alpha tokens */
export function getAlpha(scheme: string | null | undefined) {
  const key = scheme === 'dark' ? 'dark' : 'light';
  return {
    urgentBg: alpha.urgentBg[key],
    urgentBgEmphasis: alpha.urgentBgEmphasis[key],
    prayerActiveBg: alpha.prayerActiveBg[key],
    frostedBg: alpha.frostedBg[key],
    frostedBorder: alpha.frostedBorder[key],
    actionBg: alpha.actionBg[key],
    accentPill: alpha.accentPill[key],
    janazahBg: alpha.janazahBg[key],
    janazahBgEmphasis: alpha.janazahBgEmphasis[key],
    goldIconBg: alpha.goldIconBg[key],
    goldEmptyBg: alpha.goldEmptyBg[key],
    sapphireIconBg: alpha.sapphireIconBg[key],
    sapphireEmptyBg: alpha.sapphireEmptyBg[key],
    prayerActiveRowBg: alpha.prayerActiveRowBg[key],
    prayerProgressFill: alpha.prayerProgressFill[key],
    communityShareBg: alpha.communityShareBg[key],
    communityShareBorder: alpha.communityShareBorder[key],
    sageBg: alpha.sageBg[key],
    sageBgSubtle: alpha.sageBgSubtle[key],
    sageBorder: alpha.sageBorder[key],
    sapphireBg: alpha.sapphireBg[key],
    sapphireBgSubtle: alpha.sapphireBgSubtle[key],
    sapphireBorder: alpha.sapphireBorder[key],
    sapphireHadithBorder: alpha.sapphireHadithBorder[key],
  };
}

export default Colors;
