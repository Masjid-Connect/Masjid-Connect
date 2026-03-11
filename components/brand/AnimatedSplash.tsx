/**
 * Animated Splash Screen — The Reveal
 *
 * The screen is pure, unadorned Kozo paper for a brief moment. Silence.
 *
 * With a haptic impact(Medium), the mosque logo fades in and gently
 * scales up from 85% to 100% — a quiet, confident emergence, as if
 * light is finding the mark on the paper.
 *
 * The app content subtly fades in around it.
 */

import React, { useCallback, useEffect } from 'react';
import { Dimensions, Image, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { palette } from '@/constants/Colors';
import { springs } from '@/constants/Theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Logo sizing — generous, centered */
const LOGO_WIDTH = Math.min(SCREEN_WIDTH * 0.75, 360);

/** Timing constants (ms) */
const PAUSE_BEFORE_REVEAL = 600;
const LOGO_FADE_DURATION = 1200;
const HOLD_DURATION = 800;
const CONTENT_FADE_DURATION = 800;

interface AnimatedSplashProps {
  /** Called when the splash animation is complete and content should appear */
  onAnimationComplete?: () => void;
  /** Whether to show the splash (controls visibility) */
  isVisible: boolean;
  /** Children (app content) rendered behind/after the splash */
  children: React.ReactNode;
}

export const AnimatedSplash = ({
  onAnimationComplete,
  isVisible,
  children,
}: AnimatedSplashProps) => {
  const isWeb = Platform.OS === 'web';

  // Animation shared values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const splashOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const notifyComplete = useCallback(() => {
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  useEffect(() => {
    if (!isVisible) return;

    // Phase 1: Pure paper, silence
    // Phase 2: Haptic + logo fades in with gentle scale
    logoOpacity.value = withDelay(
      PAUSE_BEFORE_REVEAL,
      withTiming(1, {
        duration: LOGO_FADE_DURATION,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    logoScale.value = withDelay(
      PAUSE_BEFORE_REVEAL,
      withSpring(1, {
        ...springs.gentle,
        stiffness: 80,
        damping: 20,
      })
    );

    // Trigger haptic at the start of reveal
    const hapticTimeout = setTimeout(() => {
      triggerHaptic();
    }, PAUSE_BEFORE_REVEAL);

    // Phase 3: Hold, then splash fades out and content fades in
    const contentDelay = PAUSE_BEFORE_REVEAL + LOGO_FADE_DURATION + HOLD_DURATION;

    splashOpacity.value = withDelay(
      contentDelay,
      withTiming(0, {
        duration: CONTENT_FADE_DURATION,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      })
    );

    contentOpacity.value = withDelay(
      contentDelay,
      withTiming(1, {
        duration: CONTENT_FADE_DURATION,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      })
    );

    // Notify completion
    const completeTimeout = setTimeout(() => {
      notifyComplete();
    }, contentDelay + CONTENT_FADE_DURATION);

    return () => {
      clearTimeout(hapticTimeout);
      clearTimeout(completeTimeout);
    };
  }, [isVisible]);

  // Logo animated style — fade + scale
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  // Splash container opacity
  const splashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
    pointerEvents: splashOpacity.value > 0.01 ? 'auto' as const : 'none' as const,
  }));

  // Content opacity
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // On web, skip the splash animation — the Animated.View wrappers
  // break Expo Router's LinkingContext on web.
  if (isWeb) {
    return <>{children}</>;
  }

  return (
    <View style={styles.root}>
      {/* App content (renders behind splash, fades in) */}
      <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
        {children}
      </Animated.View>

      {/* Splash overlay */}
      <Animated.View style={[styles.splashContainer, splashAnimatedStyle]}>
        {/* Kozo paper background */}
        <View style={styles.paperBackground} />

        {/* The logo — centered, fades in with scale */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image
            source={require('@/assets/images/Masjid_Logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paperBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.limestone,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH * 0.6, // approximate aspect ratio of the logo
  },
});
