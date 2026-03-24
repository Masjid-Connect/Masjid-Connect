import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, getElevation, fontWeight as fw } from '@/constants/Theme';

export const TrustBadge = () => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.separator,
          ...getElevation('sm', isDark),
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel="Payments processed securely"
    >
      <View style={[styles.iconCircle, { backgroundColor: isDark ? colors.backgroundGrouped : colors.backgroundSecondary }]}>
        <Ionicons name="lock-closed" size={14} color={colors.success} />
      </View>
      <View style={styles.textCol}>
        <Text style={[typography.footnote, { color: colors.text, fontWeight: fw.semibold }]}>
          Secure payments
        </Text>
        <Text style={[typography.caption2, { color: colors.textSecondary }]}>
          256-bit encryption · PCI compliant
        </Text>
      </View>
      <Ionicons name="shield-checkmark" size={20} color={colors.success} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: spacing['2xs'],
  },
});
