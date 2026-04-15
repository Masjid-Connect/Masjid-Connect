/**
 * Card — Unified card surface component.
 *
 * A single, shared card that wraps announcements, events, and any
 * grouped content. Uses the same elevation + borderRadius pattern
 * as SettingsSection for Apple HIG consistency.
 *
 * Variants:
 *   - elevated (default): card background with elevation
 *   - grouped: grouped background, no elevation, used for section wrapping
 *   - flat: transparent, no elevation, for inline content
 */

import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { borderRadius, getElevation } from '@/constants/Theme';

type CardVariant = 'elevated' | 'grouped' | 'flat';
type ElevationLevel = 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  elevation?: ElevationLevel;
  style?: ViewStyle;
}

export const Card = ({
  children,
  variant = 'elevated',
  elevation = 'sm',
  style,
}: CardProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';

  const variantStyle: ViewStyle =
    variant === 'elevated'
      ? {
          backgroundColor: colors.card,
          ...getElevation(elevation, isDark),
        }
      : variant === 'grouped'
        ? { backgroundColor: colors.backgroundGrouped }
        : {};

  return (
    <View style={[styles.card, variantStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
});
