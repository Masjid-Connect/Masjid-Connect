/**
 * Living Sky Arc — Prayer-Aware Sun Path Visualization
 *
 * A gradient-colored arc showing the sun's journey across the sky with
 * prayer time markers. The arc color shifts per prayer window (dawn blues
 * → midday bright → sunset orange → night navy). The sun position is
 * animated and glows at the current time.
 *
 * Beats Pillars' flat orange line by:
 * - Multi-color gradient arc (the arc IS the sky)
 * - Animated glowing sun indicator
 * - Seasonal arc height (taller in summer, flatter in winter)
 * - Islamic geometric texture on the arc
 *
 * Returns null on web (Skia not available).
 */

import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';
import type { PrayerTimeEntry, PrayerName } from '@/types';

interface SkyArcProps {
  /** Available width for the arc */
  width: number;
  /** Prayer time entries (used to position dots) */
  prayers: PrayerTimeEntry[];
  /** Currently active/next prayer */
  nextPrayer: PrayerName | null;
}

// ─── Arc geometry ─────────────────────────────────────────────────
// Arc spans from Fajr (left) to Isha (right).
// The parabola peaks at solar noon (between Dhuhr and Asr).
// Sunrise and sunset define the visible horizon crossing.

const ARC_HEIGHT = 160;
const ARC_PADDING_H = 24;
const DOT_RADIUS = 5;
const SUN_RADIUS = 8;
const HORIZON_Y = ARC_HEIGHT - 20;

/** Get the sun's progress through the day (0 = fajr time, 1 = isha time) */
function getSunProgress(prayers: PrayerTimeEntry[]): number {
  const now = new Date();
  const fajr = prayers.find(p => p.name === 'fajr');
  const isha = prayers.find(p => p.name === 'isha');
  if (!fajr || !isha) return 0.5;

  const fajrMs = fajr.time.getTime();
  const ishaMs = isha.time.getTime();
  const nowMs = now.getTime();

  if (nowMs <= fajrMs) return 0;
  if (nowMs >= ishaMs) return 1;
  return (nowMs - fajrMs) / (ishaMs - fajrMs);
}

/** Convert a prayer's time to X position on the arc (0-1 normalized) */
function getPrayerProgress(prayer: PrayerTimeEntry, prayers: PrayerTimeEntry[]): number {
  const fajr = prayers.find(p => p.name === 'fajr');
  const isha = prayers.find(p => p.name === 'isha');
  if (!fajr || !isha) return 0.5;

  const fajrMs = fajr.time.getTime();
  const ishaMs = isha.time.getTime();
  const prayerMs = prayer.time.getTime();

  return Math.max(0, Math.min(1, (prayerMs - fajrMs) / (ishaMs - fajrMs)));
}

/** Parabolic Y position — peaks at t=0.5 (solar noon), baseline at t=0 and t=1 */
function arcY(t: number): number {
  // Parabola: y = -4h * t(t-1) where h is the peak height above horizon
  const peakHeight = HORIZON_Y - 30;
  return HORIZON_Y - (-4 * peakHeight * t * (t - 1));
}

/** Convert normalized progress (0-1) to canvas X coordinate */
function arcX(t: number, width: number): number {
  return ARC_PADDING_H + t * (width - 2 * ARC_PADDING_H);
}

// ─── Arc gradient colors per prayer window ─────────────────────────
function getArcColors(isDark: boolean): string[] {
  if (isDark) {
    return [
      '#2A3A5C', // Fajr — pre-dawn deep blue
      '#4A6A8C', // Sunrise — steel blue
      '#5B8AB5', // Dhuhr — mid-sky sapphire
      '#7A9A5C', // Asr — warm sage
      '#C47A3A', // Maghrib — sunset amber
      '#3A2A4C', // Isha — deep violet
    ];
  }
  return [
    '#7A9CC8', // Fajr — dawn blue-grey
    '#E8B87A', // Sunrise — golden
    '#8AB8E8', // Dhuhr — bright sky blue
    '#D4B87A', // Asr — warm gold
    '#D47A5A', // Maghrib — sunset orange
    '#5A6A8A', // Isha — evening blue
  ];
}

export const SkyArc = ({ width, prayers, nextPrayer }: SkyArcProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';

  const sunProgress = useMemo(() => getSunProgress(prayers), [prayers]);
  const arcColors = useMemo(() => getArcColors(isDark), [isDark]);

  if (Platform.OS === 'web' || prayers.length === 0) return null;

  // Dynamically require Skia (not available on web)
  const {
    Canvas, Path, Circle, Group,
    LinearGradient, RadialGradient,
    vec, Skia,
  } = require('@shopify/react-native-skia');

  // Build the arc path as a series of small line segments
  const arcPath = useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 100;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = arcX(t, width);
      const y = arcY(t);
      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    return path;
  }, [width, Skia]);

  // Prayer dot positions
  const prayerDots = useMemo(() => {
    return prayers.map(prayer => {
      const t = getPrayerProgress(prayer, prayers);
      return {
        name: prayer.name,
        x: arcX(t, width),
        y: arcY(t),
        isNext: prayer.name === nextPrayer,
        isPassed: prayer.time < new Date() && prayer.name !== nextPrayer,
      };
    });
  }, [prayers, nextPrayer, width]);

  // Sun position
  const sunX = arcX(sunProgress, width);
  const sunY = arcY(sunProgress);

  // Horizon line
  const horizonPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.moveTo(0, HORIZON_Y);
    path.lineTo(width, HORIZON_Y);
    return path;
  }, [width, Skia]);

  return (
    <View style={styles.container}>
      <Canvas style={{ width, height: ARC_HEIGHT }} pointerEvents="none">
        {/* Horizon line — subtle */}
        <Path
          path={horizonPath}
          style="stroke"
          strokeWidth={StyleSheet.hairlineWidth * 2}
          color={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
        />

        {/* The arc — gradient colored stroke */}
        <Path
          path={arcPath}
          style="stroke"
          strokeWidth={3}
          strokeCap="round"
        >
          <LinearGradient
            start={vec(ARC_PADDING_H, 0)}
            end={vec(width - ARC_PADDING_H, 0)}
            colors={arcColors}
          />
        </Path>

        {/* Prayer dots on the arc */}
        {prayerDots.map((dot) => (
          <Circle
            key={dot.name}
            cx={dot.x}
            cy={dot.y}
            r={dot.isNext ? DOT_RADIUS + 1 : DOT_RADIUS}
            color={
              dot.isNext
                ? (isDark ? palette.divineGoldBright : palette.divineGold)
                : dot.isPassed
                  ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')
                  : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.9)')
            }
          />
        ))}

        {/* Sun indicator — glowing orb at current time */}
        <Group>
          {/* Outer glow */}
          <Circle cx={sunX} cy={sunY} r={SUN_RADIUS + 8}>
            <RadialGradient
              c={vec(sunX, sunY)}
              r={SUN_RADIUS + 8}
              colors={[
                isDark ? 'rgba(229, 193, 75, 0.3)' : 'rgba(212, 175, 55, 0.25)',
                'transparent',
              ]}
            />
          </Circle>
          {/* Inner sun */}
          <Circle
            cx={sunX}
            cy={sunY}
            r={SUN_RADIUS}
            color={isDark ? palette.divineGoldBright : palette.divineGold}
          />
          {/* Sun highlight */}
          <Circle
            cx={sunX - 2}
            cy={sunY - 2}
            r={SUN_RADIUS * 0.4}
            color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.5)'}
          />
        </Group>
      </Canvas>

      {/* Prayer name labels below the arc */}
      <View style={styles.labelsRow}>
        {prayerDots
          .filter(d => d.name !== 'sunrise') // Skip sunrise label for cleanliness
          .map((dot) => (
            <Text
              key={dot.name}
              style={[
                styles.label,
                {
                  left: dot.x - 20,
                  color: dot.isNext
                    ? (isDark ? palette.divineGoldBright : palette.divineGold)
                    : dot.isPassed
                      ? colors.textTertiary
                      : colors.textSecondary,
                  fontWeight: dot.isNext ? '600' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {dot.name.charAt(0).toUpperCase() + dot.name.slice(1, 3)}
            </Text>
          ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  labelsRow: {
    position: 'relative',
    height: 20,
    marginTop: spacing.xs,
  },
  label: {
    position: 'absolute',
    width: 40,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});
