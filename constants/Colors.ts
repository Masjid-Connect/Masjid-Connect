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
  },
};

export type ColorScheme = 'light' | 'dark';

/** Safe accessor — maps any useColorScheme() result to 'light' | 'dark' */
export function getColors(scheme: string | null | undefined) {
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

export default Colors;
