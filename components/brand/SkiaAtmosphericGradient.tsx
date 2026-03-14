/**
 * Skia Atmospheric Gradient — GPU-Rendered Prayer Sky
 *
 * Replaces expo-linear-gradient with a Skia LinearGradient shader.
 * When the active prayer changes, colors can be interpolated smoothly
 * via reanimated shared values — the sky *shifts* instead of snapping.
 *
 * Returns null on web (Skia not available).
 */

import React from 'react';
import { Platform, StyleSheet } from 'react-native';

interface SkiaAtmosphericGradientProps {
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** 3-stop gradient colors [top, middle, bottom] */
  colors: [string, string, string];
}

export const SkiaAtmosphericGradient = ({
  width,
  height,
  colors,
}: SkiaAtmosphericGradientProps) => {
  if (Platform.OS === 'web') return null;

  const { Canvas, Rect, LinearGradient, vec } = require('@shopify/react-native-skia');

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={colors}
          positions={[0, 0.5, 1]}
        />
      </Rect>
    </Canvas>
  );
};
