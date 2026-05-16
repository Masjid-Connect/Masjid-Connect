/**
 * LessonsPreview — "Lessons" bento tile.
 *
 * Latest recorded lesson with artwork thumbnail + play badge inside
 * a BentoTile. Tile shape persists even when the feed hasn't loaded
 * yet (rare; the SoundCloud feed almost always has content).
 */

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/Theme';
import { useRecordedLessons } from '@/hooks/useRecordedLessons';
import { BentoTile } from '@/components/community/BentoTile';

interface LessonsPreviewProps {
  onSeeAll: () => void;
}

export const LessonsPreview = ({ onSeeAll }: LessonsPreviewProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const { lessons } = useRecordedLessons();

  const isEmpty = lessons.length === 0;
  const latest = isEmpty ? null : lessons[0];
  const gold = isDark ? palette.divineGoldBright : palette.divineGold;
  const meta = latest
    ? [latest.speaker, latest.series].filter(Boolean).join(' · ')
    : '';

  return (
    <BentoTile
      title={t('community.lessons')}
      actionLabel={t('community.archive')}
      onActionPress={onSeeAll}
      isEmpty={isEmpty}
      emptyIcon="musical-notes-outline"
      emptyMessage={t('community.lessonsEmpty')}
      minHeight={120}
    >
      {latest && (
        <View style={styles.row}>
          <View style={styles.artworkWrap}>
            {latest.artworkUrl ? (
              <Image
                source={{ uri: latest.artworkUrl }}
                style={styles.artwork}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={[styles.artwork, { backgroundColor: colors.backgroundGrouped }]} />
            )}
            <View style={[styles.playBadge, { backgroundColor: gold }]}>
              <Ionicons name="play" size={9} color={palette.white} style={styles.playIcon} />
            </View>
          </View>
          <View style={styles.text}>
            <Text
              style={[typography.subhead, { color: colors.text }]}
              numberOfLines={2}
            >
              {latest.title}
            </Text>
            {meta ? (
              <Text
                style={[typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}
                numberOfLines={1}
              >
                {meta}
              </Text>
            ) : null}
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
  artworkWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
  },
  artwork: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: '#1a1a1a',
  },
  playBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 1,
  },
  text: {
    flex: 1,
  },
});
