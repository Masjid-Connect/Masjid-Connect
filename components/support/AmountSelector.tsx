import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius, typography, getElevation, fontWeight as fw } from '@/constants/Theme';

const PRESET_AMOUNTS = [
  { value: 5 },
  { value: 10 },
  { value: 25, suggested: true },
  { value: 50 },
  { value: 100 },
];

interface AmountSelectorProps {
  selectedAmount: number | null;
  onAmountChange: (amount: number | null) => void;
}

export const AmountSelector = ({ selectedAmount, onAmountChange }: AmountSelectorProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const [isCustom, setIsCustom] = useState(false);
  const [customText, setCustomText] = useState('');

  const handlePreset = (val: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsCustom(false);
    setCustomText('');
    onAmountChange(val);
  };

  const handleCustomPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsCustom(true);
    onAmountChange(null);
  };

  const handleCustomChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomText(cleaned);
    const num = parseInt(cleaned, 10);
    onAmountChange(isNaN(num) ? null : num);
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {PRESET_AMOUNTS.map((amount) => {
          const isSelected = !isCustom && selectedAmount === amount.value;
          const suggested = amount.suggested ?? false;
          const goldColor = isDark ? palette.divineGoldBright : palette.divineGold;
          return (
            <Pressable
              key={amount.value}
              style={[
                styles.amountButton,
                {
                  backgroundColor: isSelected ? colors.tint : colors.card,
                  borderColor: isSelected ? colors.tint : (suggested ? goldColor : colors.separator),
                  borderWidth: suggested && !isSelected ? 1.5 : 1,
                  ...(!isSelected ? getElevation('sm', isDark) : {}),
                },
              ]}
              onPress={() => handlePreset(amount.value)}
              accessibilityLabel={t('support.donatePounds', { amount: amount.value })}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              {suggested && (
                <View style={[styles.popularPill, { backgroundColor: goldColor }]}>
                  <Text style={styles.popularText}>{t('support.popular')}</Text>
                </View>
              )}
              <Text
                style={[
                  typography.headline,
                  { color: isSelected ? colors.onPrimary : colors.text },
                ]}
              >
                £{amount.value}
              </Text>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.onPrimary}
                  style={styles.checkmark}
                />
              )}
            </Pressable>
          );
        })}

        {/* Custom amount button */}
        <Pressable
          style={[
            styles.amountButton,
            {
              backgroundColor: isCustom ? colors.tint : colors.card,
              borderColor: isCustom ? colors.tint : colors.separator,
              ...(!isCustom ? getElevation('sm', isDark) : {}),
            },
          ]}
          onPress={handleCustomPress}
          accessibilityLabel={t('support.custom')}
          accessibilityRole="button"
          accessibilityState={{ selected: isCustom }}
        >
          <Text
            style={[
              typography.headline,
              { color: isCustom ? colors.onPrimary : colors.text },
            ]}
          >
            {t('support.custom')}
          </Text>
        </Pressable>
      </View>

      {isCustom && (
        <View
          style={[
            styles.customInputContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.separator,
              ...getElevation('sm', isDark),
            },
          ]}
        >
          <Text style={[typography.title2, { color: colors.textSecondary }]}>£</Text>
          <TextInput
            style={[
              typography.title2,
              styles.customInput,
              { color: colors.text },
            ]}
            placeholder={t('support.customPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            value={customText}
            onChangeText={handleCustomChange}
            autoFocus
            maxLength={5}
            accessibilityLabel={t('support.customPlaceholder')}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amountButton: {
    flexBasis: '31%',
    flexGrow: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  checkmark: {
    marginStart: spacing['2xs'],
  },
  popularPill: {
    position: 'absolute',
    top: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  popularText: {
    color: palette.white,
    fontSize: (typography.caption2.fontSize as number) - 2,
    fontWeight: fw.semibold,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  customInput: {
    flex: 1,
    padding: 0,
  },
});
