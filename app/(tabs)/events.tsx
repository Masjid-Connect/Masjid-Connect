import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Calendar, DateData } from 'react-native-calendars';

import { getColors } from '@/constants/Colors';
import { spacing, elevation, borderRadius, typography } from '@/constants/Theme';
import { useEvents } from '@/hooks/useEvents';
import type { MosqueEvent, EventCategory } from '@/types';
import { EVENT_CATEGORY_COLORS } from '@/types';

const CATEGORIES: { key: EventCategory | null; label: string }[] = [
  { key: null, label: 'All' },
  { key: 'lesson', label: 'Lessons' },
  { key: 'lecture', label: 'Lectures' },
  { key: 'quran_circle', label: 'Quran' },
  { key: 'youth', label: 'Youth' },
  { key: 'sisters', label: 'Sisters' },
  { key: 'community', label: 'Community' },
];

export default function EventsScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const { events, isLoading, selectedCategory, setSelectedCategory, refresh } = useEvents();
  const [refreshing, setRefreshing] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Build marked dates for calendar
  const markedDates = useMemo(() => {
    const marks: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }> = {};
    for (const event of events) {
      const dateKey = event.event_date.split('T')[0] || event.event_date;
      marks[dateKey] = {
        marked: true,
        dotColor: EVENT_CATEGORY_COLORS[event.category] || colors.accent,
        ...(selectedDate === dateKey && {
          selected: true,
          selectedColor: colors.accent,
        }),
      };
    }
    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = {
        marked: false,
        dotColor: colors.accent,
        selected: true,
        selectedColor: colors.accent,
      };
    }
    return marks;
  }, [events, selectedDate, colors.accent]);

  const filteredByDate = selectedDate
    ? events.filter((e) => (e.event_date.split('T')[0] || e.event_date) === selectedDate)
    : events;

  const renderEvent = ({ item, index }: { item: MosqueEvent; index: number }) => {
    const mosqueName = item.expand?.mosque?.name || '';
    const categoryColor = EVENT_CATEGORY_COLORS[item.category] || colors.accent;
    const dateStr = item.event_date.split('T')[0] || item.event_date;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 60).duration(400).springify()}
        style={[
          styles.eventCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder, ...elevation.elevated },
        ]}>
        {/* Category strip */}
        <View style={[styles.categoryStrip, { backgroundColor: categoryColor }]} />

        <View style={styles.eventContent}>
          {/* Category badge */}
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '18' }]}>
            <Text style={[typography.caption, { color: categoryColor, fontWeight: '600' }]}>
              {item.category.replace('_', ' ').toUpperCase()}
            </Text>
          </View>

          <Text style={[typography.title3, { color: colors.text, marginTop: spacing.xs }]}>
            {item.title}
          </Text>

          {item.speaker ? (
            <Text style={[typography.callout, { color: colors.textSecondary, marginTop: 4 }]}>
              Speaker: {item.speaker}
            </Text>
          ) : null}

          <View style={styles.eventMeta}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {format(new Date(dateStr), 'EEE, MMM d')} at {item.start_time}
              {item.end_time ? ` - ${item.end_time}` : ''}
            </Text>
          </View>

          {mosqueName ? (
            <Text style={[typography.caption, { color: colors.accent, marginTop: 4 }]}>
              {mosqueName}
            </Text>
          ) : null}

          {item.recurring && (
            <Text style={[typography.caption, { color: colors.success, marginTop: 4, fontWeight: '500' }]}>
              Repeats {item.recurring}
            </Text>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* View mode toggle */}
      <View style={[styles.toggleRow, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          onPress={() => setViewMode('list')}
          style={[
            styles.toggleButton,
            viewMode === 'list' && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
          ]}>
          <Text style={[typography.callout, { color: viewMode === 'list' ? colors.accent : colors.textSecondary }]}>
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('calendar')}
          style={[
            styles.toggleButton,
            viewMode === 'calendar' && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
          ]}>
          <Text
            style={[
              typography.callout,
              { color: viewMode === 'calendar' ? colors.accent : colors.textSecondary },
            ]}>
            Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}>
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.label}
              onPress={() => setSelectedCategory(cat.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? colors.tint : colors.card,
                  borderColor: isActive ? colors.tint : colors.cardBorder,
                },
              ]}>
              <Text
                style={[
                  typography.caption,
                  { color: isActive ? '#FFFFFF' : colors.textSecondary, fontWeight: '600' },
                ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <Calendar
          markedDates={markedDates}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString === selectedDate ? null : day.dateString)}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.background,
            textSectionTitleColor: colors.textSecondary,
            todayTextColor: colors.accent,
            dayTextColor: colors.text,
            monthTextColor: colors.text,
            arrowColor: colors.accent,
            textDisabledColor: colors.divider,
          }}
        />
      )}

      {/* Event list */}
      {isLoading && events.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : filteredByDate.length === 0 ? (
        <View style={[styles.centered, { padding: spacing.xl }]}>
          <Text style={[typography.title3, { color: colors.textSecondary, textAlign: 'center' }]}>
            No upcoming events
          </Text>
          <Text
            style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            Subscribe to a mosque to see events
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredByDate}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
  },
  chipRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  listContent: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 0.5,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  categoryStrip: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: spacing.lg,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
