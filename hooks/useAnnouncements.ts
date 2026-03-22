import { useState, useEffect, useCallback } from 'react';
import { announcements as announcementsApi } from '@/lib/api';
import { getCachedData, setCachedData } from '@/lib/storage';
import { Sentry } from '@/lib/sentry';
import { getMosqueId } from '@/constants/mosque';
import type { Announcement } from '@/types';

const CACHE_KEY = 'announcements';

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
      const mosqueId = await getMosqueId();
      const mosqueIds = mosqueId ? [mosqueId] : [];
      const result = await announcementsApi.list(mosqueIds);
      setItems(result.items);
      await setCachedData(CACHE_KEY, result.items);
    } catch (err) {
      Sentry.captureException(err);
      // Serve stale cached data when offline
      const cached = await getCachedData<Announcement[]>(CACHE_KEY, undefined, true);
      if (cached && cached.length > 0) {
        setItems(cached);
        setError(null);
      } else {
        setError('Unable to load announcements. Pull down to retry.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Show cached data immediately while fetching fresh data
    (async () => {
      const cached = await getCachedData<Announcement[]>(CACHE_KEY);
      if (cached) setItems(cached);
    })();
    loadAnnouncements();
  }, [loadAnnouncements]);

  return {
    announcements: items,
    isLoading,
    error,
    refresh: loadAnnouncements,
  };
}
