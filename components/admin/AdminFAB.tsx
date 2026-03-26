import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { getColors, getAlpha, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, springs, getElevation, fontWeight } from '@/constants/Theme';

interface AdminFABProps {
  onNewAnnouncement: () => void;
  onNewEvent: () => void;
}

export const AdminFAB = ({ onNewAnnouncement, onNewEvent }: AdminFABProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const alphaColors = getAlpha(effectiveScheme);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const rotation = useSharedValue(0);
  const menuScale = useSharedValue(0);

  const toggleMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = !expanded;
    setExpanded(next);
    rotation.value = withSpring(next ? 45 : 0, springs.snappy);
    menuScale.value = withSpring(next ? 1 : 0, springs.snappy);
  }, [expanded, rotation, menuScale]);

  const handleOption = useCallback((callback: () => void) => {
    setExpanded(false);
    rotation.value = withSpring(0, springs.snappy);
    menuScale.value = withSpring(0, springs.snappy);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Slight delay so the menu animates out before sheet opens
    setTimeout(callback, 150);
  }, [rotation, menuScale]);

  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const menuStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }],
    opacity: menuScale.value,
  }));

  const goldColor = isDark ? palette.divineGoldBright : palette.divineGold;

  return (
    <View style={[styles.container, { bottom: insets.bottom + spacing.lg }]} pointerEvents="box-none">
      {/* Backdrop when expanded */}
      {expanded && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={toggleMenu}
          accessibilityRole="button"
          accessibilityLabel={t('common.dismiss')}
        />
      )}

      {/* Menu options */}
      <Animated.View style={[styles.menu, menuStyle]}>
        <Pressable
          style={[styles.menuItem, { backgroundColor: colors.card, ...getElevation('md', isDark) }]}
          onPress={() => handleOption(onNewAnnouncement)}
          accessibilityRole="menuitem"
          accessibilityLabel={t('admin.newAnnouncement')}
        >
          <View style={[styles.menuIcon, { backgroundColor: alphaColors.sapphireIconBg }]}>
            <Ionicons name="megaphone-outline" size={18} color={colors.tint} />
          </View>
          <Text style={[typography.subhead, { color: colors.text, fontWeight: fontWeight.semibold }]}>
            {t('admin.newAnnouncement')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.menuItem, { backgroundColor: colors.card, ...getElevation('md', isDark) }]}
          onPress={() => handleOption(onNewEvent)}
          accessibilityRole="menuitem"
          accessibilityLabel={t('admin.newEvent')}
        >
          <View style={[styles.menuIcon, { backgroundColor: alphaColors.sapphireIconBg }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.tint} />
          </View>
          <Text style={[typography.subhead, { color: colors.text, fontWeight: fontWeight.semibold }]}>
            {t('admin.newEvent')}
          </Text>
        </Pressable>
      </Animated.View>

      {/* FAB button */}
      <Pressable
        style={[styles.fab, { backgroundColor: goldColor, ...getElevation('lg', isDark) }]}
        onPress={toggleMenu}
        accessibilityRole="button"
        accessibilityLabel={t('admin.quickPost')}
      >
        <Animated.View style={fabIconStyle}>
          <Ionicons name="add" size={28} color={isDark ? palette.sapphire950 : palette.white} />
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.xl,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    marginBottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
