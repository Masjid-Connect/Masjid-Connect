/**
 * LessonsContent — the Community > Lessons segment.
 *
 * Renders the recorded-lesson archive (Salafi Publications' SoundCloud
 * podcast feed). Tap a row → AudioProvider takes the track; the player
 * sheet opens on top. Dismissing the sheet leaves audio playing — the
 * lock-screen/control-center bindings keep transport accessible.
 */

import React, { useCallback, useState } from 'react';
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
import type { RecordedLesson } from '@/types';

export const LessonsContent = () => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const { lessons, isLoading, error, refresh } = useRecordedLessons();
  const { currentTrack, isPlaying, play } = useAudio();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleRowPress = useCallback((lesson: RecordedLesson) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    play(lesson);
    setSheetOpen(true);
  }, [play]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<RecordedLesson>) => (
    <LessonRow
      lesson={item}
      isCurrent={currentTrack?.id === item.id}
      isPlaying={isPlaying && currentTrack?.id === item.id}
      onPress={handleRowPress}
    />
  ), [currentTrack?.id, isPlaying, handleRowPress]);

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

  return (
    <View style={styles.container}>
      <FlatList
        data={lessons}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
              {t('lessons.empty')}
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
    paddingTop: spacing.md,
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
