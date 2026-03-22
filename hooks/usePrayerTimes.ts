import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addDays, isSameDay, isToday as isTodayFn } from 'date-fns';
import { getPrayerTimes, buildPrayerEntries, getNextPrayer, getCountdown } from '@/lib/prayer';
import { getReminderMinutes, getUse24h } from '@/lib/storage';
import { SALAFI_MASJID } from '@/constants/mosque';
import { schedulePrayerReminders } from '@/lib/notifications';
import { getStaticPrayerTimes } from '@/lib/staticTimetable';
import type { PrayerTimeEntry, PrayerName } from '@/types';

/** Umm Al-Qura is the only calculation method used */
const CALCULATION_METHOD_CODE = 4;
const CALCULATION_METHOD_NAME = 'UmmAlQura';

/**
 * Get the correct Hijri date, accounting for the Islamic day starting at Maghrib.
 * If current time is after Maghrib, the Hijri date should be for the *next* Gregorian day.
 */
async function getCorrectHijriDate(
  targetDate: Date,
  maghribTime: Date | undefined,
): Promise<string | null> {
  const { latitude: lat, longitude: lng } = SALAFI_MASJID;
  const now = new Date();
  const isAfterMaghrib = maghribTime && isTodayFn(targetDate) && now >= maghribTime;
  const hijriQueryDate = isAfterMaghrib ? addDays(targetDate, 1) : targetDate;

  const result = await getPrayerTimes(lat, lng, CALCULATION_METHOD_CODE, CALCULATION_METHOD_NAME, hijriQueryDate);
  if (result.hijriDate && result.hijriMonth && result.hijriYear) {
    return `${result.hijriDate} ${result.hijriMonth} ${result.hijriYear}`;
  }
  return null;
}

interface UsePrayerTimesResult {
  prayers: PrayerTimeEntry[];
  nextPrayer: PrayerName | null;
  countdown: string;
  /** 0-1 progress through the current prayer window (current→next) */
  windowProgress: number;
  hijriDate: string | null;
  isLoading: boolean;
  /** Error message when both prayer time sources fail */
  error: string | null;
  source: 'static' | 'api' | 'offline';
  jamaahAvailable: boolean;
  /** True when jama'ah times are estimated (e.g. same day from last year) */
  isEstimated: boolean;
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
  const { t } = useTranslation();
  const [prayers, setPrayers] = useState<PrayerTimeEntry[]>([]);
  const [nextPrayer, setNextPrayer] = useState<PrayerName | null>(null);
  const [countdown, setCountdown] = useState('');
  const [windowProgress, setWindowProgress] = useState(0);
  const [hijriDate, setHijriDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'static' | 'api' | 'offline'>('static');
  const [jamaahAvailable, setJamaahAvailable] = useState(false);
  const [isEstimated, setIsEstimated] = useState(false);
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

  // Guard against setState on unmounted component (Q5: memory leak fix)
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const loadPrayerTimes = useCallback(async (dateOverride?: Date) => {
    const targetDate = dateOverride ?? selectedDateRef.current;
    setIsLoading(true);
    setError(null);

    // Load 24h preference
    const h24 = await getUse24h();
    if (!mountedRef.current) return;
    setUse24hState(h24);

    try {
      // 1. Static bundled timetable — primary source (has start + jama'ah times)
      const staticResult = getStaticPrayerTimes(targetDate);
      if (staticResult) {
        if (!mountedRef.current) return;
        const entries = buildPrayerEntries(staticResult.times, staticResult.jamaahTimes);
        setPrayers(entries);
        setNextPrayer(isTodayFn(targetDate) ? getNextPrayer(staticResult.times, staticResult.jamaahTimes) : null);
        setSource('static');
        setJamaahAvailable(true);
        setIsEstimated(staticResult.isEstimated);

        if (isTodayFn(targetDate)) {
          const reminderMinutes = await getReminderMinutes();
          await schedulePrayerReminders(staticResult.times, reminderMinutes, staticResult.jamaahTimes);
        }

        // Fetch Aladhan for Hijri date only
        try {
          const hijri = await getCorrectHijriDate(targetDate, staticResult.times.maghrib);
          if (hijri && mountedRef.current) setHijriDate(hijri);
        } catch {
          // Hijri date is nice-to-have
        }

        if (mountedRef.current) setIsLoading(false);
        return;
      }

      // 2. Aladhan API fallback (calculated start times, no jama'ah)
      const { latitude: lat, longitude: lng } = SALAFI_MASJID;
      const result = await getPrayerTimes(lat, lng, CALCULATION_METHOD_CODE, CALCULATION_METHOD_NAME, targetDate);
      if (!mountedRef.current) return;
      const entries = buildPrayerEntries(result.times);

      setPrayers(entries);
      setNextPrayer(isTodayFn(targetDate) ? getNextPrayer(result.times) : null);
      setSource(result.source);
      setJamaahAvailable(false);
      setIsEstimated(false);

      // Hijri date from the Aladhan response
      try {
        const hijri = await getCorrectHijriDate(targetDate, result.times.maghrib);
        if (hijri && mountedRef.current) setHijriDate(hijri);
      } catch {
        if (result.hijriDate && result.hijriMonth && result.hijriYear) {
          if (mountedRef.current) setHijriDate(`${result.hijriDate} ${result.hijriMonth} ${result.hijriYear}`);
        }
      }

      if (isTodayFn(targetDate)) {
        const reminderMinutes = await getReminderMinutes();
        await schedulePrayerReminders(result.times, reminderMinutes);
      }
    } catch (err) {
      console.error('Failed to load prayer times:', err);
      // R2: Surface error so the UI can show a fallback instead of a blank screen
      if (mountedRef.current) {
        setError(t('error.prayerTimesRetry'));
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextPrayerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update countdown + window progress every 30 seconds
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (!nextPrayer || prayers.length === 0) return;

    const updateCountdown = () => {
      const prayer = prayers.find((p) => p.name === nextPrayer);
      if (prayer) {
        // Count down to jama'ah time if available, else start time
        const target = prayer.jamaahTime || prayer.time;
        setCountdown(getCountdown(target));

        // Calculate window progress: how far through current→next prayer window
        const nextIdx = prayers.findIndex((p) => p.name === nextPrayer);
        const prevIdx = nextIdx > 0 ? nextIdx - 1 : 0;
        const windowStart = prayers[prevIdx].time.getTime();
        const windowEnd = prayer.time.getTime();
        const now = Date.now();
        const total = windowEnd - windowStart;
        if (total > 0) {
          setWindowProgress(Math.max(0, Math.min(1, (now - windowStart) / total)));
        }
      }
    };

    updateCountdown();
    countdownIntervalRef.current = setInterval(updateCountdown, 30_000);
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [nextPrayer, prayers]);

  // Check if next prayer changed every minute
  useEffect(() => {
    if (nextPrayerIntervalRef.current) {
      clearInterval(nextPrayerIntervalRef.current);
      nextPrayerIntervalRef.current = null;
    }

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
      const jamaahData = prayers[0].jamaahTime ? {
        fajr: prayers.find((p) => p.name === 'fajr')!.jamaahTime!,
        dhuhr: prayers.find((p) => p.name === 'dhuhr')!.jamaahTime!,
        asr: prayers.find((p) => p.name === 'asr')!.jamaahTime!,
        maghrib: prayers.find((p) => p.name === 'maghrib')!.jamaahTime!,
        isha: prayers.find((p) => p.name === 'isha')!.jamaahTime!,
      } : null;
      setNextPrayer(getNextPrayer(times, jamaahData));
    };

    nextPrayerIntervalRef.current = setInterval(checkNextPrayer, 60_000);
    return () => {
      if (nextPrayerIntervalRef.current) {
        clearInterval(nextPrayerIntervalRef.current);
        nextPrayerIntervalRef.current = null;
      }
    };
  }, [prayers]);

  // Load prayer times on mount and when selected date changes (Q8: single effect)
  const initialLoadRef = useRef(true);
  useEffect(() => {
    // Skip redundant initial load — selectedDate is already set on mount
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
    }
    loadPrayerTimes(selectedDate);
  }, [selectedDate, loadPrayerTimes]);

  return {
    prayers,
    nextPrayer,
    countdown,
    windowProgress,
    hijriDate,
    isLoading,
    error,
    source,
    jamaahAvailable,
    isEstimated,
    use24h,
    refresh: loadPrayerTimes,
    selectedDate,
    isToday,
    goToNextDay,
    goToPrevDay,
    goToToday,
  };
}
