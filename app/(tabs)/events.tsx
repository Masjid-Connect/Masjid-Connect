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
import Animated, {
  FadeInDown,
  FadeIn,
  useReducedMotion,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Calendar, DateData } from 'react-native-calendars';

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

const HEADER_HEIGHT = 44;
const LARGE_TITLE_HEIGHT = 52;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<MosqueEvent>);

export default function EventsScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'ar' ? ar : undefined;
  const insets = useSafeAreaInsets();

  // ─── Large title collapse animation ────────────────────────────
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, LARGE_TITLE_HEIGHT], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, LARGE_TITLE_HEIGHT],
          [0, -LARGE_TITLE_HEIGHT / 2],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const inlineHeaderOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [LARGE_TITLE_HEIGHT - 10, LARGE_TITLE_HEIGHT], [0, 1], Extrapolation.CLAMP),
  }));

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
  const reducedMotion = useReducedMotion();
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

  const filteredByDate = useMemo(
    () => selectedDate
      ? events.filter((e) => (e.event_date.split('T')[0] || e.event_date) === selectedDate)
      : events,
    [events, selectedDate]
  );

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
      <Pressable
        onPress={() => setDetailEvent(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${item.category.replace('_', ' ')}, ${format(new Date(dateStr), 'EEE, MMM d', { locale: dateLocale })} at ${item.start_time}${mosqueName ? `, ${mosqueName}` : ''}`}
      >
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(300) : FadeInDown.delay(Math.min(index * 50, 300)).duration(350).springify()}
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
              {format(new Date(dateStr), 'EEE, MMM d', { locale: dateLocale })} at {formatTimeString(item.start_time, use24h)}
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

  // ─── Loading ────────────────────────────────────────────────────
  if (isLoading && events.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.staticHeader, { paddingTop: insets.top }]}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>
            {t('events.title')}
          </Text>
        </View>
        <View style={[styles.centered, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────
  if (error && events.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.staticHeader, { paddingTop: insets.top }]}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>
            {t('events.title')}
          </Text>
        </View>
        <View style={[styles.centered, { flex: 1 }]}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
          <Text style={[typography.headline, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg }]}>
            {t('common.networkError')}
          </Text>
          <Pressable onPress={handleRefresh} style={[styles.retryBtn, { borderColor: colors.tint }]}>
            <Text style={[typography.subhead, { color: colors.tint }]}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Empty ──────────────────────────────────────────────────────
  if (filteredByDate.length === 0 && !isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.staticHeader, { paddingTop: insets.top }]}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>
            {t('events.title')}
          </Text>
        </View>
        {/* Toolbar */}
        <View style={[styles.toolbar, { borderBottomColor: colors.separator }]}>
          <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)} style={styles.toolbarButton}>
            <Ionicons name={showCalendar ? 'calendar' : 'calendar-outline'} size={20} color={showCalendar ? colors.accent : colors.textSecondary} />
            <Text style={[typography.subhead, { color: showCalendar ? colors.accent : colors.textSecondary, marginLeft: spacing.xs }]}>
              {t('events.calendar')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.toolbarButton}>
            <Ionicons name="funnel-outline" size={18} color={selectedCategory ? colors.accent : colors.textSecondary} />
            <Text style={[typography.subhead, { color: selectedCategory ? colors.accent : colors.textSecondary, marginLeft: spacing.xs }]}>
              {selectedCategory ? CATEGORIES.find((c) => c.key === selectedCategory)?.label : t('events.filter')}
            </Text>
          </TouchableOpacity>
        </View>
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
        <View style={[styles.centered, { flex: 1 }]}>
          <IslamicPattern
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            color={effectiveScheme === 'dark' ? palette.sapphire400 : palette.sapphire700}
            opacity={isDark ? patterns.opacityDark : patterns.opacity}
            tileSize={patterns.tileSize}
          />
          <Text style={[typography.headline, { color: colors.textSecondary, textAlign: 'center' }]}>
            {t('events.empty')}
          </Text>
          <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            {t('events.emptyHint')}
          </Text>
        </View>

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
      </View>
    );
  }

  // ─── List header component (large title + toolbar) ─────────────
  const listHeader = (
    <>
      <Animated.View style={[styles.largeTitleContainer, largeTitleStyle]}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>
          {t('events.title')}
        </Text>
      </Animated.View>

      {/* Toolbar: calendar toggle + filter */}
      <View style={[styles.toolbar, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity
          onPress={() => setShowCalendar(!showCalendar)}
          style={styles.toolbarButton}
          accessibilityRole="button"
          accessibilityState={{ expanded: showCalendar }}
          accessibilityLabel={t('events.calendar')}
        >
          <Ionicons name={showCalendar ? 'calendar' : 'calendar-outline'} size={20} color={showCalendar ? colors.accent : colors.textSecondary} />
          <Text style={[typography.subhead, { color: showCalendar ? colors.accent : colors.textSecondary, marginStart: spacing.xs }]}>
            {t('events.calendar')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          style={styles.toolbarButton}
          accessibilityRole="button"
          accessibilityLabel={selectedCategory ? CATEGORIES.find((c) => c.key === selectedCategory)?.label : t('events.filter')}
        >
          <Ionicons name="funnel-outline" size={18} color={selectedCategory ? colors.accent : colors.textSecondary} />
          <Text style={[typography.subhead, { color: selectedCategory ? colors.accent : colors.textSecondary, marginStart: spacing.xs }]}>
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
        <Pressable
          onPress={() => setSelectedDate(null)}
          accessibilityRole="button"
          accessibilityLabel={`${format(new Date(selectedDate), 'EEE, MMM d', { locale: dateLocale })}, ${t('common.clearFilter')}`}
        >
          <View style={[styles.dateChip, { backgroundColor: colors.tintLight }]}>
            <Text style={[typography.footnote, { color: colors.tint }]}>
              {format(new Date(selectedDate), 'EEE, MMM d', { locale: dateLocale })}
            </Text>
            <Ionicons name="close-circle" size={16} color={colors.tint} style={{ marginStart: spacing.xs }} />
          </View>
        </Pressable>
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Inline header — appears when large title scrolls away */}
      <View style={[styles.inlineHeader, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT, backgroundColor: colors.background }]}>
        <Animated.Text
          style={[
            typography.headline,
            { color: colors.text, textAlign: 'center' },
            inlineHeaderOpacity,
          ]}>
          {t('events.title')}
        </Animated.Text>
        <Animated.View
          style={[
            styles.headerSeparator,
            { backgroundColor: colors.separator },
            inlineHeaderOpacity,
          ]}
        />
      </View>

      <AnimatedFlatList
        data={filteredByDate}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + HEADER_HEIGHT }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
      />

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
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={cat.label}
            >
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
              {format(new Date(detailEvent.event_date.split('T')[0] || detailEvent.event_date), 'EEEE, MMMM d', { locale: dateLocale })} at {formatTimeString(detailEvent.start_time, use24h)}
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
              <Ionicons name="calendar-outline" size={18} color={colors.onPrimary} style={{ marginEnd: spacing.sm }} />
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
  // ─── Large title header ────────────────────────────────────────
  inlineHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSeparator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  staticHeader: {
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing.md,
  },
  largeTitleContainer: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
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
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['3xl'],
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
