/**
 * Mosque Connect — Islamic architectural color palette
 * Inspired by Iznik tilework, Alhambra zellige, gilded Quranic manuscripts
 */

export const palette = {
  warmIvory: '#FAF7F2',
  sacredBlue: '#1B4965',
  sacredBlueMuted: '#2A6A8F',
  divineGold: '#C8A951',
  divineGoldLight: '#E8D9A0',
  paradiseGreen: '#2D6A4F',
  paradiseGreenLight: '#52B788',
  moorishTerracotta: '#C44536',
  deepCharcoal: '#2B2D42',
  softStone: '#E8E4DE',
  softStoneDark: '#D1CCC4',

  // Dark mode
  nightSky: '#0D1117',
  midnightBlue: '#161B22',
  midnightCard: '#1C2129',
  mutedGold: '#B8952E',
  softWhite: '#E6E1D8',
  mutedBlue: '#8B949E',
};

const Colors = {
  light: {
    text: palette.deepCharcoal,
    textSecondary: palette.sacredBlueMuted,
    background: palette.warmIvory,
    card: '#FFFFFF',
    cardBorder: palette.softStone,
    tint: palette.sacredBlue,
    accent: palette.divineGold,
    success: palette.paradiseGreen,
    urgent: palette.moorishTerracotta,
    tabIconDefault: palette.softStoneDark,
    tabIconSelected: palette.sacredBlue,
    divider: palette.softStone,
    prayerActive: palette.divineGold,
    prayerActiveGlow: 'rgba(200, 169, 81, 0.15)',
  },
  dark: {
    text: palette.softWhite,
    textSecondary: palette.mutedBlue,
    background: palette.nightSky,
    card: palette.midnightCard,
    cardBorder: '#30363D',
    tint: palette.mutedGold,
    accent: palette.mutedGold,
    success: palette.paradiseGreenLight,
    urgent: palette.moorishTerracotta,
    tabIconDefault: palette.mutedBlue,
    tabIconSelected: palette.mutedGold,
    divider: '#21262D',
    prayerActive: palette.mutedGold,
    prayerActiveGlow: 'rgba(184, 149, 46, 0.2)',
  },
};

export type ColorScheme = 'light' | 'dark';

/** Safe accessor — maps any useColorScheme() result to 'light' | 'dark' */
export function getColors(scheme: string | null | undefined) {
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

export default Colors;
