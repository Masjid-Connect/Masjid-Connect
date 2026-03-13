import { useState, useEffect, useCallback, useRef } from 'react';
import { format, addDays, isSameDay, isToday as isTodayFn } from 'date-fns';
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
  /** Currently selected date */
  selectedDate: Date;
  /** Whether the selected date is today */
  isToday: boolean;
  /** Navigate to the next day */
  goToNextDay: () => void;
  /** Navigate to the previous day */
  goToPrevDay: () => void;
  /** Jump back to today */
  goToToday: () => void;
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
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const isToday = isTodayFn(selectedDate);

  const goToNextDay = useCallback(() => {
    setSelectedDate(prev => addDays(prev, 1));
  }, []);

  const goToPrevDay = useCallback(() => {
    setSelectedDate(prev => addDays(prev, -1));
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const loadPrayerTimes = useCallback(async (dateOverride?: Date) => {
    const targetDate = dateOverride ?? selectedDateRef.current;
    setIsLoading(true);
    const today = format(targetDate, 'yyyy-MM-dd');

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
        const mosqueResult = await fetchMosquePrayerTimes(mosqueId, targetDate);
        if (mosqueResult) {
          jamaahTimes = mosqueResult.jamaahTimes;
          const entries = buildPrayerEntries(mosqueResult.times, jamaahTimes);

          setPrayers(entries);
          setNextPrayer(isTodayFn(targetDate) ? getNextPrayer(mosqueResult.times) : null);
          setSource('mosque');
          setJamaahAvailable(true);

          if (isTodayFn(targetDate)) {
            await cachePrayerTimes(mosqueResult.times, today, jamaahTimes);
            const reminderMinutes = await getReminderMinutes();
            await schedulePrayerReminders(mosqueResult.times, reminderMinutes, jamaahTimes);
          }

          // Still fetch Aladhan for Hijri date (mosque API doesn't provide it)
          try {
            const { latitude: lat, longitude: lng } = SALAFI_MASJID;
            const aladhanResult = await getPrayerTimes(lat, lng, CALCULATION_METHOD_CODE, CALCULATION_METHOD_NAME, targetDate);
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

      const result = await getPrayerTimes(lat, lng, CALCULATION_METHOD_CODE, CALCULATION_METHOD_NAME, targetDate);
      const entries = buildPrayerEntries(result.times);

      setPrayers(entries);
      setNextPrayer(isTodayFn(targetDate) ? getNextPrayer(result.times) : null);
      setSource(result.source);
      setJamaahAvailable(false);

      if (result.hijriDate && result.hijriMonth && result.hijriYear) {
        setHijriDate(`${result.hijriDate} ${result.hijriMonth} ${result.hijriYear}`);
      }

      if (isTodayFn(targetDate)) {
        // Cache for offline use
        await cachePrayerTimes(result.times, today, null);
        // Schedule prayer reminder notifications
        const reminderMinutes = await getReminderMinutes();
        await schedulePrayerReminders(result.times, reminderMinutes);
      }
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

  // Initial load
  useEffect(() => {
    loadPrayerTimes();
  }, [loadPrayerTimes]);

  // Reload when selected date changes
  useEffect(() => {
    loadPrayerTimes(selectedDate);
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

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
    selectedDate,
    isToday,
    goToNextDay,
    goToPrevDay,
    goToToday,
  };
}
