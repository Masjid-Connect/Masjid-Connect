import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow, isToday, isThisWeek } from 'date-fns';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/Theme';
import { useAnnouncements } from '@/hooks/useAnnouncements';
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

// ─── Screen ─────────────────────────────────────────────────────────

export default function AnnouncementsScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const { announcements, isLoading, error, refresh } = useAnnouncements();
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

  const handlePress = (item: Announcement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedItem(item);
  };

  // ─── Loading ────────────────────────────────────────────────────
  if (isLoading && announcements.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────
  if (error && announcements.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
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
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
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
      </View>
    );
  }

  // ─── List ───────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: Announcement; index: number }) => {
    const isUrgent = item.priority === 'urgent';
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
              backgroundColor:
                effectiveScheme === 'dark'
                  ? 'rgba(196, 69, 54, 0.08)'
                  : 'rgba(196, 69, 54, 0.05)',
              marginHorizontal: -spacing.lg,
              paddingHorizontal: spacing.lg,
              borderRadius: borderRadius.sm,
            },
          ]}>
          {/* Meta: category + urgent badge */}
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
              <Text
                style={[
                  typography.caption2,
                  { color: colors.textSecondary, fontWeight: '600', letterSpacing: 0.5 },
                ]}>
                {mosqueName.toUpperCase()}
              </Text>
            ) : null}
          </View>

          {/* Title */}
          <Text style={[typography.headline, { color: colors.text, marginTop: spacing.xs }]}>
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
        </Animated.View>
      </Pressable>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: { title: string; key: string; data: Announcement[] };
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
      <BottomSheet visible={!!expandedItem} onDismiss={() => setExpandedItem(null)}>
        {expandedItem && (
          <View>
            {expandedItem.priority === 'urgent' && (
              <View style={styles.metaRow}>
                <View style={[styles.urgentDot, { backgroundColor: colors.urgent }]} />
                <Text
                  style={[typography.caption2, { color: colors.urgent, fontWeight: '600' }]}>
                  {t('announcements.urgent')}
                </Text>
              </View>
            )}
            {expandedItem.expand?.mosque?.name ? (
              <Text
                style={[
                  typography.caption2,
                  {
                    color: colors.textSecondary,
                    fontWeight: '600',
                    letterSpacing: 0.5,
                    marginTop: spacing.xs,
                  },
                ]}>
                {expandedItem.expand.mosque.name.toUpperCase()}
              </Text>
            ) : null}
            <Text style={[typography.title2, { color: colors.text, marginTop: spacing.sm }]}>
              {expandedItem.title}
            </Text>
            <Text
              style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
              {expandedItem.body}
            </Text>
            <Text
              style={[
                typography.footnote,
                { color: colors.textTertiary, marginTop: spacing.lg, opacity: 0.7 },
              ]}>
              {expandedItem.published_at
                ? formatDistanceToNow(new Date(expandedItem.published_at), { addSuffix: true })
                : ''}
            </Text>
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
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  retryBtn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
});
