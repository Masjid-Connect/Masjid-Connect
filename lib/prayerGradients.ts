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
      case 'fajr':     return ['#0D0E1A', '#080A10', '#0A0A0C']; // deep pre-dawn indigo
      case 'sunrise':  return ['#1A120A', '#0F0A06', '#0A0A0C']; // first amber on dark
      case 'dhuhr':    return ['#0A0E14', '#06080C', '#0A0A0C']; // high-noon with sapphire whisper
      case 'asr':      return ['#12100A', '#0A0806', '#0A0A0C']; // warm afternoon
      case 'maghrib':  return ['#14080E', '#0A0508', '#0A0A0C']; // dusky rose
      case 'isha':     return ['#08080E', '#060608', '#0A0A0C']; // deep night
      default:         return ['#08080E', '#060608', '#0A0A0C'];
    }
  }

  switch (prayer) {
    case 'fajr':     return ['#D8DDE6', '#E4E7EC', '#F9F7F2']; // steel-blue dawn
    case 'sunrise':  return ['#F0E4D2', '#F2EBE0', '#F9F7F2']; // warm golden wash
    case 'dhuhr':    return ['#E4E9F0', '#ECF0F4', '#F9F7F2']; // bright clear sky, sapphire whisper
    case 'asr':      return ['#EDE6DA', '#F0EBE2', '#F9F7F2']; // amber afternoon
    case 'maghrib':  return ['#E0D4DE', '#E8DEE4', '#F9F7F2']; // rose-violet dusk
    case 'isha':     return ['#D4D8E2', '#DEE0E6', '#F9F7F2']; // deep blue evening
    default:         return ['#E8E8E4', '#F0F0EC', '#F9F7F2'];
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
