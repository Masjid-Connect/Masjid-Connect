import { PixelRatio, Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

/**
 * Font families — system-first strategy.
 * Apple uses one family (SF Pro) with weight variation. We do the same:
 * system fonts for everything, SpaceMono for technical accents only.
 */
export const fonts = {
  heading: undefined, // system default (SF Pro / Roboto)
  headingSemiBold: undefined,
  body: undefined,
  bodyMedium: undefined,
  mono: 'SpaceMono',
} as const;

/**
 * Font weight tokens — centralized weight constants.
 * Prevents raw string proliferation ('300', '400', etc.) across the codebase.
 * Usage: fontWeight.semibold instead of '600'.
 */
export const fontWeight = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

/**
 * Spacing scale — expanded from 8pt grid.
 * Screen edge insets: spacing['3xl'] (32px).
 * Prayer row height target: 52px.
 */
export const spacing = {
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
  '5xl': 64,
} as const;

/**
 * Android-safe hairline border width.
 * On iOS, StyleSheet.hairlineWidth (0.5px) renders crisply on Retina displays.
 * On Android, hairlineWidth (~0.33px) is often invisible — use 1px instead.
 */
export const hairline = Platform.OS === 'android' ? 1 : StyleSheet.hairlineWidth;

/** Badge sizing tokens */
export const badge = {
  dotSize: 8,
  smallDotSize: 6,
  countSize: 18,
} as const;

/**
 * Elevation — black shadows only (Apple convention).
 * Colored glow reserved for intentional brand moments.
 */
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  // Keep old names as aliases for compatibility during migration
  ground: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

/**
 * Theme-aware elevation — Apple HIG dark mode convention.
 * Light mode: black shadows create depth.
 * Dark mode: subtle hairline borders define card edges (shadows invisible on black).
 */
type ElevationLevel = 'sm' | 'md' | 'lg';

/**
 * Dark mode elevation — distinct per level.
 * Higher elevations get brighter borders for visual hierarchy.
 */
const darkElevation: Record<ElevationLevel, ViewStyle> = {
  sm: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1E3B5A', // sapphire navy — subtle edge
  },
  md: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2A4F72', // brighter sapphire — mid-elevation
  },
  lg: {
    borderWidth: 1,
    borderColor: '#2A4F72', // full 1px border for floating surfaces
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

/**
 * Light mode elevation for Android — shadows are weak on Android,
 * so we add explicit borders (same approach as dark mode).
 */
const androidLightElevation: Record<ElevationLevel, ViewStyle> = {
  sm: {
    borderWidth: 1,
    borderColor: '#C8C3B8', // separatorLight — visible on stone backgrounds
    ...elevation.sm,
  },
  md: {
    borderWidth: 1,
    borderColor: '#C8C3B8',
    ...elevation.md,
  },
  lg: {
    borderWidth: 1,
    borderColor: '#C8C3B8',
    ...elevation.lg,
  },
};

export function getElevation(level: ElevationLevel, isDark: boolean): ViewStyle {
  if (isDark) return darkElevation[level];
  if (Platform.OS === 'android') return androidLightElevation[level];
  return elevation[level];
}

export const borderRadius = {
  '2xs': 2,  // Hairline decorative radii (accent bars, progress bars, gold rules)
  '3xs': 4,  // Small decorative radii (dots, checkboxes, category indicators)
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

/**
 * Typography — Apple's Human Interface type scale.
 * System fonts with weight variation. No custom fonts needed for MVP.
 */
export const typography: Record<string, TextStyle> = {
  largeTitle: {
    fontSize: 34,
    fontFamily: fonts.heading,
    fontWeight: '700',
    letterSpacing: 0.37,
    lineHeight: 41,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.36,
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.35,
    lineHeight: 28,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.38,
    lineHeight: 25,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  body: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.32,
    lineHeight: 21,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.08,
    lineHeight: 18,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 16,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.07,
    lineHeight: 13,
  },
  // Weight variants
  bodyBold: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  subheadMedium: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  subheadSemiBold: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  caption1Medium: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  caption1SemiBold: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  caption2SemiBold: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.07,
    lineHeight: 13,
  },
  footnoteMedium: {
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: -0.08,
    lineHeight: 18,
  },
  // Special purpose
  prayerCountdown: {
    fontSize: 54,
    fontWeight: '200',
    letterSpacing: -1.5,
    lineHeight: 60,
  },
  prayerTime: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 13,
  },
  prayerName: {
    fontSize: 40,
    fontWeight: '300',
    letterSpacing: 0.4,
    lineHeight: 48,
  },
  // Legacy aliases for compatibility
  display: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
    lineHeight: 41,
  },
  caption: {
    fontSize: 12,
    fontFamily: fonts.body,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 16,
  },
};

/**
 * Component-specific dimension tokens.
 * For values that don't fit the spacing/borderRadius scales
 * but are reused across components.
 */
export const components = {
  avatar: {
    sm: 56,
    md: 64,
  },
  button: {
    height: 48,
    compactHeight: 44,
  },
  grabber: {
    width: 36,
    height: 5,
  },
  icon: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
  iconBox: {
    size: 32,
  },
  categoryAccent: {
    width: 4,
  },
  tabGlow: {
    size: 64,
    opacity: 0.08,
  },
  emptyState: {
    iconSize: 72,
  },
} as const;

/**
 * Animation timing tokens (milliseconds).
 * Spring configs are preferred for interactive motion.
 * Use timing for backdrop fades and simple opacity transitions.
 */
export const timing = {
  fast: 150,
  normal: 300,
  slow: 500,
  staggerOffset: 40,
} as const;

/** Reanimated spring configs */
export const springs = {
  gentle: { damping: 20, stiffness: 150, mass: 1 },
  snappy: { damping: 15, stiffness: 180, mass: 0.8 },
  bouncy: { damping: 12, stiffness: 200, mass: 0.6 },
} as const;

/**
 * Layout constants for accessibility compliance.
 * minTouchTarget follows Apple HIG (44pt) for all interactive elements.
 */
export const layout = {
  /** Minimum interactive touch target (Apple HIG) */
  minTouchTarget: 44,
  /** Standard gap between content sections */
  sectionGap: 24,
  /** Bottom padding for scrollable content */
  screenBottomPad: 64,
  /** Screen edge horizontal inset */
  screenInset: 32,
} as const;

/**
 * Dynamic type scaling — respects system font scale preference.
 * Clamps between 0.85× and 1.35× to prevent layout breakage at extremes.
 * Use `getScaledTypography()` for text that should honor accessibility settings.
 */
const MIN_FONT_SCALE = 0.85;
const MAX_FONT_SCALE = 1.35;

function clampFontScale(scale: number): number {
  'worklet';
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, scale));
}

/** Returns a scaled copy of a text style based on the device font scale */
export function scaleTextStyle(style: TextStyle): TextStyle {
  const fontScale = clampFontScale(PixelRatio.getFontScale());
  const scaled: TextStyle = { ...style };
  if (style.fontSize) {
    scaled.fontSize = Math.round(style.fontSize * fontScale);
  }
  if (style.lineHeight) {
    scaled.lineHeight = Math.round(style.lineHeight * fontScale);
  }
  if (style.letterSpacing !== undefined) {
    scaled.letterSpacing = style.letterSpacing * fontScale;
  }
  return scaled;
}

/**
 * Returns the full typography scale with dynamic type applied.
 * Call at render time to pick up the current system font scale.
 */
export function getScaledTypography(): Record<string, TextStyle> {
  const result: Record<string, TextStyle> = {};
  for (const [key, style] of Object.entries(typography)) {
    result[key] = scaleTextStyle(style);
  }
  return result;
}

