import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { AppState, I18nManager, useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { palette } from '@/constants/Colors';
import { AnimatedSplash } from '@/components/brand/AnimatedSplash';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { auth } from '@/lib/api';
import { reschedulePrayerRemindersForToday } from '@/lib/notifications';
import '@/lib/i18n';

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
    // Custom brand fonts — add .ttf files to assets/fonts/ after downloading from Google Fonts
    // 'PlayfairDisplay-Bold': require('../assets/fonts/PlayfairDisplay-Bold.ttf'),
    // 'PlayfairDisplay-SemiBold': require('../assets/fonts/PlayfairDisplay-SemiBold.ttf'),
    // 'SourceSerif4-Regular': require('../assets/fonts/SourceSerif4-Regular.ttf'),
    // 'SourceSerif4-Medium': require('../assets/fonts/SourceSerif4-Medium.ttf'),
    // 'ReemKufi-Bold': require('../assets/fonts/ReemKufi-Bold.ttf'),
    // 'NotoNaskhArabic-Regular': require('../assets/fonts/NotoNaskhArabic-Regular.ttf'),
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
