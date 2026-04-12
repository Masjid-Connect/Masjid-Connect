/**
 * Static timetable fallback — bundled prayer times from historical PDFs.
 *
 * When the backend API is unreachable and Aladhan is also offline, this
 * module provides prayer times (including jama'ah) from a pre-built JSON
 * file.  Solar prayer times repeat annually to within ±1 minute, so last
 * year's data is an excellent proxy for the current year.
 */
import { format, subYears, addDays } from 'date-fns';
import type { PrayerTimesData } from '@/types';
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

/** Parse "HH:MM" into a Date on the given date string (YYYY-MM-DD).
 *  Returns noon for malformed values to prevent Invalid Date propagation. */
function toDate(timeStr: string | null, dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!timeStr || timeStr.trim() === '') {
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  return new Date(y, m - 1, d, hours, minutes, 0, 0);
}

/** Check whether the static timetable has any data. */
export function hasStaticTimetable(): boolean {
  return Object.keys(timetable).length > 0;
}

/**
 * Detect whether a date falls on a DST transition (clocks change).
 * On transition days, the static timetable may have times in the wrong
 * timezone (e.g. GMT times on a BST day or vice versa).
 */
function isDSTTransition(date: Date): boolean {
  const dayBefore = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 12);
  const dayOf = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  return dayOf.getTimezoneOffset() !== dayBefore.getTimezoneOffset();
}

/**
 * Look up prayer times for a given date from the static timetable.
 *
 * If no exact match exists for the date, tries the same calendar day
 * from the previous year (solar prayer times repeat annually).
 * Jama'ah times from a prior year are still useful estimates.
 *
 * On DST transition days (e.g. GMT→BST in March, BST→GMT in October),
 * uses the next day's timetable entry instead, since the transition-day
 * entry is often stored in the pre-transition timezone.
 *
 * Returns null if no data is available at all.
 */
export function getStaticPrayerTimes(
  targetDate: Date,
): { times: PrayerTimesData; startTimes: PrayerTimesData | undefined; isEstimated: boolean } | null {
  if (!hasStaticTimetable()) return null;

  const dateStr = format(targetDate, 'yyyy-MM-dd');
  let entry = timetable[dateStr];
  let isEstimated = false;

  // On DST transition days, the timetable entry often has times in the
  // pre-transition timezone. Use the next day's entry which has correct
  // post-transition times (prayer times shift by <2 min day-to-day).
  if (entry && isDSTTransition(targetDate)) {
    const nextDayStr = format(addDays(targetDate, 1), 'yyyy-MM-dd');
    const nextEntry = timetable[nextDayStr];
    if (nextEntry) {
      entry = nextEntry;
      isEstimated = true;
    }
  }

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

  // PRIMARY: jama'ah times from the masjid timetable
  const times: PrayerTimesData = {
    fajr: toDate(entry.fJ, dateStr),
    sunrise: toDate(entry.sr, dateStr),
    dhuhr: ensurePM(toDate(entry.dJ, dateStr)),
    asr: ensurePM(toDate(entry.aJ, dateStr)),
    maghrib: ensurePM(toDate(entry.mJ, dateStr)),
    isha: ensurePM(toDate(entry.iJ, dateStr)),
  };

  // OPTIONAL: start/begins times from the masjid timetable
  const hasStartTimes = entry.fS || entry.dS || entry.aS || entry.iS;
  const startTimes: PrayerTimesData | undefined = hasStartTimes ? {
    fajr: toDate(entry.fS, dateStr),
    sunrise: toDate(entry.sr, dateStr),
    dhuhr: ensurePM(toDate(entry.dS, dateStr)),
    asr: ensurePM(toDate(entry.aS, dateStr)),
    maghrib: ensurePM(toDate(entry.mJ, dateStr)), // maghrib has no separate start
    isha: ensurePM(toDate(entry.iS, dateStr)),
  } : undefined;

  return { times, startTimes, isEstimated };
}
