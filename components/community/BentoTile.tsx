/**
 * BentoTile — shared container chrome for the Community bento layout.
 *
 * Provides the persistent "shape" of a tile so the page rhythm survives
 * sparse data states. Each tile carries:
 *   - A tracked uppercase eyebrow (top-left)
 *   - A small gold see-all action (top-right)
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

  const handleAction = () => {
    Haptics.selectionAsync();
    onActionPress();
  };

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: colors.card,
          borderColor: colors.separator,
          ...getElevation('sm', isDark),
        },
        minHeight ? { minHeight } : null,
        style,
      ]}
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
        <Pressable
          onPress={handleAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
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
        </Pressable>
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
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
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
