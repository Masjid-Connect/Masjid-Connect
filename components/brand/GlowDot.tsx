/**
 * Glow Dot — Radiant Active Prayer Indicator
 *
 * Replaces the flat 6px Divine Gold circle marking the active prayer
 * with a Skia-rendered circle that has a soft Gaussian blur glow.
 *
 * The glow draws the eye naturally to the active prayer row —
 * a radiance, not just a dot.
 *
 * Returns a simple View dot on web (Skia not available).
 */

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { palette } from '@/constants/Colors';
import { withBreathing } from '@/lib/breathMotion';

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

export const GlowDot = ({
  size = 3,
  color = palette.divineGold,
  blurRadius = 2.5,
  animated = true,
}: GlowDotProps) => {
  // Breathing pulse — inhale brightens, exhale dims
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (animated) {
      withBreathing(pulseOpacity, 0.6, 1);
    }
  }, [animated]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Web fallback — simple colored circle, no Skia
  if (Platform.OS === 'web') {
    return (
      <Animated.View
        style={[
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            backgroundColor: color,
          },
          animated && animatedContainerStyle,
        ]}
      />
    );
  }

  const { Canvas, Circle, Group, Blur } = require('@shopify/react-native-skia');

  // Canvas needs to be large enough for the glow
  const canvasSize = (size + blurRadius) * 2 + 2;
  const center = canvasSize / 2;

  return (
    <Animated.View
      style={[
        {
          width: canvasSize,
          height: canvasSize,
          // Center the glow so the dot aligns with where a 6px View dot would be
          marginStart: -(canvasSize - size * 2) / 2,
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
