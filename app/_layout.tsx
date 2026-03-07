import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { AppState, useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { palette } from '@/constants/Colors';
import { AnimatedSplash } from '@/components/brand/AnimatedSplash';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { auth } from '@/lib/api';
import { reschedulePrayerRemindersForToday } from '@/lib/notifications';

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
    background: palette.warmIvory,
    card: '#FFFFFF',
    text: palette.deepCharcoal,
    border: palette.softStone,
    notification: palette.divineGold,
  },
};

const MosqueDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.mutedGold,
    background: palette.nightSky,
    card: palette.midnightCard,
    text: palette.softWhite,
    border: '#30363D',
    notification: palette.mutedGold,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      auth.hydrate();
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
    <AnimatedSplash isVisible={showSplash} onAnimationComplete={handleSplashComplete}>
      <AppThemeProvider>
        <RootLayoutNav />
      </AppThemeProvider>
    </AnimatedSplash>
  );
}

function RootLayoutNav() {
  const { effectiveScheme } = useTheme();

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
            headerTintColor: effectiveScheme === 'dark' ? palette.mutedGold : palette.sacredBlue,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
