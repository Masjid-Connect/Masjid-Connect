/**
 * Breath Animation System
 *
 * All ambient motion across the app follows breathing timing
 * instead of generic easing. The UI feels calm instead of reactive.
 *
 * Springs (Theme.ts) → interactive responses (drag, press, list entry)
 * Breath (this file) → ambient transitions (glow, gradient, pattern)
 *
 * Cycle: inhale (expand/brighten) → hold → exhale (contract/dim) → hold
 */

import {
  Easing,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/** Breathing rhythm durations (ms) */
export const breath = {
  /** Expansion / brightening phase */
  inhale: 900,
  /** Peak plateau */
  hold: 200,
  /** Contraction / dimming phase */
  exhale: 1100,
  /** Full cycle: inhale + hold + exhale + hold */
  full: 2400,
} as const;

/**
 * Easing curves tuned for organic breathing feel.
 * Inhale accelerates gently, exhale decelerates slowly.
 */
export const breathEasing = {
  inhale: Easing.bezier(0.4, 0.0, 0.2, 1),
  exhale: Easing.bezier(0.0, 0.0, 0.2, 1),
} as const;

/**
 * Animate a shared value through a continuous breathing cycle.
 *
 * The value oscillates between `min` and `max`:
 *   min → max (inhale) → hold → max → min (exhale) → hold → repeat
 *
 * @param sv    - Reanimated SharedValue to animate
 * @param min   - Resting value (default 0)
 * @param max   - Peak value (default 1)
 *
 * @example
 * ```ts
 * const glowOpacity = useSharedValue(0.6);
 * useEffect(() => {
 *   withBreathing(glowOpacity, 0.6, 1);
 * }, []);
 * ```
 */
export function withBreathing(
  sv: SharedValue<number>,
  min: number = 0,
  max: number = 1,
): void {
  sv.value = withRepeat(
    withSequence(
      // Inhale: min → max
      withTiming(max, {
        duration: breath.inhale,
        easing: breathEasing.inhale,
      }),
      // Hold at peak
      withTiming(max, {
        duration: breath.hold,
        easing: Easing.linear,
      }),
      // Exhale: max → min
      withTiming(min, {
        duration: breath.exhale,
        easing: breathEasing.exhale,
      }),
      // Hold at rest
      withTiming(min, {
        duration: breath.hold,
        easing: Easing.linear,
      }),
    ),
    -1, // infinite repeat
    false, // do not reverse — the sequence handles directionality
  );
}
