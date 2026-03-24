/**
 * Gold Notification Badge
 *
 * A tiny, perfect circle. Not red. Divine Gold.
 * It's not an error; it's a glint of light catching your attention.
 * It feels like a small, precious seal.
 */

import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';

import { palette, getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, fontWeight } from '@/constants/Theme';

interface GoldBadgeProps {
  /** Number to display inside the badge. If undefined, shows a dot. */
  count?: number;
  /** Badge size in points */
  size?: number;
  /** Badge color — defaults to Divine Gold */
  color?: string;
  /** Text color for the count */
  textColor?: string;
  /** Container style */
  style?: ViewStyle;
}

export const GoldBadge = ({
  count,
  size = 18,
  color,
  textColor = palette.white,
  style,
}: GoldBadgeProps) => {
  const { effectiveScheme } = useTheme();
  const defaultColor = effectiveScheme === 'dark' ? palette.divineGoldBright : palette.divineGold;
  const badgeColor = color ?? defaultColor;
  const showCount = count !== undefined && count > 0;
  const dotSize = showCount ? Math.max(size, 18) : 10;
  const displayCount = count !== undefined && count > 99 ? '99+' : count;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeColor,
          width: showCount ? undefined : dotSize,
          height: dotSize,
          minWidth: dotSize,
          borderRadius: dotSize / 2,
          paddingHorizontal: showCount ? spacing.xs : 0,
        },
        style,
      ]}
    >
      {showCount && (
        <Text
          style={[
            styles.text,
            {
              color: textColor,
              fontSize: dotSize * 0.6,
              lineHeight: dotSize,
            },
          ]}
        >
          {displayCount}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
});
