/**
 * AnnouncementsPreview — "Notices" bento tile.
 *
 * Renders the latest announcement inside a BentoTile. Gold dot marks
 * unread state. Tile shape persists when no announcements exist.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useReadAnnouncements } from '@/hooks/useReadAnnouncements';
import { BentoTile } from '@/components/community/BentoTile';

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

  const isEmpty = announcements.length === 0;
  const latest = isEmpty ? null : announcements[0];
  const goldDot = isDark ? palette.divineGoldBright : palette.divineGold;
  const dateText = latest ? format(parseISO(latest.published_at), 'd MMM') : '';
  const unread = latest ? isUnread(latest.id) : false;

  return (
    <BentoTile
      title={t('community.notices')}
      actionLabel={t('community.seeAll')}
      onActionPress={onSeeAll}
      isEmpty={isEmpty}
      emptyIcon="megaphone-outline"
      emptyMessage={t('community.noticesEmpty')}
      minHeight={120}
    >
      {latest && (
        <View style={styles.row}>
          <View style={styles.dotCol}>
            {unread && <View style={[styles.dot, { backgroundColor: goldDot }]} />}
          </View>
          <View style={styles.text}>
            <Text
              style={[typography.subhead, { color: colors.text }]}
              numberOfLines={2}
            >
              {latest.title}
            </Text>
            <Text
              style={[
                typography.caption1,
                { color: colors.textSecondary, marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {t('community.postedOn', { date: dateText })}
            </Text>
          </View>
        </View>
      )}
    </BentoTile>
  );
};

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dotCol: {
    width: 6,
    paddingTop: 6,
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
