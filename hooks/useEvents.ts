import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { events as eventsApi } from '@/lib/api';
import { getCachedData, setCachedData } from '@/lib/storage';
import { Sentry } from '@/lib/sentry';
import { getMosqueId } from '@/constants/mosque';
import type { MosqueEvent, EventCategory } from '@/types';

const CACHE_KEY = 'events';

interface UseEventsResult {
  events: MosqueEvent[];
  isLoading: boolean;
  error: string | null;
  /** Total items available on server (for pagination awareness) */
  totalItems: number;
  /** Whether more pages are available to load */
  hasMore: boolean;
  /** Load next page of results (Q19: pagination support) */
  loadMore: () => Promise<void>;
  isLoadingMore: boolean;
  selectedCategory: EventCategory | null;
  setSelectedCategory: (cat: EventCategory | null) => void;
  refresh: () => Promise<void>;
}

export function useEvents(): UseEventsResult {
  const { t } = useTranslation();
  const [items, setItems] = useState<MosqueEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  // Q13: Track whether fresh API data has arrived to prevent stale cache overwrite
  const hasFreshDataRef = useRef(false);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    hasFreshDataRef.current = false;
    pageRef.current = 1;
    try {
      const mosqueId = await getMosqueId();
      const mosqueIds = mosqueId ? [mosqueId] : [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = await eventsApi.list(mosqueIds, today, selectedCategory ?? undefined);
      hasFreshDataRef.current = true;
      setItems(result.items);
      setTotalItems(result.totalItems);
      setHasMore(result.hasMore);
      await setCachedData(`${CACHE_KEY}_${selectedCategory ?? 'all'}`, result.items);
    } catch (err) {
      Sentry.captureException(err);
      // Serve stale cached data when offline
      const cacheKey = `${CACHE_KEY}_${selectedCategory ?? 'all'}`;
      const cached = await getCachedData<MosqueEvent[]>(cacheKey, undefined, true);
      if (cached && cached.length > 0) {
        setItems(cached);
        setError(null);
      } else {
        setError(t('error.loadEvents'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  // Q19: Load next page and append results
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const mosqueId = await getMosqueId();
      const mosqueIds = mosqueId ? [mosqueId] : [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const nextPage = pageRef.current + 1;
      const result = await eventsApi.list(mosqueIds, today, selectedCategory ?? undefined, nextPage);
      pageRef.current = nextPage;
      setItems(prev => [...prev, ...result.items]);
      setHasMore(result.hasMore);
    } catch (err) {
      Sentry.captureException(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, selectedCategory]);

  useEffect(() => {
    // Show cached data immediately while fetching fresh data
    const cacheKey = `${CACHE_KEY}_${selectedCategory ?? 'all'}`;
    (async () => {
      const cached = await getCachedData<MosqueEvent[]>(cacheKey);
      // Q13: Only apply cache if fresh data hasn't arrived yet
      if (cached && !hasFreshDataRef.current) setItems(cached);
    })();
    loadEvents();
  }, [loadEvents]);

  return {
    events: items,
    isLoading,
    error,
    totalItems,
    hasMore,
    loadMore,
    isLoadingMore,
    selectedCategory,
    setSelectedCategory,
    refresh: loadEvents,
  };
}
