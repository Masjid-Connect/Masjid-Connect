import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, hairline } from '@/constants/Theme';
import { SkeletonLoader } from './SkeletonLoader';

export const PrayerSkeleton = () => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]} accessibilityLabel="Loading prayer times" accessibilityRole="progressbar">
      {/* Hero area */}
      <View style={styles.hero}>
        <SkeletonLoader width={120} height={14} borderRadius={borderRadius.xs} style={{ alignSelf: 'center' }} />
        <SkeletonLoader width={180} height={48} borderRadius={borderRadius.sm} style={{ alignSelf: 'center', marginTop: spacing.md }} />
        <SkeletonLoader width={100} height={12} borderRadius={borderRadius.xs} style={{ alignSelf: 'center', marginTop: spacing.sm }} />
      </View>

      {/* Timetable rows */}
      <View style={[styles.timetable, { backgroundColor: colors.card, borderRadius: borderRadius.lg }]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.row, i < 5 && { borderBottomWidth: hairline, borderBottomColor: colors.separator }]}>
            <SkeletonLoader width={60} height={14} />
            <SkeletonLoader width={50} height={14} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing['3xl'],
  },
  timetable: {
    marginHorizontal: spacing['3xl'],
    padding: spacing.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
});
