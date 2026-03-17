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
import { spacing, borderRadius, typography, getElevation } from '@/constants/Theme';

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

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

  const handlePreset = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsCustom(false);
    setCustomText('');
    onAmountChange(amount);
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
          const isSelected = !isCustom && selectedAmount === amount;
          return (
            <Pressable
              key={amount}
              style={[
                styles.amountButton,
                {
                  backgroundColor: isSelected ? palette.sapphire700 : colors.card,
                  borderColor: isSelected ? palette.sapphire700 : colors.separator,
                  ...(!isSelected ? getElevation('sm', isDark) : {}),
                },
              ]}
              onPress={() => handlePreset(amount)}
              accessibilityLabel={`Donate ${amount} pounds`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  typography.headline,
                  { color: isSelected ? palette.white : colors.text },
                ]}
              >
                £{amount}
              </Text>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={palette.white}
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
              backgroundColor: isCustom ? palette.sapphire700 : colors.card,
              borderColor: isCustom ? palette.sapphire700 : colors.separator,
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
              { color: isCustom ? palette.white : colors.text },
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
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  checkmark: {
    marginLeft: spacing['2xs'],
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  customInput: {
    flex: 1,
    padding: 0,
  },
});
