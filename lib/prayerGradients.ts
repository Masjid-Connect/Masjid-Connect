/**
 * Prayer-Aware Atmospheric Gradients — Shared Utility
 *
 * Sky-calibrated gradients modelled on real sky colour at each prayer window.
 * Each triple goes top → bottom to mimic looking upward.
 *
 * Light mode: warm, perceptible atmospheric shifts ending in stone.
 * Dark mode: barely-there tints on near-OLED black (onyx950).
 */

import type { PrayerName } from '@/types';

export type GradientTriple = [string, string, string];

/**
 * Returns a 3-stop gradient calibrated to the sky colour
 * during the given prayer window.
 */
export function getAtmosphericGradient(
  prayer: PrayerName | null,
  isDark: boolean,
): GradientTriple {
  if (isDark) {
    switch (prayer) {
      case 'fajr':     return ['#1A1E3A', '#0F1220', '#0A0A0C']; // bold pre-dawn indigo
      case 'sunrise':  return ['#3A2210', '#1A1008', '#0A0A0C']; // rich amber on dark
      case 'dhuhr':    return ['#142038', '#0C1420', '#0A0A0C']; // deep sapphire noon
      case 'asr':      return ['#2A2010', '#14100A', '#0A0A0C']; // warm golden afternoon
      case 'maghrib':  return ['#30102A', '#180A16', '#0A0A0C']; // vivid rose dusk
      case 'isha':     return ['#10101E', '#0A0A12', '#0A0A0C']; // deep night blue
      default:         return ['#10101E', '#0A0A12', '#0A0A0C'];
    }
  }

  switch (prayer) {
    case 'fajr':     return ['#A0B0CC', '#C8D0DE', '#F0EDE6']; // bold steel-blue dawn
    case 'sunrise':  return ['#E8C890', '#F0DCC0', '#F9F7F2']; // rich warm golden
    case 'dhuhr':    return ['#B0C8E8', '#D0DCF0', '#F9F7F2']; // vivid clear sky blue
    case 'asr':      return ['#D8C4A0', '#E8DCC4', '#F9F7F2']; // warm amber afternoon
    case 'maghrib':  return ['#C8A0C0', '#DCC0D6', '#F9F7F2']; // vivid rose-violet dusk
    case 'isha':     return ['#9CA4BE', '#C0C4D4', '#F0EDE6']; // pronounced blue evening
    default:         return ['#D0D0CC', '#E0E0DC', '#F9F7F2'];
  }
}

/**
 * Parse hex color to [r, g, b] floats (0–1).
 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

/**
 * Convert [r, g, b] floats (0–1) back to hex string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Linearly interpolate between two gradient triples.
 * `progress` is 0–1, where 0 = `from` and 1 = `to`.
 */
export function interpolateGradient(
  from: GradientTriple,
  to: GradientTriple,
  progress: number,
): GradientTriple {
  const t = Math.max(0, Math.min(1, progress));
  return from.map((fromHex, i) => {
    const [r1, g1, b1] = hexToRgb(fromHex);
    const [r2, g2, b2] = hexToRgb(to[i]);
    return rgbToHex(
      r1 + (r2 - r1) * t,
      g1 + (g2 - g1) * t,
      b1 + (b2 - b1) * t,
    );
  }) as GradientTriple;
}
