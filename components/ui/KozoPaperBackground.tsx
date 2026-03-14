/**
 * Paper Background — with Skia Grain Texture
 *
 * A warm background container with the limestone color and optional
 * Perlin noise grain rendered via Skia RuntimeShader. The grain gives
 * the surface the feeling of handmade Japanese Kozo paper at near-zero
 * GPU cost.
 */

import React, { useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { palette } from '@/constants/Colors';
import { KozoTexture } from '@/components/brand/KozoTexture';

interface KozoPaperBackgroundProps {
  /** Background color — defaults to limestone */
  color?: string;
  /** Whether to render the grain texture (default true) */
  showTexture?: boolean;
  /** Grain intensity (default 0.06) */
  grainIntensity?: number;
  /** Children to render on top */
  children?: React.ReactNode;
  /** Container style */
  style?: ViewStyle;
}

export const KozoPaperBackground = ({
  color = palette.limestone,
  showTexture = true,
  grainIntensity = 0.06,
  children,
  style,
}: KozoPaperBackgroundProps) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  return (
    <View
      style={[styles.container, { backgroundColor: color }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ width, height });
      }}
    >
      {showTexture && layout.width > 0 && (
        <KozoTexture
          width={layout.width}
          height={layout.height}
          grainIntensity={grainIntensity}
        />
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
