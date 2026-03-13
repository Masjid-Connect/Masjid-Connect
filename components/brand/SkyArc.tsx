/**
 * Sky Arc — Refined Sun Path Visualization
 *
 * A minimal, elegant parabolic arc showing the sun's journey with
 * prayer time markers as small dots. Inspired by premium prayer apps
 * with a clean, thin gradient line and subtle positioning.
 *
 * Returns null on web (Skia not available).
 */

import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/constants/Theme';
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
const ARC_HEIGHT = 120;
const ARC_PADDING_H = 32;
const DOT_RADIUS = 4;
const SUN_RADIUS = 6;
const PEAK_Y = 20;        // top of the arc (closer to top = taller arc)
const BASELINE_Y = 100;   // baseline where arc ends

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

/** Convert a prayer's time to normalized position (0-1) */
function getPrayerProgress(prayer: PrayerTimeEntry, prayers: PrayerTimeEntry[]): number {
  const fajr = prayers.find(p => p.name === 'fajr');
  const isha = prayers.find(p => p.name === 'isha');
  if (!fajr || !isha) return 0.5;

  const fajrMs = fajr.time.getTime();
  const ishaMs = isha.time.getTime();
  const prayerMs = prayer.time.getTime();

  return Math.max(0, Math.min(1, (prayerMs - fajrMs) / (ishaMs - fajrMs)));
}

/** Smooth parabolic Y — peaks at t=0.5, baseline at t=0 and t=1 */
function arcY(t: number): number {
  // Inverted parabola: highest at center
  const height = BASELINE_Y - PEAK_Y;
  return BASELINE_Y - 4 * height * t * (1 - t);
}

/** Normalized progress (0-1) → canvas X */
function arcX(t: number, width: number): number {
  return ARC_PADDING_H + t * (width - 2 * ARC_PADDING_H);
}

export const SkyArc = ({ width, prayers, nextPrayer }: SkyArcProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';

  const sunProgress = useMemo(() => getSunProgress(prayers), [prayers]);

  if (Platform.OS === 'web' || prayers.length === 0) return null;

  const {
    Canvas, Path, Circle, Group,
    LinearGradient, RadialGradient,
    vec, Skia,
  } = require('@shopify/react-native-skia');

  // Build the smooth arc path
  const arcPath = useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 80;

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

  // Faded tail path (after current sun position — future portion)
  const fadedPath = useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 80;
    const startStep = Math.max(0, Math.floor(sunProgress * steps));

    for (let i = startStep; i <= steps; i++) {
      const t = i / steps;
      const x = arcX(t, width);
      const y = arcY(t);
      if (i === startStep) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    return path;
  }, [width, sunProgress, Skia]);

  // Active path (from start to sun position)
  const activePath = useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 80;
    const endStep = Math.min(steps, Math.ceil(sunProgress * steps));

    for (let i = 0; i <= endStep; i++) {
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
  }, [width, sunProgress, Skia]);

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

  // Arc colors — warm gradient for active portion, muted for future
  const activeArcColors = isDark
    ? [palette.divineGoldBright, '#C8956A']
    : [palette.divineGold, '#C8956A'];

  const fadedArcColor = isDark
    ? 'rgba(255,255,255,0.12)'
    : 'rgba(0,0,0,0.08)';

  return (
    <View style={styles.container}>
      <Canvas style={{ width, height: ARC_HEIGHT }} pointerEvents="none">
        {/* Faded future arc — subtle hint of remaining path */}
        <Path
          path={fadedPath}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          color={fadedArcColor}
        />

        {/* Active arc — warm gradient from start to sun */}
        <Path
          path={activePath}
          style="stroke"
          strokeWidth={2.5}
          strokeCap="round"
        >
          <LinearGradient
            start={vec(ARC_PADDING_H, 0)}
            end={vec(sunX, 0)}
            colors={activeArcColors}
          />
        </Path>

        {/* Prayer dots — small, clean markers */}
        {prayerDots.map((dot) => (
          <Circle
            key={dot.name}
            cx={dot.x}
            cy={dot.y}
            r={dot.isNext ? DOT_RADIUS + 1.5 : DOT_RADIUS}
            color={
              dot.isNext
                ? (isDark ? palette.divineGoldBright : palette.divineGold)
                : dot.isPassed
                  ? (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.95)')
                  : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.12)')
            }
          />
        ))}

        {/* Sun indicator — refined glowing orb */}
        <Group>
          {/* Soft outer glow */}
          <Circle cx={sunX} cy={sunY} r={SUN_RADIUS + 10}>
            <RadialGradient
              c={vec(sunX, sunY)}
              r={SUN_RADIUS + 10}
              colors={[
                isDark ? 'rgba(229, 193, 75, 0.2)' : 'rgba(212, 175, 55, 0.18)',
                'transparent',
              ]}
            />
          </Circle>
          {/* Inner sun — clean circle */}
          <Circle
            cx={sunX}
            cy={sunY}
            r={SUN_RADIUS}
            color={isDark ? palette.divineGoldBright : palette.divineGold}
          />
          {/* Specular highlight */}
          <Circle
            cx={sunX - 1.5}
            cy={sunY - 1.5}
            r={SUN_RADIUS * 0.35}
            color="rgba(255,255,255,0.45)"
          />
        </Group>
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});
