import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getColors } from '@/constants/Colors';
import { spacing, elevation, borderRadius, typography, fonts } from '@/constants/Theme';
import type { Mosque } from '@/types';

interface MosqueCardProps {
  mosque: Mosque & { distance?: number };
  isSubscribed: boolean;
  onToggleSubscribe: (mosqueId: string) => void;
}

export const MosqueCard = ({ mosque, isSubscribed, onToggleSubscribe }: MosqueCardProps) => {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleSubscribe(mosque.id);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isSubscribed ? colors.accent : colors.cardBorder,
          borderWidth: isSubscribed ? 1.5 : 0.5,
          ...elevation.elevated,
        },
      ]}>
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={[typography.title3, { color: colors.text }]} numberOfLines={1}>
            {mosque.name}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {[mosque.city, mosque.country].filter(Boolean).join(', ')}
          </Text>
          {mosque.distance !== undefined && (
            <Text style={[typography.caption, { color: colors.accent, marginTop: 4, fontFamily: fonts.mono }]}>
              {mosque.distance < 1
                ? `${Math.round(mosque.distance * 1000)}m away`
                : `${mosque.distance.toFixed(1)} km away`}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handlePress}
          style={[
            styles.subscribeButton,
            {
              backgroundColor: isSubscribed ? colors.accent : 'transparent',
              borderColor: colors.accent,
            },
          ]}>
          <Text
            style={[
              typography.callout,
              {
                color: isSubscribed ? '#FFFFFF' : colors.accent,
              },
            ]}>
            {isSubscribed ? 'Joined' : 'Join'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expanded details */}
      {(mosque.address || mosque.jumua_time) && (
        <View style={[styles.details, { borderTopColor: colors.divider }]}>
          {mosque.address ? (
            <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={2}>
              {mosque.address}
            </Text>
          ) : null}
          {mosque.jumua_time ? (
            <Text style={[typography.caption, { color: colors.accent, marginTop: 4 }]}>
              Jumu&apos;ah: {mosque.jumua_time}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  subscribeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    minWidth: 70,
    alignItems: 'center',
  },
  details: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderTopWidth: 0.5,
    paddingTop: spacing.sm,
  },
});
