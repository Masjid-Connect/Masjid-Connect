import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { formatPrayerTime } from '@/lib/prayer';
import type { PrayerName } from '@/types';

// ─── Design Philosophy ──────────────────────────────────────────────
//
// "Time is the interface."
//
// The gradient IS the data — calibrated to real sky tones so a returning
// user recognises the prayer window by colour alone, like recognising
// golden hour without checking a clock.
//
// One dominant element per screen state: the next prayer name.
// Everything else is secondary or tertiary. No decoration. No ornament.
// Typography, space, and atmospheric colour do all the work.
//
// Strict 8pt vertical grid. Every measurement is a multiple of 8.
// Three colours max per screen state: gradient + text + one accent.
//
// ─── Sky-calibrated gradients ───────────────────────────────────────

/**
 * Gradients modelled on real sky colour at each prayer window.
 * Each pair goes top → bottom to mimic looking upward.
 *
 * Light mode: warm, perceptible atmospheric shifts.
 * Dark mode: barely-there tints on true OLED black — the screen
 * should feel like a window into the night sky.
 */
function getAtmosphericGradient(
  prayer: PrayerName | null,
  isDark: boolean,
): [string, string, string] {
  if (isDark) {
    switch (prayer) {
      case 'fajr':     return ['#0D0E1A', '#080A12', '#000000']; // deep pre-dawn indigo
      case 'sunrise':  return ['#1A120A', '#0F0A06', '#000000']; // first amber on black
      case 'dhuhr':    return ['#0A0E12', '#060A0E', '#000000']; // high-noon steel
      case 'asr':      return ['#12100A', '#0A0806', '#000000']; // warm afternoon
      case 'maghrib':  return ['#14080E', '#0A0508', '#000000']; // dusky rose
      case 'isha':     return ['#08080E', '#040408', '#000000']; // deep night
      default:         return ['#08080E', '#040408', '#000000'];
    }
  }

  switch (prayer) {
    case 'fajr':     return ['#D8DDE8', '#E4E7EE', '#F8F6F1']; // steel-blue dawn
    case 'sunrise':  return ['#F0E4D4', '#F2EBE0', '#F8F6F1']; // warm golden wash
    case 'dhuhr':    return ['#EDF0ED', '#F0F2F0', '#F8F6F1']; // bright clear sky
    case 'asr':      return ['#EDE6DA', '#F0EBE2', '#F8F6F1']; // amber afternoon
    case 'maghrib':  return ['#E0D4DF', '#E8DEE6', '#F8F6F1']; // rose-violet dusk
    case 'isha':     return ['#D4D8E4', '#DEE0E8', '#F8F6F1']; // deep blue evening
    default:         return ['#E8E8E6', '#F0F0EE', '#F8F6F1'];
  }
}

// ─── Grid constants ─────────────────────────────────────────────────
// All vertical measurements are multiples of 8.
const GRID = 8;
const HERO_PADDING_BOTTOM = GRID * 6;  // 48
const TIMETABLE_PADDING_TOP = GRID * 4; // 32
const ROW_PADDING_V = GRID * 2;         // 16 (= spacing.lg, ~52px row height)
const SECTION_HEADER_MB = GRID * 2;     // 16

export default function PrayerTimesScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const {
    prayers, nextPrayer, countdown, hijriDate,
    isLoading, use24h, refresh,
  } = usePrayerTimes();

  const [refreshing, setRefreshing] = React.useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const nextPrayerData = prayers.find((p) => p.name === nextPrayer);
  const gradient = getAtmosphericGradient(nextPrayer, isDark);

  // ─── Loading state ──────────────────────────────────────────────
  if (isLoading && prayers.length === 0) {
    return (
      <View style={[styles.root, styles.loading, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: GRID * 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero: one dominant element ─────────────────────────── */}
        <LinearGradient
          colors={gradient}
          locations={[0, 0.5, 1]}
          style={[styles.hero, { paddingTop: insets.top + GRID * 4 }]}
        >
          <Animated.View entering={FadeIn.duration(600)}>
            {/* Hijri date — quiet context, not competing */}
            {hijriDate && (
              <Text style={[styles.hijriDate, { color: colors.textSecondary }]}>
                {hijriDate}
              </Text>
            )}

            {/* THE dominant element: next prayer name */}
            {nextPrayerData && (
              <>
                <Text style={[styles.prayerLabel, { color: colors.textSecondary }]}>
                  {t('prayer.upcoming')}
                </Text>

                <Text style={[styles.prayerName, { color: colors.text }]}>
                  {nextPrayerData.label}
                </Text>

                {/* Large time — extension of the prayer name, not separate */}
                <Text style={[styles.prayerTime, { color: colors.text }]}>
                  {formatPrayerTime(nextPrayerData.jamaahTime || nextPrayerData.time, use24h)}
                </Text>

                {/* Countdown — the only secondary element */}
                {countdown ? (
                  <Text style={[styles.countdown, { color: colors.textSecondary }]}>
                    {countdown}
                  </Text>
                ) : null}
              </>
            )}
          </Animated.View>
        </LinearGradient>

        {/* ── Timetable ─────────────────────────────────────────── */}
        <View style={styles.timetable}>
          <Text style={[
            typography.sectionHeader,
            { color: colors.textSecondary, marginBottom: SECTION_HEADER_MB, paddingHorizontal: spacing['3xl'] },
          ]}>
            {t('prayer.todaySchedule')}
          </Text>

          {prayers.map((prayer, index) => {
            const isNext = prayer.name === nextPrayer;
            const isPassed = !isNext && prayer.time < new Date() && prayer.name !== 'sunrise';

            return (
              <Animated.View
                key={prayer.name}
                entering={FadeInDown.delay(index * 40).duration(300).springify()}
                style={[
                  styles.row,
                  index < prayers.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.separator,
                  },
                  isNext && {
                    backgroundColor: isDark
                      ? 'rgba(212, 184, 92, 0.06)'
                      : 'rgba(191, 161, 78, 0.04)',
                  },
                ]}
              >
                {/* Active dot */}
                <View style={styles.dotCol}>
                  {isNext && (
                    <View style={[styles.dot, { backgroundColor: colors.prayerActive }]} />
                  )}
                </View>

                {/* Name */}
                <Text style={[
                  isNext ? typography.headline : typography.body,
                  { color: isPassed ? colors.textTertiary : colors.text, flex: 1 },
                ]}>
                  {prayer.label}
                </Text>

                {/* Arabic */}
                <Text style={[
                  typography.footnote,
                  {
                    color: isPassed ? colors.textTertiary : colors.textSecondary,
                    marginRight: spacing.lg,
                    opacity: isPassed ? 0.5 : 0.7,
                  },
                ]}>
                  {prayer.arabicLabel}
                </Text>

                {/* Time — right-aligned, tabular */}
                <View style={styles.timeCol}>
                  <Text style={[
                    typography.prayerTime,
                    {
                      color: isNext ? colors.prayerActive : isPassed ? colors.textTertiary : colors.text,
                      fontVariant: ['tabular-nums'],
                      textAlign: 'right',
                    },
                  ]}>
                    {formatPrayerTime(prayer.jamaahTime || prayer.time, use24h)}
                  </Text>
                  {prayer.jamaahTime && (
                    <Text style={[
                      typography.caption2,
                      {
                        color: colors.textSecondary,
                        fontVariant: ['tabular-nums'],
                        textAlign: 'right',
                        opacity: isPassed ? 0.4 : 0.5,
                        marginTop: 1,
                      },
                    ]}>
                      {formatPrayerTime(prayer.time, use24h)}
                    </Text>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles: strict 8pt grid ──────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero — generous breathing space, typography-only
  hero: {
    paddingHorizontal: spacing['3xl'],
    paddingBottom: HERO_PADDING_BOTTOM,
  },
  hijriDate: {
    ...typography.footnote,
    marginBottom: GRID, // 8
  },
  prayerLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: GRID / 2, // 4
  },
  prayerName: {
    fontSize: 40,
    fontWeight: '300', // light, not bold — reverent, not shouting
    letterSpacing: 0.4,
    lineHeight: 48,    // 6 × 8
  },
  prayerTime: {
    ...typography.prayerCountdown,
    fontVariant: ['tabular-nums'],
    marginTop: GRID / 2, // 4
  },
  countdown: {
    ...typography.subhead,
    marginTop: GRID * 2, // 16
  },

  // Timetable — clean rows, hairline separators
  timetable: {
    paddingTop: TIMETABLE_PADDING_TOP,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ROW_PADDING_V,
    paddingHorizontal: spacing['3xl'],
  },
  dotCol: {
    width: GRID * 2.5, // 20
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timeCol: {
    alignItems: 'flex-end',
  },
});
