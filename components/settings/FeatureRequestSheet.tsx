import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput as RNTextInput,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, components } from '@/constants/Theme';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { feedback } from '@/lib/api';

interface FeatureRequestSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

type CategoryKey = 'prayer_times' | 'events' | 'notifications' | 'quran' | 'community' | 'other';

interface Category {
  key: CategoryKey;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

const CATEGORIES: Category[] = [
  { key: 'prayer_times', icon: 'time-outline', color: palette.sapphire700 },
  { key: 'events', icon: 'calendar-outline', color: palette.sage600 },
  { key: 'notifications', icon: 'notifications-outline', color: palette.sapphire600 },
  { key: 'quran', icon: 'book-outline', color: palette.divineGold },
  { key: 'community', icon: 'people-outline', color: palette.sapphire700 },
  { key: 'other', icon: 'ellipsis-horizontal-circle-outline', color: palette.onyx600 },
];

export const FeatureRequestSheet = ({ visible, onDismiss }: FeatureRequestSheetProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();

  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSelectedCategory(null);
      setDescription('');
      setSubmitting(false);
      setSubmitted(false);
    }
  }, [visible]);

  const handleCategorySelect = useCallback((key: CategoryKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory((prev) => (prev === key ? null : key));
  }, []);

  const fallbackToEmail = useCallback((category: string) => {
    const appVersion = Constants.expoConfig?.version ?? '1.0.0';
    const subject = `Feature Suggestion — ${category} — The Salafi Masjid App`;
    const body = [
      t('settings.featureEmailGreeting'),
      '',
      t('settings.featureEmailIntro'),
      '',
      `Category: ${category}`,
      `Details: ${description.trim() || t('settings.featureNoDetails')}`,
      '',
      '---',
      `Sent from The Salafi Masjid App v${appVersion}`,
      `Platform: ${Platform.OS}`,
    ].join('\n');
    const url = `mailto:info@salafimasjid.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('settings.featureRequest'), 'info@salafimasjid.app');
    });
  }, [description, t]);

  const handleSubmit = useCallback(async () => {
    if (!selectedCategory || submitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubmitting(true);

    const categoryLabel = t(`settings.featureCategory.${selectedCategory}`);

    try {
      await feedback.submit({
        type: 'feature_request',
        category: categoryLabel,
        description: description.trim(),
        device_info: {
          app_version: Constants.expoConfig?.version ?? '1.0.0',
          platform: Platform.OS,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      setTimeout(() => onDismiss(), 1500);
    } catch {
      // API failed — fall back to email
      fallbackToEmail(categoryLabel);
      onDismiss();
    } finally {
      setSubmitting(false);
    }
  }, [selectedCategory, description, t, onDismiss, submitting, fallbackToEmail]);

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} maxHeight="75%">
      {submitted ? (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={48} color={palette.divineGold} />
          <Text style={[typography.title3, { color: colors.text, marginTop: spacing.lg }]}>
            {t('settings.feedbackSuccess')}
          </Text>
          <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            {t('settings.featureSuccessDetail')}
          </Text>
        </View>
      ) : (
        <>
          <Text style={[typography.title3, { color: colors.text, marginBottom: spacing.sm }]}>
            {t('settings.featureTitle')}
          </Text>
          <Text style={[typography.subhead, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
            {t('settings.featureSubtitle')}
          </Text>

          {/* Category pills */}
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => handleCategorySelect(cat.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected ? colors.tintLight : colors.background,
                      borderColor: isSelected ? colors.tint : colors.separator,
                      borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Ionicons
                    name={cat.icon}
                    size={18}
                    color={isSelected ? colors.tint : cat.color}
                  />
                  <Text
                    style={[
                      typography.subhead,
                      {
                        color: isSelected ? colors.tint : colors.text,
                        marginStart: spacing.sm,
                      },
                    ]}
                  >
                    {t(`settings.featureCategory.${cat.key}`)}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.tint}
                      style={{ marginStart: spacing.xs }}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Optional description */}
          <RNTextInput
            style={[
              styles.textInput,
              typography.body,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.separator,
              },
            ]}
            placeholder={t('settings.featureDescriptionPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />

          {/* Submit button */}
          <Pressable
            onPress={handleSubmit}
            disabled={!selectedCategory || submitting}
            style={[
              styles.submitButton,
              {
                backgroundColor: palette.divineGold,
                opacity: selectedCategory && !submitting ? 1 : 0.4,
              },
            ]}
          >
            <Ionicons name="bulb" size={18} color={palette.white} style={{ marginEnd: spacing.sm }} />
            <Text style={[typography.headline, { color: palette.white }]}>
              {submitting ? t('settings.feedbackSending') : t('settings.featureSend')}
            </Text>
          </Pressable>
        </>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  textInput: {
    minHeight: 80,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: components.button.height,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
});
