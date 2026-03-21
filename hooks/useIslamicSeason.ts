/**
 * Hook for detecting the current Islamic season (Ramadan, Dhul Hijjah, etc.)
 * and providing seasonal UI state to components.
 *
 * Usage:
 *   const { season, isRamadan, ramadanDay } = useIslamicSeason();
 */
import { useEffect, useState } from 'react';
import { getIslamicSeason, checkRamadan, type IslamicSeason } from '@/lib/hijri';

interface IslamicSeasonState {
  /** Current season identifier */
  season: IslamicSeason;
  /** Whether we are currently in Ramadan */
  isRamadan: boolean;
  /** Day of Ramadan (1-30), or 0 if not Ramadan */
  ramadanDay: number;
  /** Whether the data has been loaded */
  isLoaded: boolean;
}

export function useIslamicSeason(): IslamicSeasonState {
  const [state, setState] = useState<IslamicSeasonState>({
    season: 'default',
    isRamadan: false,
    ramadanDay: 0,
    isLoaded: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      const [season, ramadan] = await Promise.all([
        getIslamicSeason(),
        checkRamadan(),
      ]);

      if (cancelled) return;

      setState({
        season,
        isRamadan: ramadan?.isRamadan ?? false,
        ramadanDay: ramadan?.isRamadan ? ramadan.day : 0,
        isLoaded: true,
      });
    }

    detect();
    return () => { cancelled = true; };
  }, []);

  return state;
}
