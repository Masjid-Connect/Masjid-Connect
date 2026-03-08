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
import Svg, { Line, Circle } from 'react-native-svg';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { formatPrayerTime } from '@/lib/prayer';
import { ConvergentArch } from '@/components/brand/ConvergentArch';
import { KozoPaperBackground } from '@/components/ui/KozoPaperBackground';

/** Gold diamond divider — a thin line with a diamond at center */
const GoldDivider = ({ color }: { color: string }) => (
  <View style={styles.dividerContainer}>
    <Svg height={12} width="100%" style={styles.dividerSvg}>
      <Line x1="20%" y1="6" x2="45%" y2="6" stroke={color} strokeWidth={0.5} strokeOpacity={0.4} />
      <Circle cx="50%" cy="6" r="2.5" fill={color} fillOpacity={0.6} />
      <Line x1="55%" y1="6" x2="80%" y2="6" stroke={color} strokeWidth={0.5} strokeOpacity={0.4} />
    </Svg>
  </View>
);

export default function PrayerTimesScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { prayers, nextPrayer, countdown, hijriDate, isLoading, source, refresh } = usePrayerTimes();

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const nextPrayerData = prayers.find((p) => p.name === nextPrayer);

  return (
    <KozoPaperBackground
      color={colors.background}
      showTexture={effectiveScheme !== 'dark'}
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[typography.title1, { color: colors.text }]}>Prayer Times</Text>
            {hijriDate && (
              <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                {hijriDate}
              </Text>
            )}
            {source === 'cache' && (
              <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: spacing['2xs'] }]}>
                Cached times
              </Text>
            )}
          </View>
          <ConvergentArch
            size={44}
            strokeColor={colors.tint}
            lineWidth={1.0}
            nodeRadius={2.5}
          />
        </View>
      </Animated.View>

      {isLoading && prayers.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.lg }]}>
            Calculating prayer times...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
          showsVerticalScrollIndicator={false}>

          {/* Hero countdown section */}
          {nextPrayerData && (
            <Animated.View
              entering={FadeInDown.duration(500).springify()}
              style={styles.countdownSection}
            >
              <GoldDivider color={colors.accent} />

              <Text style={[typography.sectionHeader, { color: colors.textSecondary, marginTop: spacing['2xl'], textAlign: 'center' }]}>
                {nextPrayerData.label}
              </Text>
              <Text style={[typography.prayerCountdown, { color: colors.text, textAlign: 'center', marginTop: spacing.xs }]}>
                {formatPrayerTime(nextPrayerData.time)}
              </Text>
              <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                in {countdown}
              </Text>
              {nextPrayerData.arabicLabel && (
                <Text style={[typography.footnote, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xs, opacity: 0.7 }]}>
                  {nextPrayerData.arabicLabel}
                </Text>
              )}

              <GoldDivider color={colors.accent} />
            </Animated.View>
          )}

          {/* Prayer list — bare rows, no cards */}
          <View style={styles.prayerList}>
            {prayers.map((prayer, index) => {
              const isNext = prayer.name === nextPrayer;
              const isPassed = !isNext && prayer.time < new Date() && prayer.name !== 'sunrise';

              return (
                <Animated.View
                  key={prayer.name}
                  entering={FadeInDown.delay(index * 50).duration(350).springify()}
                  style={[
                    styles.prayerRow,
                    index < prayers.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
                  ]}>
                  {/* Gold dot for active prayer */}
                  <View style={styles.dotContainer}>
                    {isNext && (
                      <View style={[styles.activeDot, { backgroundColor: colors.prayerActive }]} />
                    )}
                  </View>

                  <Text
                    style={[
                      typography.body,
                      {
                        color: isPassed ? colors.textSecondary : colors.text,
                        flex: 1,
                        opacity: isPassed ? 0.7 : 1,
                      },
                    ]}>
                    {prayer.label}
                  </Text>

                  <Text
                    style={[
                      typography.footnote,
                      {
                        color: isPassed ? colors.textSecondary : colors.textSecondary,
                        marginRight: spacing.lg,
                        opacity: isPassed ? 0.5 : 0.8,
                      },
                    ]}>
                    {prayer.arabicLabel}
                  </Text>

                  <Text
                    style={[
                      typography.prayerTime,
                      {
                        color: isNext ? colors.prayerActive : isPassed ? colors.textSecondary : colors.text,
                        fontVariant: ['tabular-nums'],
                        opacity: isPassed ? 0.7 : 1,
                      },
                    ]}>
                    {formatPrayerTime(prayer.time)}
                  </Text>
                </Animated.View>
              );
            })}
          </View>

          <View style={{ height: spacing['4xl'] }} />
        </ScrollView>
      )}
    </KozoPaperBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing['3xl'],
  },
  countdownSection: {
    paddingVertical: spacing.lg,
  },
  dividerContainer: {
    paddingVertical: spacing.xl,
  },
  dividerSvg: {
    // SVG fills container
  },
  prayerList: {
    marginTop: spacing.sm,
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
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
