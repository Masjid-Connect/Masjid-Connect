/**
 * LessonRow — single recorded-lesson entry in the Lessons list.
 *
 * Tap fires the parent's `onPlay` callback, which in practice routes to
 * AudioProvider.play(). When this row's track is the currently-playing
 * track, the row picks up the gold "now playing" indicator + a subtle
 * accent so the user can find their place in a long list.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, getElevation } from '@/constants/Theme';
import type { RecordedLesson } from '@/types';

interface LessonRowProps {
  lesson: RecordedLesson;
  /** True when this row's lesson is currently loaded into the audio player. */
  isCurrent: boolean;
  /** True only when isCurrent AND audio is actively playing (not paused). */
  isPlaying: boolean;
  onPress: (lesson: RecordedLesson) => void;
}

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} min`;
}

export const LessonRow = ({ lesson, isCurrent, isPlaying, onPress }: LessonRowProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const goldColor = isDark ? palette.divineGoldBright : palette.divineGold;

  return (
    <Pressable
      onPress={() => onPress(lesson)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: isCurrent ? goldColor : colors.separator,
          borderWidth: isCurrent ? 1.5 : 1,
          ...getElevation('sm', isDark),
        },
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${lesson.title}${lesson.speaker ? `, ${lesson.speaker}` : ''}, ${formatDuration(lesson.durationSeconds)}`}
      accessibilityState={{ selected: isCurrent }}
    >
      <Image
        source={{ uri: lesson.artworkUrl }}
        style={styles.artwork}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <View style={styles.text}>
        <Text
          numberOfLines={2}
          style={[typography.headline, { color: colors.text }]}
        >
          {lesson.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}
        >
          {[lesson.speaker, formatDuration(lesson.durationSeconds)].filter(Boolean).join(' · ')}
        </Text>
        {isCurrent && (
          <Text style={[typography.caption2SemiBold, { color: goldColor, marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' }]}>
            {isPlaying ? t('lessons.nowPlaying') : t('lessons.paused')}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.playButton,
          { backgroundColor: isCurrent ? goldColor : colors.backgroundGrouped },
        ]}
      >
        <Ionicons
          name={isCurrent && isPlaying ? 'pause' : 'play'}
          size={18}
          color={isCurrent ? palette.white : colors.text}
          style={isCurrent && isPlaying ? undefined : styles.playIcon}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing['3xl'],
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  artwork: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.sm,
    backgroundColor: '#1a1a1a',
  },
  text: {
    flex: 1,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 2,
  },
});
