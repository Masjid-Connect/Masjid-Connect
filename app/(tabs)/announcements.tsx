import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format, formatDistanceToNow } from 'date-fns';

import { getColors } from '@/constants/Colors';
import { spacing, elevation, borderRadius, typography } from '@/constants/Theme';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import type { Announcement } from '@/types';

export default function AnnouncementsScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const { announcements, isLoading, refresh } = useAnnouncements();
  const [refreshing, setRefreshing] = React.useState(false);

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
      <Animated.View
        entering={FadeInDown.delay(index * 60).duration(400).springify()}
        style={[
          styles.card,
          {
            backgroundColor: isUrgent
              ? colorScheme === 'dark'
                ? 'rgba(196, 69, 54, 0.15)'
                : 'rgba(196, 69, 54, 0.06)'
              : colors.card,
            borderColor: isUrgent ? colors.urgent : colors.cardBorder,
            ...elevation.elevated,
          },
        ]}>
        {/* Priority badge */}
        {isUrgent && (
          <View style={[styles.urgentBadge, { backgroundColor: colors.urgent }]}>
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}

        {/* Mosque name */}
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
});
