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
import type { PrayerTimesData, PrayerTimeEntry, PrayerName } from '@/types';
import { PRAYER_LABELS } from '@/types';

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

    const json = await response.json() as Partial<AladhanResponse>;
    if (json.code !== 200 || !json.data?.timings || !json.data?.date?.hijri) return null;

    const { timings } = json.data;
    if (!timings.Fajr || !timings.Sunrise || !timings.Dhuhr || !timings.Asr || !timings.Maghrib || !timings.Isha) return null;
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

/** Prayers that are always in the PM (after noon) */
const PM_PRAYERS = new Set<PrayerName>(['dhuhr', 'asr', 'maghrib', 'isha']);

/** Build prayer time entries list for display.
 *  This is the single enforcement point: all display paths flow through here,
 *  so ensurePM is applied regardless of data source (cache, mosque API, Aladhan, offline).
 *
 *  `times` = primary masjid timetable times (jama'ah) or calculated as last resort.
 *  `startTimes` = optional prayer start/begins times from the masjid timetable.
 */
export function buildPrayerEntries(
  times: PrayerTimesData,
  startTimes?: PrayerTimesData | null
): PrayerTimeEntry[] {
  const names: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  return names.map((name) => {
    const shouldEnsurePM = PM_PRAYERS.has(name);
    const time = shouldEnsurePM ? ensurePM(times[name]) : times[name];
    const startTime = startTimes
      ? (shouldEnsurePM ? ensurePM(startTimes[name]) : startTimes[name])
      : null;
    return { name, label: PRAYER_LABELS[name].en, time, startTime };
  });
}

/**
 * Determine the next upcoming prayer.
 *
 * `times` contains the masjid timetable times (jama'ah). A prayer is not
 * considered "passed" until its time has passed.
 */
export function getNextPrayer(
  times: PrayerTimesData,
): PrayerName | null {
  const now = new Date();
  const order: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  for (const name of order) {
    if (times[name] > now) {
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

/**
 * Parse "HH:mm" or "HH:mm:ss" or "HH:mm (timezone)" string to Date.
 *
 * Aladhan returns times in the timezone of the queried coordinates.
 * We parse into the device's local timezone, which is correct when the
 * user is at the mosque location. If the device timezone differs from the
 * coordinates' timezone (e.g. user traveling), times may be offset — but
 * this is acceptable for a single-mosque app where the user is local.
 *
 * The timezone abbreviation (e.g. "BST", "GMT") from Aladhan is stripped
 * since JavaScript Date doesn't support arbitrary tz abbreviations.
 * For DST transitions, the Aladhan API returns the correct local time
 * and the device timezone handles DST automatically.
 */
function parseTimeString(timeStr: string, dateStr: string): Date {
  // Aladhan returns "HH:mm (TZ)" format — strip timezone abbreviation
  const clean = timeStr.split(' ')[0];
  const parts = clean.split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];
  if (isNaN(hours) || isNaN(minutes)) {
    // Fallback: return noon if time string is malformed
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  // Construct date using local timezone components to avoid UTC offset issues
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
