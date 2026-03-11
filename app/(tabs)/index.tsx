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

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { formatPrayerTime } from '@/lib/prayer';
import type { PrayerName } from '@/types';

/**
 * Returns a subtle gradient pair based on the current/next prayer,
 * giving the screen an atmospheric quality tied to the time of day.
 */
function getPrayerGradient(
  prayer: PrayerName | null,
  isDark: boolean,
): [string, string] {
  if (isDark) {
    // Dark mode: very subtle shifts on true black
    switch (prayer) {
      case 'fajr':
        return ['#0A0A14', '#000000'];
      case 'sunrise':
        return ['#0F0A05', '#000000'];
      case 'dhuhr':
        return ['#05080A', '#000000'];
      case 'asr':
        return ['#0A0805', '#000000'];
      case 'maghrib':
        return ['#0A050A', '#000000'];
      case 'isha':
        return ['#050508', '#000000'];
      default:
        return ['#050508', '#000000'];
    }
  }

  // Light mode: atmospheric, calm tints
  switch (prayer) {
    case 'fajr':
      return ['#E8EAF0', '#F8F6F1']; // pre-dawn cool blue-grey
    case 'sunrise':
      return ['#F5EDE4', '#F8F6F1']; // warm amber wash
    case 'dhuhr':
      return ['#F0F2F0', '#F8F6F1']; // bright, neutral midday
    case 'asr':
      return ['#F2EDE6', '#F8F6F1']; // warm afternoon
    case 'maghrib':
      return ['#EDE6EC', '#F8F6F1']; // dusky lavender
    case 'isha':
      return ['#E4E6ED', '#F8F6F1']; // deep evening blue
    default:
      return ['#F0F0ED', '#F8F6F1'];
  }
}

export default function PrayerTimesScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const { prayers, nextPrayer, countdown, hijriDate, isLoading, source, jamaahAvailable, use24h, refresh } = usePrayerTimes();

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const nextPrayerData = prayers.find((p) => p.name === nextPrayer);
  const gradientColors = getPrayerGradient(nextPrayer, isDark);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {isLoading && prayers.length === 0 ? (
        <View style={[styles.loading, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.lg }]}>
            {t('prayer.calculating')}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing['4xl'] }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
          showsVerticalScrollIndicator={false}>

          {/* Hero section — atmospheric gradient with large typography */}
          <LinearGradient
            colors={gradientColors}
            style={[styles.hero, { paddingTop: insets.top + spacing['2xl'] }]}
          >
            <Animated.View entering={FadeIn.duration(800)} style={styles.heroContent}>
              {/* Hijri date — quiet, contextual */}
              {hijriDate && (
                <Text style={[typography.footnote, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                  {hijriDate}
                </Text>
              )}

              {/* Current prayer — the dominant element */}
              {nextPrayerData && (
                <>
                  <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
                    {t('prayer.upcoming')}
                  </Text>
                  <Text style={[styles.heroPrayerName, { color: colors.text }]}>
                    {nextPrayerData.label}
                  </Text>

                  {/* Prayer time — large, confident, ultralight */}
                  <Text style={[typography.prayerCountdown, { color: colors.text, marginTop: spacing.xs }]}>
                    {formatPrayerTime(nextPrayerData.jamaahTime || nextPrayerData.time, use24h)}
                  </Text>

                  {/* Jama'ah start time if different */}
                  {nextPrayerData.jamaahTime && (
                    <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: spacing['2xs'] }]}>
                      {t('prayer.startTime', { time: formatPrayerTime(nextPrayerData.time, use24h) })}
                    </Text>
                  )}

                  {/* Countdown — secondary, calm */}
                  <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.md }]}>
                    {t('prayer.timeRemaining', { countdown })}
                  </Text>
                </>
              )}

              {/* Source indicator */}
              {source === 'mosque' && (
                <Text style={[typography.caption1, { color: colors.accent, marginTop: spacing.sm }]}>
                  {t('prayer.mosqueTimes')}
                </Text>
              )}
              {source === 'cache' && (
                <Text style={[typography.caption1, { color: colors.textTertiary, marginTop: spacing.sm }]}>
                  {t('prayer.cached')}
                </Text>
              )}
            </Animated.View>
          </LinearGradient>

          {/* Timetable section */}
          <View style={styles.timetable}>
            <Text style={[typography.sectionHeader, { color: colors.textSecondary, marginBottom: spacing.lg, paddingHorizontal: spacing['3xl'] }]}>
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
                    styles.prayerRow,
                    { paddingHorizontal: spacing['3xl'] },
                    index < prayers.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
                    isNext && { backgroundColor: isDark ? 'rgba(212, 184, 92, 0.06)' : 'rgba(191, 161, 78, 0.04)' },
                  ]}>
                  {/* Active indicator — subtle left accent */}
                  <View style={styles.dotContainer}>
                    {isNext && (
                      <View style={[styles.activeDot, { backgroundColor: colors.prayerActive }]} />
                    )}
                  </View>

                  {/* Prayer name */}
                  <Text
                    style={[
                      isNext ? typography.headline : typography.body,
                      {
                        color: isPassed ? colors.textTertiary : colors.text,
                        flex: 1,
                      },
                    ]}>
                    {prayer.label}
                  </Text>

                  {/* Arabic label */}
                  <Text
                    style={[
                      typography.footnote,
                      {
                        color: isPassed ? colors.textTertiary : colors.textSecondary,
                        marginRight: spacing.lg,
                        opacity: isPassed ? 0.6 : 0.8,
                      },
                    ]}>
                    {prayer.arabicLabel}
                  </Text>

                  {/* Time */}
                  <View style={styles.timeColumn}>
                    <Text
                      style={[
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
                      <Text
                        style={[
                          typography.caption2,
                          {
                            color: colors.textSecondary,
                            fontVariant: ['tabular-nums'],
                            opacity: isPassed ? 0.5 : 0.6,
                            textAlign: 'right',
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  heroContent: {
    // Typography carries the layout — no decorative elements
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  heroPrayerName: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 42,
  },
  timetable: {
    paddingTop: spacing['2xl'],
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  dotContainer: {
    width: 20,
    alignItems: 'center',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timeColumn: {
    alignItems: 'flex-end' as const,
  },
});
