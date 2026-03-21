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
  // ─── Stone: warm marble backgrounds (light mode) ────────────────
  stone100: '#F9F7F2',      // Main background — clean masjid marble floor
  stone200: '#F0EDE6',      // Secondary surface — slightly deeper warmth
  stone300: '#E5E0D3',      // Grouped/tertiary — sand-toned

  // ─── Onyx: organic dark tones for light-mode text ───────────────
  onyx900: '#121216',       // Primary text on light backgrounds
  onyx600: '#6B6B70',       // Secondary text on light backgrounds
  onyx400: '#A8A8AD',       // Tertiary text / disabled on light backgrounds

  // ─── Sapphire: deep blue — brand primary & dark mode surfaces ───
  // Sapphire IS the dark mode. "Midnight in the Masjid" = midnight navy,
  // not black. Every dark surface lives in the sapphire family.
  sapphire950: '#0A1628',   // Dark mode main background — deepest midnight navy
  sapphire900: '#0F1E34',   // Dark mode secondary surface
  sapphire850: '#132742',   // Dark mode elevated cards
  sapphire800: '#18304E',   // Dark mode grouped list backgrounds
  sapphire700: '#0F2D52',   // Brand primary (light mode tint, tab selection)
  sapphire600: '#1A3F6B',   // Slightly lighter for interactive states
  sapphire400: '#6BABE5',   // Dark mode tint (lighter for dark backgrounds, WCAG AA on sapphire850+)
  sapphireLight: '#EBF2FA', // Tint background (light mode)
  sapphireSeparator: '#1E3B5A', // Dark mode dividers — visible on navy

  // ─── Sage: success states (muted green) ───────────────────────
  sage600: '#2D6A4F',       // Success states (light mode)
  sage400: '#6BCB9B',       // Success states (dark mode)

  // ─── Gold: divine accent, prayer signal ─────────────────────────
  divineGold: '#BF9B30',    // Rich matte leaf gold — accent, prayer active (3:1+ on Stone-100)
  divineGoldBright: '#F0D060', // Brighter variant for dark mode contrast (4.5:1+ on sapphire950)
  divineGoldGlow: 'rgba(191, 155, 48, 0.08)', // Subtle glow for active prayer
  divineGoldText: '#8A7023',        // Darker gold for text on light backgrounds (4.5:1 contrast on white)
  divineGoldTextDark: '#E0C96B',    // Lighter gold for text on dark backgrounds (4.5:1 contrast on black)

  // ─── Crimson: urgent/alert states ───────────────────────────────
  crimson600: '#B91C1C',    // Janazah, immediate announcements (light)
  crimson400: '#F87171',    // Alert for dark mode

  // ─── Slate: neutral info ────────────────────────────────────────
  slate500: '#64748B',      // Info states (light mode)
  slate400: '#94A3B8',      // Info states (dark mode)

  // ─── Separators ─────────────────────────────────────────────────
  separatorLight: '#E2DFD8', // Warmer than system gray
  separatorDark: '#1E3B5A',  // Dark mode divider — sapphire navy

  // ─── Tab bar ────────────────────────────────────────────────────
  tabInactive: '#8E8E93',

  // ─── Dark mode text ─────────────────────────────────────────────
  snow: '#F5F5F7',
  snowSecondary: '#8E8E93',
  snowTertiary: '#636366',

  // ─── Fixed colors (theme-independent) ───────────────────────────
  white: '#FFFFFF',
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
    card: palette.white,
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
    light: 'rgba(185, 28, 28, 0.05)',
    dark: 'rgba(248, 113, 113, 0.12)',
  },
  /** Stronger urgent emphasis (badge fills) */
  urgentBgEmphasis: {
    light: 'rgba(185, 28, 28, 0.08)',
    dark: 'rgba(248, 113, 113, 0.15)',
  },
  /** Prayer active row highlight */
  prayerActiveBg: {
    light: 'rgba(191, 155, 48, 0.04)',
    dark: 'rgba(240, 208, 96, 0.06)',
  },
  /** Frosted navigation / sheet backgrounds (tab bar, bottom zones) */
  frostedBg: {
    light: 'rgba(249, 247, 242, 0.85)',
    dark: 'rgba(10, 22, 40, 0.85)',
  },
  /** Subtle frosted border on translucent surfaces */
  frostedBorder: {
    light: 'rgba(0, 0, 0, 0.04)',
    dark: 'rgba(255, 255, 255, 0.08)',
  },
  /** Action button / interactive surface tint (sheets, options) */
  actionBg: {
    light: 'rgba(0, 0, 0, 0.03)',
    dark: 'rgba(255, 255, 255, 0.06)',
  },
  /** Gold-tinted pill/chip backgrounds (e.g. "Today" pill in DateNavigator) */
  accentPill: {
    light: 'rgba(191, 155, 48, 0.12)',
    dark: 'rgba(240, 208, 96, 0.15)',
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
  };
}

export default Colors;
