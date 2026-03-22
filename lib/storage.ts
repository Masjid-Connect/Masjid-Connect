import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
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

// ── Offline API response cache ──────────────────────────────────────

const CACHE_PREFIX = 'api_cache_';
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Get cached API data. Returns null if expired or missing.
 * When `allowStale` is true, returns data even if TTL has expired.
 */
export async function getCachedData<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
  allowStale = false,
): Promise<T | null> {
  const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
  if (!raw) return null;
  const entry: CacheEntry<T> = JSON.parse(raw);
  const isFresh = Date.now() - entry.timestamp < ttlMs;
  if (isFresh || allowStale) return entry.data;
  return null;
}

/** Store API response data with a timestamp. */
export async function setCachedData<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
}

/** Hardcoded fallback coordinates — The Salafi Masjid, Birmingham, UK */
export const DEFAULT_LOCATION = { latitude: 52.4694, longitude: -1.8712 };
