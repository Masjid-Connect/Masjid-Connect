import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { palette } from '@/constants/Colors';
import { AnimatedSplash } from '@/components/brand/AnimatedSplash';
import { InAppToast } from '@/components/ui/InAppToast';
import { ErrorFallback } from '@/components/ui/ErrorFallback';
import { WebContainer } from '@/components/ui/WebContainer';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import { reschedulePrayerRemindersForToday, addNotificationReceivedListener, addNotificationResponseListener } from '@/lib/notifications';
import { initSentry, Sentry } from '@/lib/sentry';
import '@/lib/i18n';

// Initialize Sentry before anything else renders
initSentry();

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const MosqueLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.sapphire700,
    background: palette.stone100,
    card: palette.white,
    text: palette.onyx900,
    border: palette.separatorLight,
    notification: palette.divineGold,
  },
};

const MosqueDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.divineGoldBright,
    background: palette.sapphire950,
    card: palette.sapphire850,
    text: palette.snow,
    border: palette.separatorDark,
    notification: palette.divineGoldBright,
  },
};

function RootLayout() {
  const { t } = useTranslation();
  // Fraunces is the display face — applied only to prayer countdown,
  // prayer names, and screen titles per DESIGN.md § Typography.
  // System fonts carry body and UI.
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Fraunces-Light': require('@expo-google-fonts/fraunces/300Light/Fraunces_300Light.ttf'),
    'Fraunces-Regular': require('@expo-google-fonts/fraunces/400Regular/Fraunces_400Regular.ttf'),
    'Fraunces-Medium': require('@expo-google-fonts/fraunces/500Medium/Fraunces_500Medium.ttf'),
    'Fraunces-SemiBold': require('@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf'),
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reschedulePrayerRemindersForToday().catch((err) => {
          Sentry.captureException(err, { extra: { context: 'prayer reminder reschedule' } });
        });
    });
    return () => sub.remove();
  }, []);

  // Check for OTA updates when app comes to foreground
  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web') return;

    async function checkForUpdate() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            t('common.updateAvailable'),
            t('common.updateMessage'),
            [
              { text: t('common.updateLater'), style: 'cancel' },
              { text: t('common.updateRestart'), onPress: () => Updates.reloadAsync() },
            ],
          );
        }
      } catch (err) {
        // Update check is best-effort, but log to Sentry for visibility
        Sentry.captureException(err, { extra: { context: 'OTA update check' } });
      }
    }

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkForUpdate();
    });
    // Also check on initial mount
    checkForUpdate();
    return () => sub.remove();
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WebContainer>
        <Sentry.ErrorBoundary fallback={({ error, resetError }) => (
          <ErrorFallback error={error} resetError={resetError} />
        )}>
          <AuthProvider>
            <AnimatedSplash isVisible={showSplash} onAnimationComplete={handleSplashComplete}>
              <AppThemeProvider>
                <ToastProvider>
                  <RootLayoutNav />
                  <InAppToast />
                </ToastProvider>
              </AppThemeProvider>
            </AnimatedSplash>
          </AuthProvider>
        </Sentry.ErrorBoundary>
      </WebContainer>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

function RootLayoutNav() {
  const { effectiveScheme } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();

  // Show in-app toast when notification arrives while foregrounded
  useEffect(() => {
    const sub = addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      const dataType = (data as Record<string, unknown>)?.type;

      const type = dataType === 'prayer_athan' ? 'athan' as const
        : dataType === 'prayer_reminder' ? 'prayer' as const
        : 'announcement' as const;

      showToast({
        type,
        title: title ?? '',
        subtitle: body ?? undefined,
      });
    });
    return () => sub.remove();
  }, [showToast]);

  // Deep-link when user taps a push notification
  useEffect(() => {
    const sub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      if (!data?.type) return;

      if (data.type === 'announcement') {
        router.push({ pathname: '/(tabs)/community', params: { segment: 'announcements' } });
      } else if (data.type === 'event') {
        router.push({ pathname: '/(tabs)/community', params: { segment: 'events' } });
      } else if (data.type === 'live_lesson') {
        router.push('/live-lesson');
      }
      // prayer_reminder / prayer_athan → default to home (prayer times tab)
    });
    return () => sub.remove();
  }, [router]);

  return (
    <ThemeProvider value={effectiveScheme === 'dark' ? MosqueDark : MosqueLight}>
      <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ animation: 'ios_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="live-lesson" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="privacy" options={{ presentation: 'card', headerBackTitle: ' ' }} />
        <Stack.Screen name="about" options={{ presentation: 'card', headerBackTitle: ' ' }} />
      </Stack>
    </ThemeProvider>
  );
}
