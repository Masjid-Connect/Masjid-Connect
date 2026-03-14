/**
 * Kozo Paper Background
 *
 * A digital interpretation of Japanese mulberry paper (Kozo) —
 * known for its incredible strength, long fibers, and subtle natural luster.
 *
 * The texture is rendered as a barely-there organic grain: faint,
 * hair-thin fiber lines scattered across the limestone substrate.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { palette } from '@/constants/Colors';

/**
 * Deterministic pseudo-random fiber positions.
 * Pre-computed to avoid runtime randomness and ensure consistency.
 */
const FIBER_DATA = [
  { x1: 12, y1: 8, x2: 38, y2: 11, opacity: 0.03 },
  { x1: 55, y1: 3, x2: 82, y2: 7, opacity: 0.025 },
  { x1: 5, y1: 22, x2: 45, y2: 25, opacity: 0.02 },
  { x1: 60, y1: 18, x2: 95, y2: 20, opacity: 0.03 },
  { x1: 20, y1: 35, x2: 55, y2: 33, opacity: 0.025 },
  { x1: 70, y1: 30, x2: 98, y2: 34, opacity: 0.02 },
  { x1: 3, y1: 45, x2: 30, y2: 48, opacity: 0.03 },
  { x1: 40, y1: 42, x2: 75, y2: 44, opacity: 0.02 },
  { x1: 15, y1: 58, x2: 50, y2: 55, opacity: 0.025 },
  { x1: 65, y1: 52, x2: 90, y2: 56, opacity: 0.03 },
  { x1: 8, y1: 68, x2: 42, y2: 70, opacity: 0.02 },
  { x1: 50, y1: 65, x2: 85, y2: 68, opacity: 0.025 },
  { x1: 18, y1: 78, x2: 48, y2: 80, opacity: 0.03 },
  { x1: 58, y1: 75, x2: 92, y2: 78, opacity: 0.02 },
  { x1: 5, y1: 88, x2: 35, y2: 90, opacity: 0.025 },
  { x1: 45, y1: 85, x2: 80, y2: 88, opacity: 0.03 },
  { x1: 25, y1: 95, x2: 60, y2: 93, opacity: 0.02 },
  { x1: 70, y1: 92, x2: 98, y2: 95, opacity: 0.025 },
] as const;

interface KozoPaperBackgroundProps {
  /** Background color — defaults to limestone */
  color?: string;
  /** Fiber/grain color — defaults to ink */
  fiberColor?: string;
  /** Whether to show the subtle fiber texture */
  showTexture?: boolean;
  /** Children to render on top */
  children?: React.ReactNode;
  /** Container style */
  style?: ViewStyle;
}

export const KozoPaperBackground = ({
  color = palette.limestone,
  fiberColor = palette.ink,
  showTexture = true,
  children,
  style,
}: KozoPaperBackgroundProps) => {
  return (
    <View style={[styles.container, { backgroundColor: color }, style]}>
      {showTexture && (
        <View style={styles.textureOverlay} pointerEvents="none">
          <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" accessible={false}>
            {/* Subtle warm grain overlay */}
            <Rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill={palette.limestoneTertiary}
              opacity={0.04}
            />
            {/* Long, hair-thin fibers characteristic of Kozo paper */}
            {FIBER_DATA.map((fiber, i) => (
              <Line
                key={i}
                x1={fiber.x1}
                y1={fiber.y1}
                x2={fiber.x2}
                y2={fiber.y2}
                stroke={fiberColor}
                strokeWidth={0.15}
                opacity={fiber.opacity}
                strokeLinecap="round"
              />
            ))}
          </Svg>
        </View>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  textureOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
