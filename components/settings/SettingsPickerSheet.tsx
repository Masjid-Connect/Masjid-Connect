import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, components, hairline } from '@/constants/Theme';
import { BottomSheet } from '@/components/ui/BottomSheet';

interface PickerOption<T extends string | number> {
  label: string;
  value: T;
  description?: string;
}

interface SettingsPickerSheetProps<T extends string | number> {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  options: PickerOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
}

export function SettingsPickerSheet<T extends string | number>({
  visible,
  onDismiss,
  title,
  options,
  selectedValue,
  onSelect,
}: SettingsPickerSheetProps<T>) {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);

  const handleSelect = useCallback(
    (value: T) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(value);
      onDismiss();
    },
    [onSelect, onDismiss]
  );

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} maxHeight="60%">
      <Text style={[typography.title3, { color: colors.text, marginBottom: spacing.xl }]}>
        {title}
      </Text>
      {options.map((option, index) => {
        const isSelected = option.value === selectedValue;
        const isLast = index === options.length - 1;

        return (
          <Pressable
            key={String(option.value)}
            onPress={() => handleSelect(option.value)}
            style={[
              styles.option,
              !isLast && styles.optionBorder,
              !isLast && { borderBottomColor: colors.separator },
            ]}
          >
            <View style={styles.optionText}>
              <Text style={[typography.body, { color: colors.text }]}>
                {option.label}
              </Text>
              {option.description && (
                <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
                  {option.description}
                </Text>
              )}
            </View>
            {isSelected && (
              <Ionicons name="checkmark" size={22} color={colors.tint} />
            )}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: components.button.compactHeight,
  },
  optionBorder: {
    borderBottomWidth: hairline,
  },
  optionText: {
    flex: 1,
    marginEnd: spacing.md,
  },
});
