import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import Colors, { palette } from '@/constants/Colors';
import { AnimatedSplash } from '@/components/brand/AnimatedSplash';

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
      // Hide the native splash screen immediately — our AnimatedSplash takes over
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <AnimatedSplash isVisible={showSplash} onAnimationComplete={handleSplashComplete}>
      <RootLayoutNav />
    </AnimatedSplash>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? MosqueDark : MosqueLight}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerTitle: 'About',
            headerTintColor: colorScheme === 'dark' ? palette.mutedGold : palette.sacredBlue,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
