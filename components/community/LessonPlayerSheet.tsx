/**
 * LessonPlayerSheet — bottom sheet hosting the now-playing controls.
 *
 * Pure UI on top of AudioProvider — does NOT own the player, so dismissing
 * the sheet leaves audio playing in the background (matching the iOS native
 * Music / Podcasts dismissal semantics). Lock-screen + control-center
 * controls are bound at the provider level, so the user can pause/resume
 * from anywhere even after dismissing.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { useAudio } from '@/contexts/AudioProvider';
import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, getElevation } from '@/constants/Theme';

interface LessonPlayerSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

function formatTime(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '0:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export const LessonPlayerSheet = ({ visible, onDismiss }: LessonPlayerSheetProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    pause,
    play,
    skipForward,
    skipBackward,
  } = useAudio();

  if (!currentTrack) return null;

  const goldColor = isDark ? palette.divineGoldBright : palette.divineGold;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const togglePlay = () => {
    if (isPlaying) pause();
    else play(currentTrack);
  };

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} maxHeight="85%">
      <View style={styles.container}>
        <View style={[styles.artworkFrame, getElevation('lg', isDark)]}>
          <Image
            source={{ uri: currentTrack.artworkUrl }}
            style={styles.artwork}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={styles.titleBlock}>
          <Text
            numberOfLines={3}
            style={[typography.title2, { color: colors.text, textAlign: 'center' }]}
          >
            {currentTrack.title}
          </Text>
          {!!currentTrack.speaker && (
            <Text
              numberOfLines={1}
              style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}
            >
              {currentTrack.speaker}
            </Text>
          )}
        </View>

        {/* Progress bar — display-only for v1; scrubbing is a follow-up */}
        <View style={styles.progressBlock}>
          <View style={[styles.progressTrack, { backgroundColor: colors.separator }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: goldColor },
              ]}
            />
          </View>
          <View style={styles.timeRow}>
            <Text style={[typography.caption1, { color: colors.textTertiary }]}>
              {formatTime(currentTime)}
            </Text>
            <Text style={[typography.caption1, { color: colors.textTertiary }]}>
              {formatTime(duration)}
            </Text>
          </View>
        </View>

        <View style={styles.transport}>
          <Pressable
            onPress={() => skipBackward(15)}
            style={styles.skipButton}
            accessibilityRole="button"
            accessibilityLabel={t('lessons.skipBackward')}
            hitSlop={12}
          >
            <Ionicons name="play-back" size={28} color={colors.text} />
            <Text style={[typography.caption2, { color: colors.textTertiary, position: 'absolute', bottom: -4 }]}>
              15
            </Text>
          </Pressable>

          <Pressable
            onPress={togglePlay}
            style={[styles.playButton, { backgroundColor: goldColor }]}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? t('lessons.pause') : t('lessons.play')}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color={palette.white}
              style={isPlaying ? undefined : styles.playIconNudge}
            />
          </Pressable>

          <Pressable
            onPress={() => skipForward(30)}
            style={styles.skipButton}
            accessibilityRole="button"
            accessibilityLabel={t('lessons.skipForward')}
            hitSlop={12}
          >
            <Ionicons name="play-forward" size={28} color={colors.text} />
            <Text style={[typography.caption2, { color: colors.textTertiary, position: 'absolute', bottom: -4 }]}>
              30
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
    alignItems: 'center',
  },
  artworkFrame: {
    width: 240,
    height: 240,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
  titleBlock: {
    width: '100%',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  progressBlock: {
    width: '100%',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3xl'],
  },
  skipButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconNudge: {
    marginLeft: 3,
  },
});
