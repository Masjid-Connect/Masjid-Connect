/**
 * LiveContent — community tab "Live" segment.
 *
 * When a Mixlr broadcast is active, renders the existing
 * `LiveLessonBanner` (tap-through to the full-screen player).
 * Otherwise, renders a quiet empty state.
 *
 * Kept deliberately minimal — the Live segment exists to give the
 * live broadcast a stable home in the Community tab; archive listing
 * and scheduled-stream surfacing are out of scope for this pass.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/Theme';
import { LiveLessonBanner } from '@/components/community/LiveLessonBanner';
import { useLiveLesson } from '@/hooks/useLiveLesson';

export const LiveContent = () => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const { isLive, broadcastTitle } = useLiveLesson();

  if (isLive) {
    return (
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <LiveLessonBanner broadcastTitle={broadcastTitle} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.empty}>
      <Ionicons
        name="radio-outline"
        size={56}
        color={colors.textTertiary}
        style={styles.emptyIcon}
      />
      <Text
        style={[typography.title3, { color: colors.text, textAlign: 'center' }]}
      >
        {t('community.liveEmptyTitle')}
      </Text>
      <Text
        style={[
          typography.subhead,
          { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
        ]}
      >
        {t('community.liveEmptyBody')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['5xl'],
  },
  emptyIcon: {
    marginBottom: spacing.lg,
    opacity: 0.7,
  },
});
