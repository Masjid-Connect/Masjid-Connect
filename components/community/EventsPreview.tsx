/**
 * EventsPreview — "Coming up" section on the Community resting state.
 *
 * Shows the next 3 upcoming events as preview rows. Hooks into the
 * shared `useEvents` cache; the Events screen, when drilled into,
 * reads the same data without re-fetching.
 *
 * Empty / loading: render nothing at all rather than a placeholder —
 * Fadwa's anti-absence-framing. If there are no upcoming events the
 * section simply doesn't appear on the page.
 */

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useEvents } from '@/hooks/useEvents';
import { getUse24h } from '@/lib/storage';
import { SectionHeader } from '@/components/community/SectionHeader';
import { EventPreviewRow } from '@/components/community/EventPreviewRow';

const PREVIEW_LIMIT = 3;

interface EventsPreviewProps {
  onSeeAll: () => void;
}

export const EventsPreview = ({ onSeeAll }: EventsPreviewProps) => {
  const { t } = useTranslation();
  const { events, isLoading } = useEvents();
  const [use24h, setUse24h] = useState(false);

  useEffect(() => {
    getUse24h().then(setUse24h);
  }, []);

  if (isLoading && events.length === 0) return null;
  if (events.length === 0) return null;

  const upcoming = events.slice(0, PREVIEW_LIMIT);

  return (
    <View>
      <SectionHeader
        title={t('community.comingUp')}
        actionLabel={t('community.seeAll')}
        onActionPress={onSeeAll}
      />
      {upcoming.map((event, i) => (
        <EventPreviewRow
          key={event.id}
          event={event}
          use24h={use24h}
          showSeparator={i < upcoming.length - 1}
          onPress={onSeeAll}
        />
      ))}
    </View>
  );
};
