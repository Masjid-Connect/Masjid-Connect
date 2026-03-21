import { useState, useEffect, useCallback } from 'react';
import { getReadAnnouncementIds, markAnnouncementRead } from '@/lib/storage';

interface UseReadAnnouncementsResult {
  readIds: Set<string>;
  markRead: (id: string) => Promise<void>;
  isUnread: (id: string) => boolean;
  /** Count unread items from a given list of announcement IDs */
  unreadCount: (allIds: string[]) => number;
}

export function useReadAnnouncements(): UseReadAnnouncementsResult {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getReadAnnouncementIds().then(setReadIds);
  }, []);

  const markRead = useCallback(async (id: string) => {
    const updated = await markAnnouncementRead(id);
    setReadIds(updated);
  }, []);

  const isUnread = useCallback(
    (id: string) => !readIds.has(id),
    [readIds],
  );

  const unreadCount = useCallback(
    (allIds: string[]) => allIds.filter((id) => !readIds.has(id)).length,
    [readIds],
  );

  return { readIds, markRead, isUnread, unreadCount };
}
