/**
 * Prayer times helpers.
 *
 * Prayer times are sourced exclusively from the bundled static timetable
 * (`constants/static-timetable.json`, read via `lib/staticTimetable.ts`)
 * with an optional overlay from the backend API. No calculation-based
 * source (Aladhan, adhan-js, etc.) is used for prayer times — the masjid's
 * committee-set jama'ah times are the source of truth.
 *
 * This module now contains only display + selection helpers.
 */
import { format } from 'date-fns';
import type { PrayerTimesData, PrayerTimeEntry, PrayerName } from '@/types';
import { PRAYER_LABELS } from '@/types';

/** Prayers that are always in the PM (after noon) */
const PM_PRAYERS = new Set<PrayerName>(['dhuhr', 'asr', 'maghrib', 'isha']);

/** Build prayer time entries list for display.
 *  Single enforcement point: all display paths flow through here, so
 *  ensurePM is applied regardless of data source.
 *
 *  `times` = masjid timetable jama'ah times (primary).
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

/** Format prayer time for display.
 *  Guards against Invalid Date to prevent render crashes (date-fns throws
 *  RangeError on Invalid Date, which would blank the entire prayer tab). */
export function formatPrayerTime(date: Date, use24h: boolean = false): string {
  if (isNaN(date.getTime())) {
    return '--:--';
  }
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
 * Ensure a Date is in the PM range (hour >= 12).
 * Prayers like Dhuhr, Asr, Maghrib, and Isha are always after noon.
 * If an upstream source returns an AM value (e.g. "04:00" instead of "16:00"),
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
