import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  SectionListData,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Share,
  Platform,
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow, isToday, isThisWeek, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { getColors, getAlpha } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, badge } from '@/constants/Theme';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useReadAnnouncements } from '@/hooks/useReadAnnouncements';
import { BottomSheet } from '@/components/ui/BottomSheet';
import type { Announcement } from '@/types';

// ─── Time grouping ──────────────────────────────────────────────────
type SectionKey = 'today' | 'thisWeek' | 'earlier';

function getSectionKey(dateStr: string): SectionKey {
  const date = new Date(dateStr);
  if (isToday(date)) return 'today';
  if (isThisWeek(date, { weekStartsOn: 1 })) return 'thisWeek';
  return 'earlier';
}

function groupByTime(
  announcements: Announcement[],
  sectionLabels: Record<SectionKey, string>,
): { title: string; key: SectionKey; data: Announcement[] }[] {
  const groups: Record<SectionKey, Announcement[]> = {
    today: [],
    thisWeek: [],
    earlier: [],
  };

  // Sort urgent first within each group, then by date descending
  const sorted = [...announcements].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'urgent' ? -1 : 1;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });

  for (const item of sorted) {
    const key = item.published_at ? getSectionKey(item.published_at) : 'earlier';
    groups[key].push(item);
  }

  const order: SectionKey[] = ['today', 'thisWeek', 'earlier'];
  return order
    .filter((key) => groups[key].length > 0)
    .map((key) => ({ title: sectionLabels[key], key, data: groups[key] }));
}

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList<Announcement>);

// ─── Screen ─────────────────────────────────────────────────────────

export default function AnnouncementsScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const alphaColors = getAlpha(effectiveScheme);
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'ar' ? ar : undefined;
  const { announcements, isLoading, error, refresh } = useAnnouncements();
  const { isUnread, markRead } = useReadAnnouncements();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedItem, setExpandedItem] = useState<Announcement | null>(null);
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  // ─── Large title collapse animation ────────────────────────────
  const HEADER_HEIGHT = 44;
  const LARGE_TITLE_HEIGHT = 52;
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

  const sectionLabels: Record<SectionKey, string> = useMemo(
    () => ({
      today: t('announcements.today'),
      thisWeek: t('announcements.thisWeek'),
      earlier: t('announcements.earlier'),
    }),
    [t],
  );

  const sections = useMemo(
    () => groupByTime(announcements, sectionLabels),
    [announcements, sectionLabels],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handlePress = useCallback(
    (item: Announcement) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      markRead(item.id);
      setExpandedItem(item);
    },
    [markRead],
  );

  const handleShare = useCallback(
    async (item: Announcement) => {
      const mosqueName = item.expand?.mosque?.name || '';
      const content = mosqueName
        ? `${item.title}\n\n${item.body}\n\n— ${mosqueName}`
        : `${item.title}\n\n${item.body}`;
      await Share.share({
        message: content,
        ...(Platform.OS === 'ios' ? { title: item.title } : {}),
      });
    },
    [],
  );

  const handleDismissSheet = useCallback(() => {
    setExpandedItem(null);
  }, []);

  // ─── Loading ────────────────────────────────────────────────────
  if (isLoading && announcements.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.staticHeader, { paddingTop: insets.top }]}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>
            {t('announcements.title')}
          </Text>
        </View>
        <View style={[styles.centered, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────
  if (error && announcements.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.staticHeader, { paddingTop: insets.top }]}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>
            {t('announcements.title')}
          </Text>
        </View>
        <View style={[styles.centered, { flex: 1 }]}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
          <Text
            style={[
              typography.headline,
              { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
            ]}>
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
  if (announcements.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.staticHeader, { paddingTop: insets.top }]}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>
            {t('announcements.title')}
          </Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.centeredScroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }>
          <Ionicons name="megaphone-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
          <Text
            style={[
              typography.headline,
              { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
            ]}>
            {t('announcements.empty')}
          </Text>
          <Text
            style={[
              typography.subhead,
              { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.sm },
            ]}>
            {t('announcements.emptyHint')}
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ─── List ───────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: Announcement; index: number }) => {
    const isUrgent = item.priority === 'urgent';
    const unread = isUnread(item.id);
    const mosqueName = item.expand?.mosque?.name || '';
    const timeAgo = item.published_at
      ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: dateLocale })
      : '';

    return (
      <Pressable
        onPress={() => handlePress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}${isUrgent ? `, ${t('announcements.urgent')}` : ''}${mosqueName ? `, ${mosqueName}` : ''}`}
      >
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(300) : FadeInDown.delay(Math.min(index * 40, 300)).duration(300).springify()}
          style={[
            styles.row,
            isUrgent && {
              backgroundColor: alphaColors.urgentBg,
              marginHorizontal: -spacing.lg,
              paddingHorizontal: spacing.lg,
              borderRadius: borderRadius.sm,
            },
          ]}>
          <View style={styles.rowInner}>
            {/* Unread indicator — leading-edge accent dot */}
            <View style={styles.unreadColumn}>
              {unread && (
                <View
                  style={[
                    styles.unreadDot,
                    {
                      backgroundColor: isUrgent ? colors.urgent : colors.accent,
                    },
                  ]}
                />
              )}
            </View>

            {/* Content */}
            <View style={styles.contentColumn}>
              {/* Meta: category + urgent badge */}
              <View style={styles.metaRow}>
                {isUrgent && (
                  <>
                    <View style={[styles.urgentDot, { backgroundColor: colors.urgent }]} />
                    <Text
                      style={[
                        typography.caption2,
                        { color: colors.urgent, fontWeight: '600', marginEnd: spacing.xs },
                      ]}>
                      {t('announcements.urgent')}
                    </Text>
                    {mosqueName ? (
                      <Text style={[typography.caption2, { color: colors.urgent, fontWeight: '600' }]}>
                        · {mosqueName.toUpperCase()}
                      </Text>
                    ) : null}
                  </>
                )}
                {!isUrgent && mosqueName ? (
                  <Text
                    style={[
                      typography.categoryLabel,
                      { color: colors.textSecondary },
                    ]}>
                    {mosqueName.toUpperCase()}
                  </Text>
                ) : null}
              </View>

              {/* Title — bold when unread, regular weight when read */}
              <Text
                style={[
                  typography.headline,
                  {
                    color: colors.text,
                    marginTop: spacing.xs,
                    fontWeight: unread ? '600' : '400',
                  },
                ]}>
                {item.title}
              </Text>

              {/* Body preview */}
              <Text
                style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.xs }]}
                numberOfLines={2}>
                {item.body}
              </Text>

              {/* Time */}
              <Text
                style={[
                  typography.caption1,
                  { color: colors.textTertiary, marginTop: spacing.sm, opacity: 0.7 },
                ]}>
                {timeAgo}
              </Text>
            </View>

            {/* Disclosure chevron */}
            <View style={styles.chevronColumn}>
              <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
            </View>
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListData<Announcement>;
  }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[typography.sectionHeader, { color: colors.textSecondary }]}>
        {section.title}
      </Text>
    </View>
  );

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: colors.separator }]} />
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
          {t('announcements.title')}
        </Animated.Text>
        {/* Separator appears with inline title */}
        <Animated.View
          style={[
            styles.headerSeparator,
            { backgroundColor: colors.separator },
            inlineHeaderOpacity,
          ]}
        />
      </View>

      <AnimatedSectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ItemSeparatorComponent={renderSeparator}
        ListHeaderComponent={
          <Animated.View style={[styles.largeTitleContainer, largeTitleStyle]}>
            <Text style={[typography.largeTitle, { color: colors.text }]}>
              {t('announcements.title')}
            </Text>
          </Animated.View>
        }
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + HEADER_HEIGHT }]}
        stickySectionHeadersEnabled
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

      {/* Detail bottom sheet */}
      <BottomSheet visible={!!expandedItem} onDismiss={handleDismissSheet}>
        {expandedItem && (
          <View>
            {/* Urgent badge */}
            {expandedItem.priority === 'urgent' && (
              <View style={[styles.urgentBadge, { backgroundColor: alphaColors.urgentBgEmphasis }]}>
                <Ionicons name="alert-circle" size={14} color={colors.urgent} />
                <Text
                  style={[
                    typography.caption2,
                    { color: colors.urgent, fontWeight: '700', marginLeft: spacing.xs },
                  ]}>
                  {t('announcements.urgent')}
                </Text>
              </View>
            )}

            {/* Mosque name */}
            {expandedItem.expand?.mosque?.name ? (
              <View style={[styles.mosqueRow, { marginTop: expandedItem.priority === 'urgent' ? spacing.md : 0 }]}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text
                  style={[
                    typography.footnote,
                    {
                      color: colors.textSecondary,
                      fontWeight: '500',
                      marginLeft: spacing.xs,
                    },
                  ]}>
                  {expandedItem.expand.mosque.name}
                </Text>
              </View>
            ) : null}

            {/* Title */}
            <Text style={[typography.title2, { color: colors.text, marginTop: spacing.md }]} accessibilityRole="header">
              {expandedItem.title}
            </Text>

            {/* Published date — full format */}
            {expandedItem.published_at && (
              <Text
                style={[
                  typography.footnote,
                  { color: colors.textTertiary, marginTop: spacing.sm },
                ]}>
                {t('announcements.publishedOn', {
                  date: format(new Date(expandedItem.published_at), 'EEEE, d MMMM yyyy'),
                })}
              </Text>
            )}

            {/* Body */}
            <Text
              style={[
                typography.body,
                {
                  color: colors.textSecondary,
                  marginTop: spacing.lg,
                  lineHeight: 26,
                },
              ]}>
              {expandedItem.body}
            </Text>
            <Text style={[typography.footnote, { color: colors.textTertiary, marginTop: spacing.lg, opacity: 0.7 }]}>
              {expandedItem.published_at
                ? formatDistanceToNow(new Date(expandedItem.published_at), { addSuffix: true, locale: dateLocale })
                : ''}
            </Text>

            {/* Actions */}
            <View style={[styles.sheetActions, { borderTopColor: colors.separator }]}>
              <Pressable
                style={[styles.sheetAction, { backgroundColor: alphaColors.actionBg }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleShare(expandedItem);
                }}>
                <Ionicons name="share-outline" size={18} color={colors.tint} />
                <Text style={[typography.subhead, { color: colors.tint, marginStart: spacing.sm }]}>
                  {t('announcements.share')}
                </Text>
              </Pressable>

              {isUnread(expandedItem.id) && (
                <Pressable
                  style={[styles.sheetAction, { backgroundColor: alphaColors.actionBg }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    markRead(expandedItem.id);
                    setExpandedItem(null);
                  }}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                  <Text style={[typography.subhead, { color: colors.success, marginStart: spacing.sm }]}>
                    {t('announcements.markRead')}
                  </Text>
                </Pressable>
              )}
            </View>
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
  centeredScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  listContent: {
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['3xl'],
  },
  sectionHeader: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  row: {
    paddingVertical: spacing.xl,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadColumn: {
    width: spacing.xl,
    paddingTop: badge.smallDotSize,
    alignItems: 'center',
  },
  unreadDot: {
    width: badge.dotSize,
    height: badge.dotSize,
    borderRadius: badge.dotSize / 2,
  },
  contentColumn: {
    flex: 1,
  },
  chevronColumn: {
    justifyContent: 'center',
    paddingLeft: spacing.sm,
    opacity: 0.4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.xl, // Align with content column
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentDot: {
    width: badge.smallDotSize,
    height: badge.smallDotSize,
    borderRadius: badge.smallDotSize / 2,
    marginEnd: spacing.xs,
  },
  retryBtn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  // Bottom sheet detail styles
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  mosqueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    marginTop: spacing['2xl'],
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
});
