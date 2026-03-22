import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  PanResponder,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  useReducedMotion,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

import { getColors, getAlpha, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, getElevation, springs } from '@/constants/Theme';
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

// Removed static Dimensions — use useWindowDimensions() for orientation-aware layout

// ─── Grid constants ─────────────────────────────────────────────────
// All vertical measurements derive from the spacing scale (8pt grid).
const HERO_PADDING_BOTTOM = spacing['4xl'];   // 48
const TIMETABLE_PADDING_TOP = spacing['3xl']; // 32
const ROW_PADDING_V = spacing.lg;             // 16 (~52px row height)
const SECTION_HEADER_MB = spacing.lg;         // 16

export default function PrayerTimesScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const alphaColors = getAlpha(effectiveScheme);
  const reducedMotion = useReducedMotion();
  const {
    prayers, nextPrayer, countdown, windowProgress, hijriDate,
    isLoading, error: prayerError, source, jamaahAvailable, isEstimated, use24h, refresh,
    selectedDate, isToday, goToNextDay, goToPrevDay, goToToday,
  } = usePrayerTimes();

  const [refreshing, setRefreshing] = React.useState(false);
  const [heroLayout, setHeroLayout] = useState<{ width: number; height: number }>({ width: screenWidth, height: layout.heroHeight });

  // ─── Prayer transition animations ───────────────────────────────
  // Scale pulse on countdown + gold overlay flash when active prayer changes
  const prevNextPrayer = useRef<PrayerName | null>(null);
  const countdownScale = useSharedValue(1);
  const goldPulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (
      nextPrayer &&
      prevNextPrayer.current !== null &&
      prevNextPrayer.current !== nextPrayer
    ) {
      // Sacred moment: prayer has transitioned
      if (!reducedMotion) {
        // Countdown scale pulse: 1 → 1.08 → 1 (spring)
        countdownScale.value = withSequence(
          withSpring(1.08, springs.snappy),
          withSpring(1, springs.gentle),
        );
        // Gold overlay flash: 0 → 0.25 → 0 (spring-based per doctrine)
        goldPulseOpacity.value = withSequence(
          withSpring(0.25, springs.snappy),
          withSpring(0, springs.gentle),
        );
      }
      // Haptic feedback — Medium impact for prayer transition (sacred moment)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    prevNextPrayer.current = nextPrayer;
  }, [nextPrayer]);

  const countdownAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countdownScale.value }],
  }));

  const goldPulseStyle = useAnimatedStyle(() => ({
    opacity: goldPulseOpacity.value,
  }));

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

  // ─── Error state — both prayer time sources failed (R2) ────────
  if (prayerError && prayers.length === 0) {
    return (
      <View style={[styles.root, styles.loading, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textTertiary} />
        <Text style={[typography.title3, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>
          {t('error.prayerTimesUnavailable')}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing['3xl'] }]}>
          {t('error.prayerTimesRetry')}
        </Text>
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
          style={[
            styles.hero,
            { paddingTop: insets.top + (isLandscape ? spacing.lg : spacing['3xl']) },
            isLandscape && styles.heroLandscape,
          ]}
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

          {/* Gold pulse overlay — momentary flash on prayer transition */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? palette.divineGoldBright : palette.divineGold },
              goldPulseStyle,
            ]}
            pointerEvents="none"
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

                {/* Countdown — large ultralight, spring scale on prayer transition */}
                {countdown ? (
                  <Animated.View style={countdownAnimatedStyle}>
                    <Text style={[
                      styles.countdown,
                      { color: colors.text },
                      isLandscape && { fontSize: 32, lineHeight: 38 },
                    ]}>
                      {countdown}
                    </Text>
                  </Animated.View>
                ) : null}

                {/* Prayer time — tertiary, gold accent */}
                <Text style={[styles.prayerTime, {
                  color: colors.accentText,
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
          style={[styles.heroFade, isLandscape && { height: spacing.xl }]}
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

        {/* ── Timetable Card ────────────────────────────────────── */}
        <View
          style={[
            styles.timetableCard,
            {
              backgroundColor: colors.card,
              ...getElevation('md', isDark),
            },
          ]}
          {...panResponder.panHandlers}
        >
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
              { color: isEstimated ? colors.info : jamaahAvailable ? colors.success : colors.textTertiary },
            ]}>
              {isEstimated
                ? t('prayer.estimatedTimes')
                : jamaahAvailable
                  ? t('prayer.mosqueTimes')
                  : t('prayer.calculatedTimes')}
            </Text>
          </View>

          {prayers.map((prayer, index) => {
            const isNext = prayer.name === nextPrayer;
            // A prayer is "passed" when both adhan AND jama'ah times are in the past
            const effectiveTime = prayer.jamaahTime && prayer.jamaahTime > prayer.time
              ? prayer.jamaahTime : prayer.time;
            const isPassed = !isNext && effectiveTime < new Date() && prayer.name !== 'sunrise';

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
                      backgroundColor: isDark
                        ? 'rgba(229,193,75,0.10)'
                        : 'rgba(212,175,55,0.08)',
                    },
                  ],
                ]}
              >
                {/* Gold accent bar for active prayer */}
                {isNext && (
                  <View style={[
                    styles.activeAccentBar,
                    { backgroundColor: isDark ? palette.divineGoldBright : palette.divineGold },
                  ]} />
                )}

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
                  {
                    color: isPassed ? colors.textTertiary : colors.text,
                    flex: 1,
                    opacity: isPassed ? 0.5 : 1,
                  },
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
                      opacity: isPassed ? 0.5 : 1,
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
                        opacity: isPassed ? 0.3 : 0.5,
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
                            ? 'rgba(229,193,75,0.35)'
                            : 'rgba(212,175,55,0.30)',
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

  // Hero — centered, atmospheric
  hero: {
    paddingHorizontal: spacing['3xl'],
    paddingBottom: HERO_PADDING_BOTTOM,
    justifyContent: 'flex-end',
    minHeight: 320,
  },
  heroLandscape: {
    minHeight: 160,
    paddingBottom: spacing.xl, // 20 — tighter in landscape
  },
  heroContent: {
    alignItems: 'center',
  },
  prayerName: {
    ...typography.prayerName,
    textAlign: 'center',
  },
  countdown: {
    ...typography.prayerCountdown,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xs, // 4
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

  // Timetable card — elevated surface with depth
  timetableCard: {
    marginHorizontal: spacing.lg, // 16
    marginTop: spacing.lg,        // 16
    borderRadius: borderRadius.lg, // 20
    paddingTop: spacing.lg,        // 16
    paddingBottom: spacing.sm,     // 8
    overflow: 'hidden',
  },
  timetableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl, // 20
    marginBottom: spacing.sm,      // 8
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ROW_PADDING_V,
    paddingHorizontal: spacing.xl, // 20
  },
  activeRow: {
    borderRadius: borderRadius.sm, // 10
    marginHorizontal: spacing.sm,  // 8
    paddingHorizontal: spacing.lg, // 16
    overflow: 'hidden',
  },
  activeAccentBar: {
    position: 'absolute',
    left: 0,
    top: spacing.sm,    // 8
    bottom: spacing.sm,  // 8
    width: 3,
    borderRadius: 2,
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
    borderBottomLeftRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 2,
    borderRadius: 1,
  },
});
