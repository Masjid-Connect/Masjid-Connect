import React from 'react';
import { StyleSheet, View, useColorScheme, type ViewStyle } from 'react-native';
import { getColors } from '@/constants/Colors';
import { spacing } from '@/constants/Theme';

interface SeparatorProps {
  /** Horizontal inset from the leading edge (e.g. to align with text after an icon) */
  inset?: number;
  style?: ViewStyle;
}

/**
 * Warm hairline divider — consistent separator across lists, sheets, and sections.
 * Respects theme: warm stone in light mode, sapphire navy in dark mode.
 */
export const Separator = ({ inset = 0, style }: SeparatorProps) => {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  return (
    <View
      style={[
        styles.separator,
        { backgroundColor: colors.separator, marginLeft: inset },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing['2xs'],
  },
});
