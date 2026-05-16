/**
 * EventDatePill — small calendar tile (day-of-week + day-of-month).
 *
 * The anchor element on each event preview row. Reads as a paper
 * calendar tag: muted ground, tracked day-of-week label up top,
 * larger day number below.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { typography, borderRadius, fontWeight } from '@/constants/Theme';

interface EventDatePillProps {
  date: Date;
}

const PILL_SIZE = 48;

export const EventDatePill = ({ date }: EventDatePillProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';

  const day = format(date, 'EEE').toUpperCase();
  const num = format(date, 'd');

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: isDark ? palette.sapphire850 : palette.stone200,
          borderColor: colors.separator,
        },
      ]}
    >
      <Text
        style={[
          typography.caption2,
          styles.day,
          { color: colors.textSecondary, fontWeight: fontWeight.semibold },
        ]}
      >
        {day}
      </Text>
      <Text
        style={[
          styles.num,
          { color: colors.text, fontWeight: fontWeight.semibold },
        ]}
      >
        {num}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    width: PILL_SIZE,
    height: PILL_SIZE,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    letterSpacing: 1.2,
    fontSize: 10,
  },
  num: {
    fontSize: 22,
    lineHeight: 24,
  },
});
