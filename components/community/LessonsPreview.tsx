/**
 * LessonsPreview — "Lessons" section on the Community resting state.
 *
 * Surfaces the most-recently published recorded lesson as a single row
 * with artwork thumbnail + play badge. Tap drills into the Lessons
 * screen where the AudioProvider takes over and the player sheet opens.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/Theme';
import { useRecordedLessons } from '@/hooks/useRecordedLessons';
import { SectionHeader } from '@/components/community/SectionHeader';

interface LessonsPreviewProps {
  onSeeAll: () => void;
}

export const LessonsPreview = ({ onSeeAll }: LessonsPreviewProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const { lessons } = useRecordedLessons();

  if (lessons.length === 0) return null;

  const latest = lessons[0];
  const gold = isDark ? palette.divineGoldBright : palette.divineGold;
  const meta = [latest.speaker, latest.series].filter(Boolean).join(' · ');

  const handlePress = () => {
    Haptics.selectionAsync();
    onSeeAll();
  };

  return (
    <View>
      <SectionHeader
        title={t('community.lessons')}
        actionLabel={t('community.archive')}
        onActionPress={onSeeAll}
      />
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={`${latest.title}${latest.speaker ? `, ${latest.speaker}` : ''}`}
      >
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
              <Ionicons name="play" size={11} color={palette.white} style={styles.playIcon} />
            </View>
          </View>
          <View style={styles.textCol}>
            <Text style={[typography.headline, { color: colors.text }]} numberOfLines={2}>
              {latest.title}
            </Text>
            {meta ? (
              <Text
                style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}
                numberOfLines={1}
              >
                {meta}
              </Text>
            ) : null}
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
  textCol: {
    flex: 1,
  },
  artworkWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: '#1a1a1a',
  },
  playBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 1,
  },
});
