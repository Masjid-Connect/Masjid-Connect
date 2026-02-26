/**
 * The Convergent Arch — Mosque Connect Brand Mark
 *
 * A single, unbroken line that simultaneously suggests the mihrab niche
 * (inward-curving base) and the dome (outward arc at top). The two curves
 * meet at a single elevated apex — the point of convergence.
 *
 * At the apex sits a matte gold leaf node: not decoration, but a structural
 * pin of significance. The only element with its own materiality.
 */

import React from 'react';
import { ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

import { palette } from '@/constants/Colors';

/**
 * The SVG path describing the Convergent Arch.
 * viewBox coordinate system: 100 x 140
 *
 * The line starts at the lower-left, curves inward (mihrab), transitions
 * to an outward arc (dome), reaches the apex, then mirrors down the
 * right side — all in one continuous cubic Bézier stroke.
 */
export const ARCH_PATH =
  'M 20 130 C 35 108, 28 48, 50 10 C 72 48, 65 108, 80 130';

/** Apex coordinates where the gold node is placed */
export const ARCH_APEX = { x: 50, y: 10 };

/** Approximate total length of the path in viewBox units (for stroke animation) */
export const ARCH_PATH_LENGTH = 280;

/** Default viewBox dimensions */
export const ARCH_VIEWBOX = { width: 100, height: 140 };

interface ConvergentArchProps {
  /** Overall size — height in points. Width scales proportionally. */
  size?: number;
  /** Stroke color for the arch line */
  strokeColor?: string;
  /** Gold node color */
  goldColor?: string;
  /** Whether to render the gold node at the apex */
  showGoldNode?: boolean;
  /** Stroke width in viewBox units */
  lineWidth?: number;
  /** Gold node radius in viewBox units */
  nodeRadius?: number;
  /** Opacity of the gold node (0–1) */
  goldOpacity?: number;
  /** Container style */
  style?: ViewStyle;
}

export const ConvergentArch = ({
  size = 140,
  strokeColor = palette.sacredBlue,
  goldColor = palette.divineGold,
  showGoldNode = true,
  lineWidth = 1.5,
  nodeRadius = 3.5,
  goldOpacity = 1,
  style,
}: ConvergentArchProps) => {
  const aspectRatio = ARCH_VIEWBOX.width / ARCH_VIEWBOX.height;
  const width = size * aspectRatio;

  return (
    <Svg
      width={width}
      height={size}
      viewBox={`0 0 ${ARCH_VIEWBOX.width} ${ARCH_VIEWBOX.height}`}
      style={style}
    >
      <Path
        d={ARCH_PATH}
        stroke={strokeColor}
        strokeWidth={lineWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showGoldNode && (
        <Circle
          cx={ARCH_APEX.x}
          cy={ARCH_APEX.y}
          r={nodeRadius}
          fill={goldColor}
          opacity={goldOpacity}
        />
      )}
    </Svg>
  );
};
