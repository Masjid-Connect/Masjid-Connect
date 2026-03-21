import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, getElevation, typography, springs, components } from '@/constants/Theme';

interface ProfileCardAuthProps {
  variant: 'authenticated';
  name: string;
  email: string;
  onPress: () => void;
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
        >
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[typography.title2, { color: colors.onPrimary }]}>
              {initial}
            </Text>
          </View>
          <View style={styles.info}>
            <Text style={[typography.title3, { color: colors.text }]} numberOfLines={1}>
              {props.name || props.email}
            </Text>
            <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
              {props.email}
            </Text>
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
          <Text style={[typography.subhead, { color: colors.onPrimary, fontWeight: '600' }]}>
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
