/**
 * The Salafi Masjid — single mosque configuration.
 *
 * All prayer times, announcements, and events in the app are scoped to this
 * mosque. The backend stays multi-mosque capable for future expansion, but the
 * frontend always targets this one mosque.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const MOSQUE_ID_KEY = 'salafi_mosque_id';

/** Hardcoded details for The Salafi Masjid (Wright Street), Birmingham, UK */
export const SALAFI_MASJID = {
  name: 'The Salafi Masjid (Wright Street)',
  city: 'Birmingham',
  country: 'United Kingdom',
  latitude: 52.4694,
  longitude: -1.8712,
  calculationMethod: 4, // Umm Al-Qura
  searchTerm: 'Salafi Masjid',
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
    const result = await mosques.list(SALAFI_MASJID.searchTerm);
    const match = result.items.find((m) => m.name.includes('Salafi'));

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
