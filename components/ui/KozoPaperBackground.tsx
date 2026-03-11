/**
 * Paper Background
 *
 * A clean background container with the warm limestone color.
 * The SVG fiber texture was removed — it was imperceptible at
 * 0.02-0.03 opacity while adding rendering overhead.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { palette } from '@/constants/Colors';

interface KozoPaperBackgroundProps {
  /** Background color — defaults to limestone */
  color?: string;
  /** @deprecated No longer renders texture. Kept for API compatibility. */
  fiberColor?: string;
  /** @deprecated No longer renders texture. Kept for API compatibility. */
  showTexture?: boolean;
  /** Children to render on top */
  children?: React.ReactNode;
  /** Container style */
  style?: ViewStyle;
}

export const KozoPaperBackground = ({
  color = palette.limestone,
  children,
  style,
}: KozoPaperBackgroundProps) => {
  return (
    <View style={[styles.container, { backgroundColor: color }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
