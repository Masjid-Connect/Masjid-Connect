import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { events as eventsApi } from '@/lib/pocketbase';
import { getSubscribedMosqueIds } from '@/lib/storage';
import type { MosqueEvent, EventCategory } from '@/types';

interface UseEventsResult {
  events: MosqueEvent[];
  isLoading: boolean;
  selectedCategory: EventCategory | null;
  setSelectedCategory: (cat: EventCategory | null) => void;
  refresh: () => Promise<void>;
}

export function useEvents(): UseEventsResult {
  const [items, setItems] = useState<MosqueEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const mosqueIds = await getSubscribedMosqueIds();
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = await eventsApi.list(mosqueIds, today);
      setItems(result.items);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = selectedCategory
    ? items.filter((e) => e.category === selectedCategory)
    : items;

  return {
    events: filteredEvents,
    isLoading,
    selectedCategory,
    setSelectedCategory,
    refresh: loadEvents,
  };
}
