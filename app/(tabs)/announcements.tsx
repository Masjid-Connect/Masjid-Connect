import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/Theme';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { IslamicPattern } from '@/components/brand/IslamicPattern';
import type { Announcement } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AnnouncementsScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const { announcements, isLoading, error, refresh } = useAnnouncements();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedItem, setExpandedItem] = useState<Announcement | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const urgentAnnouncements = announcements.filter((a) => a.priority === 'urgent');
  const normalAnnouncements = announcements.filter((a) => a.priority !== 'urgent');
  const sortedAnnouncements = [...urgentAnnouncements, ...normalAnnouncements];

  const renderAnnouncement = ({ item, index }: { item: Announcement; index: number }) => {
    const isUrgent = item.priority === 'urgent';
    const mosqueName = item.expand?.mosque?.name || '';
    const timeAgo = item.published_at
      ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true })
      : '';

    return (
      <Pressable onPress={() => setExpandedItem(item)}>
        <Animated.View
          entering={FadeInDown.delay(index * 50).duration(350).springify()}
          style={[
            styles.row,
            index < sortedAnnouncements.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.separator,
            },
          ]}>
          {/* Mosque name as category */}
          <View style={styles.metaRow}>
            {isUrgent && (
              <>
                <View style={[styles.urgentDot, { backgroundColor: colors.urgent }]} />
                <Text style={[typography.caption2, { color: colors.urgent, fontWeight: '600', marginRight: spacing.xs }]}>
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
              <Text style={[typography.caption2, { color: colors.textSecondary, fontWeight: '600', letterSpacing: 0.5 }]}>
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
          <Text style={[typography.caption1, { color: colors.textTertiary, marginTop: spacing.sm, opacity: 0.7 }]}>
            {timeAgo}
          </Text>
        </Animated.View>
      </Pressable>
    );
  };

  if (isLoading && announcements.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error && announcements.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
        <Text style={[typography.headline, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg }]}>
          {t('common.networkError')}
        </Text>
        <Pressable onPress={handleRefresh} style={[styles.retryBtn, { borderColor: colors.tint }]}>
          <Text style={[typography.subhead, { color: colors.tint }]}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (announcements.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        {/* Islamic pattern — brands the empty void */}
        <IslamicPattern
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          color={effectiveScheme === 'dark' ? palette.sacredBlueLight : palette.sacredBlue}
          opacity={0.03}
          tileSize={56}
        />
        <Text style={[typography.largeTitle, { color: colors.accent, marginBottom: spacing.lg }]}>
          ﷽
        </Text>
        <Text style={[typography.headline, { color: colors.textSecondary, textAlign: 'center' }]}>
          {t('announcements.empty')}
        </Text>
        <Text
          style={[
            typography.subhead,
            { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
          ]}>
          {t('announcements.emptyHint')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={sortedAnnouncements}
        keyExtractor={(item) => item.id}
        renderItem={renderAnnouncement}
        contentContainerStyle={styles.listContent}
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
                <Text style={[typography.caption2, { color: colors.urgent, fontWeight: '600' }]}>
                  {t('announcements.urgent')}
                </Text>
              </View>
            )}
            {expandedItem.expand?.mosque?.name ? (
              <Text style={[typography.caption2, { color: colors.textSecondary, fontWeight: '600', letterSpacing: 0.5, marginTop: spacing.xs }]}>
                {expandedItem.expand.mosque.name.toUpperCase()}
              </Text>
            ) : null}
            <Text style={[typography.title2, { color: colors.text, marginTop: spacing.sm }]}>
              {expandedItem.title}
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
              {expandedItem.body}
            </Text>
            <Text style={[typography.footnote, { color: colors.textTertiary, marginTop: spacing.lg, opacity: 0.7 }]}>
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
    paddingTop: spacing.md,
  },
  row: {
    paddingVertical: spacing.xl,
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
