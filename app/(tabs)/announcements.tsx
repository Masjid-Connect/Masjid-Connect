import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format, formatDistanceToNow } from 'date-fns';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, elevation, borderRadius, typography } from '@/constants/Theme';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import type { Announcement } from '@/types';

export default function AnnouncementsScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { announcements, isLoading, refresh } = useAnnouncements();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expandedItem = announcements.find((a) => a.id === expandedId);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const urgentAnnouncements = announcements.filter((a) => a.priority === 'urgent');
  const normalAnnouncements = announcements.filter((a) => a.priority !== 'urgent');

  const renderAnnouncement = ({ item, index }: { item: Announcement; index: number }) => {
    const isUrgent = item.priority === 'urgent';
    const mosqueName = item.expand?.mosque?.name || '';
    const timeAgo = item.published_at
      ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true })
      : '';

    return (
      <Pressable onPress={() => setExpandedId(item.id)}>
        <Animated.View
          entering={FadeInDown.delay(index * 60).duration(400).springify()}
          style={[
            styles.card,
            {
              backgroundColor: isUrgent
                ? effectiveScheme === 'dark'
                  ? 'rgba(196, 69, 54, 0.15)'
                  : 'rgba(196, 69, 54, 0.06)'
                : colors.card,
              borderColor: isUrgent ? colors.urgent : colors.cardBorder,
              ...elevation.elevated,
            },
          ]}>
          {isUrgent && (
            <View style={[styles.urgentBadge, { backgroundColor: colors.urgent }]}>
              <Text style={styles.urgentText}>URGENT</Text>
            </View>
          )}
          {mosqueName ? (
            <Text style={[typography.caption, { color: colors.accent, marginBottom: spacing.xs }]}>
              {mosqueName}
            </Text>
          ) : null}
          <Text style={[typography.title3, { color: colors.text }]}>{item.title}</Text>
          <Text
            style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}
            numberOfLines={4}>
            {item.body}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
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

  if (announcements.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[typography.display, { color: colors.accent, marginBottom: spacing.md }]}>
          ﷽
        </Text>
        <Text style={[typography.title3, { color: colors.textSecondary, textAlign: 'center' }]}>
          No announcements yet
        </Text>
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
          ]}>
          Subscribe to a mosque in Settings{'\n'}to receive community updates
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={[...urgentAnnouncements, ...normalAnnouncements]}
        keyExtractor={(item) => item.id}
        renderItem={renderAnnouncement}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      />
      {expandedItem && (
        <Modal visible={!!expandedId} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setExpandedId(null)}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              {expandedItem.priority === 'urgent' && (
                <View style={[styles.urgentBadge, { backgroundColor: colors.urgent }]}>
                  <Text style={styles.urgentText}>URGENT</Text>
                </View>
              )}
              {expandedItem.expand?.mosque?.name ? (
                <Text style={[typography.caption, { color: colors.accent, marginBottom: spacing.xs }]}>
                  {expandedItem.expand.mosque.name}
                </Text>
              ) : null}
              <Text style={[typography.title2, { color: colors.text }]}>{expandedItem.title}</Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                {expandedItem.body}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                {expandedItem.published_at
                  ? formatDistanceToNow(new Date(expandedItem.published_at), { addSuffix: true })
                  : ''}
              </Text>
              <TouchableOpacity onPress={() => setExpandedId(null)} style={[styles.modalClose, { borderColor: colors.divider }]}>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  listContent: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 0.5,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  urgentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  urgentText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
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
    maxHeight: '80%',
  },
  modalClose: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
});
