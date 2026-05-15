/**
 * LessonsContent — the Community > Lessons segment.
 *
 * Renders the recorded-lesson archive (Salafi Publications' SoundCloud
 * podcast feed). Filter bar at the top exposes:
 *   - "Recent" (default — all lessons, recency sort)
 *   - One chip per detected series (allow-list match, ≥2 lessons)
 *   - Search field (title or speaker, case-insensitive substring)
 *
 * Tap a row → AudioProvider takes the track; the player sheet opens on
 * top. Dismissing the sheet leaves audio playing — lock-screen / control-
 * centre bindings keep transport accessible.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, components, layout } from '@/constants/Theme';
import { useRecordedLessons } from '@/hooks/useRecordedLessons';
import { useAudio } from '@/contexts/AudioProvider';
import { LessonRow } from '@/components/community/LessonRow';
import { LessonPlayerSheet } from '@/components/community/LessonPlayerSheet';
import {
  LessonFilterBar,
  type LessonFilter,
} from '@/components/community/LessonFilterBar';
import type { RecordedLesson } from '@/types';

function applyFilter(
  lessons: RecordedLesson[],
  filter: LessonFilter,
): RecordedLesson[] {
  switch (filter.kind) {
    case 'recent':
      return lessons;
    case 'series':
      return lessons.filter((l) => l.series === filter.name);
    case 'search': {
      const q = filter.query.trim().toLowerCase();
      if (!q) return lessons;
      return lessons.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.speaker.toLowerCase().includes(q),
      );
    }
    default:
      return lessons;
  }
}

export const LessonsContent = () => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const { lessons, isLoading, error, refresh } = useRecordedLessons();
  const { currentTrack, isPlaying, play } = useAudio();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState<LessonFilter>({ kind: 'recent' });

  const filteredLessons = useMemo(
    () => applyFilter(lessons, filter),
    [lessons, filter],
  );

  const handleRowPress = useCallback(
    (lesson: RecordedLesson) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      play(lesson);
      setSheetOpen(true);
    },
    [play],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<RecordedLesson>) => (
      <LessonRow
        lesson={item}
        isCurrent={currentTrack?.id === item.id}
        isPlaying={isPlaying && currentTrack?.id === item.id}
        onPress={handleRowPress}
      />
    ),
    [currentTrack?.id, isPlaying, handleRowPress],
  );

  const keyExtractor = useCallback((item: RecordedLesson) => item.id, []);

  if (isLoading && lessons.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="musical-notes-outline" size={48} color={colors.textTertiary} />
        <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.md }]}>
          {t('lessons.loading')}
        </Text>
      </View>
    );
  }

  if (error && lessons.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={components.emptyState.iconSize} color={colors.textTertiary} />
        <Text style={[typography.title3, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
          {t('lessons.errorTitle')}
        </Text>
        <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
          {error}
        </Text>
      </View>
    );
  }

  const emptyMessage =
    filter.kind === 'series'
      ? t('lessons.emptyForSeries', { series: filter.name })
      : filter.kind === 'search'
        ? t('lessons.emptyForSearch', { query: filter.query })
        : t('lessons.empty');

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredLessons}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <LessonFilterBar
            lessons={lessons}
            filter={filter}
            onFilterChange={setFilter}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading && lessons.length > 0}
            onRefresh={refresh}
            tintColor={colors.text}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="musical-notes-outline" size={48} color={colors.textTertiary} />
            <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }]}>
              {emptyMessage}
            </Text>
          </View>
        }
      />

      <LessonPlayerSheet visible={sheetOpen} onDismiss={() => setSheetOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: spacing.xs,
    paddingBottom: layout.screenBottomPad,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing['5xl'],
  },
});
