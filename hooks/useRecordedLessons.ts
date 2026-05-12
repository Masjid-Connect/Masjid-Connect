/**
 * useRecordedLessons — pulls the Salafi Publications recorded-lesson archive
 * from the SoundCloud podcast feed. Cached locally; revalidates on mount and
 * on app foreground. Follows the announcements/events pattern (hasFreshDataRef
 * to prevent stale cache overwriting fresh data on slow networks).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { fetchRecordedLessons } from '@/lib/lessons';
import { getCachedData, setCachedData } from '@/lib/storage';
import { Sentry } from '@/lib/sentry';
import type { RecordedLesson } from '@/types';

const CACHE_KEY = 'recorded_lessons';
/** Feed publishes TTL=60min on its end; matching it keeps the cache aligned. */
const CACHE_TTL_MS = 60 * 60 * 1000;
/** Throttle foreground refetches so rapid bg/fg cycles don't thrash the feed. */
const FOREGROUND_REFRESH_MIN_AGE_MS = 5 * 60 * 1000;

export interface UseRecordedLessonsResult {
  lessons: RecordedLesson[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRecordedLessons(): UseRecordedLessonsResult {
  const [lessons, setLessons] = useState<RecordedLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFreshDataRef = useRef(false);
  const lastFetchAtRef = useRef(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    hasFreshDataRef.current = false;
    try {
      const fresh = await fetchRecordedLessons();
      if (fresh) {
        hasFreshDataRef.current = true;
        lastFetchAtRef.current = Date.now();
        setLessons(fresh);
        await setCachedData(CACHE_KEY, fresh);
        return;
      }
      // Network/parse failure — fall back to stale cache so the screen
      // isn't blank when the user is offline.
      const cached = await getCachedData<RecordedLesson[]>(CACHE_KEY, CACHE_TTL_MS, true);
      if (cached && cached.length > 0) {
        setLessons(cached);
      } else {
        setError('Unable to load lessons. Pull down to retry.');
      }
    } catch (err) {
      Sentry.captureException(err, { extra: { context: 'useRecordedLessons.load' } });
      setError('Unable to load lessons. Pull down to retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Show cached data immediately while fresh data is fetched.
  useEffect(() => {
    (async () => {
      const cached = await getCachedData<RecordedLesson[]>(CACHE_KEY, CACHE_TTL_MS);
      if (cached && !hasFreshDataRef.current) setLessons(cached);
    })();
    load();
  }, [load]);

  // Revalidate on foreground; throttled.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (Date.now() - lastFetchAtRef.current < FOREGROUND_REFRESH_MIN_AGE_MS) return;
      load();
    });
    return () => sub.remove();
  }, [load]);

  return { lessons, isLoading, error, refresh: load };
}
