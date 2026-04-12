/**
 * Date Navigator — swipe or tap arrows to browse prayer times by date.
 * Shows a "Today" pill when viewing a non-today date.
 */
import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { getColors, getAlpha, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, fontWeight } from '@/constants/Theme';

interface DateNavigatorProps {
  selectedDate: Date;
  isTodayDate: boolean;
  hijriDate?: string | null;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export const DateNavigator = ({
  selectedDate,
  isTodayDate,
  hijriDate,
  onPrev,
  onNext,
  onToday,
}: DateNavigatorProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPrev();
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  const handleToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToday();
  };

  const dateLabel = isTodayDate
    ? t('prayer.today')
    : format(selectedDate, 'EEE, d MMM');

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePrev}
        style={styles.arrowButton}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('prayer.previousDay')}
      >
        <Ionicons
          name="chevron-back"
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>

      <View style={styles.center}>
        <View style={styles.dateStack}>
          <Text
            style={[
              typography.headline,
              styles.dateText,
              { color: isTodayDate ? colors.text : colors.accent },
            ]}
          >
            {dateLabel}
          </Text>
          {hijriDate && (
            <Text style={[typography.footnote, styles.hijriText, { color: isDark ? palette.divineGoldBright : palette.divineGold, letterSpacing: 0.5 }]}>
              {hijriDate}
            </Text>
          )}
        </View>

        {!isTodayDate && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            <Pressable
              onPress={handleToday}
              style={[styles.todayPill, {
                backgroundColor: getAlpha(effectiveScheme).accentPill,
              }]}
              accessibilityRole="button"
              accessibilityLabel={t('prayer.jumpToToday')}
            >
              <Text style={[styles.todayText, {
                color: isDark ? palette.divineGoldBright : palette.divineGoldText,
              }]}>
                {t('prayer.today')}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      <Pressable
        onPress={handleNext}
        style={styles.arrowButton}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('prayer.nextDay')}
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.md,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateStack: {
    alignItems: 'center',
  },
  dateText: {
    textAlign: 'center',
  },
  hijriText: {
    textAlign: 'center',
    marginTop: 2,
  },
  todayPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  todayText: {
    fontSize: typography.caption1.fontSize,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.3,
  },
});
