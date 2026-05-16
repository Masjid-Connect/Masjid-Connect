/**
 * SectionHeader — eyebrow + optional "See all →" action.
 *
 * Used on the Community resting state to label each preview section
 * (Coming up, Notices, Lessons) and route the user to the full screen
 * via a small gold link on the right.
 *
 * The title is uppercase, tracked, secondary-coloured — sits as a quiet
 * label above the section. The action takes a Divine Gold tint so it
 * reads as a real affordance without competing with the content.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, fontWeight } from '@/constants/Theme';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export const SectionHeader = ({ title, actionLabel, onActionPress }: SectionHeaderProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const gold = isDark ? palette.divineGoldBright : palette.divineGold;

  const handlePress = () => {
    if (!onActionPress) return;
    Haptics.selectionAsync();
    onActionPress();
  };

  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.title,
          { color: colors.textSecondary, fontWeight: fontWeight.semibold },
        ]}
      >
        {title}
      </Text>
      {actionLabel && onActionPress && (
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
        >
          <View style={styles.action}>
            <Text
              style={[
                typography.footnote,
                {
                  color: gold,
                  fontWeight: fontWeight.semibold,
                  letterSpacing: 0.4,
                },
              ]}
            >
              {actionLabel}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={gold} />
          </View>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
