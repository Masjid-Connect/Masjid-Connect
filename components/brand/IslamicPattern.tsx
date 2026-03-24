/**
 * Islamic Geometric Pattern — 8-Point Star (Murabba') Tessellation
 *
 * Two overlapping squares rotated 45° form the classic 8-point star,
 * tiled across a Skia Canvas in a single GPU render pass.
 *
 * This is the app's geometric identity — a whisper of pattern at 2–4% opacity,
 * never loud enough to compete with content.
 *
 * Returns null on web (Skia not available).
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Path as SvgPath, G } from 'react-native-svg';

import { palette } from '@/constants/Colors';

interface IslamicPatternProps {
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Pattern line color — defaults to Sacred Blue */
  color?: string;
  /** Opacity of the entire pattern (0–1) — keep low */
  opacity?: number;
  /** Size of each tile in points */
  tileSize?: number;
  /** Line width for the star geometry */
  strokeWidth?: number;
}

/**
 * Build a single 8-point star path centered at (cx, cy).
 *
 * Geometry: two squares of side `size`, one axis-aligned
 * and one rotated 45°. The intersection of their edges
 * creates the 8-point star.
 */
function buildStarPath(cx: number, cy: number, size: number): string {
  const r = size / 2;
  const innerR = r * 0.414; // r * (√2 - 1) ≈ 0.414

  // 8 outer points alternating between axis-aligned and 45° rotated squares
  const points: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const outerAngle = (i * Math.PI) / 4;

    // Outer point
    points.push([
      cx + r * Math.cos(outerAngle),
      cy + r * Math.sin(outerAngle),
    ]);

    // Inner notch point (between outer points)
    const nextAngle = ((i + 1) * Math.PI) / 4;
    const betweenAngle = (outerAngle + nextAngle) / 2;
    points.push([
      cx + innerR * Math.cos(betweenAngle),
      cy + innerR * Math.sin(betweenAngle),
    ]);
  }

  // Build SVG path string
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i][0]} ${points[i][1]}`;
  }
  d += ' Z';

  return d;
}

/**
 * Build connecting lines between stars in the tessellation.
 * Short segments link adjacent star tips to form the continuous lattice.
 */
function buildConnectorPaths(
  cols: number,
  rows: number,
  tileSize: number,
  offsetX: number,
  offsetY: number,
): string {
  let d = '';
  const half = tileSize / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = offsetX + col * tileSize;
      const cy = offsetY + row * tileSize;

      // Horizontal connector to right neighbor
      if (col < cols - 1) {
        d += `M ${cx + half} ${cy} L ${cx + tileSize - half} ${cy} `;
      }

      // Vertical connector to bottom neighbor
      if (row < rows - 1) {
        d += `M ${cx} ${cy + half} L ${cx} ${cy + tileSize - half} `;
      }
    }
  }

  return d;
}

export const IslamicPattern = ({
  width,
  height,
  color = palette.sapphire700,
  opacity = 0.03,
  tileSize = 48,
  strokeWidth = 0.8,
}: IslamicPatternProps) => {
  // Calculate grid
  const cols = Math.ceil(width / tileSize) + 1;
  const rows = Math.ceil(height / tileSize) + 1;
  const offsetX = (width - (cols - 1) * tileSize) / 2;
  const offsetY = (height - (rows - 1) * tileSize) / 2;

  // Build all star paths
  const starPaths: string[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = offsetX + col * tileSize;
      const cy = offsetY + row * tileSize;
      starPaths.push(buildStarPath(cx, cy, tileSize * 0.45));
    }
  }

  const combinedStarPath = starPaths.join(' ');
  const connectorPath = buildConnectorPaths(cols, rows, tileSize, offsetX, offsetY);

  // Web fallback — use react-native-svg instead of Skia
  if (Platform.OS === 'web') {
    return (
      <View
        accessible={false}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { width, height }]}
      >
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <G opacity={opacity}>
            <SvgPath
              d={combinedStarPath}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {connectorPath ? (
              <SvgPath
                d={connectorPath}
                stroke={color}
                strokeWidth={strokeWidth * 0.6}
                strokeLinecap="round"
                fill="none"
              />
            ) : null}
          </G>
        </Svg>
      </View>
    );
  }

  const { Canvas, Path, Group, Skia } = require('@shopify/react-native-skia');

  const skiaStarPath = Skia.Path.MakeFromSVGString(combinedStarPath);
  const skiaConnectorPath = connectorPath
    ? Skia.Path.MakeFromSVGString(connectorPath)
    : null;

  if (!skiaStarPath) return null;

  return (
    <View
      accessible={false}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { width, height }]}
    >
      <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
        <Group opacity={opacity}>
          <Path
            path={skiaStarPath}
            color={color}
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap="round"
            strokeJoin="round"
          />
          {skiaConnectorPath && (
            <Path
              path={skiaConnectorPath}
              color={color}
              style="stroke"
              strokeWidth={strokeWidth * 0.6}
              strokeCap="round"
            />
          )}
        </Group>
      </Canvas>
    </View>
  );
};
