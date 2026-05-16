/**
 * AnnouncementsPreview — "Notices" section on the Community resting state.
 *
 * Surfaces the single most-recent announcement as a one-line preview.
 * A small Divine Gold dot marks it as unread; once read in the full
 * Announcements screen, the dot disappears.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useReadAnnouncements } from '@/hooks/useReadAnnouncements';
import { SectionHeader } from '@/components/community/SectionHeader';

interface AnnouncementsPreviewProps {
  onSeeAll: () => void;
}

export const AnnouncementsPreview = ({ onSeeAll }: AnnouncementsPreviewProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const { announcements } = useAnnouncements();
  const { isUnread } = useReadAnnouncements();

  if (announcements.length === 0) return null;

  const latest = announcements[0];
  const unread = isUnread(latest.id);
  const goldDot = isDark ? palette.divineGoldBright : palette.divineGold;
  const dateText = format(parseISO(latest.published_at), 'd MMM');

  const handlePress = () => {
    Haptics.selectionAsync();
    onSeeAll();
  };

  return (
    <View>
      <SectionHeader
        title={t('community.notices')}
        actionLabel={t('community.seeAll')}
        onActionPress={onSeeAll}
      />
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={`${latest.title}, ${t('community.postedOn', { date: dateText })}`}
      >
        <View style={styles.row}>
          <View style={styles.dotCol}>
            {unread && <View style={[styles.dot, { backgroundColor: goldDot }]} />}
          </View>
          <View style={styles.text}>
            <Text style={[typography.headline, { color: colors.text }]} numberOfLines={2}>
              {latest.title}
            </Text>
            <Text
              style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}
              numberOfLines={1}
            >
              {t('community.postedOn', { date: dateText })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dotCol: {
    width: 8,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    flex: 1,
  },
});
