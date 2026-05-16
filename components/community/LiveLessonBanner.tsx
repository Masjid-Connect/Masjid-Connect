/**
 * LiveLessonBanner — dark "on-air" hero card for active Mixlr broadcasts.
 *
 * Appears above the Community tile row when a lesson is being broadcast.
 * The card itself is theme-independent (always deep ink) so the gold
 * accents read consistently against a single dark surface — the broadcast
 * is the hero, not the page.
 *
 * Composition (editorial / hadith-book inspired):
 *   - Pulsing gold dot + "LIVE NOW" eyebrow (uppercase, tracked)
 *   - Outlined gold play disc on the left
 *   - Broadcast title in Sora display weight on the right
 *   - "Live from the masjid" tagline in muted gold
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

import { palette } from '@/constants/Colors';
import {
  spacing,
  typography,
  borderRadius,
  fontWeight,
  getElevation,
} from '@/constants/Theme';
import { withBreathing } from '@/lib/breathMotion';

interface LiveLessonBannerProps {
  broadcastTitle: string;
}

const PULSE_DURATION = 1200;

export const LiveLessonBanner = ({ broadcastTitle }: LiveLessonBannerProps) => {
  const router = useRouter();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  // Breathing gold border — subtle, doesn't compete with the dot pulse.
  const glowOpacity = useSharedValue(reducedMotion ? 0.32 : 0.22);
  useEffect(() => {
    if (reducedMotion) return;
    withBreathing(glowOpacity, 0.18, 0.42);
  }, [glowOpacity, reducedMotion]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  // Pulsing dot halo — the primary attention cue.
  const dotScale = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) return;
    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: PULSE_DURATION / 2, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: PULSE_DURATION / 2, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [dotScale, reducedMotion]);
  const dotHaloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: 0.35,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/live-lesson');
  };

  // Theme-independent surface — the banner reads as one consistent
  // "deep ink" panel regardless of system light/dark mode. The gold
  // accents land the same way on both.
  const cardBg = palette.sapphire900;
  const goldAccent = palette.divineGoldBright;
  const paperText = palette.stone100;
  const mutedText = 'rgba(232, 199, 107, 0.65)';

  const titleText = broadcastTitle?.trim() || t('liveLesson.lessonInProgress');

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20).stiffness(150)}
      exiting={FadeOutUp.duration(200)}
      style={styles.wrapper}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.banner,
          { backgroundColor: cardBg, ...getElevation('md', true) },
          pressed && styles.bannerPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('liveLesson.tapToListen')}
        accessibilityHint={t('liveLesson.bannerHint')}
      >
        {/* Breathing gold hairline */}
        <Animated.View
          style={[styles.border, { borderColor: goldAccent }, glowStyle]}
          pointerEvents="none"
        />

        {/* Eyebrow: pulsing dot + LIVE NOW */}
        <View style={styles.eyebrowRow}>
          <View style={styles.dotWrap}>
            <Animated.View
              style={[styles.dotHalo, { backgroundColor: goldAccent }, dotHaloStyle]}
              pointerEvents="none"
            />
            <View style={[styles.dotCore, { backgroundColor: goldAccent }]} />
          </View>
          <Text style={[styles.eyebrowLabel, { color: goldAccent }]}>
            {t('liveLesson.liveNow')}
          </Text>
        </View>

        {/* Hero row */}
        <View style={styles.heroRow}>
          <View style={[styles.playBtn, { borderColor: goldAccent }]}>
            <Ionicons name="play" size={20} color={goldAccent} style={styles.playIcon} />
          </View>
          <View style={styles.textCol}>
            <Text
              style={[
                typography.title3,
                styles.title,
                { color: paperText, fontWeight: fontWeight.semibold },
              ]}
              numberOfLines={2}
            >
              {titleText}
            </Text>
            <Text
              style={[typography.footnote, styles.tagline, { color: mutedText }]}
              numberOfLines={1}
            >
              {t('liveLesson.liveFromMasjid')}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  banner: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  bannerPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dotWrap: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotHalo: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eyebrowLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 199, 107, 0.08)',
  },
  playIcon: {
    marginLeft: 2, // optical centering of the play triangle
  },
  textCol: {
    flex: 1,
  },
  title: {
    lineHeight: 22,
  },
  tagline: {
    marginTop: 2,
  },
});
