/**
 * Mosque Connect — Apple-inspired color system with Islamic soul
 *
 * Light mode: "Morning Light in the Musalla"
 * Dark mode: "Midnight in the Masjid"
 *
 * Every color is intentional. Backgrounds are sunlit limestone, not yellowed
 * parchment. Gold is matte leaf, not digital yellow. True black dark mode
 * for OLED efficiency.
 */

export const palette = {
  // Backgrounds — light
  limestone: '#F8F6F1',
  limestoneSecondary: '#F2EFEA',
  limestoneTertiary: '#EDEAE4',

  // Text
  ink: '#1C1C1E',
  inkSecondary: '#636366',
  inkTertiary: '#AEAEB2',

  // Brand
  sacredBlue: '#1A5276',
  sacredBlueLight: '#6AADDB',
  divineGold: '#BFA14E',
  divineGoldBright: '#D4B85C',
  divineGoldGlow: 'rgba(191, 161, 78, 0.08)',

  // Semantic
  paradiseGreen: '#2D6A4F',
  paradiseGreenLight: '#52B788',
  moorishTerracotta: '#C44536',
  moorishTerracottaLight: '#E05A4A',
  steelBlue: '#5B7FA5',
  steelBlueLight: '#7BA4C7',

  // Interactive
  tintLight: '#E8F0F6',

  // Separators
  separatorLight: '#E5E5EA',
  separatorDark: '#38383A',

  // Tab bar
  tabInactive: '#8E8E93',

  // Dark backgrounds
  black: '#000000',
  darkElevated: '#1C1C1E',
  darkGrouped: '#2C2C2E',
  darkCardBorder: '#38383A',

  // Light text on dark
  snow: '#F5F5F7',
  snowSecondary: '#8E8E93',
  snowTertiary: '#636366',

  // Fixed colors (theme-independent)
  white: '#FFFFFF',
  googleBlue: '#4285F4',
  backdrop: 'rgba(0,0,0,0.4)',
} as const;

const Colors = {
  light: {
    text: palette.ink,
    textSecondary: palette.inkSecondary,
    textTertiary: palette.inkTertiary,
    background: palette.limestone,
    backgroundSecondary: palette.limestoneSecondary,
    backgroundGrouped: palette.limestoneTertiary,
    card: '#FFFFFF',
    cardBorder: palette.separatorLight,
    tint: palette.sacredBlue,
    tintLight: palette.tintLight,
    accent: palette.divineGold,
    success: palette.paradiseGreen,
    urgent: palette.moorishTerracotta,
    info: palette.steelBlue,
    tabIconDefault: palette.tabInactive,
    tabIconSelected: palette.sacredBlue,
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
    background: palette.black,
    backgroundSecondary: palette.darkElevated,
    backgroundGrouped: palette.darkGrouped,
    card: palette.darkElevated,
    cardBorder: palette.darkCardBorder,
    tint: palette.sacredBlueLight,
    tintLight: 'rgba(26, 82, 118, 0.12)',
    accent: palette.divineGoldBright,
    success: palette.paradiseGreenLight,
    urgent: palette.moorishTerracottaLight,
    info: palette.steelBlueLight,
    tabIconDefault: palette.snowSecondary,
    tabIconSelected: palette.divineGoldBright,
    divider: palette.separatorDark,
    prayerActive: palette.divineGoldBright,
    prayerActiveGlow: 'rgba(212, 184, 92, 0.15)',
    separator: palette.separatorDark,
    inverseText: palette.black,
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
    light: 'rgba(196, 69, 54, 0.05)',
    dark: 'rgba(224, 90, 74, 0.12)',
  },
  /** Stronger urgent emphasis (badge fills) */
  urgentBgEmphasis: {
    light: 'rgba(196, 69, 54, 0.08)',
    dark: 'rgba(224, 90, 74, 0.15)',
  },
  /** Prayer active row highlight */
  prayerActiveBg: {
    light: 'rgba(191, 161, 78, 0.04)',
    dark: 'rgba(212, 184, 92, 0.06)',
  },
  /** Frosted navigation / sheet backgrounds (tab bar, bottom zones) */
  frostedBg: {
    light: 'rgba(248, 246, 241, 0.85)',
    dark: 'rgba(28, 28, 30, 0.85)',
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
