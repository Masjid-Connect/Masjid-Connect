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
import { getColors } from '@/constants/Colors';
import { springs, spacing, typography } from '@/constants/Theme';
import { useTheme } from '@/contexts/ThemeContext';
import { layout } from '@/lib/layoutGrid';

/** Glow indicator dimensions */
const GLOW_SIZE = 64;
const GLOW_RADIUS = GLOW_SIZE / 2;
const GLOW_OPACITY = 0.08;

export const AmbientTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const insets = useSafeAreaInsets();

  const tabCount = state.routes.length;

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

  const glowColor = isDark ? colors.accent : colors.tint;

  const barHeight = layout.tabBarHeight;
  const bottomPadding = Platform.OS === 'ios' ? insets.bottom : spacing.sm;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(248,246,241,0.85)',
          height: barHeight,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      {/* Ambient glow — positioned absolutely behind tabs */}
      {Platform.OS !== 'web' && (
        <Animated.View style={[styles.glowContainer, glowAnimatedStyle]} pointerEvents="none">
          <SkiaGlow color={glowColor} />
        </Animated.View>
      )}

      {/* Tab buttons */}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;

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
              handleTabLayout(index, x, width);
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
    fontWeight: '500',
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
