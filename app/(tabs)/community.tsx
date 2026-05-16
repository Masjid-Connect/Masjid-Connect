import React, { useState, useCallback, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, hairline } from '@/constants/Theme';
import { layout } from '@/lib/layoutGrid';
import { AnnouncementsContent } from '@/components/community/AnnouncementsContent';
import { EventsContent } from '@/components/community/EventsContent';
import { LiveContent } from '@/components/community/LiveContent';
import { LessonsContent } from '@/components/community/LessonsContent';
import { LiveLessonBanner } from '@/components/community/LiveLessonBanner';
import { CommunityCard } from '@/components/community/CommunityCard';
import { IslamicPattern } from '@/components/brand/IslamicPattern';
import { AdminFAB, QuickPostSheet, EventWizardSheet } from '@/components/admin';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useReadAnnouncements } from '@/hooks/useReadAnnouncements';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { useLiveLesson } from '@/hooks/useLiveLesson';
import { resolveCommunitySegment, type CommunitySegment } from '@/lib/community-segment';

const HEADER_HEIGHT = 44;
const LARGE_TITLE_HEIGHT = 52;

/** Tab-internal mode: the 2×2 grid landing, or one of the four sub-segments
 *  drilled into. Drill-in is local state, not stack navigation, so back
 *  navigation stays tab-internal (chevron in the header) and deep links
 *  from push notifications continue to land via the `segment` search param. */
type CommunityMode = CommunitySegment | 'grid';

const SEGMENT_LABEL_KEY: Record<CommunitySegment, string> = {
  events: 'community.events',
  announcements: 'community.announcements',
  live: 'community.live',
  lessons: 'community.lessons',
};

export default function CommunityScreen() {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Deep-link support: a `segment` search param drills straight into the
  // sub-segment; absence (or any unrecognised value) lands on the grid.
  // Push notifications use this via app/_layout.tsx.
  const params = useLocalSearchParams<{ segment?: string }>();
  const [mode, setMode] = useState<CommunityMode>(
    () => resolveCommunitySegment(params.segment) ?? 'grid',
  );

  // React to param changes when the tab is already mounted (e.g. user taps a
  // second notification without the screen unmounting).
  useEffect(() => {
    const resolved = resolveCommunitySegment(params.segment);
    if (resolved) setMode(resolved);
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

  // ─── Sub-segment drill-in / back-out ───────────────────────────
  const drillInto = useCallback((segment: CommunitySegment) => {
    setMode(segment);
    // Reset scroll position so the large title is visible on entry.
    scrollY.value = 0;
  }, [scrollY]);

  const backToGrid = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode('grid');
    scrollY.value = 0;
  }, [scrollY]);

  // ─── Grid mode body — 4-up single row ─────────────────────────
  // Per-card accents drawn from the Celestial Ink palette. Variety
  // comes from sapphire tiers + the gold counterpoint — no foreign
  // hues. Light/dark mappings tuned for contrast on each surface.
  const accent = {
    events: isDark ? palette.sapphire400 : palette.sapphire700,
    announcements: isDark ? palette.divineGoldBright : palette.divineGold,
    // Live off: deliberately neutral (not a brand accent) so the gold
    // pulse on transition reads as a real state change, not a redundancy.
    liveOff: colors.textSecondary,
    liveOn: isDark ? palette.divineGoldBright : palette.divineGold,
    // Lessons: deepest ink in light mode (book-on-paper);
    // parchment in dark mode (pages-on-night).
    lessons: isDark ? palette.stone300 : palette.sapphire950,
  };

  const renderGrid = () => (
    <Animated.View
      style={styles.gridContainer}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(100)}
    >
      <View style={styles.gridRow}>
        <CommunityCard
          icon="calendar-outline"
          title={t('community.events')}
          accent={accent.events}
          onPress={() => drillInto('events')}
          accessibilityLabel={t('community.events')}
        />
        <View style={styles.gridGap} />
        <CommunityCard
          icon="megaphone-outline"
          title={t('community.announcements')}
          accent={accent.announcements}
          badge={
            announcementUnreadCount > 0
              ? { kind: 'count', count: announcementUnreadCount }
              : { kind: 'none' }
          }
          onPress={() => drillInto('announcements')}
          accessibilityLabel={t('community.announcements')}
        />
        <View style={styles.gridGap} />
        <CommunityCard
          icon="radio-outline"
          title={t('community.live')}
          accent={isLive ? accent.liveOn : accent.liveOff}
          badge={isLive ? { kind: 'pulse' } : { kind: 'none' }}
          onPress={() => drillInto('live')}
          accessibilityLabel={t('community.live')}
        />
        <View style={styles.gridGap} />
        <CommunityCard
          icon="musical-notes-outline"
          title={t('community.lessons')}
          accent={accent.lessons}
          onPress={() => drillInto('lessons')}
          accessibilityLabel={t('community.lessons')}
        />
      </View>
    </Animated.View>
  );

  // ─── Sub-segment body ──────────────────────────────────────────
  const renderSegmentContent = () => {
    switch (mode) {
      case 'live':
        return <LiveContent />;
      case 'lessons':
        return <LessonsContent />;
      case 'events':
        return <EventsContent onScroll={onScroll} />;
      case 'announcements':
        return <AnnouncementsContent onScroll={onScroll} />;
      default:
        return null;
    }
  };

  // ─── Title text for the inline header + large title ─────────────
  const titleText =
    mode === 'grid'
      ? t('community.title')
      : t(SEGMENT_LABEL_KEY[mode]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Subtle Islamic pattern — sacred identity */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <IslamicPattern
          width={windowWidth}
          height={windowHeight}
          opacity={isDark ? 0.04 : 0.05}
          color={isDark ? palette.divineGoldBright : palette.sapphire700}
        />
      </View>

      {/* Inline header — back chevron in sub-segments, plain title in grid */}
      <View
        style={[
          styles.inlineHeader,
          { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT, backgroundColor: colors.background },
        ]}
      >
        {mode !== 'grid' && (
          <Pressable
            style={styles.backButton}
            onPress={backToGrid}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('community.back')}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        )}
        <Animated.Text
          style={[
            typography.headline,
            { color: colors.text, textAlign: 'center' },
            inlineHeaderOpacity,
          ]}
        >
          {titleText}
        </Animated.Text>
        <Animated.View
          style={[styles.headerSeparator, { backgroundColor: colors.separator }, inlineHeaderOpacity]}
        />
      </View>

      {/* Content area */}
      <View
        style={[
          styles.contentArea,
          { paddingTop: insets.top + HEADER_HEIGHT },
          windowWidth >= layout.tabletBreakpoint && {
            maxWidth: layout.tabletMaxContentWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
      >
        {/* Large title */}
        <Animated.View style={[styles.largeTitleContainer, largeTitleStyle]}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>{titleText}</Text>
        </Animated.View>

        {/* Live banner — surfaced on the grid and on any non-Live sub-segment.
            The Live sub-segment renders its own banner inside LiveContent, so
            we suppress it there to avoid duplication. */}
        {isLive && mode !== 'live' && <LiveLessonBanner broadcastTitle={broadcastTitle} />}

        {/* Body — grid or sub-segment */}
        {mode === 'grid' ? (
          renderGrid()
        ) : (
          <Animated.View
            style={styles.segmentContent}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(100)}
          >
            {renderSegmentContent()}
          </Animated.View>
        )}
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
  backButton: {
    position: 'absolute',
    left: spacing.lg,
    bottom: 0,
    height: HEADER_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  contentArea: {
    flex: 1,
  },
  largeTitleContainer: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  gridContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  gridGap: {
    width: spacing.sm,
  },
  segmentContent: {
    flex: 1,
  },
});
