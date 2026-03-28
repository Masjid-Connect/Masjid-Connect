/**
 * useLiveLesson — polls Mixlr for live broadcast status.
 *
 * Checks every 30 seconds while the app is active. Pauses when
 * backgrounded to conserve battery. Caches the last known state
 * so the UI never flickers on mount.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  fetchMixlrStatus,
  MIXLR_POLL_INTERVAL_MS,
  MIXLR_EMBED_URL,
  MIXLR_CHANNEL_URL,
  type LiveLessonStatus,
} from '@/lib/mixlr';

export interface UseLiveLessonResult {
  /** Whether a lesson is currently being broadcast */
  isLive: boolean;
  /** Title of the current broadcast / channel */
  broadcastTitle: string;
  /** Channel logo URL for display */
  channelLogoUrl: string;
  /** Embed player URL (for WebView) */
  embedUrl: string;
  /** Direct channel URL (fallback) */
  channelUrl: string;
  /** Whether the initial fetch is still in progress */
  isLoading: boolean;
  /** Force a refresh of the live status */
  refresh: () => Promise<void>;
}

const DEFAULT_STATUS: LiveLessonStatus = {
  isLive: false,
  broadcastTitle: '',
  channelName: '',
  channelLogoUrl: '',
  channelUrl: MIXLR_CHANNEL_URL,
  embedUrl: MIXLR_EMBED_URL,
};

export function useLiveLesson(): UseLiveLessonResult {
  const [status, setStatus] = useState<LiveLessonStatus>(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    const result = await fetchMixlrStatus();
    if (!mountedRef.current) return;
    if (result) {
      setStatus(result);
    }
    setIsLoading(false);
  }, []);

  // Start/stop polling based on app state
  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, MIXLR_POLL_INTERVAL_MS);

    // Pause polling when app goes to background, resume on foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        // Resume: fetch immediately + restart interval
        poll();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(poll, MIXLR_POLL_INTERVAL_MS);
      } else {
        // Background: stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    });

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, [poll]);

  return {
    isLive: status.isLive,
    broadcastTitle: status.broadcastTitle,
    channelLogoUrl: status.channelLogoUrl,
    embedUrl: status.embedUrl,
    channelUrl: status.channelUrl,
    isLoading,
    refresh: poll,
  };
}
