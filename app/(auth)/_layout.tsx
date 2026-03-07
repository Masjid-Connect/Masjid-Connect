import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { palette } from '@/constants/Colors';

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const bg = colorScheme === 'dark' ? palette.nightSky : palette.warmIvory;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: bg },
      }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
