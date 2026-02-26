/**
 * Brand Tab Icon — The Convergent Arch in Navigation
 *
 * The full mark reduced to the thinnest possible line weight in a
 * slightly muted Sacred Blue. It sits quietly in the tab bar.
 * When selected, the gold node gently illuminates.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

import { palette } from '@/constants/Colors';
import {
  ARCH_PATH,
  ARCH_APEX,
  ARCH_VIEWBOX,
} from '@/components/brand/ConvergentArch';
import { springs } from '@/constants/Theme';

interface BrandTabIconProps {
  /** Whether this tab is currently selected */
  focused: boolean;
  /** Tint color provided by the tab bar */
  color: string;
  /** Icon size — height in points */
  size?: number;
  /** Container style */
  style?: ViewStyle;
}

export const BrandTabIcon = ({
  focused,
  color,
  size = 26,
  style,
}: BrandTabIconProps) => {
  const aspectRatio = ARCH_VIEWBOX.width / ARCH_VIEWBOX.height;
  const width = size * aspectRatio;

  const animatedContainer = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(focused ? 1.08 : 1, springs.gentle),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedContainer, style]}>
      <Svg
        width={width}
        height={size}
        viewBox={`0 0 ${ARCH_VIEWBOX.width} ${ARCH_VIEWBOX.height}`}
      >
        <Path
          d={ARCH_PATH}
          stroke={color}
          strokeWidth={focused ? 1.5 : 1.2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle
          cx={ARCH_APEX.x}
          cy={ARCH_APEX.y}
          r={focused ? 3.5 : 2.5}
          fill={focused ? palette.divineGold : color}
          opacity={focused ? 1 : 0.4}
        />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
