/**
 * Hijri calendar utilities.
 *
 * Sole remaining use of the Aladhan API in this app: Gregorian→Hijri date
 * conversion. Prayer times come from the bundled static timetable
 * (`constants/static-timetable.json`) — see `lib/staticTimetable.ts`.
 *
 * Results are cached per Gregorian day to avoid repeated network calls.
 */

interface HijriDate {
  day: number;
  month: number;
  monthName: string;
  year: number;
}

type HijriCache = Map<string, HijriDate>;

const _cache: HijriCache = new Map();

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Fetch the Hijri date for a specific Gregorian date from the Aladhan API.
 * Returns cached result if already fetched for that date.
 */
export async function getHijriDateFor(d: Date): Promise<HijriDate | null> {
  const key = dateKey(d);
  const cached = _cache.get(key);
  if (cached) return cached;

  try {
    const dd = d.getDate();
    const mm = d.getMonth() + 1;
    const yyyy = d.getFullYear();
    const url = `https://api.aladhan.com/v1/gToH/${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}-${yyyy}`;
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

    _cache.set(key, hijri);
    return hijri;
  } catch {
    return null;
  }
}

/** Fetch today's Hijri date. Convenience wrapper around `getHijriDateFor`. */
export async function getHijriDate(): Promise<HijriDate | null> {
  return getHijriDateFor(new Date());
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
