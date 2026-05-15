/**
 * LessonFilterBar — chip row + collapsible search for the Lessons screen.
 *
 * Filter shape is a discriminated union:
 *   { kind: 'recent' }                 — default, no filter
 *   { kind: 'series'; name: string }   — show one series only
 *   { kind: 'search'; query: string }  — title-or-speaker substring match
 *
 * Chips are derived from the lesson data (series counts, descending) so
 * the row reflects what's actually in the archive rather than a static
 * label list. Council Seat 30 condition: no "trending" / "popular" /
 * progress indicators — chips are pure filters, not recommendations.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import {
  spacing,
  typography,
  borderRadius,
  fontWeight,
} from '@/constants/Theme';
import type { RecordedLesson } from '@/types';

export type LessonFilter =
  | { kind: 'recent' }
  | { kind: 'series'; name: string }
  | { kind: 'search'; query: string };

export interface LessonFilterBarProps {
  lessons: RecordedLesson[];
  filter: LessonFilter;
  onFilterChange: (filter: LessonFilter) => void;
}

/** Count lessons per series, return series names sorted by count desc.
 *  Only includes series with at least 2 lessons so single-item series
 *  don't clutter the chip row. */
function rankSeries(lessons: RecordedLesson[]): string[] {
  const counts = new Map<string, number>();
  for (const lesson of lessons) {
    if (!lesson.series) continue;
    counts.set(lesson.series, (counts.get(lesson.series) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

export const LessonFilterBar = ({
  lessons,
  filter,
  onFilterChange,
}: LessonFilterBarProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const isDark = effectiveScheme === 'dark';

  const [searchOpen, setSearchOpen] = useState(filter.kind === 'search');
  const [searchValue, setSearchValue] = useState(
    filter.kind === 'search' ? filter.query : '',
  );

  const seriesNames = useMemo(() => rankSeries(lessons), [lessons]);
  const accent = isDark ? palette.divineGoldBright : palette.divineGold;

  const pickRecent = useCallback(() => {
    Haptics.selectionAsync();
    setSearchOpen(false);
    setSearchValue('');
    onFilterChange({ kind: 'recent' });
  }, [onFilterChange]);

  const pickSeries = useCallback(
    (name: string) => {
      Haptics.selectionAsync();
      setSearchOpen(false);
      setSearchValue('');
      onFilterChange({ kind: 'series', name });
    },
    [onFilterChange],
  );

  const toggleSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (searchOpen) {
      // Collapsing search clears the filter back to recent.
      setSearchOpen(false);
      setSearchValue('');
      onFilterChange({ kind: 'recent' });
    } else {
      setSearchOpen(true);
    }
  }, [searchOpen, onFilterChange]);

  const onSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (value.trim().length === 0) {
        onFilterChange({ kind: 'recent' });
      } else {
        onFilterChange({ kind: 'search', query: value });
      }
    },
    [onFilterChange],
  );

  const isRecent = filter.kind === 'recent';

  return (
    <View>
      {/* Chip row + search toggle */}
      <View style={styles.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          <Chip
            label={t('lessons.filterRecent')}
            active={isRecent}
            accent={accent}
            colors={colors}
            onPress={pickRecent}
          />
          {seriesNames.map((name) => {
            const active = filter.kind === 'series' && filter.name === name;
            return (
              <Chip
                key={name}
                label={name}
                active={active}
                accent={accent}
                colors={colors}
                onPress={() => pickSeries(name)}
              />
            );
          })}
        </ScrollView>
        <Pressable
          style={[
            styles.searchToggle,
            { borderColor: colors.separator, backgroundColor: colors.card },
          ]}
          onPress={toggleSearch}
          accessibilityRole="button"
          accessibilityLabel={t('lessons.searchToggle')}
          accessibilityState={{ expanded: searchOpen }}
          hitSlop={8}
        >
          <Ionicons
            name={searchOpen ? 'close' : 'search'}
            size={18}
            color={colors.text}
          />
        </Pressable>
      </View>

      {/* Search field — only when open */}
      {searchOpen && (
        <View
          style={[
            styles.searchField,
            { backgroundColor: colors.card, borderColor: colors.separator },
          ]}
        >
          <Ionicons
            name="search"
            size={16}
            color={colors.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={t('lessons.searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            style={[typography.body, styles.searchInput, { color: colors.text }]}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            returnKeyType="search"
            accessibilityLabel={t('lessons.searchPlaceholder')}
          />
        </View>
      )}
    </View>
  );
};

interface ChipProps {
  label: string;
  active: boolean;
  accent: string;
  colors: ReturnType<typeof getColors>;
  onPress: () => void;
}

const Chip = ({ label, active, accent, colors, onPress }: ChipProps) => (
  <Pressable
    style={[
      styles.chip,
      {
        backgroundColor: active ? accent : colors.card,
        borderColor: active ? accent : colors.separator,
      },
    ]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    accessibilityLabel={label}
  >
    <Text
      numberOfLines={1}
      style={[
        typography.footnote,
        {
          color: active ? '#000' : colors.text,
          fontWeight: active ? fontWeight.semibold : fontWeight.regular,
        },
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  chipScroll: {
    paddingRight: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  searchToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
});
