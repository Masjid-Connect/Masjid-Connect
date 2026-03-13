import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/Theme';
import { AnnouncementsContent } from '@/components/community/AnnouncementsContent';
import { EventsContent } from '@/components/community/EventsContent';

type CommunitySegment = 'announcements' | 'events';

const HEADER_HEIGHT = 44;
const LARGE_TITLE_HEIGHT = 52;

export default function CommunityScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeSegment, setActiveSegment] = useState<CommunitySegment>('announcements');

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

  const handleSegmentChange = useCallback((segment: CommunitySegment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSegment(segment);
  }, []);

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
          {t('community.title')}
        </Animated.Text>
        <Animated.View
          style={[
            styles.headerSeparator,
            { backgroundColor: colors.separator },
            inlineHeaderOpacity,
          ]}
        />
      </View>

      {/* Content area */}
      <View style={[styles.contentArea, { paddingTop: insets.top + HEADER_HEIGHT }]}>
        {/* Large title */}
        <Animated.View style={[styles.largeTitleContainer, largeTitleStyle]}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>
            {t('community.title')}
          </Text>
        </Animated.View>

        {/* Segmented control */}
        <View style={[styles.segmentContainer, { paddingHorizontal: spacing['3xl'] }]}>
          <View style={[styles.segmentControl, { backgroundColor: colors.backgroundGrouped }]}>
            <Pressable
              style={[
                styles.segmentButton,
                activeSegment === 'announcements' && [
                  styles.segmentButtonActive,
                  { backgroundColor: colors.card },
                ],
              ]}
              onPress={() => handleSegmentChange('announcements')}
            >
              <Text style={[
                typography.subhead,
                {
                  color: activeSegment === 'announcements' ? colors.text : colors.textSecondary,
                  fontWeight: activeSegment === 'announcements' ? '600' : '400',
                },
              ]}>
                {t('community.announcements')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentButton,
                activeSegment === 'events' && [
                  styles.segmentButtonActive,
                  { backgroundColor: colors.card },
                ],
              ]}
              onPress={() => handleSegmentChange('events')}
            >
              <Text style={[
                typography.subhead,
                {
                  color: activeSegment === 'events' ? colors.text : colors.textSecondary,
                  fontWeight: activeSegment === 'events' ? '600' : '400',
                },
              ]}>
                {t('community.events')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Segment content */}
        {activeSegment === 'announcements' ? (
          <AnnouncementsContent onScroll={onScroll} />
        ) : (
          <EventsContent onScroll={onScroll} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inlineHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
  contentArea: {
    flex: 1,
  },
  largeTitleContainer: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  segmentContainer: {
    paddingVertical: spacing.md,
  },
  segmentControl: {
    flexDirection: 'row',
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm - 2,
  },
  segmentButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
