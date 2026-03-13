import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { getColors, getAlpha, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';
import { layout, patterns } from '@/lib/layoutGrid';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { formatPrayerTime } from '@/lib/prayer';
import { getAtmosphericGradient } from '@/lib/prayerGradients';
import { SkiaAtmosphericGradient } from '@/components/brand/SkiaAtmosphericGradient';
import { IslamicPattern } from '@/components/brand/IslamicPattern';
import { GlowDot } from '@/components/brand/GlowDot';
import { SolarLight } from '@/components/brand/SolarLight';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Grid constants ─────────────────────────────────────────────────
// All vertical measurements derive from the spacing scale (8pt grid).
const HERO_PADDING_BOTTOM = spacing['4xl'];   // 48
const TIMETABLE_PADDING_TOP = spacing['3xl']; // 32
const ROW_PADDING_V = spacing.lg;             // 16 (~52px row height)
const SECTION_HEADER_MB = spacing.lg;         // 16

export default function PrayerTimesScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const alphaColors = getAlpha(effectiveScheme);
  const {
    prayers, nextPrayer, countdown, hijriDate,
    isLoading, source, jamaahAvailable, use24h, refresh,
  } = usePrayerTimes();

  const [refreshing, setRefreshing] = React.useState(false);
  const [heroLayout, setHeroLayout] = useState({ width: SCREEN_WIDTH, height: layout.heroHeight });

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
        contentContainerStyle={{ paddingBottom: spacing['5xl'] }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero: one dominant element ─────────────────────────── */}
        <View
          style={[styles.hero, { paddingTop: insets.top + spacing['3xl'] }]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setHeroLayout({ width, height });
          }}
        >
          {/* Skia atmospheric gradient — GPU-rendered sky */}
          <SkiaAtmosphericGradient
            width={heroLayout.width}
            height={heroLayout.height}
            colors={gradient}
          />

          {/* Solar light — directional sunlight per prayer time */}
          <SolarLight
            prayer={nextPrayer}
            width={heroLayout.width}
            height={heroLayout.height}
            isDark={isDark}
          />

          {/* Islamic pattern — ultra-subtle geometric identity */}
          <IslamicPattern
            width={heroLayout.width}
            height={heroLayout.height}
            color={isDark ? palette.sapphire400 : palette.sapphire700}
            opacity={isDark ? patterns.opacityDark : patterns.opacity}
            tileSize={patterns.tileSize}
          />

          <Animated.View entering={FadeIn.duration(600)}>
            {/* Mosque name — always visible, quiet identity */}
            <Text style={[styles.mosqueName, { color: colors.textSecondary }]}>
              {t('prayer.mosqueName')}
            </Text>

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
                  {t(`prayer.${nextPrayerData.name}`)}
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
        </View>

        {/* ── Timetable ─────────────────────────────────────────── */}
        <View style={styles.timetable}>
          <View style={styles.timetableHeader}>
            <Text style={[
              typography.sectionHeader,
              { color: colors.textSecondary },
            ]}>
              {t('prayer.todaySchedule')}
            </Text>
            <Text style={[
              typography.caption2,
              { color: jamaahAvailable ? colors.success : colors.textTertiary },
            ]}>
              {jamaahAvailable ? t('prayer.mosqueTimes') : t('prayer.calculatedTimes')}
            </Text>
          </View>

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
                    backgroundColor: alphaColors.prayerActiveBg,
                  },
                ]}
              >
                {/* Active dot — Skia glow or empty column */}
                <View style={styles.dotCol}>
                  {isNext && (
                    <GlowDot
                      color={colors.prayerActive}
                      size={3}
                      blurRadius={4}
                      animated={true}
                    />
                  )}
                </View>

                {/* Name — i18n-aware */}
                <Text style={[
                  isNext ? typography.headline : typography.body,
                  { color: isPassed ? colors.textTertiary : colors.text, flex: 1 },
                ]}>
                  {t(`prayer.${prayer.name}`)}
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
                        marginTop: 0,
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
  mosqueName: {
    ...typography.caption1,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.xs, // 4
  },
  hijriDate: {
    ...typography.footnote,
    marginBottom: spacing.sm, // 8
  },
  prayerLabel: {
    ...typography.sectionHeader,
    marginBottom: spacing.xs, // 4
  },
  prayerName: {
    ...typography.prayerName,
  },
  prayerTime: {
    ...typography.prayerCountdown,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xs, // 4
  },
  countdown: {
    ...typography.subhead,
    marginTop: spacing.lg, // 16
  },

  // Timetable — clean rows, hairline separators
  timetable: {
    paddingTop: TIMETABLE_PADDING_TOP,
  },
  timetableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    marginBottom: SECTION_HEADER_MB,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ROW_PADDING_V,
    paddingHorizontal: spacing['3xl'],
  },
  dotCol: {
    width: spacing.xl, // 20
    alignItems: 'center',
  },
  timeCol: {
    alignItems: 'flex-end',
  },
});
