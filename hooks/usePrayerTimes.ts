import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addDays, isToday as isTodayFn } from 'date-fns';
import { buildPrayerEntries, getNextPrayer, getCountdown, ensurePM } from '@/lib/prayer';
import { getReminderMinutes, getUse24h } from '@/lib/storage';
import { getMosqueId } from '@/constants/mosque';
import { schedulePrayerReminders } from '@/lib/notifications';
import { getStaticPrayerTimes } from '@/lib/staticTimetable';
import { getHijriDateFor } from '@/lib/hijri';
import { prayerTimes as prayerTimesApi } from '@/lib/api';
import type { PrayerTimeEntry, PrayerName, PrayerTimesData, MosquePrayerTimeResponse } from '@/types';

/** Parse "HH:MM:SS" or "HH:MM" time string into a Date on the given date.
 *  Returns midnight for null/empty, noon for malformed (NaN) values.
 *  Noon fallback matches parseTimeString in lib/prayer.ts — prevents
 *  Invalid Date from propagating to the render and crashing date-fns. */
function parseTimeField(timeStr: string | null, targetDate: Date): Date {
  const y = targetDate.getFullYear();
  const m = targetDate.getMonth();
  const d = targetDate.getDate();
  if (!timeStr || timeStr.trim() === '') {
    return new Date(y, m, d, 0, 0, 0);
  }
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];
  if (isNaN(hours) || isNaN(minutes)) {
    // Malformed time string — fall back to noon rather than producing Invalid Date
    return new Date(y, m, d, 12, 0, 0);
  }
  return new Date(y, m, d, hours, minutes, 0);
}

/**
 * Check whether a parsed Date came from a null/empty field (resolved to midnight).
 * Midnight (hour 0) is the sentinel returned by parseTimeField for null inputs.
 * Fajr genuinely occurs before sunrise but never at exactly 00:00.
 */
function isMidnightSentinel(date: Date): boolean {
  return date.getHours() === 0 && date.getMinutes() === 0;
}

/**
 * Patch any null-sentinel prayer times with values from the static timetable.
 * This ensures the user always sees real times — never blank or noon fallbacks.
 * The static timetable has 365 days of accurate data (±1 min year-over-year).
 */
function patchFromStatic(
  times: PrayerTimesData,
  startTimes: PrayerTimesData | undefined,
  targetDate: Date,
): { times: PrayerTimesData; startTimes: PrayerTimesData | undefined } {
  const staticResult = getStaticPrayerTimes(targetDate);
  if (!staticResult) return { times, startTimes };

  const prayerKeys: (keyof PrayerTimesData)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  const patched = { ...times };
  for (const key of prayerKeys) {
    if (isMidnightSentinel(patched[key])) {
      patched[key] = staticResult.times[key];
    }
  }

  let patchedStart = startTimes;
  if (patchedStart && staticResult.startTimes) {
    patchedStart = { ...patchedStart };
    for (const key of prayerKeys) {
      if (isMidnightSentinel(patchedStart[key])) {
        patchedStart[key] = staticResult.startTimes[key];
      }
    }
  }

  return { times: patched, startTimes: patchedStart };
}

/**
 * Convert an API MosquePrayerTimeResponse into prayer data.
 * Masjid jama'ah times are the PRIMARY times — they're what the congregation uses.
 * Start times from the masjid timetable are optional secondary info.
 * Any null/missing fields are patched from the static timetable.
 */
function parseApiPrayerTimes(
  apiData: MosquePrayerTimeResponse,
  targetDate: Date,
): { times: PrayerTimesData; startTimes: PrayerTimesData | undefined } {
  // PRIMARY: jama'ah times from the masjid timetable (always present)
  const times: PrayerTimesData = {
    fajr: parseTimeField(apiData.fajr_jamat, targetDate),
    sunrise: parseTimeField(apiData.sunrise, targetDate),
    dhuhr: ensurePM(parseTimeField(apiData.dhuhr_jamat, targetDate)),
    asr: ensurePM(parseTimeField(apiData.asr_jamat, targetDate)),
    maghrib: ensurePM(parseTimeField(apiData.maghrib_jamat, targetDate)),
    isha: ensurePM(parseTimeField(apiData.isha_jamat, targetDate)),
  };

  // OPTIONAL: start/begins times from the masjid timetable (may be null)
  const hasStartTimes = apiData.fajr_start || apiData.dhuhr_start || apiData.asr_start || apiData.isha_start;
  const startTimes: PrayerTimesData | undefined = hasStartTimes ? {
    fajr: parseTimeField(apiData.fajr_start, targetDate),
    sunrise: parseTimeField(apiData.sunrise, targetDate),
    dhuhr: ensurePM(parseTimeField(apiData.dhuhr_start, targetDate)),
    asr: ensurePM(parseTimeField(apiData.asr_start, targetDate)),
    maghrib: ensurePM(parseTimeField(apiData.maghrib_jamat, targetDate)), // maghrib has no separate start
    isha: ensurePM(parseTimeField(apiData.isha_start, targetDate)),
  } : undefined;

  // Patch any null/missing fields from the static timetable
  return patchFromStatic(times, startTimes, targetDate);
}

/**
 * Get the correct Hijri date, accounting for the Islamic day starting at Maghrib.
 * If current time is after Maghrib, the Hijri date should be for the *next* Gregorian day.
 *
 * Uses Aladhan's Gregorian→Hijri conversion endpoint via `lib/hijri.ts`.
 * This is the only remaining use of Aladhan in the app; prayer times themselves
 * come from the bundled static timetable.
 */
async function getCorrectHijriDate(
  targetDate: Date,
  maghribTime: Date | undefined,
): Promise<string | null> {
  const now = new Date();
  const isAfterMaghrib = maghribTime && isTodayFn(targetDate) && now >= maghribTime;
  const hijriQueryDate = isAfterMaghrib ? addDays(targetDate, 1) : targetDate;

  const hijri = await getHijriDateFor(hijriQueryDate);
  if (!hijri) return null;
  return `${hijri.day} ${hijri.monthName} ${hijri.year}`;
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
  source: 'static' | 'api';
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
  const [source, setSource] = useState<'static' | 'api'>('static');
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

    // Helper: once we have valid prayer data, set state + schedule reminders
    const applyPrayerData = async (
      times: PrayerTimesData,
      startTimes: PrayerTimesData | undefined,
      dataSource: 'static' | 'api',
      estimated: boolean,
      hasMasjidTimes: boolean,
    ) => {
      if (!mountedRef.current) return;
      const entries = buildPrayerEntries(times, startTimes);
      setPrayers(entries);
      setNextPrayer(isTodayFn(targetDate) ? getNextPrayer(times) : null);
      setSource(dataSource);
      setJamaahAvailable(hasMasjidTimes);
      setIsEstimated(estimated);

      if (isTodayFn(targetDate)) {
        const reminderMinutes = await getReminderMinutes();
        await schedulePrayerReminders(times, reminderMinutes);
      }

      // Fetch Aladhan for Hijri date only
      try {
        const hijri = await getCorrectHijriDate(targetDate, times.maghrib);
        if (hijri && mountedRef.current) setHijriDate(hijri);
      } catch {
        // Hijri date is nice-to-have
      }

      if (mountedRef.current) setIsLoading(false);
    };

    try {
      // 1. Static bundled timetable — PRIMARY source (masjid's committee-set jama'ah
      //    times, scraped from the masjid website and shipped with the app).
      //    Covers 2023-01-01 through 2027-12-31; refreshed via the
      //    `scrape-timetables` GitHub Action + EAS OTA update.
      const staticResult = getStaticPrayerTimes(targetDate);
      if (staticResult) {
        await applyPrayerData(staticResult.times, staticResult.startTimes, 'static', staticResult.isEstimated, true);

        // 2. Backend API overlay — if available, replaces the static data for
        //    ad-hoc schedule edits (e.g. Ramadan changes entered by an admin
        //    between JSON regenerations). Silent no-op on failure.
        try {
          const mosqueId = await getMosqueId();
          if (mosqueId) {
            const dateStr = format(targetDate, 'yyyy-MM-dd');
            const apiData = await prayerTimesApi.getByDate(mosqueId, dateStr);
            if (apiData && mountedRef.current) {
              const { times, startTimes } = parseApiPrayerTimes(apiData, targetDate);
              await applyPrayerData(times, startTimes, 'api', false, true);
            }
          }
        } catch {
          // Overlay is optional — static data already applied, no error surfaced
        }
        return;
      }

      // Static lookup returned nothing (should not happen given coverage through
      // 2027-12-31 plus ±1 day leap-year fallback). Try the backend API as a
      // last resort; if that also fails, surface an error rather than fabricate
      // calculation-based times the masjid doesn't use.
      const mosqueId = await getMosqueId();
      if (mosqueId) {
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        const apiData = await prayerTimesApi.getByDate(mosqueId, dateStr);
        if (apiData) {
          const { times, startTimes } = parseApiPrayerTimes(apiData, targetDate);
          await applyPrayerData(times, startTimes, 'api', false, true);
          return;
        }
      }

      if (mountedRef.current) {
        setError(t('error.prayerTimesRetry'));
        setIsLoading(false);
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
        // Count down to the masjid timetable time (jama'ah)
        setCountdown(getCountdown(prayer.time));

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
      setNextPrayer(getNextPrayer(times));
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
