import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  /** Total items available on server (for pagination awareness) */
  totalItems: number;
  refresh: () => Promise<void>;
}

export function useAnnouncements(): UseAnnouncementsResult {
  const { t } = useTranslation();
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  // Q13: Track whether fresh API data has arrived to prevent stale cache overwrite
  const hasFreshDataRef = useRef(false);

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    hasFreshDataRef.current = false;
    try {
      const mosqueId = await getMosqueId();
      const mosqueIds = mosqueId ? [mosqueId] : [];
      const result = await announcementsApi.list(mosqueIds);
      hasFreshDataRef.current = true;
      setItems(result.items);
      setTotalItems(result.totalItems);
      await setCachedData(CACHE_KEY, result.items);
    } catch (err) {
      Sentry.captureException(err);
      // Serve stale cached data when offline
      const cached = await getCachedData<Announcement[]>(CACHE_KEY, undefined, true);
      if (cached && cached.length > 0) {
        setItems(cached);
        setError(null);
      } else {
        setError(t('error.loadAnnouncements'));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Show cached data immediately while fetching fresh data
    (async () => {
      const cached = await getCachedData<Announcement[]>(CACHE_KEY);
      // Q13: Only apply cache if fresh data hasn't arrived yet
      if (cached && !hasFreshDataRef.current) setItems(cached);
    })();
    loadAnnouncements();
  }, [loadAnnouncements]);

  return {
    announcements: items,
    isLoading,
    error,
    totalItems,
    refresh: loadAnnouncements,
  };
}
