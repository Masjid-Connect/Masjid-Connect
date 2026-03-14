/**
 * Sky Arc — The Celestial Path
 *
 * A refined, elegant arc showing the sun's journey from Fajr to Isha.
 * Prayer dots sit at time-proportional positions along a gentle parabola.
 * The sun indicator tracks real position. Tiny prayer initials label each dot.
 *
 * Design: flat horizon-like arc (not bulgy), thin strokes, small dots,
 * properly integrated with the home screen's visual hierarchy.
 *
 * Returns null on web (Skia not available).
 */

import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, Text } from 'react-native';
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
// Flatter, wider arc — a gentle horizon, not a speed bump.
const ARC_HEIGHT = 56;
const ARC_PADDING_H = 28;
const DOT_RADIUS = 2.5;
const ACTIVE_DOT_RADIUS = 3.5;
const SUN_RADIUS = 4;
const SUN_GLOW_RADIUS = 10;
const PEAK_Y = 10;       // gentle peak — subtle curvature
const BASELINE_Y = 44;   // baseline where arc rests
const LABEL_OFFSET_Y = 8; // space between dot and label

/** Prayer initials for labels */
const PRAYER_INITIALS: Record<PrayerName, string> = {
  fajr: 'F',
  sunrise: 'S',
  dhuhr: 'D',
  asr: 'A',
  maghrib: 'M',
  isha: 'I',
};

/** Get the sun's progress through the day (0 = fajr, 1 = isha) */
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
  const height = BASELINE_Y - PEAK_Y;
  return BASELINE_Y - 4 * height * t * (1 - t);
}

/** Normalized progress (0-1) → canvas X */
function arcX(t: number, width: number): number {
  return ARC_PADDING_H + t * (width - 2 * ARC_PADDING_H);
}

// Skia imports — only available on native
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Skia = Platform.OS !== 'web' ? require('@shopify/react-native-skia') : null;

export const SkyArc = ({ width, prayers, nextPrayer }: SkyArcProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';

  const sunProgress = useMemo(() => getSunProgress(prayers), [prayers]);

  // Prayer dot positions (shared between Skia canvas and RN label overlay)
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

  // Faded tail path (after current sun position — future portion)
  const fadedPath = useMemo(() => {
    if (!Skia) return null;
    const path = Skia.Skia.Path.Make();
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
  }, [width, sunProgress]);

  // Active path (from start to sun position)
  const activePath = useMemo(() => {
    if (!Skia) return null;
    const path = Skia.Skia.Path.Make();
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
  }, [width, sunProgress]);

  // Early return after all hooks
  if (Platform.OS === 'web' || prayers.length === 0 || width === 0 || !Skia) return null;

  const { Canvas, Path, Circle, Group, LinearGradient, RadialGradient, vec } = Skia;

  // Sun position
  const sunX = arcX(sunProgress, width);
  const sunY = arcY(sunProgress);

  // Arc colors
  const activeArcColors = isDark
    ? [palette.divineGoldBright, '#C8956A']
    : [palette.divineGold, '#C8956A'];

  const fadedArcColor = isDark
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.06)';

  // Label colors
  const labelColorActive = isDark ? palette.divineGoldBright : palette.divineGold;
  const labelColorPassed = colors.textTertiary;
  const labelColorFuture = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';

  return (
    <View style={styles.container}>
      <Canvas style={{ width, height: ARC_HEIGHT }} pointerEvents="none">
        {/* Faded future arc */}
        {fadedPath && (
          <Path
            path={fadedPath}
            style="stroke"
            strokeWidth={1.5}
            strokeCap="round"
            color={fadedArcColor}
          />
        )}

        {/* Active arc — warm gradient from start to sun */}
        {activePath && (
          <Path
            path={activePath}
            style="stroke"
            strokeWidth={1.5}
            strokeCap="round"
          >
            <LinearGradient
              start={vec(ARC_PADDING_H, 0)}
              end={vec(sunX, 0)}
              colors={activeArcColors}
            />
          </Path>
        )}

        {/* Prayer dots */}
        {prayerDots.map((dot) => (
          <Circle
            key={dot.name}
            cx={dot.x}
            cy={dot.y}
            r={dot.isNext ? ACTIVE_DOT_RADIUS : DOT_RADIUS}
            color={
              dot.isNext
                ? (isDark ? palette.divineGoldBright : palette.divineGold)
                : dot.isPassed
                  ? (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.15)')
                  : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)')
            }
          />
        ))}

        {/* Sun indicator — refined glowing orb */}
        <Group>
          {/* Soft outer glow */}
          <Circle cx={sunX} cy={sunY} r={SUN_GLOW_RADIUS}>
            <RadialGradient
              c={vec(sunX, sunY)}
              r={SUN_GLOW_RADIUS}
              colors={[
                isDark ? 'rgba(229, 193, 75, 0.15)' : 'rgba(212, 175, 55, 0.12)',
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
          {/* Specular highlight */}
          <Circle
            cx={sunX - 1}
            cy={sunY - 1}
            r={SUN_RADIUS * 0.3}
            color="rgba(255,255,255,0.4)"
          />
        </Group>
      </Canvas>

      {/* Prayer initial labels — positioned below each dot */}
      <View style={styles.labelsContainer} pointerEvents="none">
        {prayerDots.map((dot) => (
          <Text
            key={`label-${dot.name}`}
            style={[
              styles.label,
              {
                left: dot.x,
                top: dot.y + LABEL_OFFSET_Y,
                color: dot.isNext
                  ? labelColorActive
                  : dot.isPassed
                    ? labelColorPassed
                    : labelColorFuture,
                fontWeight: dot.isNext ? '600' : '400',
              },
            ]}
          >
            {PRAYER_INITIALS[dot.name]}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg, // 16px
  },
  labelsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  label: {
    position: 'absolute',
    fontSize: 9,
    letterSpacing: 0.3,
    textAlign: 'center',
    // Center the label on the dot's X position
    marginLeft: -3,
  },
});
