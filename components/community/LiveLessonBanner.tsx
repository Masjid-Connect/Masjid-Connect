/**
 * LiveLessonBanner — "Living Banner" for live Mixlr broadcasts.
 *
 * Appears at the top of the Community tab when a lesson is being
 * broadcast. Features a breathing Divine Gold glow border, pulsing
 * live indicator dot, and spring-animated entrance.
 *
 * Tap → navigates to the full-screen LiveLessonPlayer.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, getElevation } from '@/constants/Theme';
import { withBreathing } from '@/lib/breathMotion';

interface LiveLessonBannerProps {
  broadcastTitle: string;
}

/** Pulsing gold dot animation cycle (ms) */
const PULSE_DURATION = 1200;

export const LiveLessonBanner = ({ broadcastTitle }: LiveLessonBannerProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const router = useRouter();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  // ─── Breathing gold glow ────────────────────────────────────────
  // Reduced-motion: hold at mid opacity (0.4), skip infinite loop.
  const glowOpacity = useSharedValue(reducedMotion ? 0.4 : 0.3);

  useEffect(() => {
    if (reducedMotion) return;
    withBreathing(glowOpacity, 0.2, 0.6);
  }, [glowOpacity, reducedMotion]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // ─── Pulsing live dot ───────────────────────────────────────────
  // Reduced-motion: skip the repeat; dot stays at scale 1 (static indicator).
  const dotScale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: PULSE_DURATION / 2, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: PULSE_DURATION / 2, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [dotScale, reducedMotion]);

  const dotPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: 0.4,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/live-lesson');
  };

  const goldColor = isDark ? palette.divineGoldBright : palette.divineGold;
  const goldBorder = isDark ? 'rgba(240, 208, 96, 0.35)' : 'rgba(166, 133, 35, 0.35)';

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20).stiffness(150)}
      exiting={FadeOutUp.duration(200)}
      style={styles.wrapper}
    >
      {/* Breathing gold glow border */}
      <Animated.View
        style={[
          styles.glowBorder,
          {
            borderColor: goldColor,
            shadowColor: goldColor,
          },
          glowStyle,
        ]}
        pointerEvents="none"
      />

      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.banner,
          {
            backgroundColor: isDark ? palette.sapphire850 : palette.white,
            borderColor: goldBorder,
            ...getElevation('md', isDark),
          },
          pressed && styles.bannerPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('liveLesson.tapToListen')}
        accessibilityHint={t('liveLesson.bannerHint')}
      >
        {/* Live indicator */}
        <View style={styles.liveIndicator}>
          {/* Pulsing halo behind the dot */}
          <Animated.View style={[styles.dotHalo, dotPulseStyle]} />
          <View style={styles.liveDot} />
        </View>

        {/* Text content */}
        <View style={styles.textContainer}>
          <View style={styles.liveRow}>
            <Text style={[styles.liveLabel, { color: goldColor }]}>
              {t('liveLesson.live')}
            </Text>
            <Text style={[typography.footnote, { color: colors.textSecondary }]}>
              {t('liveLesson.fromMasjid')}
            </Text>
          </View>
          <Text
            style={[typography.headline, { color: colors.text }]}
            numberOfLines={1}
          >
            {t('liveLesson.lessonInProgress')}
          </Text>
          <Text
            style={[typography.footnote, { color: goldColor }]}
            numberOfLines={1}
          >
            {t('liveLesson.tapToListen')}
          </Text>
        </View>

        {/* Play icon */}
        <View style={[styles.playButton, { backgroundColor: goldColor }]}>
          <Ionicons name="play" size={18} color={palette.white} style={styles.playIcon} />
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  glowBorder: {
    ...StyleSheet.absoluteFillObject,
    marginHorizontal: spacing['3xl'] - 2,
    marginTop: spacing.sm - 2,
    marginBottom: spacing.xs - 2,
    borderRadius: borderRadius.lg + 2,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  bannerPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  liveIndicator: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotHalo: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.divineGoldBright,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.divineGoldBright,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 2, // optical centering for play triangle
  },
});
