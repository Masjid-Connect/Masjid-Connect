/**
 * Glow Dot — Radiant Active Prayer Indicator
 *
 * Replaces the flat 6px Divine Gold circle marking the active prayer
 * with a Skia-rendered circle that has a soft Gaussian blur glow.
 *
 * The glow draws the eye naturally to the active prayer row —
 * a radiance, not just a dot.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Blur,
  Paint,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { palette } from '@/constants/Colors';

interface GlowDotProps {
  /** Dot radius in points (default 3, giving 6pt diameter) */
  size?: number;
  /** Dot color — defaults to Divine Gold */
  color?: string;
  /** Blur radius for the glow effect (default 4) */
  blurRadius?: number;
  /** Whether the glow pulses gently (default true) */
  animated?: boolean;
}

const AnimatedCanvas = Animated.createAnimatedComponent(Canvas);

export const GlowDot = ({
  size = 3,
  color = palette.divineGold,
  blurRadius = 4,
  animated = true,
}: GlowDotProps) => {
  // Canvas needs to be large enough for the glow
  const canvasSize = (size + blurRadius) * 2 + 2;
  const center = canvasSize / 2;

  // Gentle pulse animation
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (animated) {
      pulseOpacity.value = withRepeat(
        withTiming(0.6, {
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    }
  }, [animated]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: canvasSize,
          height: canvasSize,
          // Center the glow so the dot aligns with where a 6px View dot would be
          marginLeft: -(canvasSize - size * 2) / 2,
          marginTop: -(canvasSize - size * 2) / 2,
        },
        animated && animatedContainerStyle,
      ]}
    >
      <Canvas style={{ width: canvasSize, height: canvasSize }}>
        {/* Glow layer — blurred larger circle */}
        <Group>
          <Circle cx={center} cy={center} r={size + 1} color={color} opacity={0.4}>
            <Blur blur={blurRadius} />
          </Circle>
        </Group>

        {/* Core dot — sharp, fully opaque */}
        <Circle cx={center} cy={center} r={size} color={color} />
      </Canvas>
    </Animated.View>
  );
};
