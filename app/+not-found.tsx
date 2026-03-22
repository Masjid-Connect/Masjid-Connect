import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';

export default function NotFoundScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.title2, { color: colors.text }]}>{t('notFound.title')}</Text>
        <Link href="/" style={styles.link} accessibilityRole="link" accessibilityLabel={t('notFound.returnHome')}>
          <Text style={[typography.callout, { color: colors.accent }]}>{t('notFound.returnHome')}</Text>
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
