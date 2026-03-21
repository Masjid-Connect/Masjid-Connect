/**
 * Static timetable fallback — bundled prayer times from historical PDFs.
 *
 * When the backend API is unreachable and Aladhan is also offline, this
 * module provides prayer times (including jama'ah) from a pre-built JSON
 * file.  Solar prayer times repeat annually to within ±1 minute, so last
 * year's data is an excellent proxy for the current year.
 */
import { format, subYears } from 'date-fns';
import type { PrayerTimesData, JamaahTimesData } from '@/types';
import { ensurePM } from '@/lib/prayer';

/**
 * Compact JSON format exported by `manage.py export_timetable_json`.
 * Keys are shortened to minimise bundle size:
 *   fS = fajr_start, fJ = fajr_jamat, sr = sunrise,
 *   dS = dhuhr_start, dJ = dhuhr_jamat, aS = asr_start, aJ = asr_jamat,
 *   mJ = maghrib_jamat, iS = isha_start, iJ = isha_jamat
 */
interface StaticDayEntry {
  fS: string | null;
  fJ: string | null;
  sr: string | null;
  dS: string | null;
  dJ: string | null;
  aS: string | null;
  aJ: string | null;
  mJ: string | null;
  iS: string | null;
  iJ: string | null;
}

type StaticTimetable = Record<string, StaticDayEntry>;

// Load the bundled JSON at module init
// eslint-disable-next-line @typescript-eslint/no-var-requires
let timetable: StaticTimetable = {};
try {
  // require() so Metro bundles the JSON at build time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  timetable = require('@/constants/static-timetable.json') as StaticTimetable;
} catch {
  // JSON not yet generated — static fallback unavailable
}

/** Parse "HH:MM" into a Date on the given date string (YYYY-MM-DD). */
function toDate(timeStr: string | null, dateStr: string): Date {
  if (!timeStr) {
    // Shouldn't happen for required fields, but return midnight as safe default
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, hours, minutes, 0, 0);
}

/** Check whether the static timetable has any data. */
export function hasStaticTimetable(): boolean {
  return Object.keys(timetable).length > 0;
}

/**
 * Look up prayer times for a given date from the static timetable.
 *
 * If no exact match exists for the date, tries the same calendar day
 * from the previous year (solar prayer times repeat annually).
 * Jama'ah times from a prior year are still useful estimates.
 *
 * Returns null if no data is available at all.
 */
export function getStaticPrayerTimes(
  targetDate: Date,
): { times: PrayerTimesData; jamaahTimes: JamaahTimesData; isEstimated: boolean } | null {
  if (!hasStaticTimetable()) return null;

  const dateStr = format(targetDate, 'yyyy-MM-dd');
  let entry = timetable[dateStr];
  let isEstimated = false;

  if (!entry) {
    // Try the same calendar day from the previous year
    const lastYear = subYears(targetDate, 1);
    const lastYearStr = format(lastYear, 'yyyy-MM-dd');
    entry = timetable[lastYearStr];
    isEstimated = true;

    if (!entry) {
      // Try ±1 day from last year (handles leap year shifts)
      for (const offset of [1, -1, 2, -2]) {
        const nearby = new Date(lastYear);
        nearby.setDate(nearby.getDate() + offset);
        const nearbyStr = format(nearby, 'yyyy-MM-dd');
        if (timetable[nearbyStr]) {
          entry = timetable[nearbyStr];
          break;
        }
      }
    }

    if (!entry) return null;
  }

  // Build PrayerTimesData — use start times when available, fall back to jama'ah
  const times: PrayerTimesData = {
    fajr: toDate(entry.fS ?? entry.fJ, dateStr),
    sunrise: toDate(entry.sr, dateStr),
    dhuhr: ensurePM(toDate(entry.dS ?? entry.dJ, dateStr)),
    asr: ensurePM(toDate(entry.aS ?? entry.aJ, dateStr)),
    maghrib: ensurePM(toDate(entry.mJ, dateStr)),
    isha: ensurePM(toDate(entry.iS ?? entry.iJ, dateStr)),
  };

  // Build JamaahTimesData
  const jamaahTimes: JamaahTimesData = {
    fajr: toDate(entry.fJ, dateStr),
    dhuhr: ensurePM(toDate(entry.dJ, dateStr)),
    asr: ensurePM(toDate(entry.aJ, dateStr)),
    maghrib: ensurePM(toDate(entry.mJ, dateStr)),
    isha: ensurePM(toDate(entry.iJ, dateStr)),
  };

  return { times, jamaahTimes, isEstimated };
}
