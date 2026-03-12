import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { events as eventsApi } from '@/lib/api';
import { getMosqueId } from '@/constants/mosque';
import type { MosqueEvent, EventCategory } from '@/types';

interface UseEventsResult {
  events: MosqueEvent[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: EventCategory | null;
  setSelectedCategory: (cat: EventCategory | null) => void;
  refresh: () => Promise<void>;
}

export function useEvents(enabled = true): UseEventsResult {
  const [items, setItems] = useState<MosqueEvent[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);

  const loadEvents = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const mosqueId = await getMosqueId();
      const mosqueIds = mosqueId ? [mosqueId] : [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = await eventsApi.list(mosqueIds, today);
      setItems(result.items);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Unable to load events. Pull down to retry.');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = selectedCategory
    ? items.filter((e) => e.category === selectedCategory)
    : items;

  return {
    events: filteredEvents,
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    refresh: loadEvents,
  };
}
