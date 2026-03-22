import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, springs, getElevation, components } from '@/constants/Theme';

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  maxHeight?: `${number}%` | number;
}

/** Velocity threshold (pts/s) at which a fling dismisses the sheet */
const DISMISS_VELOCITY = 500;
/** Distance threshold — if dragged more than 30% of sheet height, dismiss */
const DISMISS_FRACTION = 0.3;

export const BottomSheet = ({ visible, onDismiss, children, maxHeight }: BottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  // Track mounted state separately from visible to allow exit animation
  const [mounted, setMounted] = useState(false);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const dragY = useSharedValue(0);

  const performDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const animateOut = useCallback(() => {
    if (reducedMotion) {
      backdropOpacity.value = 0;
      translateY.value = SCREEN_HEIGHT;
      runOnJS(setMounted)(false);
      runOnJS(performDismiss)();
      return;
    }
    backdropOpacity.value = withTiming(0, { duration: 200 });
    translateY.value = withSpring(SCREEN_HEIGHT, springs.snappy, (finished) => {
      if (finished) {
        runOnJS(setMounted)(false);
        runOnJS(performDismiss)();
      }
    });
  }, [SCREEN_HEIGHT, translateY, backdropOpacity, performDismiss, reducedMotion]);

  // Mount when visible becomes true; animate out when it becomes false
  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (reducedMotion) {
        backdropOpacity.value = 1;
        translateY.value = 0;
      } else {
        backdropOpacity.value = withTiming(1, { duration: 200 });
        translateY.value = withSpring(0, springs.snappy);
      }
    } else if (mounted) {
      // visible turned false — play exit animation before unmounting
      animateOut();
    }
  }, [visible]);

  // Pan gesture for swipe-to-dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Only allow dragging downward
      dragY.value = Math.max(0, e.translationY);
      translateY.value = dragY.value;
      // Fade backdrop proportionally
      const progress = Math.min(dragY.value / (SCREEN_HEIGHT * 0.4), 1);
      backdropOpacity.value = 1 - progress;
    })
    .onEnd((e) => {
      const shouldDismiss =
        e.velocityY > DISMISS_VELOCITY ||
        dragY.value > SCREEN_HEIGHT * DISMISS_FRACTION;

      if (shouldDismiss) {
        runOnJS(animateOut)();
      } else {
        // Snap back
        translateY.value = withSpring(0, springs.snappy);
        backdropOpacity.value = withTiming(1, { duration: 150 });
      }
      dragY.value = 0;
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={animateOut} accessibilityRole="button" accessibilityLabel="Dismiss">
        <Animated.View
          style={[
            styles.backdrop,
            backdropStyle,
          ]}
        />
      </Pressable>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          accessibilityViewIsModal={true}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + spacing.lg,
              maxHeight: maxHeight || '85%',
              ...getElevation('lg', isDark),
            },
            sheetStyle,
          ]}
        >
          {/* Grabber handle */}
          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: colors.textTertiary }]} />
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            bounces={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.backdrop,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  grabberRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  grabber: {
    width: components.grabber.width,
    height: components.grabber.height,
    borderRadius: components.grabber.height / 2,
    opacity: 0.3,
  },
  content: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing.lg,
  },
});
