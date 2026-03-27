import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme, ThemePreference } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, springs, badge, hairline } from '@/constants/Theme';
import { BottomSheet } from '@/components/ui/BottomSheet';

interface ThemePreviewSheetProps {
  visible: boolean;
  onDismiss: () => void;
  selectedTheme: ThemePreference;
  onSelect: (theme: ThemePreference) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ThemeCardProps {
  theme: ThemePreference;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  onSelect: () => void;
  previewBg: string;
  previewText: string;
  previewAccent: string;
  previewCard: string;
}

const ThemeCard = ({
  label,
  icon,
  selected,
  onSelect,
  previewBg,
  previewText,
  previewAccent,
  previewCard,
}: ThemeCardProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, springs.bouncy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springs.bouncy);
  }, [scale]);

  return (
    <AnimatedPressable
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.themeCard, animatedStyle]}
    >
      {/* Mini preview */}
      <View
        style={[
          styles.preview,
          {
            backgroundColor: previewBg,
            borderColor: selected ? colors.tint : colors.separator,
            borderWidth: selected ? 2.5 : hairline,
          },
        ]}
      >
        {/* Mini status bar line */}
        <View style={[styles.previewLine, { backgroundColor: previewText, width: '40%', opacity: 0.3 }]} />
        {/* Mini card */}
        <View style={[styles.previewCard, { backgroundColor: previewCard }]}>
          <View style={[styles.previewLine, { backgroundColor: previewAccent, width: '60%' }]} />
          <View style={[styles.previewLine, { backgroundColor: previewText, width: '80%', opacity: 0.2, marginTop: 4 }]} />
          <View style={[styles.previewLine, { backgroundColor: previewText, width: '50%', opacity: 0.15, marginTop: 3 }]} />
        </View>
        {/* Mini rows */}
        <View style={[styles.previewRow, { borderBottomColor: previewText }]}>
          <View style={[styles.previewDot, { backgroundColor: previewAccent }]} />
          <View style={[styles.previewLine, { backgroundColor: previewText, width: '55%', opacity: 0.25 }]} />
        </View>
        <View style={styles.previewRow}>
          <View style={[styles.previewDot, { backgroundColor: previewAccent, opacity: 0.5 }]} />
          <View style={[styles.previewLine, { backgroundColor: previewText, width: '45%', opacity: 0.2 }]} />
        </View>

        {/* Checkmark overlay */}
        {selected && (
          <View style={[styles.checkBadge, { backgroundColor: colors.tint }]}>
            <Ionicons name="checkmark" size={14} color={palette.white} />
          </View>
        )}
      </View>

      {/* Label */}
      <View style={styles.labelRow}>
        <Ionicons
          name={icon}
          size={18}
          color={selected ? colors.tint : colors.textSecondary}
          style={{ marginEnd: spacing.xs }}
        />
        <Text
          style={[
            typography.subhead,
            {
              color: selected ? colors.tint : colors.text,
              fontWeight: selected ? '600' : '400',
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
};

export const ThemePreviewSheet = ({
  visible,
  onDismiss,
  selectedTheme,
  onSelect,
}: ThemePreviewSheetProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (theme: ThemePreference) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(theme);
      onDismiss();
    },
    [onSelect, onDismiss]
  );

  // Light preview colors
  const lightPreview = {
    previewBg: palette.stone100,
    previewText: palette.onyx900,
    previewAccent: palette.sapphire700,
    previewCard: palette.white,
  };

  // Dark preview colors
  const darkPreview = {
    previewBg: palette.sapphire950,
    previewText: palette.snow,
    previewAccent: palette.sapphire400,
    previewCard: palette.sapphire850,
  };

  // System uses current effective theme for preview
  const systemPreview = effectiveScheme === 'dark' ? darkPreview : lightPreview;

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} maxHeight="55%">
      <Text style={[typography.title3, { color: colors.text, marginBottom: spacing.xl }]}>
        {t('settings.theme')}
      </Text>
      <View style={styles.cardsRow}>
        <ThemeCard
          theme="light"
          label={t('settings.themeLight')}
          icon="sunny"
          selected={selectedTheme === 'light'}
          onSelect={() => handleSelect('light')}
          {...lightPreview}
        />
        <ThemeCard
          theme="dark"
          label={t('settings.themeDark')}
          icon="moon"
          selected={selectedTheme === 'dark'}
          onSelect={() => handleSelect('dark')}
          {...darkPreview}
        />
        <ThemeCard
          theme="system"
          label={t('settings.themeSystem')}
          icon="phone-portrait-outline"
          selected={selectedTheme === 'system'}
          onSelect={() => handleSelect('system')}
          {...systemPreview}
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    aspectRatio: 0.65,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  previewCard: {
    borderRadius: spacing.xs,
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  previewLine: {
    height: 4,
    borderRadius: borderRadius['2xs'],
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: hairline,
    borderBottomColor: 'transparent',
  },
  previewDot: {
    width: badge.smallDotSize,
    height: badge.smallDotSize,
    borderRadius: badge.smallDotSize / 2,
    marginEnd: badge.smallDotSize,
  },
  checkBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    width: spacing['2xl'],
    height: spacing['2xl'],
    borderRadius: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
