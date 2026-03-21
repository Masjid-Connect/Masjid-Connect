/**
 * Hijri calendar utilities for seasonal UI hooks.
 *
 * Uses the Aladhan API's Gregorian-to-Hijri conversion endpoint.
 * Cached for the current day to avoid repeated network calls.
 *
 * Primary use: Ramadan detection for seasonal theming and iftar countdowns.
 */

interface HijriDate {
  day: number;
  month: number;
  monthName: string;
  year: number;
}

interface HijriCacheEntry {
  date: string; // YYYY-MM-DD gregorian key
  hijri: HijriDate;
}

let _cache: HijriCacheEntry | null = null;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Fetch today's Hijri date from the Aladhan API.
 * Returns cached result if already fetched today.
 */
export async function getHijriDate(): Promise<HijriDate | null> {
  const key = todayKey();
  if (_cache && _cache.date === key) return _cache.hijri;

  try {
    const [dd, mm, yyyy] = [
      new Date().getDate(),
      new Date().getMonth() + 1,
      new Date().getFullYear(),
    ];
    const url = `https://api.aladhan.com/v1/gpiToH/${dd}-${String(mm).padStart(2, '0')}-${yyyy}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    const h = json?.data?.hijri;
    if (!h) return null;

    const hijri: HijriDate = {
      day: Number(h.day),
      month: Number(h.month.number),
      monthName: h.month.en as string,
      year: Number(h.year),
    };

    _cache = { date: key, hijri };
    return hijri;
  } catch {
    return null;
  }
}

/** Hijri month numbers for semantic checks */
export const HIJRI_MONTHS = {
  MUHARRAM: 1,
  SAFAR: 2,
  RABI_AL_AWWAL: 3,
  RABI_AL_THANI: 4,
  JUMADA_AL_ULA: 5,
  JUMADA_AL_THANI: 6,
  RAJAB: 7,
  SHABAN: 8,
  RAMADAN: 9,
  SHAWWAL: 10,
  DHU_AL_QADAH: 11,
  DHU_AL_HIJJAH: 12,
} as const;

/**
 * Check if we are currently in Ramadan.
 * Returns { isRamadan, day } or null if unable to determine.
 */
export async function checkRamadan(): Promise<{ isRamadan: boolean; day: number } | null> {
  const hijri = await getHijriDate();
  if (!hijri) return null;
  return {
    isRamadan: hijri.month === HIJRI_MONTHS.RAMADAN,
    day: hijri.day,
  };
}

/**
 * Get the current Islamic season for UI theming.
 * Returns a season identifier for conditional styling hooks.
 */
export type IslamicSeason = 'ramadan' | 'dhul_hijjah' | 'default';

export async function getIslamicSeason(): Promise<IslamicSeason> {
  const hijri = await getHijriDate();
  if (!hijri) return 'default';
  if (hijri.month === HIJRI_MONTHS.RAMADAN) return 'ramadan';
  if (hijri.month === HIJRI_MONTHS.DHU_AL_HIJJAH) return 'dhul_hijjah';
  return 'default';
}
