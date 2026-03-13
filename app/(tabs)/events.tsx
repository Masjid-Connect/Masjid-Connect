import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Calendar, DateData } from 'react-native-calendars';
import { useRouter } from 'expo-router';

import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, getElevation, borderRadius, typography, components } from '@/constants/Theme';
import { patterns } from '@/lib/layoutGrid';
import { useEvents } from '@/hooks/useEvents';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { IslamicPattern } from '@/components/brand/IslamicPattern';
import type { MosqueEvent, EventCategory } from '@/types';
import { EVENT_CATEGORY_COLORS } from '@/types';
import { formatTimeString } from '@/lib/prayer';
import { getUse24h } from '@/lib/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORY_KEYS: (EventCategory | null)[] = [null, 'lesson', 'lecture', 'quran_school', 'youth', 'sisters', 'community'];

export default function EventsScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const router = useRouter();

  const CATEGORIES = CATEGORY_KEYS.map((key) => ({
    key,
    label: t(`events.categories.${key || 'all'}`),
  }));
  const { events, isLoading, error, selectedCategory, setSelectedCategory, refresh } = useEvents();
  const [refreshing, setRefreshing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<MosqueEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [use24h, setUse24h] = useState(false);

  useEffect(() => {
    getUse24h().then(setUse24h);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

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
    Linking.openURL(url).catch(() => Alert.alert(t('common.error'), t('common.calendarError')));
  };

  const renderEvent = ({ item, index }: { item: MosqueEvent; index: number }) => {
    const mosqueName = item.expand?.mosque?.name || '';
    const categoryColor = EVENT_CATEGORY_COLORS[item.category] || colors.accent;
    const dateStr = item.event_date.split('T')[0] || item.event_date;

    return (
      <Pressable onPress={() => setDetailEvent(item)}>
        <Animated.View
          entering={FadeInDown.delay(index * 50).duration(350).springify()}
          style={[
            styles.eventCard,
            { backgroundColor: colors.card, ...getElevation('sm', isDark) },
          ]}>
          {/* Left color accent */}
          <View style={[styles.categoryAccent, { backgroundColor: categoryColor }]} />
          <View style={styles.eventContent}>
            <Text style={[typography.categoryLabel, { color: categoryColor }]}>
              {item.category.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={[typography.headline, { color: colors.text, marginTop: spacing.xs }]}>
              {item.title}
            </Text>
            <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.xs }]}>
              {item.speaker ? `${item.speaker} · ` : ''}
              {format(new Date(dateStr), 'EEE, MMM d')} at {formatTimeString(item.start_time, use24h)}
              {item.end_time ? ` – ${formatTimeString(item.end_time, use24h)}` : ''}
            </Text>
            {mosqueName ? (
              <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                {mosqueName}
              </Text>
            ) : null}
            {item.recurring && (
              <Text style={[typography.caption1, { color: colors.success, marginTop: spacing.xs, fontWeight: '500' }]}>
                {t('events.repeats', { frequency: item.recurring })}
              </Text>
            )}
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Toolbar: calendar toggle + filter */}
      <View style={[styles.toolbar, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity
          onPress={() => setShowCalendar(!showCalendar)}
          style={styles.toolbarButton}
        >
          <Ionicons
            name={showCalendar ? 'calendar' : 'calendar-outline'}
            size={20}
            color={showCalendar ? colors.accent : colors.textSecondary}
          />
          <Text style={[typography.subhead, { color: showCalendar ? colors.accent : colors.textSecondary, marginLeft: spacing.xs }]}>
            {t('events.calendar')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          style={styles.toolbarButton}
        >
          <Ionicons name="funnel-outline" size={18} color={selectedCategory ? colors.accent : colors.textSecondary} />
          <Text style={[typography.subhead, { color: selectedCategory ? colors.accent : colors.textSecondary, marginLeft: spacing.xs }]}>
            {selectedCategory ? CATEGORIES.find((c) => c.key === selectedCategory)?.label : t('events.filter')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Calendar (expandable) */}
      {showCalendar && (
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
            textDisabledColor: colors.textTertiary,
          }}
        />
      )}

      {/* Selected date indicator */}
      {selectedDate && (
        <Pressable onPress={() => setSelectedDate(null)}>
          <View style={[styles.dateChip, { backgroundColor: colors.tintLight }]}>
            <Text style={[typography.footnote, { color: colors.tint }]}>
              {format(new Date(selectedDate), 'EEE, MMM d')}
            </Text>
            <Ionicons name="close-circle" size={16} color={colors.tint} style={{ marginLeft: spacing.xs }} />
          </View>
        </Pressable>
      )}

      {/* Event list */}
      {isLoading && events.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error && events.length === 0 ? (
        <View style={[styles.centered, { padding: spacing['3xl'] }]}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
          <Text style={[typography.headline, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg }]}>
            {t('common.networkError')}
          </Text>
          <Pressable onPress={handleRefresh} style={[styles.retryBtn, { borderColor: colors.tint }]}>
            <Text style={[typography.subhead, { color: colors.tint }]}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : filteredByDate.length === 0 ? (
        <View style={[styles.centered, { padding: spacing['3xl'] }]}>
          {/* Islamic pattern — brands the empty void */}
          <IslamicPattern
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            color={effectiveScheme === 'dark' ? palette.emerald400 : palette.emerald700}
            opacity={patterns.opacity}
            tileSize={patterns.tileSize}
          />
          <Text style={[typography.headline, { color: colors.textSecondary, textAlign: 'center' }]}>
            {t('events.empty')}
          </Text>
          <Text
            style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            {t('events.emptyHint')}
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

      {/* Filter bottom sheet */}
      <BottomSheet visible={showFilters} onDismiss={() => setShowFilters(false)}>
        <Text style={[typography.title3, { color: colors.text, marginBottom: spacing.lg }]}>{t('events.filterEvents')}</Text>
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.label}
              onPress={() => {
                setSelectedCategory(cat.key);
                setShowFilters(false);
              }}
              style={[
                styles.filterRow,
                { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
              ]}>
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{cat.label}</Text>
              {isActive && <Ionicons name="checkmark" size={20} color={colors.tint} />}
            </TouchableOpacity>
          );
        })}
      </BottomSheet>

      {/* Event detail bottom sheet */}
      <BottomSheet visible={!!detailEvent} onDismiss={() => setDetailEvent(null)}>
        {detailEvent && (
          <View>
            <Text style={[typography.categoryLabel, { color: EVENT_CATEGORY_COLORS[detailEvent.category] || colors.accent }]}>
              {detailEvent.category.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={[typography.title2, { color: colors.text, marginTop: spacing.sm }]}>
              {detailEvent.title}
            </Text>
            {detailEvent.description ? (
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
                {detailEvent.description}
              </Text>
            ) : null}
            {detailEvent.speaker ? (
              <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                {t('events.speaker', { name: detailEvent.speaker })}
              </Text>
            ) : null}
            <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              {format(new Date(detailEvent.event_date.split('T')[0] || detailEvent.event_date), 'EEEE, MMMM d')} at {formatTimeString(detailEvent.start_time, use24h)}
              {detailEvent.end_time ? ` – ${formatTimeString(detailEvent.end_time, use24h)}` : ''}
            </Text>
            {detailEvent.expand?.mosque?.name ? (
              <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                {detailEvent.expand.mosque.name}
              </Text>
            ) : null}
            {detailEvent.recurring && (
              <Text style={[typography.footnote, { color: colors.success, marginTop: spacing.xs, fontWeight: '500' }]}>
                {t('events.repeats', { frequency: detailEvent.recurring })}
              </Text>
            )}
            <TouchableOpacity
              onPress={() => handleAddToCalendar(detailEvent)}
              style={[styles.addBtn, { backgroundColor: colors.tint }]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.onPrimary} style={{ marginRight: spacing.sm }} />
              <Text style={[typography.headline, { color: colors.onPrimary }]}>{t('events.addToCalendar')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
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
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: spacing['3xl'],
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  listContent: {
    padding: spacing['3xl'],
    paddingTop: spacing.md,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  categoryAccent: {
    width: components.categoryAccent.width,
  },
  eventContent: {
    flex: 1,
    padding: spacing.lg,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.sm,
  },
  retryBtn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
});
