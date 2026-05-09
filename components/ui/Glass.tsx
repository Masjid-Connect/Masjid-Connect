/**
 * Glass — Apple Liquid Glass approximation for React Native.
 *
 * Wraps `expo-blur` BlurView with the discipline Apple publishes for
 * Liquid Glass on iOS 26+:
 *
 *   - Glass belongs to the NAVIGATION / OVERLAY layer only — tab bars,
 *     toolbars, sheet headers, toasts, popovers, FABs. Never on content
 *     rows, body text, or scrollable surfaces.
 *   - Two production variants: `regular` (default for everything) and
 *     `clear` (only over rich media, paired with a dimming layer).
 *   - Tinting is SEMANTIC, not decorative. We expose two semantic
 *     tints used across this app: `tint-gold` (divine accent) and
 *     `tint-crimson` (urgent only).
 *   - Respects `AccessibilityInfo.isReduceTransparencyEnabled()` —
 *     when on, falls back to a solid surface (Apple's own pattern).
 *
 * Forward path: when an iOS-26-only native bridge to UIGlassEffect
 * lands, swap the implementation here without changing the API.
 *
 * See `projects/mosque-connect/DESIGN.md` § Glass for the rules and
 * `context/celestial-ink-glass-apple.html` for the visual reference.
 */

import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';

import { palette } from '@/constants/Colors';

export type GlassVariant = 'regular' | 'clear' | 'tint-gold' | 'tint-crimson';

interface GlassProps {
  variant?: GlassVariant;
  /** Force light/dark blur regardless of theme — defaults to scheme inference. */
  scheme?: 'light' | 'dark';
  /** Override the blur intensity (0-100). Defaults are tuned per variant. */
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Test ID for unit tests / accessibility tooling. */
  testID?: string;
}

/** Default intensities per variant — matches Apple's apparent material density. */
const DEFAULT_INTENSITY: Record<GlassVariant, number> = {
  regular: 80,
  clear: 36, // .clear is permanently transparent — much lower blur
  'tint-gold': 70,
  'tint-crimson': 70,
};

/** Tint overlay applied above the blur for semantic-tinted variants. */
const TINT_OVERLAY: Record<GlassVariant, string | null> = {
  regular: null,
  clear: null,
  'tint-gold': 'rgba(212, 175, 90, 0.18)',     // gilt at low alpha
  'tint-crimson': 'rgba(185, 28, 28, 0.16)',   // crimson600 at low alpha
};

/** Solid fallback when Reduce Transparency is on. */
function solidFallbackBackground(variant: GlassVariant, scheme: 'light' | 'dark'): string {
  if (variant === 'tint-gold') return scheme === 'dark' ? palette.sapphire850 : palette.stone200;
  if (variant === 'tint-crimson') return scheme === 'dark' ? palette.sapphire900 : palette.stone200;
  return scheme === 'dark' ? palette.sapphire900 : palette.stone200;
}

export const Glass = ({
  variant = 'regular',
  scheme = 'dark',
  intensity,
  style,
  children,
  testID,
}: GlassProps) => {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((on) => mounted && setReduceTransparency(on))
      .catch(() => {
        // No-op: feature unsupported on platform/web — assume off.
      });
    const sub = AccessibilityInfo.addEventListener?.(
      'reduceTransparencyChanged',
      (on) => mounted && setReduceTransparency(on),
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  // ─── Solid fallback ─────────────────────────────────────────────
  // Apple's published behaviour: when Reduce Transparency is enabled,
  // glass surfaces become opaque. Mirroring it keeps us legible for
  // users who chose the accessibility setting.
  if (reduceTransparency) {
    return (
      <View
        testID={testID}
        style={[
          { backgroundColor: solidFallbackBackground(variant, scheme) },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // ─── Web fallback ───────────────────────────────────────────────
  // expo-blur on RN-Web uses CSS backdrop-filter; some older browsers
  // don't support it. Render a translucent fill as a baseline so the
  // surface still reads correctly in those browsers.
  const webFallbackBg =
    Platform.OS === 'web'
      ? scheme === 'dark'
        ? 'rgba(11, 19, 38, 0.55)'
        : 'rgba(255, 255, 255, 0.7)'
      : 'transparent';

  const blurTint: 'light' | 'dark' = scheme;
  const blurIntensity = intensity ?? DEFAULT_INTENSITY[variant];
  const tintOverlay = TINT_OVERLAY[variant];

  return (
    <View testID={testID} style={[{ backgroundColor: webFallbackBg, overflow: 'hidden' }, style]}>
      <BlurView
        tint={blurTint}
        intensity={blurIntensity}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {tintOverlay ? (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: tintOverlay }]}
          pointerEvents="none"
        />
      ) : null}
      {children}
    </View>
  );
};
