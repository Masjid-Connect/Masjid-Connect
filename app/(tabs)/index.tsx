import React, { useState, useRef } from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  PanResponder,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

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

import { DateNavigator } from '@/components/prayer/DateNavigator';
import { Ionicons } from '@expo/vector-icons';
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
  const reducedMotion = useReducedMotion();
  const {
    prayers, nextPrayer, countdown, windowProgress, hijriDate,
    isLoading, source, jamaahAvailable, use24h, refresh,
    selectedDate, isToday, goToNextDay, goToPrevDay, goToToday,
  } = usePrayerTimes();

  const [refreshing, setRefreshing] = React.useState(false);
  const [heroLayout, setHeroLayout] = useState<{ width: number; height: number }>({ width: SCREEN_WIDTH, height: layout.heroHeight });

  // Horizontal swipe to change date
  const swipeHandled = useRef(false);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 40,
      onPanResponderGrant: () => {
        swipeHandled.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        if (swipeHandled.current) return;
        if (Math.abs(gestureState.dx) > 60) {
          swipeHandled.current = true;
          if (gestureState.dx > 0) {
            goToPrevDay();
          } else {
            goToNextDay();
          }
        }
      },
      onPanResponderRelease: () => {
        swipeHandled.current = false;
      },
    })
  ).current;

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
      <View style={[styles.root, styles.loading, { backgroundColor: colors.background, paddingTop: insets.top }]} accessibilityLabel={t('prayer.calculating')} accessibilityRole="progressbar">
        <ActivityIndicator size="large" color={colors.accent} accessibilityLabel={t('prayer.calculating')} />
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

          <Animated.View
            entering={FadeIn.duration(600)}
            style={styles.heroContent}
            accessibilityRole="header"
            accessibilityLabel={nextPrayerData ? `${t('prayer.nextPrayer')}: ${t(`prayer.${nextPrayerData.name}`)}, ${countdown || ''}` : undefined}
          >
            {/* THE dominant element: next prayer name */}
            {nextPrayerData && (
              <>
                <Text style={[styles.prayerName, { color: colors.text }]} accessibilityRole="header">
                  {t(`prayer.${nextPrayerData.name}`)}
                </Text>

                {/* Countdown — large, the secondary hero element */}
                {countdown ? (
                  <Text style={[styles.countdown, { color: colors.textSecondary }]}>
                    {countdown}
                  </Text>
                ) : null}

                {/* Prayer time — tertiary */}
                <Text style={[styles.prayerTime, {
                  color: isDark ? palette.divineGoldBright : colors.accent,
                }]}>
                  {formatPrayerTime(nextPrayerData.jamaahTime || nextPrayerData.time, use24h)}
                </Text>
              </>
            )}
          </Animated.View>
        </View>

        {/* ── Gradient fade: hero → content ──────────────────────── */}
        <LinearGradient
          colors={[
            gradient[gradient.length - 1] || colors.background,
            colors.background,
          ]}
          style={styles.heroFade}
        />

        {/* ── Date Navigator ─────────────────────────────────────── */}
        <DateNavigator
          selectedDate={selectedDate}
          isTodayDate={isToday}
          hijriDate={hijriDate}
          onPrev={goToPrevDay}
          onNext={goToNextDay}
          onToday={goToToday}
        />

        {/* ── Timetable ─────────────────────────────────────────── */}
        <View style={styles.timetable} {...panResponder.panHandlers}>
          <View style={styles.timetableHeader} accessibilityRole="header">
            <Text
              style={[
                typography.sectionHeader,
                { color: colors.textSecondary },
              ]}
              accessibilityRole="header"
            >
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
                entering={reducedMotion ? FadeIn.duration(300) : FadeInDown.delay(Math.min(index * 40, 300)).duration(300).springify()}
                accessibilityLabel={`${t(`prayer.${prayer.name}`)}, ${formatPrayerTime(prayer.jamaahTime || prayer.time, use24h)}${isNext ? `, ${t('prayer.nextPrayer')}` : ''}`}
                style={[
                  styles.row,
                  index < prayers.length - 1 && !isNext && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.separator,
                  },
                  isNext && [
                    styles.activeRow,
                    {
                      backgroundColor: alphaColors.prayerActiveBg,
                      borderColor: isDark
                        ? 'rgba(229,193,75,0.25)'
                        : 'rgba(212,175,55,0.2)',
                    },
                  ],
                ]}
              >
                {/* Status indicator: glow dot (active), checkmark (passed), or empty */}
                <View style={styles.dotCol}>
                  {isNext ? (
                    <GlowDot
                      color={colors.prayerActive}
                      size={3}
                      blurRadius={4}
                      animated={true}
                    />
                  ) : isPassed ? (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={colors.textTertiary}
                    />
                  ) : null}
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

                {/* Active row progress bar — thin gold line at bottom */}
                {isNext && isToday && (
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.round(windowProgress * 100)}%`,
                          backgroundColor: isDark
                            ? 'rgba(229,193,75,0.3)'
                            : 'rgba(212,175,55,0.25)',
                        } as ViewStyle,
                      ]}
                    />
                  </View>
                )}
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

  // Hero — centered, bold, minimal
  hero: {
    paddingHorizontal: spacing['3xl'],
    paddingBottom: HERO_PADDING_BOTTOM,
    justifyContent: 'flex-end',
    minHeight: 280,
  },
  heroContent: {
    alignItems: 'center',
  },
  prayerName: {
    ...typography.largeTitle,
    fontSize: 42,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  countdown: {
    ...typography.title1,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.sm, // 8
    textAlign: 'center',
  },
  prayerTime: {
    ...typography.headline,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.md, // 12
    textAlign: 'center',
    fontWeight: '600',
  },

  // Gradient fade from hero to content
  heroFade: {
    height: HERO_PADDING_BOTTOM, // 48
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
  activeRow: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  dotCol: {
    width: spacing.xl, // 20
    alignItems: 'center',
  },
  timeCol: {
    alignItems: 'flex-end',
  },


  // Active row progress bar
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 2,
    borderRadius: 1,
  },
});
