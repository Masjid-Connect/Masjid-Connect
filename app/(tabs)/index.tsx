import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors } from '@/constants/Colors';
import { spacing, elevation, borderRadius, typography } from '@/constants/Theme';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { formatPrayerTime } from '@/lib/prayer';

export default function PrayerTimesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const { prayers, nextPrayer, countdown, hijriDate, isLoading, source, refresh } = usePrayerTimes();

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <Text style={[typography.title1, { color: colors.text }]}>Prayer Times</Text>
        {hijriDate && (
          <Text style={[typography.callout, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {hijriDate}
          </Text>
        )}
        {source === 'cache' && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            Cached times
          </Text>
        )}
      </Animated.View>

      {isLoading && prayers.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
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
          {/* Next Prayer Countdown */}
          {nextPrayer && (
            <Animated.View
              entering={FadeInDown.duration(500).springify()}
              style={[
                styles.countdownCard,
                {
                  backgroundColor: colors.prayerActiveGlow,
                  borderColor: colors.prayerActive,
                },
              ]}>
              <Text style={[typography.callout, { color: colors.textSecondary }]}>Next Prayer</Text>
              <Text style={[typography.display, { color: colors.prayerActive, marginTop: spacing.xs }]}>
                {prayers.find((p) => p.name === nextPrayer)?.label}
              </Text>
              <Text style={[typography.title2, { color: colors.text, marginTop: spacing.xs }]}>
                {countdown}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {prayers.find((p) => p.name === nextPrayer)?.arabicLabel}
              </Text>
            </Animated.View>
          )}

          {/* Prayer List */}
          {prayers.map((prayer, index) => {
            const isNext = prayer.name === nextPrayer;
            const isPassed = !isNext && prayer.time < new Date() && prayer.name !== 'sunrise';

            return (
              <Animated.View
                key={prayer.name}
                entering={FadeInDown.delay(index * 80).duration(400).springify()}
                style={[
                  styles.prayerRow,
                  {
                    backgroundColor: isNext ? colors.prayerActiveGlow : colors.card,
                    borderColor: isNext ? colors.prayerActive : colors.cardBorder,
                    ...(isNext ? elevation.floating : elevation.elevated),
                  },
                ]}>
                {/* Active indicator */}
                {isNext && <View style={[styles.activeIndicator, { backgroundColor: colors.prayerActive }]} />}

                <View style={styles.prayerInfo}>
                  <Text
                    style={[
                      typography.title3,
                      {
                        color: isPassed ? colors.textSecondary : colors.text,
                        opacity: isPassed ? 0.6 : 1,
                      },
                    ]}>
                    {prayer.label}
                  </Text>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textSecondary, opacity: isPassed ? 0.5 : 0.8 },
                    ]}>
                    {prayer.arabicLabel}
                  </Text>
                </View>

                <Text
                  style={[
                    typography.title3,
                    {
                      color: isNext ? colors.prayerActive : isPassed ? colors.textSecondary : colors.text,
                      fontVariant: ['tabular-nums'],
                      opacity: isPassed ? 0.6 : 1,
                    },
                  ]}>
                  {formatPrayerTime(prayer.time)}
                </Text>
              </Animated.View>
            );
          })}

          <View style={{ height: spacing['2xl'] }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  countdownCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.md,
    borderWidth: 0.5,
    padding: spacing.lg,
    paddingVertical: spacing.md + 4,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
  },
  prayerInfo: {
    flex: 1,
  },
});
