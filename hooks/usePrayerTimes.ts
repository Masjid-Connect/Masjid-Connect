import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { getPrayerTimes, buildPrayerEntries, getNextPrayer, getCountdown } from '@/lib/prayer';
import { cachePrayerTimes, getCachedPrayerTimes, getUserLocation, getReminderMinutes, getUse24h } from '@/lib/storage';
import { reschedulePrayerRemindersForToday, schedulePrayerReminders } from '@/lib/notifications';
import type { PrayerTimeEntry, PrayerName } from '@/types';

/** Umm Al-Qura is the only calculation method used */
const CALCULATION_METHOD_CODE = 4;
const CALCULATION_METHOD_NAME = 'UmmAlQura';

interface UsePrayerTimesResult {
  prayers: PrayerTimeEntry[];
  nextPrayer: PrayerName | null;
  countdown: string;
  hijriDate: string | null;
  isLoading: boolean;
  source: 'api' | 'offline' | 'cache';
  use24h: boolean;
  refresh: () => Promise<void>;
}

export function usePrayerTimes(): UsePrayerTimesResult {
  const [prayers, setPrayers] = useState<PrayerTimeEntry[]>([]);
  const [nextPrayer, setNextPrayer] = useState<PrayerName | null>(null);
  const [countdown, setCountdown] = useState('');
  const [hijriDate, setHijriDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<'api' | 'offline' | 'cache'>('cache');
  const [use24h, setUse24hState] = useState(false);

  const loadPrayerTimes = useCallback(async () => {
    setIsLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    // Load 24h preference
    const h24 = await getUse24h();
    setUse24hState(h24);

    try {
      // Check cache first
      const cached = await getCachedPrayerTimes(today);
      if (cached) {
        const entries = buildPrayerEntries(cached);
        setPrayers(entries);
        setNextPrayer(getNextPrayer(cached));
        setSource('cache');
        setIsLoading(false);
        reschedulePrayerRemindersForToday().catch(() => {});
      }

      // Fetch fresh data
      const location = await getUserLocation();

      // Default to Mecca coordinates if no location set
      const lat = location?.latitude ?? 21.4225;
      const lng = location?.longitude ?? 39.8262;

      const result = await getPrayerTimes(lat, lng, CALCULATION_METHOD_CODE, CALCULATION_METHOD_NAME);
      const entries = buildPrayerEntries(result.times);

      setPrayers(entries);
      setNextPrayer(getNextPrayer(result.times));
      setSource(result.source);

      if (result.hijriDate && result.hijriMonth && result.hijriYear) {
        setHijriDate(`${result.hijriDate} ${result.hijriMonth} ${result.hijriYear}`);
      }

      // Cache for offline use
      await cachePrayerTimes(result.times, today);

      // Schedule prayer reminder notifications
      const reminderMinutes = await getReminderMinutes();
      await schedulePrayerReminders(result.times, reminderMinutes);
    } catch (error) {
      console.error('Failed to load prayer times:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update countdown every minute
  useEffect(() => {
    if (!nextPrayer || prayers.length === 0) return;

    const updateCountdown = () => {
      const prayer = prayers.find((p) => p.name === nextPrayer);
      if (prayer) {
        setCountdown(getCountdown(prayer.time));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30_000); // every 30 seconds
    return () => clearInterval(interval);
  }, [nextPrayer, prayers]);

  // Check if next prayer changed every minute
  useEffect(() => {
    if (prayers.length === 0) return;

    const checkNextPrayer = () => {
      const times = {
        fajr: prayers.find((p) => p.name === 'fajr')!.time,
        sunrise: prayers.find((p) => p.name === 'sunrise')!.time,
        dhuhr: prayers.find((p) => p.name === 'dhuhr')!.time,
        asr: prayers.find((p) => p.name === 'asr')!.time,
        maghrib: prayers.find((p) => p.name === 'maghrib')!.time,
        isha: prayers.find((p) => p.name === 'isha')!.time,
      };
      setNextPrayer(getNextPrayer(times));
    };

    const interval = setInterval(checkNextPrayer, 60_000);
    return () => clearInterval(interval);
  }, [prayers]);

  useEffect(() => {
    loadPrayerTimes();
  }, [loadPrayerTimes]);

  return {
    prayers,
    nextPrayer,
    countdown,
    hijriDate,
    isLoading,
    source,
    use24h,
    refresh: loadPrayerTimes,
  };
}
