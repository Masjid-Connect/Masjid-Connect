/**
 * EventsPreview — "Coming up" bento tile.
 *
 * Renders into a BentoTile so the tile shape persists when there are
 * no upcoming events (sparse-data weeks). Up to 3 event rows when
 * populated; a quiet empty state inside the tile otherwise.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useEvents } from '@/hooks/useEvents';
import { getUse24h } from '@/lib/storage';
import { BentoTile } from '@/components/community/BentoTile';
import { EventPreviewRow } from '@/components/community/EventPreviewRow';

const PREVIEW_LIMIT = 3;

interface EventsPreviewProps {
  onSeeAll: () => void;
}

export const EventsPreview = ({ onSeeAll }: EventsPreviewProps) => {
  const { t } = useTranslation();
  const { events } = useEvents();
  const [use24h, setUse24h] = useState(false);

  useEffect(() => {
    getUse24h().then(setUse24h);
  }, []);

  const upcoming = events.slice(0, PREVIEW_LIMIT);
  const isEmpty = upcoming.length === 0;

  return (
    <BentoTile
      title={t('community.comingUp')}
      actionLabel={t('community.seeAll')}
      onActionPress={onSeeAll}
      isEmpty={isEmpty}
      emptyIcon="calendar-outline"
      emptyMessage={t('community.eventsEmpty')}
      minHeight={isEmpty ? 130 : 220}
    >
      {upcoming.map((event, i) => (
        <EventPreviewRow
          key={event.id}
          event={event}
          use24h={use24h}
          showSeparator={i < upcoming.length - 1}
        />
      ))}
    </BentoTile>
  );
};
