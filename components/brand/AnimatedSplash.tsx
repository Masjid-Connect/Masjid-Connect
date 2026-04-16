/**
 * Animated Splash Screen — The Reveal
 *
 * Full Sapphire-950 backdrop. An Islamic geometric pattern
 * breathes in at whisper opacity. A Divine Gold radial glow
 * pulses softly behind the logo. The logo emerges with a
 * gentle spring scale — then a gold shimmer sweeps across
 * the text like light catching gilded calligraphy.
 *
 * Haptic impact(Medium) fires at the moment of reveal.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { palette } from '@/constants/Colors';
import { springs, borderRadius } from '@/constants/Theme';
import { patterns } from '@/lib/layoutGrid';
import { breath, breathEasing } from '@/lib/breathMotion';
import { IslamicPattern } from './IslamicPattern';

/** Logo max width cap — the horizontal wordmark (Arabic + English) sits
 *  comfortably at 360 on phones, doesn't dominate like the square SVG did. */
const LOGO_MAX_WIDTH = 360;
/** Wordmark aspect ratio — height is 60% of width. */
const LOGO_ASPECT = 0.6;

/** Timing constants (ms) */
const PAUSE_BEFORE_REVEAL = 500;
const LOGO_FADE_DURATION = 1200;
const HOLD_DURATION = 700;
const CONTENT_FADE_DURATION = 800;
const SHIMMER_DURATION = 1400;

/** Glow sizing relative to logo — tightened to sit on the wordmark
 *  text only (not radiate as a wide background halo). User 2026-04-16:
 *  'the glow should only be on the words'. 1.1 gives a soft bleed
 *  just past the letterforms without spreading across the whole screen. */
const GLOW_SCALE = 1.1;

interface AnimatedSplashProps {
  /** Called when the splash animation is complete and content should appear */
  onAnimationComplete?: () => void;
  /** Whether to show the splash (controls visibility) */
  isVisible: boolean;
  /** Children (app content) rendered behind/after the splash */
  children: React.ReactNode;
}

/**
 * Skia radial glow — a soft Divine Gold light behind the logo.
 * Pulses gently between 0.0 and 0.12 opacity with spring rhythm.
 */
const GoldenGlow = ({
  width,
  height,
  glowWidth,
  glowHeight,
}: {
  width: number;
  height: number;
  glowWidth: number;
  glowHeight: number;
}) => {
  if (Platform.OS === 'web') return null;

  const { Canvas, Circle, RadialGradient, vec } = require('@shopify/react-native-skia');
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(glowWidth, glowHeight) / 2;

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Circle cx={cx} cy={cy} r={radius}>
        <RadialGradient
          c={vec(cx, cy)}
          r={radius}
          colors={[
            'rgba(240, 208, 96, 0.40)',  // Divine Gold center — concentrated on the text
            'rgba(240, 208, 96, 0.12)',  // Tight mid fade
            'rgba(240, 208, 96, 0.0)',   // Clean transparent edge
          ]}
          positions={[0, 0.4, 0.85]}
        />
      </Circle>
    </Canvas>
  );
};

/**
 * Shimmer sweep — a diagonal highlight that sweeps across the logo area.
 * Uses a masked linear gradient to create a "light catching gold" effect.
 */
const ShimmerSweep = ({
  width,
  height,
  shimmerX,
}: {
  width: number;
  height: number;
  shimmerX: SharedValue<number>;
}) => {
  // Hook must be called unconditionally (rules-of-hooks); web early-return follows.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  if (Platform.OS === 'web') return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: width * 0.4,
          height: height,
          left: -width * 0.4,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <ShimmerGradient width={width * 0.4} height={height} />
    </Animated.View>
  );
};

const ShimmerGradient = ({ width, height }: { width: number; height: number }) => {
  if (Platform.OS === 'web') return null;

  const { Canvas, Rect, LinearGradient, vec } = require('@shopify/react-native-skia');

  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, 0)}
          colors={[
            'rgba(240, 208, 96, 0.0)',
            'rgba(240, 208, 96, 0.22)',
            'rgba(240, 208, 96, 0.0)',
          ]}
        />
      </Rect>
    </Canvas>
  );
};

export const AnimatedSplash = ({
  onAnimationComplete,
  isVisible,
  children,
}: AnimatedSplashProps) => {
  const isWeb = Platform.OS === 'web';
  const reducedMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // Bigger logo presence per "full-screen splash" direction. Capped at
  // min(viewport shorter edge) × 0.85 to never spill off any orientation,
  // and at LOGO_MAX_WIDTH on very large screens so it doesn't dwarf on tablets.
  const shortEdge = Math.min(windowWidth, windowHeight);
  const logoWidth = Math.min(windowWidth * 0.7, shortEdge * 0.85, LOGO_MAX_WIDTH);

  // Animation shared values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const splashOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const patternOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const shimmerX = useSharedValue(0);

  // Layout dimensions (updated on mount for accuracy)
  const [dimensions, setDimensions] = useState({
    width: windowWidth,
    height: windowHeight,
  });

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

    // Phase 2: Gold glow fades in, then logo reveals with spring
    const logoSpring = { ...springs.gentle, stiffness: 80, damping: 20 };

    // Glow appears slightly before logo
    glowOpacity.value = withDelay(
      PAUSE_BEFORE_REVEAL - 200,
      withSpring(1, { ...springs.gentle, stiffness: 60 }),
    );

    // Logo fades in with gentle scale
    logoOpacity.value = withDelay(PAUSE_BEFORE_REVEAL, withSpring(1, logoSpring));
    logoScale.value = withDelay(PAUSE_BEFORE_REVEAL, withSpring(1, logoSpring));

    // Trigger haptic at the start of reveal
    const hapticTimeout = setTimeout(() => {
      triggerHaptic();
    }, PAUSE_BEFORE_REVEAL);

    // Phase 2.5: Shimmer sweep across logo after it's visible
    const shimmerDelay = PAUSE_BEFORE_REVEAL + LOGO_FADE_DURATION * 0.6;
    const shimmerTravel = windowWidth * 1.8; // full sweep distance
    shimmerX.value = withDelay(
      shimmerDelay,
      withTiming(shimmerTravel, {
        duration: SHIMMER_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
    );

    // Glow pulses gently after initial reveal (2 soft pulses)
    const pulseDelay = PAUSE_BEFORE_REVEAL + LOGO_FADE_DURATION * 0.8;
    const pulseTimeout = setTimeout(() => {
      glowOpacity.value = withSequence(
        withSpring(1.3, { ...springs.gentle, stiffness: 40 }),
        withSpring(0.8, { ...springs.gentle, stiffness: 40 }),
        withSpring(1, { ...springs.gentle, stiffness: 40 }),
      );
    }, pulseDelay);

    // Phase 3: Hold, then splash fades out and content fades in
    const contentDelay = PAUSE_BEFORE_REVEAL + LOGO_FADE_DURATION + HOLD_DURATION;
    const fadeSpring = { ...springs.gentle, stiffness: 60, damping: 18 };

    splashOpacity.value = withDelay(contentDelay, withSpring(0, fadeSpring));
    contentOpacity.value = withDelay(contentDelay, withSpring(1, fadeSpring));

    // Notify completion
    const completeTimeout = setTimeout(() => {
      notifyComplete();
    }, contentDelay + CONTENT_FADE_DURATION);

    return () => {
      clearTimeout(hapticTimeout);
      clearTimeout(pulseTimeout);
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

  // Glow layer opacity (animated for pulse)
  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Wordmark is horizontal (aspect 0.6), so the glow follows that shape.
  const glowWidth = logoWidth * GLOW_SCALE;
  const glowHeight = logoWidth * LOGO_ASPECT * GLOW_SCALE;

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

      {/* Splash overlay — full Sapphire-950 */}
      <Animated.View style={[styles.splashContainer, splashAnimatedStyle]}>
        {/* Islamic pattern — fades in during silence */}
        <Animated.View style={[StyleSheet.absoluteFill, patternAnimatedStyle]}>
          <IslamicPattern
            width={dimensions.width}
            height={dimensions.height}
            color={palette.sapphire400}
            opacity={1} // Opacity controlled by Animated.View wrapper
            tileSize={patterns.tileSize}
          />
        </Animated.View>

        {/* Divine Gold radial glow — pulses softly behind logo */}
        <Animated.View style={[styles.glowContainer, glowAnimatedStyle]}>
          <GoldenGlow
            width={glowWidth}
            height={glowHeight}
            glowWidth={glowWidth}
            glowHeight={glowHeight}
          />
        </Animated.View>

        {/* The logo — centered, fades in with scale.
            Horizontal wordmark (Masjid_Logo.png — Arabic + English),
            tinted snow so it reads bright on the midnight backdrop. */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]} accessibilityLabel="The Salafi Masjid">
          {/* Shimmer sweep layer — sized to the wordmark aspect */}
          <View style={[styles.shimmerClip, { width: logoWidth, height: logoWidth * LOGO_ASPECT }]}>
            <ShimmerSweep
              width={logoWidth}
              height={logoWidth * LOGO_ASPECT}
              shimmerX={shimmerX}
            />
          </View>

          <Image
            source={require('@/assets/images/Masjid_Logo.png')}
            style={{ width: logoWidth, height: logoWidth * LOGO_ASPECT, tintColor: palette.snow }}
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
    backgroundColor: palette.sapphire950,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmerClip: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: borderRadius.sm,
  },
});
