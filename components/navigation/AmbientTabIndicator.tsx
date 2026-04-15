/**
 * Ambient Tab Bar — Soft Gradient Indicator
 *
 * Replaces the default Expo Router tab bar with one that has a soft
 * gradient undertone gliding between tabs. Instead of a static highlight,
 * the active tab gets a gentle radial glow that animates horizontally
 * when switching tabs.
 *
 * Light mode: Sacred Blue glow (~8% opacity)
 * Dark mode: Divine Gold Bright glow (~8% opacity)
 */

import React, { useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { getColors, getAlpha } from '@/constants/Colors';
import { springs, spacing, typography, components, fontWeight } from '@/constants/Theme';
import { useTheme } from '@/contexts/ThemeContext';

/** Glow indicator dimensions */
const GLOW_SIZE = components.tabGlow.size;
const GLOW_RADIUS = GLOW_SIZE / 2;
const GLOW_OPACITY = components.tabGlow.opacity;

export const AmbientTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const insets = useSafeAreaInsets();

  // Animated horizontal position of the glow
  const glowX = useSharedValue(0);

  // Update glow position when active tab changes
  useEffect(() => {
    // Will be set correctly once layout is measured
    glowX.value = withSpring(state.index, springs.gentle);
  }, [state.index]);

  // Track measured tab positions for precise glow placement
  const [tabLayouts, setTabLayouts] = React.useState<number[]>([]);

  const handleTabLayout = (index: number, x: number, width: number) => {
    setTabLayouts((prev) => {
      const next = [...prev];
      next[index] = x + width / 2;
      return next;
    });
  };

  // Animate glow to measured center position
  useEffect(() => {
    if (tabLayouts[state.index] !== undefined) {
      glowX.value = withSpring(tabLayouts[state.index], springs.gentle);
    }
  }, [state.index, tabLayouts]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: glowX.value - GLOW_RADIUS },
      { translateY: -GLOW_RADIUS / 2 },
    ],
  }));

  const alphaColors = getAlpha(effectiveScheme);
  const glowColor = isDark ? colors.accent : colors.tint;

  // Bottom padding must clear BOTH the iOS home indicator (34pt on
  // modern iPhones) AND the Android gesture navigation bar.
  //
  // Earlier revision trusted insets.bottom blindly when > 0. That
  // broke on Android gesture-nav devices: insets.bottom reports as
  // 16-20dp (just the visible hint bar), but the swipe-activation
  // zone extends further. Tab taps landed in the gesture zone.
  //
  // Fix: apply a platform-specific floor via Math.max so we always
  // clear the full system area, regardless of what insets reports.
  //   - iOS floor: 34pt (standard home-indicator reservation)
  //   - Android floor: 24dp (gesture-nav swipe safety)
  //   - Web: no floor, no gesture system to avoid
  const SAFE_FLOOR = Platform.select({ ios: 34, android: 24, default: 0 }) ?? 0;
  const bottomPadding = Platform.OS === 'web'
    ? spacing.xs
    : Math.max(insets.bottom, SAFE_FLOOR) + spacing.sm;

  // Tab content height (icons + labels + top padding) is fixed;
  // total bar height grows dynamically to include the safe area inset.
  const TAB_CONTENT_HEIGHT = Platform.OS === 'web' ? 56 : 56;
  const barHeight = TAB_CONTENT_HEIGHT + bottomPadding;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: alphaColors.frostedBg,
          height: barHeight,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      {/* Ambient glow — positioned absolutely behind tabs */}
      {Platform.OS === 'web' ? (
        <Animated.View
          style={[styles.glowContainer, glowAnimatedStyle]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.glowCanvas,
              {
                borderRadius: GLOW_RADIUS,
                opacity: GLOW_OPACITY,
                // @ts-expect-error — web-only CSS property
                background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
              },
            ]}
          />
        </Animated.View>
      ) : (
        <Animated.View style={[styles.glowContainer, glowAnimatedStyle]} pointerEvents="none">
          <SkiaGlow color={glowColor} />
        </Animated.View>
      )}

      {/* Tab buttons — filter out hidden tabs */}
      {state.routes
        .filter((route) => {
          const { options } = descriptors[route.key];
          const href = (options as Record<string, unknown>).href;
          // Expo Router sets href to null for hidden tabs
          if (href === null) return false;
          // Fallback: hide tabs with tabBarButton set to return null
          if (options.tabBarButton === null) return false;
          // Fallback: check tabBarStyle display none
          const style = options.tabBarItemStyle as Record<string, unknown> | undefined;
          if (style?.display === 'none') return false;
          return true;
        })
        .map((route) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const realIndex = state.routes.indexOf(route);
        const isFocused = state.index === realIndex;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const color = isFocused ? colors.tabIconSelected : colors.tabIconDefault;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              handleTabLayout(realIndex, x, width);
            }}
            style={styles.tab}
          >
            {options.tabBarIcon?.({
              focused: isFocused,
              color,
              size: 24,
            })}
            <Text
              style={[
                styles.label,
                { color },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

/** Skia glow — isolated to avoid import on web */
const SkiaGlow = ({ color }: { color: string }) => {
  const { Canvas, Circle, RadialGradient, vec } = require('@shopify/react-native-skia');
  return (
    <Canvas style={styles.glowCanvas}>
      <Circle cx={GLOW_RADIUS} cy={GLOW_RADIUS} r={GLOW_RADIUS} opacity={GLOW_OPACITY}>
        <RadialGradient
          c={vec(GLOW_RADIUS, GLOW_RADIUS)}
          r={GLOW_RADIUS}
          colors={[color, 'transparent']}
          positions={[0, 1]}
        />
      </Circle>
    </Canvas>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0,
    paddingTop: spacing.xs,
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  label: {
    fontSize: typography.caption2.fontSize,
    fontWeight: fontWeight.medium,
    marginTop: spacing['2xs'],
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    zIndex: 0,
  },
  glowCanvas: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
  },
});
