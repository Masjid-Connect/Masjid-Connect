/**
 * Solar Light System — Directional Sunlight Simulation
 *
 * Simulates subtle sunlight direction based on the current prayer time.
 * Instead of gradients only, the interface gets a light source.
 *
 * Fajr:    soft horizontal light from the horizon (bottom-left)
 * Sunrise: warm light rising (bottom-center)
 * Dhuhr:   overhead light, minimal shadow (top-center)
 * Asr:     angled warm light (right-center)
 * Maghrib: low orange light from the side (bottom-right)
 * Isha:    no light — deeper shadow
 *
 * The effect is visible and atmospheric (12–18% opacity).
 * The light should be noticeable — it makes each prayer feel distinct.
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import type { PrayerName } from '@/types';

interface SolarLightProps {
  /** Current prayer name — determines light position and warmth */
  prayer: PrayerName | null;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Whether dark mode is active (halves opacity for OLED) */
  isDark?: boolean;
}

/**
 * Light configuration per prayer.
 * Position is relative: 0 = left/top edge, 1 = right/bottom edge.
 */
interface LightConfig {
  /** Horizontal position (0–1) */
  x: number;
  /** Vertical position (0–1) */
  y: number;
  /** Light tint color */
  color: string;
  /** Base opacity (light mode) */
  opacity: number;
  /** Radius multiplier relative to canvas diagonal */
  radiusScale: number;
}

const LIGHT_CONFIGS: Record<string, LightConfig> = {
  fajr: {
    x: 0.2,
    y: 0.85,
    color: '#C8D8E4',   // cool steel dawn light
    opacity: 0.12,
    radiusScale: 0.7,
  },
  sunrise: {
    x: 0.5,
    y: 0.8,
    color: '#F0DCBE',   // warm golden
    opacity: 0.15,
    radiusScale: 0.75,
  },
  dhuhr: {
    x: 0.5,
    y: 0.15,
    color: '#F0EDE6',   // warm stone white
    opacity: 0.18,
    radiusScale: 0.8,
  },
  asr: {
    x: 0.8,
    y: 0.4,
    color: '#F0D8B0',   // amber afternoon
    opacity: 0.15,
    radiusScale: 0.7,
  },
  maghrib: {
    x: 0.85,
    y: 0.75,
    color: '#E8C0A0',   // low orange
    opacity: 0.12,
    radiusScale: 0.65,
  },
  isha: {
    x: 0.5,
    y: 0.5,
    color: '#000000',
    opacity: 0,          // no light at night
    radiusScale: 0,
  },
};

export const SolarLight = ({
  prayer,
  width,
  height,
  isDark = false,
}: SolarLightProps) => {
  const config = prayer ? LIGHT_CONFIGS[prayer] : null;

  if (!config || config.opacity === 0 || width === 0 || height === 0) {
    return null;
  }

  const centerX = width * config.x;
  const centerY = height * config.y;
  const diagonal = Math.sqrt(width * width + height * height);
  const radius = diagonal * config.radiusScale;
  const opacity = isDark ? config.opacity * 0.5 : config.opacity;

  // Web fallback — CSS radial gradient
  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            width,
            height,
            opacity,
            // @ts-expect-error — web-only CSS property
            background: `radial-gradient(circle at ${centerX}px ${centerY}px, ${config.color} 0%, transparent ${radius}px)`,
          },
        ]}
      />
    );
  }

  const { Canvas, Circle, RadialGradient, vec } = require('@shopify/react-native-skia');

  return (
    <Canvas
      style={[StyleSheet.absoluteFill, { width, height }]}
      pointerEvents="none"
    >
      <Circle cx={centerX} cy={centerY} r={radius} opacity={opacity}>
        <RadialGradient
          c={vec(centerX, centerY)}
          r={radius}
          colors={[config.color, 'transparent']}
          positions={[0, 1]}
        />
      </Circle>
    </Canvas>
  );
};
