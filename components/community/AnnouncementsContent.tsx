import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  SectionListData,
  ScrollView,
  RefreshControl,
  Pressable,
  Share,
  Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeIn, useReducedMotion } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow, isToday, isThisWeek, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { getColors, getAlpha, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, fontWeight, hairline } from '@/constants/Theme';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useReadAnnouncements } from '@/hooks/useReadAnnouncements';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { GoldBadge } from '@/components/brand/GoldBadge';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
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

  const priorityOrder: Record<string, number> = { janazah: 0, urgent: 1, normal: 2 };
  const sorted = [...announcements].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 2;
    const pb = priorityOrder[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
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
  const isDark = effectiveScheme === 'dark';
  const alphaColors = getAlpha(effectiveScheme);
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
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
    return <ListSkeleton rows={4} />;
  }

  // ─── Error ──────────────────────────────────────────────────────
  if (error && announcements.length === 0) {
    return (
      <View style={[styles.centered, { flex: 1 }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} accessibilityLabel={t('common.networkError')} />
        <Text
          style={[
            typography.headline,
            { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
          ]}>
          {t('common.networkError')}
        </Text>
        <Pressable
          onPress={handleRefresh}
          style={[styles.retryBtn, { borderColor: colors.tint }]}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
        >
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
        <Ionicons name="megaphone-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} accessibilityLabel={t('announcements.empty')} />
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
  const renderItem = ({ item, index, section }: { item: Announcement; index: number; section: SectionListData<Announcement> }) => {
    const isUrgent = item.priority === 'urgent';
    const isJanazah = item.priority === 'janazah';
    const isHighPriority = isUrgent || isJanazah;
    const unread = isUnread(item.id);
    const mosqueName = item.expand?.mosque?.name || '';
    const timeAgo = item.published_at
      ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true })
      : '';
    const isLast = index === section.data.length - 1;

    const priorityBg = isJanazah ? alphaColors.janazahBg : isUrgent ? alphaColors.urgentBg : undefined;

    return (
      <Pressable
        onPress={() => handlePress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}${isJanazah ? `, ${t('announcements.janazah')}` : isUrgent ? `, ${t('announcements.urgent')}` : ''}${mosqueName ? `, ${mosqueName}` : ''}${unread ? `, ${t('announcements.unread')}` : ''}`}
      >
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(300) : FadeInDown.delay(Math.min(index * 40, 300)).duration(300).springify()}
          style={[
            styles.row,
            priorityBg ? { backgroundColor: priorityBg } : undefined,
          ]}>
          {/* Priority accent bar — left edge visual cue */}
          {isHighPriority && (
            <View style={{
              position: 'absolute',
              left: 0,
              top: 4,
              bottom: 4,
              width: 3,
              borderRadius: 2,
              backgroundColor: isJanazah ? (isDark ? palette.divineGoldBright : palette.divineGold) : palette.crimson600,
            }} />
          )}
          <View style={[
            styles.rowInner,
            !isLast && styles.rowSeparator,
            !isLast && { borderBottomColor: colors.separator },
          ]}>
            {/* Unread indicator — GoldBadge dot */}
            <View style={styles.unreadColumn}>
              {unread && (
                <GoldBadge
                  size={10}
                  color={isUrgent ? colors.urgent : undefined}
                />
              )}
            </View>

            {/* Content */}
            <View style={styles.contentColumn}>
              <View style={styles.metaRow}>
                {isJanazah && (
                  <>
                    <Ionicons name="moon-outline" size={12} color={colors.accent} accessibilityLabel={t('announcements.janazah')} />
                    <Text
                      style={[
                        typography.caption2,
                        { color: colors.accentText, fontWeight: fontWeight.semibold, marginStart: spacing.xs, marginEnd: spacing.xs },
                      ]}>
                      {t('announcements.janazah')}
                    </Text>
                    {mosqueName ? (
                      <Text style={[typography.caption2, { color: colors.accentText, fontWeight: fontWeight.semibold }]}>
                        · {mosqueName.toUpperCase()}
                      </Text>
                    ) : null}
                  </>
                )}
                {isUrgent && (
                  <>
                    <Ionicons name="alert-circle" size={12} color={colors.urgent} accessibilityLabel={t('announcements.urgent')} />
                    <Text
                      style={[
                        typography.caption2,
                        { color: colors.urgent, fontWeight: fontWeight.semibold, marginStart: spacing.xs, marginEnd: spacing.xs },
                      ]}>
                      {t('announcements.urgent')}
                    </Text>
                    {mosqueName ? (
                      <Text style={[typography.caption2, { color: colors.urgent, fontWeight: fontWeight.semibold }]}>
                        · {mosqueName.toUpperCase()}
                      </Text>
                    ) : null}
                  </>
                )}
                {!isHighPriority && mosqueName ? (
                  <Text style={[typography.categoryLabel, { color: colors.textSecondary }]}>
                    {mosqueName.toUpperCase()}
                  </Text>
                ) : null}
              </View>

              <Text
                style={[
                  unread ? typography.headline : typography.body,
                  {
                    color: colors.text,
                    marginTop: spacing.xs,
                  },
                ]}
                numberOfLines={2}>
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
                  { color: colors.textTertiary, marginTop: spacing.sm },
                ]}>
                {timeAgo}
              </Text>
            </View>

            {/* Disclosure chevron */}
            <View style={styles.chevronColumn}>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} accessibilityLabel="" />
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

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
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
            {expandedItem.priority === 'janazah' && (
              <View style={[styles.urgentBadge, { backgroundColor: alphaColors.janazahBgEmphasis }]}>
                <Ionicons name="moon-outline" size={14} color={colors.accent} />
                <Text
                  style={[
                    typography.caption2,
                    { color: colors.accentText, fontWeight: fontWeight.bold, marginStart: spacing.xs },
                  ]}>
                  {t('announcements.janazah')}
                </Text>
              </View>
            )}
            {expandedItem.priority === 'urgent' && (
              <View style={[styles.urgentBadge, { backgroundColor: alphaColors.urgentBgEmphasis }]}>
                <Ionicons name="alert-circle" size={14} color={colors.urgent} />
                <Text
                  style={[
                    typography.caption2,
                    { color: colors.urgent, fontWeight: fontWeight.bold, marginStart: spacing.xs },
                  ]}>
                  {t('announcements.urgent')}
                </Text>
              </View>
            )}

            {expandedItem.expand?.mosque?.name ? (
              <View style={[styles.mosqueRow, { marginTop: expandedItem.priority !== 'normal' ? spacing.md : 0 }]}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} accessibilityLabel={t('announcements.location')} />
                <Text
                  style={[
                    typography.footnote,
                    { color: colors.textSecondary, fontWeight: fontWeight.medium, marginStart: spacing.xs },
                  ]}>
                  {expandedItem.expand.mosque.name}
                </Text>
              </View>
            ) : null}

            <Text style={[typography.title2, { color: colors.text, marginTop: spacing.md }]} accessibilityRole="header">
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
                }}
                accessibilityRole="button"
                accessibilityLabel={t('announcements.share')}
              >
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
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('announcements.markRead')}
                >
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
    paddingStart: spacing.lg,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
    paddingEnd: spacing.lg,
  },
  rowSeparator: {
    borderBottomWidth: hairline,
  },
  unreadColumn: {
    width: spacing.xl,
    paddingTop: spacing.xs,
    alignItems: 'center',
  },
  contentColumn: {
    flex: 1,
  },
  chevronColumn: {
    justifyContent: 'center',
    paddingStart: spacing.sm,
    paddingTop: spacing.xs,
    opacity: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderTopWidth: hairline,
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
