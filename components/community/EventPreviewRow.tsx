/**
 * EventPreviewRow — one row inside the "Coming up" preview list.
 *
 * Date pill (left) + title + meta line (centre) + chevron (right). Tap
 * drills the user into the Events screen — the full detail sheet is
 * opened there, not inline.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format, parseISO } from 'date-fns';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, hairline } from '@/constants/Theme';
import { formatTimeString } from '@/lib/prayer';
import { EventDatePill } from '@/components/community/EventDatePill';
import type { MosqueEvent } from '@/types';

interface EventPreviewRowProps {
  event: MosqueEvent;
  use24h: boolean;
  showSeparator: boolean;
}

const PILL_SIZE = 48;
const SEPARATOR_LEFT_INSET = PILL_SIZE + spacing.md;

export const EventPreviewRow = ({
  event,
  use24h,
  showSeparator,
}: EventPreviewRowProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);

  const dateStr = event.event_date.split('T')[0] || event.event_date;
  const date = parseISO(`${dateStr}T00:00:00`);
  const timeStr = formatTimeString(event.start_time, use24h);
  const meta = [timeStr, event.speaker].filter(Boolean).join(' · ');

  return (
    <View
      accessible
      accessibilityLabel={`${event.title}, ${format(date, 'EEEE MMM d')}${event.speaker ? `, ${event.speaker}` : ''}`}
    >
      <View style={styles.row}>
        <EventDatePill date={date} />
        <View style={styles.text}>
          <Text
            style={[typography.headline, { color: colors.text }]}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          {meta ? (
            <Text
              style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}
              numberOfLines={1}
            >
              {meta}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
      {showSeparator && (
        <View
          style={[
            styles.separator,
            { backgroundColor: colors.separator, marginLeft: SEPARATOR_LEFT_INSET },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    flex: 1,
  },
  separator: {
    height: hairline,
  },
});
