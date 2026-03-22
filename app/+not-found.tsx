import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';

export default function NotFoundScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);

  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.title2, { color: colors.text }]}>Page not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={[typography.callout, { color: colors.accent }]}>Return to Prayer Times</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  link: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
});
