/**
 * Animated Splash Screen — The Reveal
 *
 * The screen opens with a prayer-aware atmospheric gradient.
 * During the silence phase, a whisper of Islamic geometric pattern
 * fades in at 4% opacity.
 *
 * With a haptic impact(Medium), the mosque logo fades in and gently
 * scales up from 85% to 100% — a quiet, confident emergence, as if
 * light is finding the mark on the paper.
 *
 * The app content subtly fades in around it.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, View, useColorScheme, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { palette } from '@/constants/Colors';
import { springs } from '@/constants/Theme';
import { patterns } from '@/lib/layoutGrid';
import { breath, breathEasing } from '@/lib/breathMotion';
import { getAtmosphericGradient } from '@/lib/prayerGradients';
import { IslamicPattern } from './IslamicPattern';
import { SkiaAtmosphericGradient } from './SkiaAtmosphericGradient';

/** Logo max width cap */
const LOGO_MAX_WIDTH = 360;

/** Timing constants (ms) */
const PAUSE_BEFORE_REVEAL = 500;
const LOGO_FADE_DURATION = 1200;
const HOLD_DURATION = 700;
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
  const reducedMotion = useReducedMotion();
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const logoWidth = Math.min(windowWidth * 0.75, LOGO_MAX_WIDTH);

  // Animation shared values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const splashOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const patternOpacity = useSharedValue(0);

  // Layout dimensions (updated on mount for accuracy)
  const [dimensions, setDimensions] = useState({
    width: windowWidth,
    height: windowHeight,
  });

  // Default gradient — uses null prayer (neutral sky)
  const gradient = getAtmosphericGradient(null, false);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const notifyComplete = useCallback(() => {
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  useEffect(() => {
    if (!isVisible) return;

    // When reduced motion is preferred, skip all animations and show content immediately
    if (reducedMotion) {
      logoOpacity.value = 1;
      logoScale.value = 1;
      splashOpacity.value = 0;
      contentOpacity.value = 1;
      notifyComplete();
      return;
    }

    // Pattern fades in during silence phase — breath inhale rhythm
    patternOpacity.value = withTiming(patterns.opacity, {
      duration: breath.inhale,
      easing: breathEasing.inhale,
    });


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

  // Pattern layer opacity
  const patternAnimatedStyle = useAnimatedStyle(() => ({
    opacity: patternOpacity.value,
  }));

  // On web, skip the splash animation — the Animated.View wrappers
  // break Expo Router's LinkingContext on web.
  if (isWeb) {
    return <>{children}</>;
  }

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setDimensions({ width, height });
      }}
    >
      {/* App content (renders behind splash, fades in) */}
      <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
        {children}
      </Animated.View>

      {/* Splash overlay */}
      <Animated.View style={[styles.splashContainer, splashAnimatedStyle]}>
        {/* Atmospheric gradient background */}
        <SkiaAtmosphericGradient
          width={dimensions.width}
          height={dimensions.height}
          colors={gradient}
        />

        {/* Islamic pattern — fades in during silence */}
        <Animated.View style={[StyleSheet.absoluteFill, patternAnimatedStyle]}>
          <IslamicPattern
            width={dimensions.width}
            height={dimensions.height}
            color={isDark ? palette.sapphire400 : palette.sapphire700}
            opacity={1} // Opacity controlled by Animated.View wrapper
            tileSize={patterns.tileSize}
          />
        </Animated.View>

        {/* The logo — centered, fades in with scale */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]} accessibilityLabel="Mosque Connect">
          <Image
            source={require('@/assets/images/Masjid_Logo.png')}
            style={[
              { width: logoWidth, height: logoWidth * 0.6 },
              isDark && { tintColor: palette.snow },
            ]}
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
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
