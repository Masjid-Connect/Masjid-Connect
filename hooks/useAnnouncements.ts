import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { announcements as announcementsApi } from '@/lib/api';
import { getCachedData, setCachedData, evictCachedData } from '@/lib/storage';
import { Sentry } from '@/lib/sentry';
import { getMosqueId } from '@/constants/mosque';
import type { Announcement } from '@/types';

const CACHE_KEY = 'announcements';
// Throttle foreground re-fetches so rapid background/foreground cycles
// don't thrash the API. 30s matches "fresh enough for a mosque feed".
const FOREGROUND_REFRESH_MIN_AGE_MS = 30_000;

interface UseAnnouncementsResult {
  announcements: Announcement[];
  isLoading: boolean;
  error: string | null;
  /** Total items available on server (for pagination awareness) */
  totalItems: number;
  /** Whether more pages are available to load */
  hasMore: boolean;
  /** Load next page of results (Q6: pagination support) */
  loadMore: () => Promise<void>;
  isLoadingMore: boolean;
  refresh: () => Promise<void>;
  /** Evict cache then re-fetch — use after mutations (create/update/delete). */
  invalidate: () => Promise<void>;
}

export function useAnnouncements(): UseAnnouncementsResult {
  const { t } = useTranslation();
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  // Q13: Track whether fresh API data has arrived to prevent stale cache overwrite
  const hasFreshDataRef = useRef(false);
  const lastFetchAtRef = useRef(0);

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    hasFreshDataRef.current = false;
    pageRef.current = 1;
    try {
      const mosqueId = await getMosqueId();
      const mosqueIds = mosqueId ? [mosqueId] : [];
      const result = await announcementsApi.list(mosqueIds);
      hasFreshDataRef.current = true;
      lastFetchAtRef.current = Date.now();
      setItems(result.items);
      setTotalItems(result.totalItems);
      setHasMore(result.hasMore);
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

  // Q6: Load next page and append results
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const mosqueId = await getMosqueId();
      const mosqueIds = mosqueId ? [mosqueId] : [];
      const nextPage = pageRef.current + 1;
      const result = await announcementsApi.list(mosqueIds, nextPage);
      pageRef.current = nextPage;
      setItems(prev => [...prev, ...result.items]);
      setHasMore(result.hasMore);
    } catch (err) {
      Sentry.captureException(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore]);

  useEffect(() => {
    // Show cached data immediately while fetching fresh data
    (async () => {
      const cached = await getCachedData<Announcement[]>(CACHE_KEY);
      // Q13: Only apply cache if fresh data hasn't arrived yet
      if (cached && !hasFreshDataRef.current) setItems(cached);
    })();
    loadAnnouncements();
  }, [loadAnnouncements]);

  // Refresh when the app returns to the foreground — without this the
  // feed is frozen at whatever was loaded when the app last launched.
  // Throttled so rapid background/foreground cycles don't hit the API.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (Date.now() - lastFetchAtRef.current < FOREGROUND_REFRESH_MIN_AGE_MS) return;
      loadAnnouncements();
    });
    return () => sub.remove();
  }, [loadAnnouncements]);

  /** Invalidate cache and re-fetch — call after create/update/delete mutations. */
  const invalidate = useCallback(async () => {
    await evictCachedData(CACHE_KEY);
    await loadAnnouncements();
  }, [loadAnnouncements]);

  return {
    announcements: items,
    isLoading,
    error,
    totalItems,
    hasMore,
    loadMore,
    isLoadingMore,
    refresh: loadAnnouncements,
    /** Evict cache then re-fetch — use after mutations (create/update/delete). */
    invalidate,
  };
}
