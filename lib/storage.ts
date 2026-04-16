import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_LOCATION: 'user_location',
  CALCULATION_METHOD: 'calculation_method',
  CALCULATION_METHOD_NAME: 'calculation_method_name',
  REMINDER_MINUTES: 'reminder_minutes',
  USE_24H: 'use_24h_format',
  THEME: 'theme_preference',
  NOTIFY_ANNOUNCEMENTS: 'notify_announcements',
  NOTIFY_EVENTS: 'notify_events',
  PLAY_ADHAN: 'play_adhan_at_prayer_time',
};

/** User location */
export async function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER_LOCATION);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    await AsyncStorage.removeItem(KEYS.USER_LOCATION);
    return null;
  }
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

/** Play the masjid's adhan as the prayer-time notification sound.
 *  When false, the "prayer time has entered" push is suppressed entirely —
 *  the 15-minute reminder still fires, but the adhan itself doesn't.
 *  Default: true (adhan on) — users who want silence opt out.
 */
export async function getPlayAdhan(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.PLAY_ADHAN);
  return raw !== 'false'; // default true
}

export async function setPlayAdhan(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.PLAY_ADHAN, enabled.toString());
}

/** Read announcements tracking */
const READ_ANNOUNCEMENTS_KEY = 'read_announcement_ids';

export async function getReadAnnouncementIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(READ_ANNOUNCEMENTS_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    await AsyncStorage.removeItem(READ_ANNOUNCEMENTS_KEY);
    return new Set();
  }
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
const MAX_STALE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — hard cap for allowStale mode

/**
 * Cache version — bump this when the CacheEntry schema changes.
 * Entries with a mismatched version are treated as missing.
 */
const CACHE_VERSION = 1;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
}

/**
 * Get cached API data. Returns null if expired, missing, or version mismatched.
 * When `allowStale` is true, returns data even if TTL has expired.
 */
export async function getCachedData<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
  allowStale = false,
): Promise<T | null> {
  const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
  if (!raw) return null;
  let entry: CacheEntry<T>;
  try {
    entry = JSON.parse(raw);
  } catch {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
    return null;
  }
  // Reject entries from older cache versions
  if (entry.version !== CACHE_VERSION) {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
    return null;
  }
  const age = Date.now() - entry.timestamp;
  const isFresh = age < ttlMs;
  if (isFresh) return entry.data;
  // Stale data allowed but capped at 7 days to prevent serving months-old data
  if (allowStale && age < MAX_STALE_AGE_MS) return entry.data;
  return null;
}

/** Store API response data with a timestamp and version tag. */
export async function setCachedData<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, timestamp: Date.now(), version: CACHE_VERSION };
  await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
}

/** Evict a single cache key. */
export async function evictCachedData(key: string): Promise<void> {
  await AsyncStorage.removeItem(CACHE_PREFIX + key);
}

/** Evict all API cache entries (keys matching the cache prefix). */
export async function evictAllCachedData(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const cacheKeys = allKeys.filter((k: string) => k.startsWith(CACHE_PREFIX));
  if (cacheKeys.length > 0) {
    await AsyncStorage.multiRemove(cacheKeys);
  }
}

/** Hardcoded fallback coordinates — The Salafi Masjid, Birmingham, UK */
export const DEFAULT_LOCATION = { latitude: 52.4694, longitude: -1.8712 };
