import { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/constants/Colors';
import { typography, spacing, borderRadius } from '@/constants/Theme';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

/**
 * Graceful fallback screen shown when an unhandled error crashes a screen.
 * Branded with the app's design language — not a raw stack trace.
 */
export const ErrorFallback = ({ error, resetError }: ErrorFallbackProps) => {
  const { t } = useTranslation();

  const handleRetry = useCallback(() => {
    resetError();
  }, [resetError]);

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={64} color={palette.crimson600} />
      <Text style={styles.title}>{t('error.title', 'Something went wrong')}</Text>
      <Text style={styles.message}>
        {t('error.message', 'An unexpected error occurred. Please try again.')}
      </Text>
      {__DEV__ && (
        <Text style={styles.debug}>{error.message}</Text>
      )}
      <TouchableOpacity style={styles.button} onPress={handleRetry} activeOpacity={0.7}>
        <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>{t('error.retry', 'Try Again')}</Text>
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
    backgroundColor: palette.stone100,
  },
  title: {
    ...typography.title2,
    color: palette.onyx900,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: palette.onyx600,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 300,
  },
  debug: {
    ...typography.caption1,
    fontFamily: 'SpaceMono',
    color: palette.crimson600,
    marginTop: spacing.lg,
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.sapphire700,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing['2xl'],
  },
  buttonText: {
    ...typography.headline,
    color: '#FFFFFF',
  },
});
