import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { getPrayerTimes, fetchMosquePrayerTimes, buildPrayerEntries, getNextPrayer, getCountdown } from '@/lib/prayer';
import { cachePrayerTimes, getCachedPrayerTimes, getReminderMinutes, getUse24h } from '@/lib/storage';
import { getMosqueId, SALAFI_MASJID } from '@/constants/mosque';
import { reschedulePrayerRemindersForToday, schedulePrayerReminders } from '@/lib/notifications';
import type { PrayerTimeEntry, PrayerName, JamaahTimesData } from '@/types';

/** Umm Al-Qura is the only calculation method used */
const CALCULATION_METHOD_CODE = 4;
const CALCULATION_METHOD_NAME = 'UmmAlQura';

interface UsePrayerTimesResult {
  prayers: PrayerTimeEntry[];
  nextPrayer: PrayerName | null;
  countdown: string;
  hijriDate: string | null;
  isLoading: boolean;
  source: 'api' | 'offline' | 'cache' | 'mosque';
  jamaahAvailable: boolean;
  use24h: boolean;
  refresh: () => Promise<void>;
}

export function usePrayerTimes(): UsePrayerTimesResult {
  const [prayers, setPrayers] = useState<PrayerTimeEntry[]>([]);
  const [nextPrayer, setNextPrayer] = useState<PrayerName | null>(null);
  const [countdown, setCountdown] = useState('');
  const [hijriDate, setHijriDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<'api' | 'offline' | 'cache' | 'mosque'>('cache');
  const [jamaahAvailable, setJamaahAvailable] = useState(false);
  const [use24h, setUse24hState] = useState(false);

  const loadPrayerTimes = useCallback(async () => {
    setIsLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    // Load 24h preference
    const h24 = await getUse24h();
    setUse24hState(h24);

    try {
      // Check cache first — show stale data immediately while fetching
      const cached = await getCachedPrayerTimes(today);
      if (cached) {
        const entries = buildPrayerEntries(cached.times, cached.jamaahTimes);
        setPrayers(entries);
        setNextPrayer(getNextPrayer(cached.times));
        setJamaahAvailable(cached.jamaahTimes !== null);
        setSource('cache');
        setIsLoading(false);
        reschedulePrayerRemindersForToday().catch(() => {});
      }

      // Try The Salafi Masjid's scraped jama'ah times first
      const mosqueId = await getMosqueId();
      let jamaahTimes: JamaahTimesData | null = null;

      if (mosqueId) {
        const mosqueResult = await fetchMosquePrayerTimes(mosqueId);
        if (mosqueResult) {
          jamaahTimes = mosqueResult.jamaahTimes;
          const entries = buildPrayerEntries(mosqueResult.times, jamaahTimes);

          setPrayers(entries);
          setNextPrayer(getNextPrayer(mosqueResult.times));
          setSource('mosque');
          setJamaahAvailable(true);

          await cachePrayerTimes(mosqueResult.times, today, jamaahTimes);

          const reminderMinutes = await getReminderMinutes();
          await schedulePrayerReminders(mosqueResult.times, reminderMinutes, jamaahTimes);

          // Still fetch Aladhan for Hijri date (mosque API doesn't provide it)
          try {
            const { latitude: lat, longitude: lng } = SALAFI_MASJID;
            const aladhanResult = await getPrayerTimes(lat, lng, CALCULATION_METHOD_CODE, CALCULATION_METHOD_NAME);
            if (aladhanResult.hijriDate && aladhanResult.hijriMonth && aladhanResult.hijriYear) {
              setHijriDate(`${aladhanResult.hijriDate} ${aladhanResult.hijriMonth} ${aladhanResult.hijriYear}`);
            }
          } catch {
            // Hijri date is nice-to-have, don't fail on it
          }

          return;
        }
      }

      // Fallback: Aladhan API (mosque has no scraped data or backend unreachable)
      const lat = SALAFI_MASJID.latitude;
      const lng = SALAFI_MASJID.longitude;

      const result = await getPrayerTimes(lat, lng, CALCULATION_METHOD_CODE, CALCULATION_METHOD_NAME);
      const entries = buildPrayerEntries(result.times);

      setPrayers(entries);
      setNextPrayer(getNextPrayer(result.times));
      setSource(result.source);
      setJamaahAvailable(false);

      if (result.hijriDate && result.hijriMonth && result.hijriYear) {
        setHijriDate(`${result.hijriDate} ${result.hijriMonth} ${result.hijriYear}`);
      }

      // Cache for offline use
      await cachePrayerTimes(result.times, today, null);

      // Schedule prayer reminder notifications
      const reminderMinutes = await getReminderMinutes();
      await schedulePrayerReminders(result.times, reminderMinutes);
    } catch (error) {
      console.error('Failed to load prayer times:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update countdown every 30 seconds
  useEffect(() => {
    if (!nextPrayer || prayers.length === 0) return;

    const updateCountdown = () => {
      const prayer = prayers.find((p) => p.name === nextPrayer);
      if (prayer) {
        // Count down to jama'ah time if available, else start time
        const target = prayer.jamaahTime || prayer.time;
        setCountdown(getCountdown(target));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30_000);
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
    jamaahAvailable,
    use24h,
    refresh: loadPrayerTimes,
  };
}
