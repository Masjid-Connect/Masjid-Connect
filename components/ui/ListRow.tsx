/**
 * ListRow — Shared row component for Apple HIG grouped lists.
 *
 * Used for announcement rows, event rows, or any content row within
 * a GroupedSection. Provides consistent padding, separator handling,
 * press animation, and accessibility.
 */

import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, springs, layout, hairline } from '@/constants/Theme';

interface ListRowProps {
  children: React.ReactNode;
  onPress?: () => void;
  showSeparator?: boolean;
  accessibilityLabel?: string;
  /** Override background (e.g. urgent tint) */
  backgroundColor?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ListRow = ({
  children,
  onPress,
  showSeparator = true,
  accessibilityLabel,
  backgroundColor,
}: ListRowProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (onPress) {
      scale.value = withSpring(0.98, springs.snappy);
    }
  }, [onPress, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springs.gentle);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [onPress]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.row,
        backgroundColor ? { backgroundColor } : undefined,
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.content,
          showSeparator && styles.separator,
          showSeparator && { borderBottomColor: colors.separator },
        ]}
      >
        {children}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingStart: spacing.lg,
  },
  content: {
    paddingVertical: spacing.lg,
    paddingEnd: spacing.lg,
  },
  separator: {
    borderBottomWidth: hairline,
  },
});
