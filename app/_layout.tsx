import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';

import { palette } from '@/constants/Colors';
import { AnimatedSplash } from '@/components/brand/AnimatedSplash';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { reschedulePrayerRemindersForToday } from '@/lib/notifications';
import '@/lib/i18n';
import { configureRTL } from '@/lib/rtl';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const MosqueLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.sacredBlue,
    background: palette.limestone,
    card: '#FFFFFF',
    text: palette.ink,
    border: palette.separatorLight,
    notification: palette.divineGold,
  },
};

const MosqueDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.divineGoldBright,
    background: palette.black,
    card: palette.darkElevated,
    text: palette.snow,
    border: palette.separatorDark,
    notification: palette.divineGoldBright,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      configureRTL();
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reschedulePrayerRemindersForToday().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AnimatedSplash isVisible={showSplash} onAnimationComplete={handleSplashComplete}>
        <AppThemeProvider>
          <RootLayoutNav />
        </AppThemeProvider>
      </AnimatedSplash>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { effectiveScheme } = useTheme();
  const { isAuthenticated, isLoading, hasCompletedOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!hasCompletedOnboarding && !inAuthGroup) {
      // Not logged in and not guest → show welcome screen
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      // Logged in but still on auth screens → go to tabs
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, hasCompletedOnboarding, segments]);

  return (
    <ThemeProvider value={effectiveScheme === 'dark' ? MosqueDark : MosqueLight}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerTitle: 'About',
            headerTintColor: effectiveScheme === 'dark' ? palette.divineGoldBright : palette.sacredBlue,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
