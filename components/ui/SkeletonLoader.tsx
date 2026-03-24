import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { borderRadius as br } from '@/constants/Theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader = ({ width = '100%', height = 16, borderRadius = br.xs, style }: SkeletonLoaderProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);

  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.backgroundGrouped,
        },
        animatedStyle,
        style,
      ]}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    />
  );
};
