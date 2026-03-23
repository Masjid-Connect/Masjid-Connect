import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';

interface DonationConfirmationSheetProps {
  visible: boolean;
  onDismiss: () => void;
  amount: number;
  frequency: 'one-time' | 'monthly';
}

export const DonationConfirmationSheet = ({
  visible,
  onDismiss,
  amount,
  frequency,
}: DonationConfirmationSheetProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} maxHeight="50%">
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(45, 106, 79, 0.15)' : 'rgba(45, 106, 79, 0.08)' }]}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
        </View>

        <Text style={[typography.title2, { color: colors.text, textAlign: 'center', marginTop: spacing.lg }]}>
          {t('support.confirmationTitle')}
        </Text>

        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
          {t('support.confirmationMessage', {
            amount: `£${amount.toFixed(2)}`,
            frequency: t(`support.${frequency === 'one-time' ? 'oneTime' : 'monthly'}`).toLowerCase(),
          })}
        </Text>

        <Text style={[typography.footnote, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.sm }]}>
          {t('support.confirmationHint')}
        </Text>

        <Button
          variant="primary"
          title={t('common.done')}
          onPress={onDismiss}
          style={styles.button}
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    marginTop: spacing['2xl'],
    width: '100%',
  },
});
