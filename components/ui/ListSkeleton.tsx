import React from 'react';
import { StyleSheet, View } from 'react-native';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/constants/Theme';
import { SkeletonLoader } from './SkeletonLoader';

interface ListSkeletonProps {
  rows?: number;
  showAccentBar?: boolean;
}

export const ListSkeleton = ({ rows = 4, showAccentBar = false }: ListSkeletonProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);

  return (
    <View style={styles.container} accessibilityLabel="Loading content" accessibilityRole="progressbar">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.row, i < rows - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }]}>
          {showAccentBar && (
            <SkeletonLoader width={4} height={40} borderRadius={2} />
          )}
          <View style={styles.content}>
            <SkeletonLoader width="70%" height={14} />
            <SkeletonLoader width="90%" height={12} style={{ marginTop: spacing.sm }} />
            <SkeletonLoader width="40%" height={10} style={{ marginTop: spacing.sm }} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing['3xl'],
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  content: {
    flex: 1,
  },
});
