/**
 * BentoTile — shared container chrome for the Community bento layout.
 *
 * The ENTIRE TILE is a single Pressable — tapping anywhere on a tile
 * (chrome, padding, content area, empty state) fires onActionPress and
 * drills the user into the named segment. The "see all →" link in the
 * top-right corner is a visual cue only; it doesn't carry its own
 * touch target (so the inner Pressables don't compete with the outer).
 *
 * Each tile carries:
 *   - A tracked uppercase eyebrow with a 3×12pt gold tab to its left
 *   - A small gold see-all visual marker (top-right)
 *   - Body content OR a centred empty state with optional icon
 *
 * Card chrome (background, border, elevation) holds regardless of
 * whether the data is present — the tile's identity is the SHAPE,
 * the data fills it in.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import {
  spacing,
  typography,
  borderRadius,
  fontWeight,
  getElevation,
} from '@/constants/Theme';

export interface BentoTileProps {
  title: string;
  actionLabel: string;
  onActionPress: () => void;
  children?: React.ReactNode;
  /** When true, suppresses children and shows the empty state instead. */
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Optional minimum height. Useful for stretching to fill a bento cell. */
  minHeight?: number;
  style?: ViewStyle;
}

export const BentoTile = ({
  title,
  actionLabel,
  onActionPress,
  children,
  isEmpty = false,
  emptyMessage,
  emptyIcon,
  minHeight,
  style,
}: BentoTileProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const gold = isDark ? palette.divineGoldBright : palette.divineGold;

  const handlePress = () => {
    Haptics.selectionAsync();
    onActionPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colors.card,
          borderColor: colors.separator,
          ...getElevation('sm', isDark),
        },
        minHeight ? { minHeight } : null,
        pressed && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${actionLabel}`}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {/* Tiny gold tab — gives the eyebrow a sectional mark */}
          <View style={[styles.eyebrowAccent, { backgroundColor: gold }]} />
          <Text
            style={[
              styles.title,
              { color: colors.textSecondary, fontWeight: fontWeight.semibold },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <View style={styles.action}>
          <Text
            style={[
              typography.caption1,
              { color: gold, fontWeight: fontWeight.semibold, letterSpacing: 0.3 },
            ]}
          >
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={12} color={gold} />
        </View>
      </View>

      {/* Body */}
      {isEmpty ? (
        <View style={styles.emptyState}>
          {emptyIcon && (
            <Ionicons
              name={emptyIcon}
              size={26}
              color={colors.textTertiary}
              style={styles.emptyIcon}
            />
          )}
          {emptyMessage && (
            <Text
              style={[
                typography.footnote,
                { color: colors.textSecondary, textAlign: 'center' },
              ]}
            >
              {emptyMessage}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  eyebrowAccent: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
  },
  title: {
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  body: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  emptyIcon: {
    marginBottom: spacing.sm,
    opacity: 0.6,
  },
});
