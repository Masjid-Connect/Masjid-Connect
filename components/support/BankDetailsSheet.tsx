import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography, hairline } from '@/constants/Theme';

const BANK_DETAILS = [
  { key: 'accountName', value: 'Salafi Bookstore & Islamic Centre' },
  { key: 'sortCode', value: '30-93-09' },
  { key: 'accountNumber', value: '00231260' },
  { key: 'iban', value: 'GB14 LOYD 3093 0900 2312 60' },
  { key: 'bic', value: 'LOYDGB21282' },
] as const;

interface BankDetailsSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export const BankDetailsSheet = ({ visible, onDismiss }: BankDetailsSheetProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = useCallback(async (key: string, value: string) => {
    await Clipboard.setStringAsync(value.replace(/\s/g, ''));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <Text style={[typography.title2, { color: colors.text, marginBottom: spacing.xl }]}>
        {t('support.bankDetails')}
      </Text>

      <View style={styles.detailsList}>
        {BANK_DETAILS.map(({ key, value }) => (
          <View
            key={key}
            style={[
              styles.detailRow,
              { borderBottomColor: colors.separator },
            ]}
          >
            <View style={styles.detailText}>
              <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                {t(`support.${key}`)}
              </Text>
              <Text
                style={[typography.body, { color: colors.text }]}
                selectable
              >
                {value}
              </Text>
            </View>
            <Pressable
              onPress={() => handleCopy(key, value)}
              style={[
                styles.copyButton,
                {
                  backgroundColor: copiedKey === key
                    ? palette.sage600
                    : colors.backgroundGrouped,
                },
              ]}
              accessibilityLabel={`Copy ${t(`support.${key}`)}`}
              accessibilityRole="button"
            >
              <Ionicons
                name={copiedKey === key ? 'checkmark' : 'copy-outline'}
                size={16}
                color={copiedKey === key ? palette.white : colors.textSecondary}
              />
            </Pressable>
          </View>
        ))}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  detailsList: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: hairline,
  },
  detailText: {
    flex: 1,
    gap: spacing['2xs'],
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: spacing.sm,
  },
});
