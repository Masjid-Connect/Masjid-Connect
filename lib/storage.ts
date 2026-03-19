import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PrayerTimesData, JamaahTimesData } from '@/types';
import { ensurePM } from '@/lib/prayer';

const KEYS = {
  PRAYER_TIMES: 'cached_prayer_times',
  PRAYER_DATE: 'cached_prayer_date',
  JAMAAH_TIMES: 'cached_jamaah_times',
  LATEST_JAMAAH_TIMES: 'latest_jamaah_times',
  USER_LOCATION: 'user_location',
  CALCULATION_METHOD: 'calculation_method',
  CALCULATION_METHOD_NAME: 'calculation_method_name',
  REMINDER_MINUTES: 'reminder_minutes',
  USE_24H: 'use_24h_format',
  THEME: 'theme_preference',
  LANGUAGE: 'language_preference',
  NOTIFY_ANNOUNCEMENTS: 'notify_announcements',
  NOTIFY_EVENTS: 'notify_events',
};

/** Prayer times cache */
export async function cachePrayerTimes(
  times: PrayerTimesData,
  date: string,
  jamaahTimes?: JamaahTimesData | null
): Promise<void> {
  const serialized = {
    fajr: times.fajr.toISOString(),
    sunrise: times.sunrise.toISOString(),
    dhuhr: times.dhuhr.toISOString(),
    asr: times.asr.toISOString(),
    maghrib: times.maghrib.toISOString(),
    isha: times.isha.toISOString(),
  };
  await AsyncStorage.setItem(KEYS.PRAYER_TIMES, JSON.stringify(serialized));
  await AsyncStorage.setItem(KEYS.PRAYER_DATE, date);

  if (jamaahTimes) {
    const serializedJamaah = {
      fajr: jamaahTimes.fajr.toISOString(),
      dhuhr: jamaahTimes.dhuhr.toISOString(),
      asr: jamaahTimes.asr.toISOString(),
      maghrib: jamaahTimes.maghrib.toISOString(),
      isha: jamaahTimes.isha.toISOString(),
    };
    await AsyncStorage.setItem(KEYS.JAMAAH_TIMES, JSON.stringify(serializedJamaah));
  } else {
    await AsyncStorage.removeItem(KEYS.JAMAAH_TIMES);
  }
}

export async function getCachedPrayerTimes(
  date: string
): Promise<{ times: PrayerTimesData; jamaahTimes: JamaahTimesData | null } | null> {
  const results = await AsyncStorage.multiGet([
    KEYS.PRAYER_DATE,
    KEYS.PRAYER_TIMES,
    KEYS.JAMAAH_TIMES,
  ]);
  const cachedDate = results[0][1];
  const raw = results[1][1];
  const rawJamaah = results[2][1];

  if (cachedDate !== date) return null;
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  const times: PrayerTimesData = {
    fajr: new Date(parsed.fajr),
    sunrise: new Date(parsed.sunrise),
    dhuhr: ensurePM(new Date(parsed.dhuhr)),
    asr: ensurePM(new Date(parsed.asr)),
    maghrib: ensurePM(new Date(parsed.maghrib)),
    isha: ensurePM(new Date(parsed.isha)),
  };

  let jamaahTimes: JamaahTimesData | null = null;
  if (rawJamaah) {
    const parsedJamaah = JSON.parse(rawJamaah);
    jamaahTimes = {
      fajr: new Date(parsedJamaah.fajr),
      dhuhr: ensurePM(new Date(parsedJamaah.dhuhr)),
      asr: ensurePM(new Date(parsedJamaah.asr)),
      maghrib: ensurePM(new Date(parsedJamaah.maghrib)),
      isha: ensurePM(new Date(parsedJamaah.isha)),
    };
  }

  return { times, jamaahTimes };
}

/**
 * Latest known jama'ah times — NOT keyed by date.
 * Persists across app restarts so we can extrapolate future times
 * even if the current day has no backend data.
 */
export async function saveLatestJamaahTimes(jamaahTimes: JamaahTimesData): Promise<void> {
  const serialized = {
    fajr: `${jamaahTimes.fajr.getHours()}:${String(jamaahTimes.fajr.getMinutes()).padStart(2, '0')}`,
    dhuhr: `${jamaahTimes.dhuhr.getHours()}:${String(jamaahTimes.dhuhr.getMinutes()).padStart(2, '0')}`,
    asr: `${jamaahTimes.asr.getHours()}:${String(jamaahTimes.asr.getMinutes()).padStart(2, '0')}`,
    maghrib: `${jamaahTimes.maghrib.getHours()}:${String(jamaahTimes.maghrib.getMinutes()).padStart(2, '0')}`,
    isha: `${jamaahTimes.isha.getHours()}:${String(jamaahTimes.isha.getMinutes()).padStart(2, '0')}`,
  };
  await AsyncStorage.setItem(KEYS.LATEST_JAMAAH_TIMES, JSON.stringify(serialized));
}

export async function getLatestJamaahTimes(targetDate: Date): Promise<JamaahTimesData | null> {
  const raw = await AsyncStorage.getItem(KEYS.LATEST_JAMAAH_TIMES);
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  const makeDate = (timeStr: string): Date => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(targetDate);
    d.setHours(h, m, 0, 0);
    return d;
  };

  return {
    fajr: makeDate(parsed.fajr),
    dhuhr: ensurePM(makeDate(parsed.dhuhr)),
    asr: ensurePM(makeDate(parsed.asr)),
    maghrib: ensurePM(makeDate(parsed.maghrib)),
    isha: ensurePM(makeDate(parsed.isha)),
  };
}

/** User location */
export async function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER_LOCATION);
  return raw ? JSON.parse(raw) : null;
}

export async function setUserLocation(latitude: number, longitude: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_LOCATION, JSON.stringify({ latitude, longitude }));
}

/** Calculation method */
export async function getCalculationMethod(): Promise<{ code: number; name: string }> {
  const results = await AsyncStorage.multiGet([KEYS.CALCULATION_METHOD, KEYS.CALCULATION_METHOD_NAME]);
  const code = results[0][1];
  const name = results[1][1];
  return {
    code: code ? parseInt(code, 10) : 2,
    name: name || 'NorthAmerica',
  };
}

export async function setCalculationMethod(code: number, name: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.CALCULATION_METHOD, code.toString());
  await AsyncStorage.setItem(KEYS.CALCULATION_METHOD_NAME, name);
}

/** Reminder minutes */
export async function getReminderMinutes(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.REMINDER_MINUTES);
  return raw ? parseInt(raw, 10) : 15;
}

export async function setReminderMinutes(minutes: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.REMINDER_MINUTES, minutes.toString());
}

/** Time format preference */
export async function getUse24h(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.USE_24H);
  return raw === 'true';
}

export async function setUse24h(use24h: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.USE_24H, use24h.toString());
}

/** Theme preference */
export async function getThemePreference(): Promise<'light' | 'dark' | 'system'> {
  const raw = await AsyncStorage.getItem(KEYS.THEME);
  return (raw as 'light' | 'dark' | 'system') || 'system';
}

export async function setThemePreference(theme: 'light' | 'dark' | 'system'): Promise<void> {
  await AsyncStorage.setItem(KEYS.THEME, theme);
}

/** Language preference */
export async function getLanguage(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.LANGUAGE);
}

export async function setLanguage(language: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.LANGUAGE, language);
}

/** Notification preferences */
export async function getNotifyAnnouncements(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.NOTIFY_ANNOUNCEMENTS);
  return raw !== 'false'; // default true
}

export async function setNotifyAnnouncements(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.NOTIFY_ANNOUNCEMENTS, enabled.toString());
}

export async function getNotifyEvents(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.NOTIFY_EVENTS);
  return raw !== 'false'; // default true
}

export async function setNotifyEvents(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.NOTIFY_EVENTS, enabled.toString());
}

/** Read announcements tracking */
const READ_ANNOUNCEMENTS_KEY = 'read_announcement_ids';

export async function getReadAnnouncementIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(READ_ANNOUNCEMENTS_KEY);
  if (!raw) return new Set();
  return new Set(JSON.parse(raw) as string[]);
}

export async function markAnnouncementRead(id: string): Promise<Set<string>> {
  const existing = await getReadAnnouncementIds();
  existing.add(id);
  // Keep only last 500 to prevent unbounded growth
  const arr = [...existing].slice(-500);
  await AsyncStorage.setItem(READ_ANNOUNCEMENTS_KEY, JSON.stringify(arr));
  return new Set(arr);
}

/** Hardcoded fallback coordinates — The Salafi Masjid, Birmingham, UK */
export const DEFAULT_LOCATION = { latitude: 52.4694, longitude: -1.8712 };
