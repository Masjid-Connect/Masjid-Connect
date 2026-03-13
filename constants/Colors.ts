/**
 * Mosque Connect — "Timeless Sanctuary" Color System
 *
 * Jewel & Stone philosophy: organic, stone-inspired tones replace
 * harsh pure whites and generic blues. High-contrast for older
 * congregants, calm for daily use.
 *
 * Light mode: "Morning Light in the Musalla"
 * Dark mode: "Midnight in the Masjid"
 *
 * Palette taxonomy:
 *   Stone  — warm marble backgrounds
 *   Onyx   — organic dark tones (never pure black)
 *   Emerald — sacred green, brand primary
 *   Gold   — divine accent, prayer signal
 *   Crimson — urgent/alert states
 *   Slate  — neutral info
 */

export const palette = {
  // ─── Stone: warm marble backgrounds (light mode) ────────────────
  stone100: '#F9F7F2',      // Main background — clean masjid marble floor
  stone200: '#F0EDE6',      // Secondary surface — slightly deeper warmth
  stone300: '#E5E0D3',      // Grouped/tertiary — sand-toned

  // ─── Onyx: organic dark tones (dark mode) ───────────────────────
  onyx950: '#0A0A0C',       // Main background — not pure black, easier on OLED
  onyx900: '#121216',       // Near-black for text on light backgrounds
  onyx850: '#1A1A1E',       // Elevated card surfaces
  onyx800: '#262628',       // Grouped list backgrounds
  onyx600: '#6B6B70',       // Secondary text
  onyx400: '#A8A8AD',       // Tertiary text / disabled

  // ─── Emerald: sacred green, brand primary ───────────────────────
  emerald700: '#064E3B',    // Brand primary (light mode tint, tab selection)
  emerald600: '#047857',    // Success states
  emerald400: '#34D399',    // Dark mode tint (lighter for dark backgrounds)
  emeraldLight: '#ECFDF5',  // Tint background (light mode)

  // ─── Gold: divine accent, prayer signal ─────────────────────────
  divineGold: '#D4AF37',    // Rich matte leaf gold — accent, prayer active
  divineGoldBright: '#E5C14B', // Brighter variant for dark mode contrast
  divineGoldGlow: 'rgba(212, 175, 55, 0.08)', // Subtle glow for active prayer

  // ─── Crimson: urgent/alert states ───────────────────────────────
  crimson600: '#B91C1C',    // Janazah, immediate announcements (light)
  crimson400: '#F87171',    // Alert for dark mode

  // ─── Slate: neutral info ────────────────────────────────────────
  slate500: '#64748B',      // Info states (light mode)
  slate400: '#94A3B8',      // Info states (dark mode)

  // ─── Separators ─────────────────────────────────────────────────
  separatorLight: '#E2DFD8', // Warmer than system gray
  separatorDark: '#333336',  // Dark mode divider

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
  darkCardBorder: '#333336',

  // ─── Legacy aliases (map old names to new values) ───────────────
  // These exist for gradual migration. Prefer canonical names above.
  limestone: '#F9F7F2',
  limestoneSecondary: '#F0EDE6',
  limestoneTertiary: '#E5E0D3',
  ink: '#121216',
  inkSecondary: '#6B6B70',
  inkTertiary: '#A8A8AD',
  sacredBlue: '#064E3B',
  sacredBlueLight: '#34D399',
  paradiseGreen: '#047857',
  paradiseGreenLight: '#34D399',
  moorishTerracotta: '#B91C1C',
  moorishTerracottaLight: '#F87171',
  steelBlue: '#64748B',
  steelBlueLight: '#94A3B8',
  tintLight: '#ECFDF5',
  black: '#0A0A0C',
  darkElevated: '#1A1A1E',
  darkGrouped: '#262628',
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
    main: { light: palette.stone100, dark: palette.onyx950 },
    card: { light: palette.white, dark: palette.onyx850 },
    grouped: { light: palette.stone300, dark: palette.onyx800 },
    frosted: { light: 'rgba(249, 247, 242, 0.85)', dark: 'rgba(26, 26, 30, 0.85)' },
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
    success: { light: palette.emerald600, dark: palette.emerald400 },
    info: { light: palette.slate500, dark: palette.slate400 },
  },
  brand: {
    primary: { light: palette.emerald700, dark: palette.emerald400 },
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
    tint: palette.emerald700,
    tintLight: palette.emeraldLight,
    accent: palette.divineGold,
    success: palette.emerald600,
    urgent: palette.crimson600,
    info: palette.slate500,
    tabIconDefault: palette.tabInactive,
    tabIconSelected: palette.emerald700,
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
    background: palette.onyx950,
    backgroundSecondary: palette.onyx850,
    backgroundGrouped: palette.onyx800,
    card: palette.onyx850,
    cardBorder: palette.darkCardBorder,
    tint: palette.emerald400,
    tintLight: 'rgba(6, 78, 59, 0.12)',
    accent: palette.divineGoldBright,
    success: palette.emerald400,
    urgent: palette.crimson400,
    info: palette.slate400,
    tabIconDefault: palette.snowSecondary,
    tabIconSelected: palette.divineGoldBright,
    divider: palette.separatorDark,
    prayerActive: palette.divineGoldBright,
    prayerActiveGlow: 'rgba(229, 193, 75, 0.15)',
    separator: palette.separatorDark,
    inverseText: palette.onyx950,
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
    light: 'rgba(212, 175, 55, 0.04)',
    dark: 'rgba(229, 193, 75, 0.06)',
  },
  /** Frosted navigation / sheet backgrounds (tab bar, bottom zones) */
  frostedBg: {
    light: 'rgba(249, 247, 242, 0.85)',
    dark: 'rgba(26, 26, 30, 0.85)',
  },
  /** Subtle frosted border on translucent surfaces */
  frostedBorder: {
    light: 'rgba(0, 0, 0, 0.04)',
    dark: 'rgba(255, 255, 255, 0.06)',
  },
  /** Action button / interactive surface tint (sheets, options) */
  actionBg: {
    light: 'rgba(0, 0, 0, 0.03)',
    dark: 'rgba(255, 255, 255, 0.06)',
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
  };
}

export default Colors;
