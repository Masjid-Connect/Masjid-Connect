/**
 * The Salafi Masjid — single mosque configuration.
 *
 * Per DOCTRINE.md §6 (Single masjid, operational scope) the app serves
 * The Salafi Masjid (Wright Street). The backend retains a relational
 * Mosque schema so existing data isolation patterns work, but production
 * has exactly one row and no UI surfaces a chooser.
 *
 * The mosque UUID is pinned via `EXPO_PUBLIC_MOSQUE_ID` so the client never
 * has to discover it at runtime. The legacy lookup remains as a fallback
 * for the rare case where someone runs without the env var set.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bumped to v3: was v2 with lookup-cached UUID; v3 prefers the env-pinned ID.
const MOSQUE_ID_KEY = 'salafi_mosque_id_v3';

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

/** Pinned UUID from build-time env. Empty string if unset. */
const PINNED_ID = (process.env.EXPO_PUBLIC_MOSQUE_ID ?? '').trim();

/** In-memory cache to avoid repeated AsyncStorage reads */
let _cachedId: string | null = null;

/**
 * Get The Salafi Masjid's backend UUID.
 *
 * Resolution order:
 *   1. Pinned env-var (EXPO_PUBLIC_MOSQUE_ID) — synchronous, no network
 *   2. In-memory cache
 *   3. AsyncStorage cache from a prior lookup
 *   4. Backend search by canonical name (legacy fallback)
 *
 * Returns `null` only if all four fail — which shouldn't happen in any
 * properly-built binary because the env var is set in eas.json.
 */
export async function getMosqueId(): Promise<string | null> {
  // 1. Build-time pin — the happy path
  if (PINNED_ID) {
    if (!_cachedId) _cachedId = PINNED_ID;
    return PINNED_ID;
  }

  // 2. In-memory cache (from a previous resolution)
  if (_cachedId) return _cachedId;

  // 3. Local storage cache
  const stored = await AsyncStorage.getItem(MOSQUE_ID_KEY);
  if (stored) {
    _cachedId = stored;
    return stored;
  }

  // 4. Fetch from API (legacy fallback for builds without the env pin)
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
