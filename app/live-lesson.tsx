/**
 * LiveLessonPlayer — full-screen Mixlr player.
 *
 * Embeds the Mixlr player widget in a WebView, wrapped in a
 * themed container with Islamic pattern background and
 * mosque branding. Supports background audio playback.
 */

import React, { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, getElevation } from '@/constants/Theme';
import { IslamicPattern } from '@/components/brand/IslamicPattern';
import { MIXLR_EMBED_URL, MIXLR_CHANNEL_URL } from '@/lib/mixlr';

export default function LiveLessonScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const webViewRef = useRef<WebView>(null);
  const [webViewError, setWebViewError] = useState(false);

  const goldColor = isDark ? palette.divineGoldBright : palette.divineGold;

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleOpenExternal = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await WebBrowser.openBrowserAsync(MIXLR_CHANNEL_URL);
  };

  /**
   * Custom HTML wrapper for the Mixlr embed.
   * Ensures the player fits the WebView, matches the app theme,
   * and auto-enables inline media playback.
   */
  const embedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          width: 100%;
          height: 100%;
          background: ${isDark ? palette.sapphire950 : palette.stone100};
          overflow: hidden;
        }
        iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
      </style>
    </head>
    <body>
      <iframe
        src="${MIXLR_EMBED_URL}"
        allow="autoplay"
        scrolling="no"
        frameborder="0"
      ></iframe>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? palette.sapphire950 : palette.stone100 }]}>
      {/* Islamic pattern background — whisper opacity */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <IslamicPattern
          width={windowWidth}
          height={windowHeight}
          opacity={0.03}
          color={isDark ? palette.divineGoldBright : palette.sapphire700}
        />
      </View>

      {/* Header */}
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <Pressable
          onPress={handleClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.dismiss')}
          hitSlop={12}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.liveIndicatorRow}>
            <View style={styles.headerLiveDot} />
            <Text style={[styles.headerLiveLabel, { color: goldColor }]}>
              {t('liveLesson.live')}
            </Text>
          </View>
          <Text style={[typography.headline, { color: colors.text, textAlign: 'center' }]}>
            {t('liveLesson.title')}
          </Text>
        </View>

        <Pressable
          onPress={handleOpenExternal}
          style={styles.externalButton}
          accessibilityRole="link"
          accessibilityLabel={t('liveLesson.openInMixlr')}
          hitSlop={12}
        >
          <Ionicons name="open-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </Animated.View>

      {/* Player area */}
      <Animated.View
        entering={FadeIn.delay(100).duration(400)}
        style={[styles.playerContainer, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        {/* Branding */}
        <View style={styles.brandingSection}>
          <View style={[styles.brandIcon, { backgroundColor: isDark ? 'rgba(240, 208, 96, 0.12)' : 'rgba(166, 133, 35, 0.12)' }]}>
            <Ionicons name="radio-outline" size={32} color={goldColor} />
          </View>
          <Text style={[typography.title2, { color: colors.text, textAlign: 'center' }]}>
            {t('liveLesson.listeningLive')}
          </Text>
          <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center' }]}>
            {t('liveLesson.fromMasjid')}
          </Text>
        </View>

        {/* WebView embed player */}
        <View style={[styles.webViewWrapper, { ...getElevation('md', isDark), borderColor: isDark ? palette.sapphireSeparator : palette.separatorLight }]}>
          {!webViewError ? (
            <WebView
              ref={webViewRef}
              source={{ html: embedHtml }}
              style={[styles.webView, { backgroundColor: isDark ? palette.sapphire950 : palette.stone100 }]}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              allowsBackForwardNavigationGestures={false}
              scrollEnabled={false}
              bounces={false}
              onError={() => setWebViewError(true)}
              onHttpError={() => setWebViewError(true)}
              onShouldStartLoadWithRequest={(request) => {
                const url = request.url;
                if (url === 'about:blank' || url.startsWith('about:')) return true;
                try {
                  const { hostname } = new URL(url);
                  return hostname === 'mixlr.com' || hostname.endsWith('.mixlr.com');
                } catch {
                  return false;
                }
              }}
            />
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="cloud-offline-outline" size={40} color={colors.textTertiary} />
              <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
                {t('liveLesson.playerError')}
              </Text>
              <Pressable
                onPress={handleOpenExternal}
                style={[styles.fallbackButton, { backgroundColor: goldColor }]}
                accessibilityRole="button"
                accessibilityLabel={t('liveLesson.openInMixlr')}
              >
                <Text style={[typography.subheadMedium, { color: palette.white }]}>
                  {t('liveLesson.openInMixlr')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Attribution */}
        <Text style={[typography.caption1, { color: colors.textTertiary, textAlign: 'center' }]}>
          {t('liveLesson.poweredByMixlr')}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.divineGoldBright,
  },
  headerLiveLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  externalButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerContainer: {
    flex: 1,
    paddingHorizontal: spacing['3xl'],
    gap: spacing.xl,
  },
  brandingSection: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
  brandIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  webViewWrapper: {
    flex: 1,
    maxHeight: 300,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    borderRadius: borderRadius.lg,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    gap: spacing.md,
  },
  fallbackButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
});
