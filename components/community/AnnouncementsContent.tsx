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
import Animated, { FadeInDown } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow, isToday, isThisWeek, format } from 'date-fns';
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

interface AnnouncementsContentProps {
  onScroll?: ReturnType<typeof import('react-native-reanimated').useAnimatedScrollHandler>;
}

export const AnnouncementsContent = ({ onScroll }: AnnouncementsContentProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const alphaColors = getAlpha(effectiveScheme);
  const { t } = useTranslation();
  const { announcements, isLoading, error, refresh } = useAnnouncements();
  const { isUnread, markRead } = useReadAnnouncements();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedItem, setExpandedItem] = useState<Announcement | null>(null);

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
      <View style={[styles.centered, { flex: 1 }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────
  if (error && announcements.length === 0) {
    return (
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
    );
  }

  // ─── Empty ──────────────────────────────────────────────────────
  if (announcements.length === 0) {
    return (
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
    );
  }

  // ─── List ───────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: Announcement; index: number }) => {
    const isUrgent = item.priority === 'urgent';
    const unread = isUnread(item.id);
    const mosqueName = item.expand?.mosque?.name || '';
    const timeAgo = item.published_at
      ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true })
      : '';

    return (
      <Pressable onPress={() => handlePress(item)}>
        <Animated.View
          entering={FadeInDown.delay(index * 40).duration(300).springify()}
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
            <View style={styles.unreadColumn}>
              {unread && (
                <View
                  style={[
                    styles.unreadDot,
                    { backgroundColor: isUrgent ? colors.urgent : colors.accent },
                  ]}
                />
              )}
            </View>

            <View style={styles.contentColumn}>
              <View style={styles.metaRow}>
                {isUrgent && (
                  <>
                    <View style={[styles.urgentDot, { backgroundColor: colors.urgent }]} />
                    <Text
                      style={[
                        typography.caption2,
                        { color: colors.urgent, fontWeight: '600', marginRight: spacing.xs },
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
                  <Text style={[typography.categoryLabel, { color: colors.textSecondary }]}>
                    {mosqueName.toUpperCase()}
                  </Text>
                ) : null}
              </View>

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

              <Text
                style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.xs }]}
                numberOfLines={2}>
                {item.body}
              </Text>

              <Text
                style={[
                  typography.caption1,
                  { color: colors.textTertiary, marginTop: spacing.sm, opacity: 0.7 },
                ]}>
                {timeAgo}
              </Text>
            </View>

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
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Detail bottom sheet */}
      <BottomSheet visible={!!expandedItem} onDismiss={handleDismissSheet}>
        {expandedItem && (
          <View>
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

            {expandedItem.expand?.mosque?.name ? (
              <View style={[styles.mosqueRow, { marginTop: expandedItem.priority === 'urgent' ? spacing.md : 0 }]}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text
                  style={[
                    typography.footnote,
                    { color: colors.textSecondary, fontWeight: '500', marginLeft: spacing.xs },
                  ]}>
                  {expandedItem.expand.mosque.name}
                </Text>
              </View>
            ) : null}

            <Text style={[typography.title2, { color: colors.text, marginTop: spacing.md }]}>
              {expandedItem.title}
            </Text>

            {expandedItem.published_at && (
              <Text
                style={[typography.footnote, { color: colors.textTertiary, marginTop: spacing.sm }]}>
                {t('announcements.publishedOn', {
                  date: format(new Date(expandedItem.published_at), 'EEEE, d MMMM yyyy'),
                })}
              </Text>
            )}

            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: spacing.lg, lineHeight: 26 },
              ]}>
              {expandedItem.body}
            </Text>

            <View style={[styles.sheetActions, { borderTopColor: colors.separator }]}>
              <Pressable
                style={[styles.sheetAction, { backgroundColor: alphaColors.actionBg }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleShare(expandedItem);
                }}>
                <Ionicons name="share-outline" size={18} color={colors.tint} />
                <Text style={[typography.subhead, { color: colors.tint, marginLeft: spacing.sm }]}>
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
                  <Text style={[typography.subhead, { color: colors.success, marginLeft: spacing.sm }]}>
                    {t('announcements.markRead')}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
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
    marginLeft: spacing.xl,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentDot: {
    width: badge.smallDotSize,
    height: badge.smallDotSize,
    borderRadius: badge.smallDotSize / 2,
    marginRight: spacing.xs,
  },
  retryBtn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
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
