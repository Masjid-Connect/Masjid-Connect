import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Calendar, DateData } from 'react-native-calendars';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
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
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { events, isLoading, selectedCategory, setSelectedCategory, refresh } = useEvents();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<MosqueEvent | null>(null);

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

  const buildAddToCalendarUrl = (event: MosqueEvent): string => {
    const dateStr = event.event_date.split('T')[0] || event.event_date;
    const start = `${dateStr.replace(/-/g, '')}T${event.start_time.replace(/:/g, '').slice(0, 4)}00`;
    const endTime = event.end_time || event.start_time;
    const end = `${dateStr.replace(/-/g, '')}T${endTime.replace(/:/g, '').slice(0, 4)}00`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${start}/${end}`,
    });
    if (event.description) params.set('details', event.description);
    if (event.expand?.mosque?.name) params.set('location', event.expand.mosque.name);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const handleAddToCalendar = (event: MosqueEvent) => {
    const url = buildAddToCalendarUrl(event);
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open calendar.'));
  };

  const renderEvent = ({ item, index }: { item: MosqueEvent; index: number }) => {
    const mosqueName = item.expand?.mosque?.name || '';
    const categoryColor = EVENT_CATEGORY_COLORS[item.category] || colors.accent;
    const dateStr = item.event_date.split('T')[0] || item.event_date;

    return (
      <Pressable onPress={() => setDetailEvent(item)}>
        <Animated.View
          entering={FadeInDown.delay(index * 60).duration(400).springify()}
          style={[
            styles.eventCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder, ...elevation.elevated },
          ]}>
          <View style={[styles.categoryStrip, { backgroundColor: categoryColor }]} />
          <View style={styles.eventContent}>
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
      </Pressable>
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

      {detailEvent && (
        <Modal visible={!!detailEvent} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setDetailEvent(null)}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.categoryBadge, { backgroundColor: (EVENT_CATEGORY_COLORS[detailEvent.category] || colors.accent) + '18' }]}>
                <Text style={[typography.caption, { color: EVENT_CATEGORY_COLORS[detailEvent.category] || colors.accent, fontWeight: '600' }]}>
                  {detailEvent.category.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <Text style={[typography.title2, { color: colors.text, marginTop: spacing.xs }]}>{detailEvent.title}</Text>
              {detailEvent.description ? (
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>{detailEvent.description}</Text>
              ) : null}
              {detailEvent.speaker ? (
                <Text style={[typography.callout, { color: colors.textSecondary, marginTop: spacing.sm }]}>Speaker: {detailEvent.speaker}</Text>
              ) : null}
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                {format(new Date(detailEvent.event_date.split('T')[0] || detailEvent.event_date), 'EEE, MMM d')} at {detailEvent.start_time}
                {detailEvent.end_time ? ` – ${detailEvent.end_time}` : ''}
              </Text>
              {detailEvent.expand?.mosque?.name ? (
                <Text style={[typography.caption, { color: colors.accent, marginTop: 4 }]}>{detailEvent.expand.mosque.name}</Text>
              ) : null}
              {detailEvent.recurring && (
                <Text style={[typography.caption, { color: colors.success, marginTop: 4, fontWeight: '500' }]}>Repeats {detailEvent.recurring}</Text>
              )}
              <TouchableOpacity
                onPress={() => handleAddToCalendar(detailEvent)}
                style={[styles.addToCalendarBtn, { backgroundColor: colors.tint }]}
              >
                <Text style={[typography.callout, { color: '#FFFFFF' }]}>Add to Calendar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDetailEvent(null)} style={[styles.modalClose, { borderColor: colors.divider }]}>
                <Text style={[typography.callout, { color: colors.tint }]}>Close</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  addToCalendarBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalClose: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
});
