/**
 * CommunityCard — one tile in the Community 2×2 grid.
 *
 * Press → spring scale 0.96 (Reanimated) + haptic. Optional badge:
 *   - `count`: Divine Gold unread badge (announcements use this)
 *   - `pulse`: Gold pulsing dot (Live card uses this when broadcasting)
 *   - `none`: nothing
 *
 * Visual density matters here — empty tiles would feel like an app
 * launcher. Each card surfaces a content-specific subtitle (next event
 * date, "On air", latest lesson title) so the grid carries meaning.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import {
  spacing,
  typography,
  borderRadius,
  fontWeight,
  springs,
  getElevation,
} from '@/constants/Theme';
import { GoldBadge } from '@/components/brand/GoldBadge';

export type CommunityCardBadge =
  | { kind: 'count'; count: number }
  | { kind: 'pulse' }
  | { kind: 'none' };

export interface CommunityCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  badge?: CommunityCardBadge;
  onPress: () => void;
  accessibilityLabel: string;
}

export const CommunityCard = ({
  icon,
  title,
  subtitle,
  badge = { kind: 'none' },
  onPress,
  accessibilityLabel,
}: CommunityCardProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';

  const pressScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  // Slow gold pulse only while the badge is in 'pulse' state — Jun's
  // direction: no idle motion on cards that aren't broadcasting.
  useEffect(() => {
    if (badge.kind === 'pulse') {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1200 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = 1;
    }
    return () => cancelAnimation(pulseOpacity);
  }, [badge.kind, pulseOpacity]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const onPressIn = () => {
    pressScale.value = withSpring(0.96, springs.snappy);
  };
  const onPressOut = () => {
    pressScale.value = withSpring(1, springs.snappy);
  };
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const accent = isDark ? palette.divineGoldBright : palette.divineGold;
  const iconColor = badge.kind === 'pulse' ? accent : colors.text;

  return (
    <Animated.View style={[styles.cardWrap, pressStyle]}>
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.separator,
            ...getElevation('sm', isDark),
          },
        ]}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.iconRow}>
          <Ionicons name={icon} size={28} color={iconColor} />
          {badge.kind === 'count' && badge.count > 0 && (
            <GoldBadge count={badge.count} />
          )}
          {badge.kind === 'pulse' && (
            <Animated.View
              style={[styles.pulseDot, { backgroundColor: accent }, pulseStyle]}
            />
          )}
        </View>
        <View style={styles.textBlock}>
          <Text
            style={[
              typography.headline,
              { color: colors.text, fontWeight: fontWeight.semibold },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[
              typography.footnote,
              { color: colors.textSecondary, marginTop: spacing.xs },
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrap: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textBlock: {
    marginTop: spacing.md,
  },
});
