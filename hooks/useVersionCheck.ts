/**
 * useVersionCheck — runs the version-policy check on cold start and on
 * foreground transition, returning the urgency state for the root layout
 * to render.
 *
 * Never throws. Failures resolve to `{ urgency: 'ok' }` so the UI stays
 * silent rather than flashing a fake banner.
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { getVersionCheckResult, type VersionCheckResult } from '@/lib/version-check';

export interface UseVersionCheckResult {
  /** What (if anything) to render. Always defined; defaults to ok. */
  state: VersionCheckResult;
  /** Force a recheck — useful for testing and after dismiss actions. */
  recheck: () => Promise<void>;
}

const INITIAL: VersionCheckResult = { urgency: 'ok' };

export function useVersionCheck(): UseVersionCheckResult {
  const [state, setState] = useState<VersionCheckResult>(INITIAL);
  const mountedRef = useRef(true);
  const lastCheckedAtRef = useRef(0);

  const run = async () => {
    // Don't pile up checks if foreground events fire rapidly (e.g. iOS
    // sends multiple AppState changes during a quick lock/unlock).
    const now = Date.now();
    if (now - lastCheckedAtRef.current < 5_000) return;
    lastCheckedAtRef.current = now;

    const result = await getVersionCheckResult();
    if (!mountedRef.current) return;
    setState(result);
  };

  useEffect(() => {
    mountedRef.current = true;

    // Cold start
    void run();

    // Re-check on foreground
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void run();
    });

    return () => {
      mountedRef.current = false;
      sub.remove();
    };
  }, []);

  return { state, recheck: run };
}
