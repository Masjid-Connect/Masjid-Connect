import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography, fonts, components } from '@/constants/Theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  compact = false,
  style,
}: ButtonProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const variantStyles = getVariantStyles(variant, colors);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.button,
        compact && styles.compact,
        {
          backgroundColor: variantStyles.bg,
          borderColor: variantStyles.border,
          opacity: isDisabled ? 0.5 : 1,
        },
        variantStyles.outlined && styles.outlined,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variantStyles.text} size="small" />
      ) : (
        <Text style={[styles.label, { color: variantStyles.text, fontFamily: fonts.body }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

function getVariantStyles(
  variant: ButtonVariant,
  colors: ReturnType<typeof getColors>,
) {
  switch (variant) {
    case 'primary':
      return { bg: colors.tint, text: colors.onPrimary, border: colors.tint, outlined: false };
    case 'secondary':
      return { bg: 'transparent', text: colors.tint, border: colors.tint, outlined: true };
    case 'ghost':
      return { bg: 'transparent', text: colors.tint, border: 'transparent', outlined: false };
    case 'destructive':
      return { bg: colors.urgent, text: colors.onPrimary, border: colors.urgent, outlined: false };
  }
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: components.button.height,
  },
  compact: {
    minHeight: components.button.compactHeight,
    paddingVertical: spacing.sm,
  },
  outlined: {
    borderWidth: 1.5,
  },
  label: {
    fontSize: typography.callout.fontSize,
    fontWeight: '600',
  },
});
