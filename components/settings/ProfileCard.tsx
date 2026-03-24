import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, getElevation, typography, springs, components, fontWeight } from '@/constants/Theme';
import { format } from 'date-fns';

interface ProfileCardAuthProps {
  variant: 'authenticated';
  name: string;
  email: string;
  onPress: () => void;
  /** ISO date string for member-since display */
  memberSince?: string;
  /** Whether the user is a mosque admin */
  isAdmin?: boolean;
}

interface ProfileCardGuestProps {
  variant: 'guest';
  onSignIn: () => void;
}

type ProfileCardProps = ProfileCardAuthProps | ProfileCardGuestProps;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ProfileCard = (props: ProfileCardProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, springs.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springs.gentle);
  }, [scale]);

  if (props.variant === 'authenticated') {
    const initial = (props.name || props.email)[0].toUpperCase();
    const memberSinceLabel = props.memberSince
      ? t('settings.memberSince', { date: format(new Date(props.memberSince), 'MMM yyyy') })
      : null;

    return (
      <View style={styles.wrapper}>
        <AnimatedPressable
          onPress={props.onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              ...getElevation('sm', isDark),
            },
            animatedStyle,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('settings.profileButton')}
        >
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[typography.title2, { color: colors.onPrimary }]}>
              {initial}
            </Text>
          </View>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[typography.title3, { color: colors.text }]} numberOfLines={1}>
                {props.name || props.email}
              </Text>
              {props.isAdmin && (
                <View style={[styles.adminBadge, { backgroundColor: isDark ? colors.backgroundGrouped : palette.sapphireLight }]}>
                  <Ionicons name="shield-checkmark" size={10} color={colors.tint} />
                  <Text style={[typography.caption2, { color: colors.tint, fontWeight: fontWeight.semibold, marginStart: 2 }]}>
                    {t('settings.admin')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
              {props.email}
            </Text>
            {memberSinceLabel && (
              <Text style={[typography.caption2, { color: colors.textTertiary, marginTop: 2 }]}>
                {memberSinceLabel}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </AnimatedPressable>
      </View>
    );
  }

  // Guest variant
  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.card,
          styles.guestCard,
          {
            backgroundColor: colors.card,
            ...getElevation('sm', isDark),
          },
        ]}
      >
        <View style={[styles.guestIconCircle, { backgroundColor: isDark ? colors.backgroundGrouped : colors.backgroundSecondary }]}>
          <Ionicons name="person-circle-outline" size={44} color={colors.textTertiary} />
        </View>
        <Text style={[typography.footnote, styles.guestHint, { color: colors.textSecondary }]}>
          {t('settings.guestHint')}
        </Text>
        <Pressable
          onPress={props.onSignIn}
          style={[styles.signInButton, { backgroundColor: colors.tint }]}
        >
          <Text style={[typography.subhead, { color: colors.onPrimary, fontWeight: fontWeight.semibold }]}>
            {t('settings.signIn')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.lg,
  },
  card: {
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  avatar: {
    width: components.avatar.sm,
    height: components.avatar.sm,
    borderRadius: components.avatar.sm / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginStart: spacing.lg,
    marginEnd: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  guestCard: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing['2xl'],
  },
  guestIconCircle: {
    width: components.avatar.md,
    height: components.avatar.md,
    borderRadius: components.avatar.md / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  guestHint: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  signInButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['3xl'],
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
});
