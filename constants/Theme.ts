import { TextStyle } from 'react-native';

/** 8pt spacing grid — generous whitespace (30-50% more than typical) */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

/**
 * Brand Identity — The Convergent Arch
 *
 * Timing, sizing, and material constants for the living identity system.
 * These tokens govern how the mark behaves across the splash screen,
 * tab bar, app icon, and notification badges.
 */
export const brand = {
  /** Splash screen animation timing (ms) */
  splash: {
    pauseBeforeDraw: 1000,
    drawDuration: 1500,
    pauseAfterDraw: 200,
    goldFadeDuration: 600,
    contentFadeDelay: 400,
    contentFadeDuration: 800,
  },
  /** Mark stroke weights in viewBox units */
  stroke: {
    splash: 1.5,
    tabBar: 1.2,
    tabBarActive: 1.5,
    header: 1.0,
  },
  /** Gold node radii in viewBox units */
  node: {
    splash: 4,
    tabBar: 2.5,
    tabBarActive: 3.5,
    header: 3,
  },
  /** Tab bar icon sizing */
  tabIcon: {
    size: 26,
  },
  /** Notification badge */
  badge: {
    dotSize: 8,
    countSize: 18,
  },
} as const;

/** Muqarnas-inspired depth system */
export const elevation = {
  ground: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  elevated: {
    shadowColor: '#1B4965',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#1B4965',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/** Type scale — serif-forward, editorial */
export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  title1: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
  },
  title3: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  callout: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
};

/** Reanimated spring configs */
export const springs = {
  gentle: { damping: 20, stiffness: 150, mass: 1 },
  snappy: { damping: 15, stiffness: 180, mass: 0.8 },
  bouncy: { damping: 12, stiffness: 200, mass: 0.6 },
} as const;
