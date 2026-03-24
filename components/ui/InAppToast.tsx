import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { getAlpha, getColors, palette } from '@/constants/Colors';
import { borderRadius, getElevation, spacing, springs, typography } from '@/constants/Theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast, type ToastMessage, type ToastType } from '@/contexts/ToastContext';

// ── Accent colour mapping ───────────────────────────────────────────

function getAccentColor(type: ToastType, isDark: boolean): string {
  switch (type) {
    case 'prayer':
    case 'athan':
    case 'donation':
      return isDark ? palette.divineGoldBright : palette.divineGold;
    case 'announcement':
      return isDark ? palette.sapphire400 : palette.sapphire700;
    case 'urgent':
      return isDark ? palette.crimson400 : palette.crimson600;
    case 'event':
    case 'success':
      return isDark ? palette.sage400 : palette.sage600;
  }
}

// ── Haptic feedback ─────────────────────────────────────────────────

function fireHaptic(haptic: ToastMessage['haptic']) {
  switch (haptic) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'none':
    default:
      break;
  }
}

// ── Component ───────────────────────────────────────────────────────

const DISMISS_THRESHOLD = 30;
const SLIDE_DISTANCE = 120;

export const InAppToast = () => {
  const { currentToast, dismissToast } = useToast();
  const { effectiveScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = effectiveScheme === 'dark';
  const colors = getColors(effectiveScheme);
  const alphaColors = getAlpha(effectiveScheme);

  const translateY = useSharedValue(-SLIDE_DISTANCE);
  const opacity = useSharedValue(0);
  const panOffset = useSharedValue(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevToastId = useRef<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    clearTimer();
    opacity.value = withTiming(0, { duration: 150 });
    translateY.value = withSpring(-SLIDE_DISTANCE, springs.gentle, () => {
      runOnJS(dismissToast)();
    });
  }, [clearTimer, dismissToast, opacity, translateY]);

  // ── Show / hide on toast change ───────────────────────────────────

  useEffect(() => {
    if (currentToast && currentToast.id !== prevToastId.current) {
      prevToastId.current = currentToast.id;
      clearTimer();

      // Reset position and enter
      panOffset.value = 0;
      translateY.value = -SLIDE_DISTANCE;
      opacity.value = 0;

      // Enter animation
      translateY.value = withSpring(0, springs.snappy);
      opacity.value = withTiming(1, { duration: 200 });

      // Haptic
      fireHaptic(currentToast.haptic);

      // Auto-dismiss (0 = sticky)
      const duration = currentToast.duration ?? 0;
      if (duration > 0) {
        timerRef.current = setTimeout(handleDismiss, duration);
      }
    } else if (!currentToast && prevToastId.current) {
      prevToastId.current = null;
      clearTimer();
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withSpring(-SLIDE_DISTANCE, springs.gentle);
    }
  }, [currentToast, clearTimer, handleDismiss, translateY, opacity, panOffset]);

  // Clean up timer on unmount
  useEffect(() => clearTimer, [clearTimer]);

  // ── Swipe-up-to-dismiss via PanResponder ──────────────────────────

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, gesture) =>
          // Claim if vertical movement exceeds horizontal (swipe up)
          Math.abs(gesture.dy) > Math.abs(gesture.dx) && Math.abs(gesture.dy) > 5,
        onPanResponderMove: (_e, gesture) => {
          // Only allow upward drag
          panOffset.value = Math.min(0, gesture.dy);
        },
        onPanResponderRelease: (_e, gesture) => {
          if (gesture.dy < -DISMISS_THRESHOLD || gesture.vy < -0.5) {
            handleDismiss();
          } else {
            // Snap back
            panOffset.value = withSpring(0, springs.snappy);
          }
        },
      }),
    [handleDismiss, panOffset],
  );

  // ── Animated styles ───────────────────────────────────────────────

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + panOffset.value }],
    opacity: opacity.value,
  }));

  if (!currentToast) return null;

  const accent = getAccentColor(currentToast.type, isDark);
  const isUrgent = currentToast.type === 'urgent';

  return (
    <View
      style={[styles.wrapper, { top: insets.top + spacing.sm }]}
      pointerEvents="box-none"
    >
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          {
            backgroundColor: isUrgent ? alphaColors.urgentBgEmphasis : alphaColors.frostedBg,
            ...getElevation('md', isDark),
            ...(isUrgent && {
              borderWidth: 1,
              borderColor: isDark ? palette.crimson400 : palette.crimson600,
            }),
          },
          containerStyle,
        ]}
        accessibilityRole="alert"
        accessibilityLiveRegion={isUrgent ? 'assertive' : 'polite'}
      >
        <Pressable
          style={styles.pressable}
          onPress={() => {
            currentToast.onPress?.();
            handleDismiss();
          }}
        >
          {/* Accent dot */}
          <View style={[styles.dot, { backgroundColor: accent }]} />

          {/* Text content */}
          <View style={styles.textContainer}>
            <Animated.Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {currentToast.title}
            </Animated.Text>
            {currentToast.subtitle ? (
              <Animated.Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {currentToast.subtitle}
              </Animated.Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
  },
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius['3xs'],
    marginEnd: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.headline,
  },
  subtitle: {
    ...typography.subhead,
    marginTop: spacing['2xs'],
  },
});
