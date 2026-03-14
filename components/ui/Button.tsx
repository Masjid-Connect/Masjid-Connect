import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getColors } from '@/constants/Colors';
import { spacing, borderRadius, typography, fonts } from '@/constants/Theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) => {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const isPrimary = variant === 'primary';
  const bgColor = isPrimary ? colors.tint : 'transparent';
  const textColor = isPrimary ? '#FFFFFF' : colors.tint;
  const borderColor = isPrimary ? colors.tint : colors.tint;

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
        {
          backgroundColor: bgColor,
          borderColor,
          opacity: isDisabled ? 0.5 : 1,
        },
        !isPrimary && styles.outlined,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor, fontFamily: fonts.body }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  outlined: {
    borderWidth: 1.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
