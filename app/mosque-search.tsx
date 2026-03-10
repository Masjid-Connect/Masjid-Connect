import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  TextInput,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors, palette } from '@/constants/Colors';
import { spacing, typography, borderRadius, fonts } from '@/constants/Theme';
import { useMosqueSearch, type MosqueWithDistance } from '@/hooks/useMosqueSearch';
import { MosqueCard } from '@/components/mosque/MosqueCard';
import { subscriptions } from '@/lib/api';
import { getSubscribedMosqueIds, setSubscribedMosqueIds } from '@/lib/storage';

export default function MosqueSearchScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { results, nearbyMosques, isLoading, searchQuery, setSearchQuery } = useMosqueSearch();

  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [subMap, setSubMap] = useState<Map<string, string>>(new Map()); // mosqueId → subscriptionId

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const [storedIds, subs] = await Promise.all([
        getSubscribedMosqueIds(),
        subscriptions.list(),
      ]);
      const idSet = new Set(storedIds);
      const map = new Map<string, string>();
      subs.forEach((s) => {
        idSet.add(s.mosque);
        map.set(s.mosque, s.id);
      });
      setSubscribedIds(idSet);
      setSubMap(map);
    } catch {
      const storedIds = await getSubscribedMosqueIds();
      setSubscribedIds(new Set(storedIds));
    }
  };

  const handleToggleSubscribe = useCallback(async (mosqueId: string) => {
    const isCurrentlySubscribed = subscribedIds.has(mosqueId);

    // Optimistic update
    setSubscribedIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlySubscribed) next.delete(mosqueId);
      else next.add(mosqueId);
      return next;
    });

    try {
      if (isCurrentlySubscribed) {
        const subId = subMap.get(mosqueId);
        if (subId) {
          await subscriptions.unsubscribe(subId);
          setSubMap((prev) => {
            const next = new Map(prev);
            next.delete(mosqueId);
            return next;
          });
        }
      } else {
        const sub = await subscriptions.subscribe(mosqueId);
        setSubMap((prev) => new Map(prev).set(mosqueId, sub.id));
      }

      // Persist to local storage
      setSubscribedIds((current) => {
        const arr = Array.from(current);
        setSubscribedMosqueIds(arr);
        return current;
      });
    } catch {
      // Revert on failure
      setSubscribedIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlySubscribed) next.add(mosqueId);
        else next.delete(mosqueId);
        return next;
      });
    }
  }, [subscribedIds, subMap]);

  const displayMosques = searchQuery.trim() ? results : nearbyMosques;

  const renderItem = ({ item }: { item: MosqueWithDistance }) => (
    <MosqueCard
      mosque={item}
      isSubscribed={subscribedIds.has(item.id)}
      onToggleSubscribe={handleToggleSubscribe}
    />
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Search bar */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}>
        <FontAwesome name="search" size={16} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text, fontFamily: fonts.body }]}
          placeholder="Search mosques..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searchQuery ? (
          <FontAwesome
            name="times-circle"
            size={16}
            color={colors.textSecondary}
            onPress={() => setSearchQuery('')}
          />
        ) : null}
      </View>

      {/* Section label */}
      <Text
        style={[
          typography.callout,
          {
            color: colors.textSecondary,
            marginTop: spacing.lg,
            marginBottom: spacing.sm,
            paddingHorizontal: spacing.xl,
            textTransform: 'uppercase',
            letterSpacing: 1,
          },
        ]}>
        {searchQuery.trim() ? 'Search Results' : 'Nearby Mosques'}
      </Text>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Text style={[typography.title3, { color: colors.textSecondary, textAlign: 'center' }]}>
          {searchQuery.trim()
            ? 'No mosques found for your search.'
            : 'No nearby mosques detected.\nTry searching by name or city.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={displayMosques}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingTop: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    padding: 0,
  },
  empty: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
});
