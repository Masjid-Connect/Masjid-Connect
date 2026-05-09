/**
 * UpdateBanner — soft tier of the version-check UX.
 *
 * A Glass overlay pinned above the tab bar. Renders only when the
 * version-check hook reports `urgency: 'soft'`. Tap CTA → opens the
 * platform store; tap ✕ → dismisses for 7 days (tracked via the
 * version-check lib).
 *
 * Design rules honoured:
 *   - Glass on overlays only (see DESIGN.md § Glass) — banner is a
 *     transient nudge, not content. Glass is appropriate.
 *   - No self-ascribed virtues, no Islamic vocabulary in copy.
 *   - Star-Gold accents only on the CTA — Indigo Ink as the surface.
 *   - Spring enter, no linear easing.
 */

import React, { useCallback, useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Glass } from '@/components/ui/Glass';
import { palette } from '@/constants/Colors';
import { borderRadius, spacing, springs, typography } from '@/constants/Theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Sentry } from '@/lib/sentry';
import { dismissSoftBanner } from '@/lib/version-check';

interface UpdateBannerProps {
  /** Store deep link to open when the user taps the CTA. */
  storeUrl: string;
  /** Called after the user dismisses or taps CTA. Parent removes the banner. */
  onDismiss: () => void;
  /** Distance from the bottom of the screen, in addition to safe-area inset.
   * Should equal the tab-bar content height (56) so the banner sits above it. */
  tabBarHeight?: number;
}

const TAB_CONTENT_HEIGHT = 56;
const BANNER_GAP = 8;

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  storeUrl,
  onDismiss,
  tabBarHeight = TAB_CONTENT_HEIGHT,
}) => {
  const { t } = useTranslation();
  const { effectiveScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = effectiveScheme === 'dark';

  const translateY = useSharedValue(40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, springs.gentle);
    opacity.value = withTiming(1, { duration: 220 });
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleDismiss = useCallback(async () => {
    opacity.value = withTiming(0, { duration: 150 });
    translateY.value = withSpring(40, springs.gentle);
    await dismissSoftBanner();
    onDismiss();
  }, [opacity, translateY, onDismiss]);

  const handleCta = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(storeUrl);
      if (supported) {
        await Linking.openURL(storeUrl);
      } else {
        Sentry.captureMessage('UpdateBanner: store URL not supported', {
          extra: { storeUrl },
        });
      }
    } catch (error) {
      Sentry.captureException(error, { extra: { context: 'UpdateBanner.handleCta', storeUrl } });
    }
    // Closing the banner on tap-through avoids re-prompting users who clearly
    // chose to update — the dismissal lasts 7 days.
    await handleDismiss();
  }, [storeUrl, handleDismiss]);

  const accentText = isDark ? palette.divineGoldBright : palette.divineGold;
  const titleColor = isDark ? palette.snow : palette.onyx900;
  const bodyColor = isDark ? palette.snowSecondary : palette.onyx600;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: tabBarHeight + insets.bottom + BANNER_GAP,
        },
        animatedStyle,
      ]}
      testID="update-banner"
    >
      <Glass variant="regular" scheme={effectiveScheme} style={styles.glass}>
        <View style={styles.row}>
          <Ionicons
            name="arrow-up-circle-outline"
            size={22}
            color={accentText}
            style={styles.icon}
          />
          <View style={styles.copy}>
            <Animated.Text
              style={[typography.subhead, { color: titleColor, fontWeight: '600' }]}
              numberOfLines={1}
            >
              {t('version_check.soft.title')}
            </Animated.Text>
            <Animated.Text style={[typography.caption1, { color: bodyColor }]} numberOfLines={2}>
              {t('version_check.soft.body')}
            </Animated.Text>
          </View>
          <Pressable
            onPress={handleCta}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={t('version_check.soft.cta')}
            testID="update-banner-cta"
          >
            <Animated.Text style={[typography.subhead, styles.ctaText, { fontWeight: '600' }]}>
              {t('version_check.soft.cta')}
            </Animated.Text>
          </Pressable>
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [styles.dismiss, { opacity: pressed ? 0.5 : 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel={t('version_check.dismiss_a11y_label')}
            hitSlop={8}
            testID="update-banner-dismiss"
          >
            <Ionicons name="close" size={18} color={bodyColor} />
          </Pressable>
        </View>
      </Glass>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  glass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    marginRight: 2,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  cta: {
    backgroundColor: palette.divineGold,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
  },
  ctaText: {
    color: palette.divineGoldText,
  },
  dismiss: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
