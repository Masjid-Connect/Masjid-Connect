import { useState, useEffect, useCallback } from 'react';
import { announcements as announcementsApi } from '@/lib/api';
import { getSubscribedMosqueIds, getSelectedMosqueId } from '@/lib/storage';
import type { Announcement } from '@/types';

interface UseAnnouncementsResult {
  announcements: Announcement[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAnnouncements(): UseAnnouncementsResult {
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use subscribed mosques if available, otherwise fall back to selected mosque (guest mode)
      let mosqueIds = await getSubscribedMosqueIds();
      if (mosqueIds.length === 0) {
        const selectedId = await getSelectedMosqueId();
        if (selectedId) mosqueIds = [selectedId];
      }
      const result = await announcementsApi.list(mosqueIds);
      setItems(result.items);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setError('Unable to load announcements. Pull down to retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  return {
    announcements: items,
    isLoading,
    error,
    refresh: loadAnnouncements,
  };
}
