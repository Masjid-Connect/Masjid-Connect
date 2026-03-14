import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PrayerTimesData, JamaahTimesData } from '@/types';

const KEYS = {
  PRAYER_TIMES: 'cached_prayer_times',
  PRAYER_DATE: 'cached_prayer_date',
  JAMAAH_TIMES: 'cached_jamaah_times',
  SUBSCRIBED_MOSQUES: 'subscribed_mosque_ids',
  SELECTED_MOSQUE: 'selected_mosque_id',
  USER_LOCATION: 'user_location',
  CALCULATION_METHOD: 'calculation_method',
  CALCULATION_METHOD_NAME: 'calculation_method_name',
  REMINDER_MINUTES: 'reminder_minutes',
  USE_24H: 'use_24h_format',
  THEME: 'theme_preference',
  LANGUAGE: 'language_preference',
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
    dhuhr: new Date(parsed.dhuhr),
    asr: new Date(parsed.asr),
    maghrib: new Date(parsed.maghrib),
    isha: new Date(parsed.isha),
  };

  let jamaahTimes: JamaahTimesData | null = null;
  if (rawJamaah) {
    const parsedJamaah = JSON.parse(rawJamaah);
    jamaahTimes = {
      fajr: new Date(parsedJamaah.fajr),
      dhuhr: new Date(parsedJamaah.dhuhr),
      asr: new Date(parsedJamaah.asr),
      maghrib: new Date(parsedJamaah.maghrib),
      isha: new Date(parsedJamaah.isha),
    };
  }

  return { times, jamaahTimes };
}

/** Subscribed mosque IDs */
export async function getSubscribedMosqueIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.SUBSCRIBED_MOSQUES);
  return raw ? JSON.parse(raw) : [];
}

export async function setSubscribedMosqueIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.SUBSCRIBED_MOSQUES, JSON.stringify(ids));
}

/** Selected mosque for guest users (no account needed) */
export async function getSelectedMosqueId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.SELECTED_MOSQUE);
}

export async function setSelectedMosqueId(id: string | null): Promise<void> {
  if (id) {
    await AsyncStorage.setItem(KEYS.SELECTED_MOSQUE, id);
  } else {
    await AsyncStorage.removeItem(KEYS.SELECTED_MOSQUE);
  }
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
