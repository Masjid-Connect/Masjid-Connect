import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
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
  selectedCategory: EventCategory | null;
  setSelectedCategory: (cat: EventCategory | null) => void;
  refresh: () => Promise<void>;
}

export function useEvents(): UseEventsResult {
  const [items, setItems] = useState<MosqueEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mosqueId = await getMosqueId();
      const mosqueIds = mosqueId ? [mosqueId] : [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = await eventsApi.list(mosqueIds, today, selectedCategory ?? undefined);
      setItems(result.items);
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
        setError('Unable to load events. Pull down to retry.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    // Show cached data immediately while fetching fresh data
    const cacheKey = `${CACHE_KEY}_${selectedCategory ?? 'all'}`;
    (async () => {
      const cached = await getCachedData<MosqueEvent[]>(cacheKey);
      if (cached) setItems(cached);
    })();
    loadEvents();
  }, [loadEvents]);

  return {
    events: items,
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    refresh: loadEvents,
  };
}
