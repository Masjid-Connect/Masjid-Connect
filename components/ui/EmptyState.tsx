import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/Theme';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  /** Ionicons icon name */
  icon: keyof typeof Ionicons.glyphMap;
  /** Icon circle tint color (RGBA) — defaults to gold empty bg */
  iconBgColor?: string;
  /** Icon color — defaults to accent */
  iconColor?: string;
  /** Main headline */
  title: string;
  /** Supporting description */
  subtitle?: string;
  /** Optional hint text below subtitle (e.g., "Pull down to refresh") */
  hint?: string;
  /** Optional action button */
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  icon,
  iconBgColor,
  iconColor,
  title,
  subtitle,
  hint,
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';

  const defaultIconBg = isDark ? 'rgba(240, 208, 96, 0.08)' : 'rgba(166, 133, 35, 0.06)';

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: iconBgColor ?? defaultIconBg }]}>
        <Ionicons name={icon} size={32} color={iconColor ?? colors.accent} />
      </View>

      <Text
        style={[typography.title3, { color: colors.text, textAlign: 'center', marginTop: spacing.lg }]}
        accessibilityRole="header"
      >
        {title}
      </Text>

      {subtitle && (
        <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
          {subtitle}
        </Text>
      )}

      {hint && (
        <Text style={[typography.caption1, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.sm }]}>
          {hint}
        </Text>
      )}

      {actionLabel && onAction && (
        <Button
          variant="secondary"
          title={actionLabel}
          onPress={onAction}
          style={styles.actionBtn}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing['4xl'],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    marginTop: spacing.xl,
  },
});
