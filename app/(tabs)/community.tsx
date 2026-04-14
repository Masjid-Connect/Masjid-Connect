import React, { useState, useCallback, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Share,
  Platform,
  LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { getColors, getAlpha, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, fontWeight, springs, getElevation, hairline } from '@/constants/Theme';
import { AnnouncementsContent } from '@/components/community/AnnouncementsContent';
import { EventsContent } from '@/components/community/EventsContent';
import { LiveLessonBanner } from '@/components/community/LiveLessonBanner';
import { GoldBadge } from '@/components/brand/GoldBadge';
import { IslamicPattern } from '@/components/brand/IslamicPattern';
import { AdminFAB, QuickPostSheet, EventWizardSheet } from '@/components/admin';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useReadAnnouncements } from '@/hooks/useReadAnnouncements';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { useLiveLesson } from '@/hooks/useLiveLesson';

type CommunitySegment = 'announcements' | 'events';

const HEADER_HEIGHT = 44;
const LARGE_TITLE_HEIGHT = 52;

export default function CommunityScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const alphaColors = getAlpha(effectiveScheme);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // Deep-link support: a `segment` search param preselects the sub-tab.
  // Push notifications (announcement/event) use this to route via app/_layout.tsx.
  const params = useLocalSearchParams<{ segment?: string }>();
  const initialSegment: CommunitySegment =
    params.segment === 'events' ? 'events' : 'announcements';
  const [activeSegment, setActiveSegment] = useState<CommunitySegment>(initialSegment);

  // React to param changes when the tab is already mounted (e.g. user taps a
  // second notification without the screen unmounting).
  useEffect(() => {
    if (params.segment === 'announcements' || params.segment === 'events') {
      setActiveSegment(params.segment);
    }
  }, [params.segment]);
  const { announcements, refresh: refreshAnnouncements } = useAnnouncements();
  const { unreadCount } = useReadAnnouncements();
  const announcementUnreadCount = unreadCount(announcements.map((a) => a.id));
  const { isAdmin, mosqueIds } = useAdminStatus();
  const { isLive, broadcastTitle } = useLiveLesson();
  const [showQuickPost, setShowQuickPost] = useState(false);
  const [showEventWizard, setShowEventWizard] = useState(false);
  const adminMosqueId = mosqueIds[0] || '';

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

  const isDark = effectiveScheme === 'dark';

  // ─── Animated segment indicator ─────────────────────────────
  const segmentIndicatorX = useSharedValue(0);
  const segmentWidth = useSharedValue(0);
  const SEGMENT_PADDING = 2;

  const handleSegmentLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    segmentWidth.value = (width - SEGMENT_PADDING * 2) / 2;
    // Set initial position without animation
    if (activeSegment === 'events') {
      segmentIndicatorX.value = (width - SEGMENT_PADDING * 2) / 2;
    }
  }, [activeSegment, segmentIndicatorX, segmentWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segmentWidth.value,
    transform: [{ translateX: segmentIndicatorX.value }],
  }));

  const handleSegmentChange = useCallback((segment: CommunitySegment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSegment(segment);
    segmentIndicatorX.value = withSpring(
      segment === 'announcements' ? 0 : segmentWidth.value,
      springs.snappy,
    );
  }, [segmentIndicatorX, segmentWidth]);

  const handleShareReward = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: t('community.shareMessage'),
      });
    } catch {
      // Share cancelled or failed — no action needed
    }
  }, [t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Subtle Islamic pattern — sacred identity */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <IslamicPattern width={windowWidth} height={windowHeight} opacity={isDark ? 0.04 : 0.05} color={isDark ? palette.divineGoldBright : palette.sapphire700} />
      </View>

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

        {/* Live lesson banner — appears when a Mixlr broadcast is active */}
        {isLive && <LiveLessonBanner broadcastTitle={broadcastTitle} />}

        {/* Segmented control with spring-animated sliding indicator */}
        <View style={[styles.segmentContainer, { paddingHorizontal: spacing['3xl'] }]}>
          <View
            style={[styles.segmentControl, { backgroundColor: colors.backgroundGrouped }]}
            onLayout={handleSegmentLayout}
          >
            {/* Animated sliding indicator */}
            <Animated.View
              style={[
                styles.segmentIndicator,
                { backgroundColor: colors.card, ...getElevation('sm', isDark) },
                indicatorStyle,
              ]}
            />

            {/* Announcements tab */}
            <Pressable
              style={styles.segmentButton}
              onPress={() => handleSegmentChange('announcements')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeSegment === 'announcements' }}
              accessibilityLabel={`${t('community.announcements')}${announcementUnreadCount > 0 ? `, ${announcementUnreadCount} ${t('announcements.unread')}` : ''}`}
            >
              <View style={styles.segmentLabelRow}>
                <Text style={[
                  typography.subhead,
                  {
                    color: activeSegment === 'announcements' ? colors.text : colors.textSecondary,
                    fontWeight: activeSegment === 'announcements' ? fontWeight.semibold : fontWeight.regular,
                  },
                ]}>
                  {t('community.announcements')}
                </Text>
                {announcementUnreadCount > 0 && (
                  <GoldBadge count={announcementUnreadCount} size={16} style={{ marginStart: spacing.xs }} />
                )}
              </View>
            </Pressable>

            {/* Events tab */}
            <Pressable
              style={styles.segmentButton}
              onPress={() => handleSegmentChange('events')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeSegment === 'events' }}
              accessibilityLabel={t('community.events')}
            >
              <Text style={[
                typography.subhead,
                {
                  color: activeSegment === 'events' ? colors.text : colors.textSecondary,
                  fontWeight: activeSegment === 'events' ? fontWeight.semibold : fontWeight.regular,
                },
              ]}>
                {t('community.events')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Segment content with crossfade */}
        {activeSegment === 'announcements' ? (
          <Animated.View style={styles.segmentContent} entering={FadeIn.duration(200)} exiting={FadeOut.duration(100)}>
            <AnnouncementsContent onScroll={onScroll} />
          </Animated.View>
        ) : (
          <Animated.View style={styles.segmentContent} entering={FadeIn.duration(200)} exiting={FadeOut.duration(100)}>
            <EventsContent onScroll={onScroll} />
          </Animated.View>
        )}

        {/* Share the App — prominent CTA */}
        <Pressable
          onPress={handleShareReward}
          style={[styles.shareCard, {
            backgroundColor: alphaColors.communityShareBg,
            borderColor: alphaColors.communityShareBorder,
          }]}
          accessibilityRole="button"
          accessibilityLabel={t('community.shareApp')}
        >
          <Ionicons
            name="gift-outline"
            size={24}
            color={isDark ? palette.divineGoldBright : palette.divineGold}
          />
          <View style={styles.shareTextCol}>
            <Text style={[typography.headline, {
              color: isDark ? palette.divineGoldBright : palette.divineGoldText,
            }]}>
              {t('community.shareApp')}
            </Text>
            <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
              {t('community.shareHint')}
            </Text>
          </View>
          <Ionicons
            name="share-outline"
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Admin FAB — only visible to mosque administrators */}
      {isAdmin && (
        <AdminFAB
          onNewAnnouncement={() => setShowQuickPost(true)}
          onNewEvent={() => setShowEventWizard(true)}
        />
      )}

      {/* Admin sheets */}
      <QuickPostSheet
        visible={showQuickPost}
        onDismiss={() => setShowQuickPost(false)}
        mosqueId={adminMosqueId}
        onPublished={refreshAnnouncements}
      />
      <EventWizardSheet
        visible={showEventWizard}
        onDismiss={() => setShowEventWizard(false)}
        mosqueId={adminMosqueId}
      />
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
    height: hairline,
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
  segmentIndicator: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    borderRadius: borderRadius.sm - 2,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm - 2,
  },
  segmentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentContent: {
    flex: 1,
  },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing['3xl'],
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  shareTextCol: {
    flex: 1,
  },
});
