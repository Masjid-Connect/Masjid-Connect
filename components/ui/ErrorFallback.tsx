import { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getColors, palette } from '@/constants/Colors';
import { typography, spacing, borderRadius } from '@/constants/Theme';

interface ErrorFallbackProps {
  error: unknown;
  resetError: () => void;
}

/**
 * Graceful fallback screen shown when an unhandled error crashes a screen.
 * Branded with the app's design language — not a raw stack trace.
 */
export const ErrorFallback = ({ error, resetError }: ErrorFallbackProps) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  const handleRetry = useCallback(() => {
    resetError();
  }, [resetError]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.urgent} />
      <Text style={[styles.title, { color: colors.text }]}>
        {t('error.title', 'Something went wrong')}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {t('error.message', 'An unexpected error occurred. Please try again.')}
      </Text>
      {__DEV__ && (
        <Text style={[styles.debug, { color: colors.urgent }]}>
          {error instanceof Error ? error.message : String(error)}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.tint }]}
        onPress={handleRetry}
        activeOpacity={0.7}
      >
        <Ionicons name="refresh-outline" size={20} color={colors.onPrimary} />
        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
          {t('error.retry', 'Try Again')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  title: {
    ...typography.title2,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 300,
  },
  debug: {
    ...typography.caption1,
    fontFamily: 'SpaceMono',
    marginTop: spacing.lg,
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing['2xl'],
  },
  buttonText: {
    ...typography.headline,
  },
});
