import { useState, useEffect, useCallback } from 'react';
import { announcements as announcementsApi } from '@/lib/pocketbase';
import { getSubscribedMosqueIds } from '@/lib/storage';
import type { Announcement } from '@/types';

interface UseAnnouncementsResult {
  announcements: Announcement[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useAnnouncements(): UseAnnouncementsResult {
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const mosqueIds = await getSubscribedMosqueIds();
      const result = await announcementsApi.list(mosqueIds);
      setItems(result.items);
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    let unsubscribed = false;

    const setup = async () => {
      const mosqueIds = await getSubscribedMosqueIds();
      if (mosqueIds.length === 0 || unsubscribed) return;

      announcementsApi.subscribe(mosqueIds, (newAnnouncement) => {
        setItems((prev) => [newAnnouncement, ...prev]);
      });
    };

    setup();

    return () => {
      unsubscribed = true;
      announcementsApi.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  return {
    announcements: items,
    isLoading,
    refresh: loadAnnouncements,
  };
}
