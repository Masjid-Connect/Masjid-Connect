/**
 * Prayer times service
 * Primary: Aladhan API (free, no key) for accurate, method-aware times + Hijri date
 * Fallback: adhan-js for offline calculation
 */
import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  Prayer,
} from 'adhan';
import { format } from 'date-fns';
import type { PrayerTimesData, PrayerTimeEntry, PrayerName, JamaahTimesData, MosquePrayerTimeResponse } from '@/types';
import { PRAYER_LABELS } from '@/types';
import { mosques } from '@/lib/api';

const ALADHAN_BASE = 'https://api.aladhan.com/v1';

interface AladhanTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface AladhanResponse {
  code: number;
  data: {
    timings: AladhanTimings;
    date: {
      hijri: {
        date: string;
        day: string;
        month: { number: number; en: string; ar: string };
        year: string;
        designation: { abbreviated: string; expanded: string };
      };
      gregorian: {
        date: string;
      };
    };
    meta: {
      method: { id: number; name: string };
    };
  };
}

/** Fetch prayer times from Aladhan API */
export async function fetchPrayerTimesFromAPI(
  latitude: number,
  longitude: number,
  method: number = 2,
  date?: Date
): Promise<{ timings: PrayerTimesData; hijriDate: string; hijriMonth: string; hijriYear: string } | null> {
  try {
    const d = date || new Date();
    const dateStr = format(d, 'dd-MM-yyyy');
    const url = `${ALADHAN_BASE}/timings/${dateStr}?latitude=${latitude}&longitude=${longitude}&method=${method}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const json: AladhanResponse = await response.json();
    if (json.code !== 200) return null;

    const { timings } = json.data;
    const today = format(d, 'yyyy-MM-dd');

    return {
      timings: {
        fajr: parseTimeString(timings.Fajr, today),
        sunrise: parseTimeString(timings.Sunrise, today),
        dhuhr: ensurePM(parseTimeString(timings.Dhuhr, today)),
        asr: ensurePM(parseTimeString(timings.Asr, today)),
        maghrib: ensurePM(parseTimeString(timings.Maghrib, today)),
        isha: ensurePM(parseTimeString(timings.Isha, today)),
      },
      hijriDate: json.data.date.hijri.day,
      hijriMonth: json.data.date.hijri.month.en,
      hijriYear: json.data.date.hijri.year,
    };
  } catch {
    return null;
  }
}

/** Offline fallback: calculate prayer times using adhan-js */
export function calculatePrayerTimesOffline(
  latitude: number,
  longitude: number,
  methodName: string = 'NorthAmerica',
  date?: Date
): PrayerTimesData {
  const coordinates = new Coordinates(latitude, longitude);
  const d = date || new Date();

  const methodMap: Record<string, () => ReturnType<typeof CalculationMethod.NorthAmerica>> = {
    NorthAmerica: () => CalculationMethod.NorthAmerica(),
    MuslimWorldLeague: () => CalculationMethod.MuslimWorldLeague(),
    UmmAlQura: () => CalculationMethod.UmmAlQura(),
    Egyptian: () => CalculationMethod.Egyptian(),
    Karachi: () => CalculationMethod.Karachi(),
  };

  const params = (methodMap[methodName] || methodMap.NorthAmerica)();
  const prayerTimes = new PrayerTimes(coordinates, d, params);

  return {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
  };
}

/** Get prayer times — API first, offline fallback */
export async function getPrayerTimes(
  latitude: number,
  longitude: number,
  method: number = 2,
  methodName: string = 'NorthAmerica',
  date?: Date
): Promise<{ times: PrayerTimesData; hijriDate?: string; hijriMonth?: string; hijriYear?: string; source: 'api' | 'offline' }> {
  // Try API first
  const apiResult = await fetchPrayerTimesFromAPI(latitude, longitude, method, date);
  if (apiResult) {
    return {
      times: apiResult.timings,
      hijriDate: apiResult.hijriDate,
      hijriMonth: apiResult.hijriMonth,
      hijriYear: apiResult.hijriYear,
      source: 'api',
    };
  }

  // Offline fallback
  return {
    times: calculatePrayerTimesOffline(latitude, longitude, methodName, date),
    source: 'offline',
  };
}

/** Fetch scraped prayer times from our backend for a specific mosque + date */
export async function fetchMosquePrayerTimes(
  mosqueId: string,
  date?: Date
): Promise<{ times: PrayerTimesData; jamaahTimes: JamaahTimesData; hasSunrise: boolean } | null> {
  try {
    const d = date || new Date();
    const dateStr = format(d, 'yyyy-MM-dd');
    const response = await mosques.getPrayerTimes(mosqueId, dateStr);
    if (!response) return null;
    return parseMosquePrayerTimesResponse(response, dateStr);
  } catch {
    return null;
  }
}

/** Convert API response to typed prayer + jama'ah data */
function parseMosquePrayerTimesResponse(
  response: MosquePrayerTimeResponse,
  dateStr: string
): { times: PrayerTimesData; jamaahTimes: JamaahTimesData } {
  // Jama'ah times (always present)
  // Dhuhr, Asr, Maghrib, Isha are always PM — ensurePM corrects any AM values
  const jamaahTimes: JamaahTimesData = {
    fajr: parseTimeString(response.fajr_jamat, dateStr),
    dhuhr: ensurePM(parseTimeString(response.dhuhr_jamat, dateStr)),
    asr: ensurePM(parseTimeString(response.asr_jamat, dateStr)),
    maghrib: ensurePM(parseTimeString(response.maghrib_jamat, dateStr)),
    isha: ensurePM(parseTimeString(response.isha_jamat, dateStr)),
  };

  // Start times — use scraped values if available, otherwise use jama'ah times as approximation
  const times: PrayerTimesData = {
    fajr: response.fajr_start ? parseTimeString(response.fajr_start, dateStr) : jamaahTimes.fajr,
    sunrise: response.sunrise ? parseTimeString(response.sunrise, dateStr) : jamaahTimes.fajr, // placeholder — overridden by Aladhan in hook
    dhuhr: response.dhuhr_start ? ensurePM(parseTimeString(response.dhuhr_start, dateStr)) : jamaahTimes.dhuhr,
    asr: response.asr_start ? ensurePM(parseTimeString(response.asr_start, dateStr)) : jamaahTimes.asr,
    maghrib: jamaahTimes.maghrib, // Maghrib start = jama'ah (prayed immediately at sunset)
    isha: response.isha_start ? ensurePM(parseTimeString(response.isha_start, dateStr)) : jamaahTimes.isha,
  };

  const hasSunrise = response.sunrise !== null;

  return { times, jamaahTimes, hasSunrise };
}

/** Prayers that are always in the PM (after noon) */
const PM_PRAYERS = new Set<PrayerName>(['dhuhr', 'asr', 'maghrib', 'isha']);

/** Build prayer time entries list for display.
 *  This is the single enforcement point: all display paths flow through here,
 *  so ensurePM is applied regardless of data source (cache, mosque API, Aladhan, offline).
 */
export function buildPrayerEntries(
  times: PrayerTimesData,
  jamaahTimes?: JamaahTimesData | null
): PrayerTimeEntry[] {
  const names: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  return names.map((name) => {
    const shouldEnsurePM = PM_PRAYERS.has(name);
    const time = shouldEnsurePM ? ensurePM(times[name]) : times[name];
    const jamaahTime = (jamaahTimes && name !== 'sunrise' && name in jamaahTimes)
      ? (shouldEnsurePM ? ensurePM(jamaahTimes[name as keyof JamaahTimesData]) : jamaahTimes[name as keyof JamaahTimesData])
      : null;
    return { name, label: PRAYER_LABELS[name].en, time, jamaahTime };
  });
}

/**
 * Extrapolate jama'ah times from a known source to a different date.
 * Copies the HH:MM from each prayer and applies them to targetDate.
 * Used when the backend has no timetable for a future date — we carry
 * forward the last known jama'ah schedule (timetable changes on Sundays).
 */
export function extrapolateJamaahTimes(
  source: JamaahTimesData,
  targetDate: Date,
): JamaahTimesData {
  const applyDate = (src: Date): Date => {
    const d = new Date(targetDate);
    d.setHours(src.getHours(), src.getMinutes(), src.getSeconds(), 0);
    return d;
  };

  return {
    fajr: applyDate(source.fajr),
    dhuhr: applyDate(source.dhuhr),
    asr: applyDate(source.asr),
    maghrib: applyDate(source.maghrib),
    isha: applyDate(source.isha),
  };
}

/**
 * Determine the next upcoming prayer.
 *
 * When jama'ah times are available, a prayer is not considered "passed"
 * until BOTH the adhan time AND the jama'ah time have passed. This prevents
 * the app from jumping to the next prayer while the congregation hasn't
 * prayed yet (e.g. Dhuhr adhan at 12:17 but jama'ah at 12:45).
 */
export function getNextPrayer(
  times: PrayerTimesData,
  jamaahTimes?: JamaahTimesData | null,
): PrayerName | null {
  const now = new Date();
  const order: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  for (const name of order) {
    const adhanTime = times[name];
    // Use the later of adhan or jama'ah time (sunrise has no jama'ah)
    const jamaahTime = name !== 'sunrise' && jamaahTimes?.[name as keyof JamaahTimesData];
    const effectiveTime = jamaahTime && jamaahTime > adhanTime ? jamaahTime : adhanTime;

    if (effectiveTime > now) {
      return name;
    }
  }

  // All prayers passed — next is tomorrow's fajr
  return 'fajr';
}

/** Get countdown string to next prayer */
export function getCountdown(target: Date): string {
  const now = new Date();
  let diff = target.getTime() - now.getTime();

  if (diff < 0) {
    // If prayer has passed, calculate to next day
    diff += 24 * 60 * 60 * 1000;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/** Format prayer time for display */
export function formatPrayerTime(date: Date, use24h: boolean = false): string {
  if (use24h) {
    return format(date, 'HH:mm');
  }
  return format(date, 'h:mm a');
}

/** Format a time string (HH:mm or HH:mm:ss) for display based on 24h preference */
export function formatTimeString(timeStr: string, use24h: boolean = false): string {
  if (use24h) {
    // Already in 24h format from the API, just ensure HH:mm
    return timeStr.slice(0, 5);
  }
  // Convert HH:mm to 12h format
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutesStr} ${period}`;
}

/** Parse "HH:mm" or "HH:mm:ss" or "HH:mm (timezone)" string to Date */
function parseTimeString(timeStr: string, dateStr: string): Date {
  // Aladhan returns "HH:mm (TZ)" format — strip timezone part
  const clean = timeStr.split(' ')[0];
  const [hours, minutes] = clean.split(':').map(Number);
  // Use explicit year/month/day to avoid UTC vs local timezone mismatch
  // (new Date("YYYY-MM-DD") creates UTC midnight, but setHours is local)
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, hours, minutes, 0, 0);
  return date;
}

/**
 * Ensure a Date is in the PM range (hour >= 12).
 * Prayers like Dhuhr, Asr, Maghrib, and Isha are always after noon.
 * If the backend returns an AM value (e.g. "04:00" instead of "16:00"),
 * this corrects it by adding 12 hours.
 */
export function ensurePM(date: Date): Date {
  if (date.getHours() < 12) {
    const corrected = new Date(date);
    corrected.setHours(corrected.getHours() + 12);
    return corrected;
  }
  return date;
}
