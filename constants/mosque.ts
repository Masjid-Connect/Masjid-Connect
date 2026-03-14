/**
 * The Salafi Masjid — single mosque configuration.
 *
 * All prayer times, announcements, and events in the app are scoped to this
 * mosque. The backend stays multi-mosque capable for future expansion, but the
 * frontend always targets this one mosque.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bumped to v2: invalidates stale cache that pointed at wrong mosque UUID
const MOSQUE_ID_KEY = 'salafi_mosque_id_v2';

/** Canonical name — must match the backend exactly */
const CANONICAL_NAME = 'The Salafi Masjid (Wright Street)';

/** Hardcoded details for The Salafi Masjid (Wright Street), Birmingham, UK */
export const SALAFI_MASJID = {
  name: CANONICAL_NAME,
  city: 'Birmingham',
  country: 'United Kingdom',
  latitude: 52.4694,
  longitude: -1.8712,
  calculationMethod: 4, // Umm Al-Qura
} as const;

/** In-memory cache to avoid repeated AsyncStorage reads */
let _cachedId: string | null = null;

/**
 * Get The Salafi Masjid's backend UUID.
 *
 * On first call, searches the API for the mosque and caches the ID locally.
 * On subsequent calls, returns the cached ID instantly. Returns `null` only
 * if the backend is unreachable and no cached ID exists yet.
 */
export async function getMosqueId(): Promise<string | null> {
  // 1. In-memory cache
  if (_cachedId) return _cachedId;

  // 2. Local storage cache
  const stored = await AsyncStorage.getItem(MOSQUE_ID_KEY);
  if (stored) {
    _cachedId = stored;
    return stored;
  }

  // 3. Fetch from API (first launch)
  try {
    const { mosques } = await import('@/lib/api');

    // Primary: exact name match (handles multi-mosque DBs safely)
    const result = await mosques.list('Wright Street');
    let match = result.items.find((m) => m.name === CANONICAL_NAME);

    // Fallback: if only one mosque exists in the DB, just use it.
    // This is the robust production pattern — avoids name mismatches entirely.
    if (!match && result.items.length === 0) {
      const all = await mosques.list();
      if (all.totalItems === 1) {
        match = all.items[0];
      }
    }

    if (match) {
      _cachedId = match.id;
      await AsyncStorage.setItem(MOSQUE_ID_KEY, match.id);
      return match.id;
    }
  } catch {
    // Backend unreachable on first launch — will retry next time
  }

  return null;
}

/**
 * Clear the cached mosque ID. Call this when the user clears app data
 * or if the stored ID needs to be refreshed (e.g. after a data migration).
 */
export async function clearMosqueIdCache(): Promise<void> {
  _cachedId = null;
  await AsyncStorage.removeItem(MOSQUE_ID_KEY);
}
