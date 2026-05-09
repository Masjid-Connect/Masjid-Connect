/**
 * UpdateBlocker — block tier of the version-check UX.
 *
 * Full-screen takeover. Renders only when the version-check hook reports
 * `urgency: 'block'` — i.e. the installed version is below the server's
 * configured minimum AND the policy is `below_minimum: 'block'`. Reserved
 * for break-glass events (security incident, contract break).
 *
 * Design rules honoured:
 *   - NO Glass — this is content, not navigation/overlay (DESIGN.md § Glass).
 *   - Indigo Ink surface, Sora display heading, Star-Gold CTA only.
 *   - Calm palette: no red, no alarms, no guilt copy (Dr Fadwa).
 *   - accessibilityViewIsModal so screen readers treat the screen as a
 *     modal and trap focus.
 *   - The user cannot dismiss; the only way forward is to update.
 */

import React, { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { palette } from '@/constants/Colors';
import { borderRadius, spacing, typography } from '@/constants/Theme';
import { Sentry } from '@/lib/sentry';

interface UpdateBlockerProps {
  /** Store deep link to open when the user taps the CTA. */
  storeUrl: string;
}

export const UpdateBlocker: React.FC<UpdateBlockerProps> = ({ storeUrl }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleCta = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(storeUrl);
      if (supported) {
        await Linking.openURL(storeUrl);
      } else {
        Sentry.captureMessage('UpdateBlocker: store URL not supported', {
          extra: { storeUrl },
        });
      }
    } catch (error) {
      Sentry.captureException(error, { extra: { context: 'UpdateBlocker.handleCta', storeUrl } });
    }
  }, [storeUrl]);

  // Both light and dark schemes show the same calm Indigo Ink surface here.
  // The blocker is rare and ought to feel like a quiet wall, not a system
  // alert that adapts to the time of day.
  return (
    <View
      style={[
        styles.surface,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      accessibilityViewIsModal
      accessibilityRole="alert"
      testID="update-blocker"
    >
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Ionicons name="arrow-up-circle-outline" size={42} color={palette.divineGoldBright} />
        </View>

        <Text style={[typography.title1, styles.title]} accessibilityRole="header">
          {t('version_check.block.title')}
        </Text>

        <Text style={[typography.body, styles.body]}>
          {t('version_check.block.body')}
        </Text>

        <Pressable
          onPress={handleCta}
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={t('version_check.block.cta')}
          testID="update-blocker-cta"
        >
          <Text style={[typography.headline, styles.ctaText]}>
            {t('version_check.block.cta')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  surface: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: palette.sapphire950, // Celestial Ink Indigo
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: palette.divineGoldBright,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: palette.snow,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    color: palette.snowSecondary,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: spacing.xl + spacing.md,
  },
  cta: {
    backgroundColor: palette.divineGoldBright,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl + spacing.md,
    borderRadius: borderRadius.full,
    minWidth: 240,
    alignItems: 'center',
  },
  ctaText: {
    color: palette.sapphire950,
    fontWeight: '700',
  },
});
