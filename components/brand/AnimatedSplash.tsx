/**
 * Animated Splash Screen — The Reveal
 *
 * The screen is pure, unadorned Kozo paper for a full second. Silence.
 *
 * With a haptic impact(Medium), the single hair-thin line of the mark
 * is drawn in Sacred Blue over 1.5 seconds — a vector draw, as if an
 * invisible hand is tracing the geometry on the paper. Clean, fast,
 * confident.
 *
 * The moment the line completes and the two ends meet at the apex,
 * there's a microscopic pause. Then the matte gold node fades in at
 * the convergence point with a soft spring animation.
 *
 * The app content subtly fades in around it.
 */

import React, { useCallback, useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { palette } from '@/constants/Colors';
import {
  ARCH_APEX,
  ARCH_PATH,
  ARCH_PATH_LENGTH,
  ARCH_VIEWBOX,
} from '@/components/brand/ConvergentArch';
import { springs } from '@/constants/Theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Mark size on splash — large and centered */
const MARK_SIZE = Math.min(SCREEN_WIDTH * 0.45, 200);
const MARK_ASPECT = ARCH_VIEWBOX.width / ARCH_VIEWBOX.height;
const MARK_WIDTH = MARK_SIZE * MARK_ASPECT;

/** Timing constants (ms) */
const PAUSE_BEFORE_DRAW = 1000;
const DRAW_DURATION = 1500;
const PAUSE_AFTER_DRAW = 200;
const GOLD_FADE_DURATION = 600;
const CONTENT_FADE_DELAY = 400;
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
  // Animation shared values
  const drawProgress = useSharedValue(0);
  const goldNodeOpacity = useSharedValue(0);
  const goldNodeScale = useSharedValue(0.3);
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

    // Phase 1: Pure paper, silence (1 second)
    // Phase 2: Haptic + draw the line (1.5 seconds)
    drawProgress.value = withDelay(
      PAUSE_BEFORE_DRAW,
      withTiming(1, {
        duration: DRAW_DURATION,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    // Trigger haptic at the start of drawing
    const hapticTimeout = setTimeout(() => {
      triggerHaptic();
    }, PAUSE_BEFORE_DRAW);

    // Phase 3: Gold node appears after line completes
    const goldDelay = PAUSE_BEFORE_DRAW + DRAW_DURATION + PAUSE_AFTER_DRAW;

    goldNodeOpacity.value = withDelay(
      goldDelay,
      withTiming(1, { duration: GOLD_FADE_DURATION })
    );

    goldNodeScale.value = withDelay(
      goldDelay,
      withSpring(1, {
        ...springs.gentle,
        stiffness: 120,
      })
    );

    // Phase 4: Splash fades out, content fades in
    const contentDelay = goldDelay + CONTENT_FADE_DELAY;

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

  // Animated props for the SVG path stroke drawing
  const pathAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: ARCH_PATH_LENGTH * (1 - drawProgress.value),
  }));

  // Animated props for the gold node
  const goldAnimatedProps = useAnimatedProps(() => ({
    opacity: goldNodeOpacity.value,
    r: 4 * goldNodeScale.value,
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

        {/* The mark — centered */}
        <View style={styles.markContainer}>
          <Svg
            width={MARK_WIDTH}
            height={MARK_SIZE}
            viewBox={`0 0 ${ARCH_VIEWBOX.width} ${ARCH_VIEWBOX.height}`}
          >
            {/* The convergent arch line — drawn via stroke animation */}
            <AnimatedPath
              d={ARCH_PATH}
              stroke={palette.sacredBlue}
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={ARCH_PATH_LENGTH}
              animatedProps={pathAnimatedProps}
            />

            {/* The gold node at the apex */}
            <AnimatedCircle
              cx={ARCH_APEX.x}
              cy={ARCH_APEX.y}
              fill={palette.divineGold}
              animatedProps={goldAnimatedProps}
            />
          </Svg>
        </View>
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
  markContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
