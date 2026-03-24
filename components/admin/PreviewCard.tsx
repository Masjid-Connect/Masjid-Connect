import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { getColors, getAlpha, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, getElevation, fontWeight } from '@/constants/Theme';
import type { EventCategory } from '@/types';
import { EVENT_CATEGORY_COLORS, EVENT_CATEGORY_COLORS_DARK } from '@/types';

interface AnnouncementPreviewProps {
  type: 'announcement';
  title: string;
  body: string;
  priority: 'normal' | 'urgent' | 'janazah';
  mosqueName?: string;
}

interface EventPreviewProps {
  type: 'event';
  title: string;
  description: string;
  speaker: string;
  eventDate: string;
  startTime: string;
  category: EventCategory;
  mosqueName?: string;
}

type PreviewCardProps = AnnouncementPreviewProps | EventPreviewProps;

export const PreviewCard = (props: PreviewCardProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const alphaColors = getAlpha(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();

  if (props.type === 'announcement') {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>
        <View style={styles.previewLabel}>
          <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
          <Text style={[typography.caption1, { color: colors.textSecondary, marginStart: spacing.xs }]}>
            {t('admin.previewHint')}
          </Text>
        </View>

        {/* Priority badge */}
        {props.priority !== 'normal' && (
          <View style={[
            styles.priorityBadge,
            {
              backgroundColor: props.priority === 'janazah'
                ? alphaColors.janazahBg
                : alphaColors.urgentBg,
            },
          ]}>
            <Text style={[
              typography.caption1,
              {
                fontWeight: fontWeight.bold,
                letterSpacing: 0.5,
                color: props.priority === 'janazah'
                  ? (isDark ? palette.divineGoldBright : palette.divineGoldText)
                  : colors.urgent,
              },
            ]}>
              {props.priority === 'janazah' ? t('announcements.janazah') : t('announcements.urgent')}
            </Text>
          </View>
        )}

        <Text style={[typography.headline, { color: colors.text, marginTop: spacing.sm }]}>
          {props.title || t('admin.titlePlaceholder')}
        </Text>
        <Text
          style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}
          numberOfLines={3}
        >
          {props.body || t('admin.bodyPlaceholder')}
        </Text>

        {props.mosqueName && (
          <Text style={[typography.caption1, { color: colors.textTertiary, marginTop: spacing.sm }]}>
            {props.mosqueName}
          </Text>
        )}
      </View>
    );
  }

  // Event preview
  const categoryColors = isDark ? EVENT_CATEGORY_COLORS_DARK : EVENT_CATEGORY_COLORS;
  const categoryColor = categoryColors[props.category] || colors.tint;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>
      <View style={styles.previewLabel}>
        <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
        <Text style={[typography.caption1, { color: colors.textSecondary, marginStart: spacing.xs }]}>
          {t('admin.previewHint')}
        </Text>
      </View>

      {/* Category accent */}
      <View style={[styles.categoryRow, { marginTop: spacing.sm }]}>
        <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
        <Text style={[typography.caption1, { color: categoryColor, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
          {t(`events.categories.${props.category}`)}
        </Text>
      </View>

      <Text style={[typography.headline, { color: colors.text, marginTop: spacing.xs }]}>
        {props.title || t('admin.eventTitlePlaceholder')}
      </Text>

      {props.description ? (
        <Text
          style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}
          numberOfLines={2}
        >
          {props.description}
        </Text>
      ) : null}

      <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
        {props.eventDate ? (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[typography.caption1, { color: colors.textSecondary, marginStart: spacing.xs }]}>
              {props.eventDate}
            </Text>
          </View>
        ) : null}
        {props.startTime ? (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[typography.caption1, { color: colors.textSecondary, marginStart: spacing.xs }]}>
              {props.startTime}
            </Text>
          </View>
        ) : null}
      </View>

      {props.speaker ? (
        <View style={[styles.metaItem, { marginTop: spacing.xs }]}>
          <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
          <Text style={[typography.caption1, { color: colors.textSecondary, marginStart: spacing.xs }]}>
            {props.speaker}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  previewLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
    marginTop: spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius['3xs'],
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
