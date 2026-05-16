/**
 * CommunityCard — one tile in the Community 4-up row.
 *
 * Compact (~22% width on phone), centered icon halo + single-line title.
 * Each tile carries an identity via the `accent` colour:
 *   - The icon renders in the full accent colour
 *   - A halo disc (~12% light / ~22% dark opacity of accent) sits behind it
 *
 * Press → spring scale 0.95 + haptic. Optional badge in the top-right
 * corner: a Divine Gold unread count, or a slow pulsing dot (live state).
 *
 * Design discipline (Council Seats 19 + 30):
 *   - Colours stay within the Celestial Ink palette — no app-launcher
 *     rainbow. Variety comes from sapphire tier + gold counterpoint.
 *   - No idle motion. The pulse only runs while badge.kind === 'pulse'.
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

import { getColors } from '@/constants/Colors';
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
  /** Accent colour for icon + halo. Pick from the Celestial Ink palette. */
  accent: string;
  badge?: CommunityCardBadge;
  onPress: () => void;
  accessibilityLabel: string;
}

const HALO_SIZE = 38;
const ICON_SIZE = 20;

export const CommunityCard = ({
  icon,
  title,
  accent,
  badge = { kind: 'none' },
  onPress,
  accessibilityLabel,
}: CommunityCardProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';

  const pressScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (badge.kind === 'pulse') {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: 1200 }),
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
    pressScale.value = withSpring(0.95, springs.snappy);
  };
  const onPressOut = () => {
    pressScale.value = withSpring(1, springs.snappy);
  };
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  // Halo: composes alpha into the accent hex. '20' ≈ 12% (light), '38' ≈ 22%
  // (dark — needs more to remain visible on a dark card). RN parses 8-digit
  // hex (#RRGGBBAA) on both platforms so the concat is safe.
  const haloAlphaHex = isDark ? '38' : '20';
  const haloBg = accent + haloAlphaHex;

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
        <View style={[styles.halo, { backgroundColor: haloBg }]}>
          <Ionicons name={icon} size={ICON_SIZE} color={accent} />
        </View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          style={[
            typography.footnote,
            styles.title,
            { color: colors.text, fontWeight: fontWeight.semibold },
          ]}
        >
          {title}
        </Text>

        {badge.kind === 'count' && badge.count > 0 && (
          <View style={styles.badgeAbs}>
            <GoldBadge count={badge.count} size={16} />
          </View>
        )}
        {badge.kind === 'pulse' && (
          <Animated.View
            style={[styles.pulseAbs, { backgroundColor: accent }, pulseStyle]}
          />
        )}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xs,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  badgeAbs: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  pulseAbs: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
