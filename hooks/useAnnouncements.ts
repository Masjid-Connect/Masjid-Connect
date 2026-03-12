import { useState, useEffect, useCallback } from 'react';
import { announcements as announcementsApi } from '@/lib/api';
import { getMosqueId } from '@/constants/mosque';
import type { Announcement } from '@/types';

interface UseAnnouncementsResult {
  announcements: Announcement[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAnnouncements(enabled = true): UseAnnouncementsResult {
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const mosqueId = await getMosqueId();
      const mosqueIds = mosqueId ? [mosqueId] : [];
      const result = await announcementsApi.list(mosqueIds);
      setItems(result.items);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setError('Unable to load announcements. Pull down to retry.');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

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
