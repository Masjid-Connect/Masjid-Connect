/**
 * Sacred Grid System — Layout Law
 *
 * Single source of truth for all structural measurements.
 * Everything snaps to the 8pt grid. This removes visual drift across screens.
 *
 * Use `layout.*` for structural dimensions.
 * Use `spacing.*` (Theme.ts) for padding/margin within components.
 * Use `borderRadius.*` (Theme.ts) for corner radii.
 */

import { Platform } from 'react-native';

/** Base grid unit — all measurements derive from this */
export const GRID = 8;

/** Structural layout constants */
export const layout = {
  /** Screen-edge horizontal inset (matches spacing['3xl']) */
  screenInset: 32,

  /** Prayer hero section height */
  heroHeight: 320,

  /** Standard list row height */
  rowHeight: 64,

  /** Prayer time row height (compact) */
  prayerRowHeight: 52,

  /** Default card corner radius (2 × GRID) */
  cardRadius: 16,

  /** Vertical space between major sections */
  sectionSpacing: 32,

  /** Tab bar height per platform */
  tabBarHeight: Platform.OS === 'ios' ? 83 : Platform.OS === 'web' ? 56 : 64,

  /** Minimum touch target (Apple HIG / Material) */
  minTouchTarget: 44,

  /** Logo width ratio relative to screen width */
  logoWidthRatio: 0.75,

  /** Maximum logo width */
  logoMaxWidth: 360,

  /** Standard button height */
  buttonHeight: 52,

  /** Compact button / picker option height */
  compactRowHeight: 44,
} as const;

/** Islamic geometric pattern defaults */
export const patterns = {
  /** SVG tile size for background patterns */
  tileSize: 56,
  /** Pattern overlay opacity — visible as architectural tilework, perceptible on device */
  opacity: 0.07,
  /** Slightly less in dark mode to avoid noise on OLED */
  opacityDark: 0.05,
} as const;

/**
 * Visual Doctrine
 *
 * The rules that make the system self-designing.
 * Every visual element must serve one of these roles.
 * If it doesn't belong to a role, it doesn't belong in the interface.
 *
 *   Sky      = time          — gradients encode the prayer window
 *   Light    = sun position  — directional radiance follows the prayer cycle
 *   Paper    = information   — limestone surfaces carry content
 *   Gold     = divine signal — Divine Gold marks sacred moments
 *   Geometry = structure     — Islamic patterns provide sacred architecture
 *   Motion   = breathing     — all ambient animation follows breath rhythm
 */
export const VISUAL_DOCTRINE = {
  sky: 'time',
  light: 'sun position',
  paper: 'information',
  gold: 'divine signal',
  geometry: 'sacred structure',
  motion: 'breathing',
} as const;
