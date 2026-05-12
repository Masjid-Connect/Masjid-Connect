/**
 * AudioProvider — single audio engine for the app.
 *
 * Mounted at the root layout so playback persists across tab navigation
 * and segment changes (which would otherwise unmount any locally-held
 * player). expo-audio's `useAudioPlayer` swaps its source when the URL
 * argument changes, so we drive one stable player instance from a single
 * `currentTrack` state.
 *
 * Surfaces consume via `useAudio()`:
 *   - LessonsContent (the list) calls `play(track)` on row tap
 *   - LessonPlayerSheet (the full-screen player) reads status + drives transport
 *   - Future mini-player will subscribe to the same state
 *
 * Lock-screen / now-playing metadata is wired via `player.setActiveForLockScreen`
 * — required for the user-facing promise of "press play and put the phone away".
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';

import { Sentry } from '@/lib/sentry';
import type { RecordedLesson } from '@/types';

interface AudioContextValue {
  /** The track currently loaded into the player; null when nothing has been started. */
  currentTrack: RecordedLesson | null;
  /** True while audio is actively playing (not paused, not seeking, not idle). */
  isPlaying: boolean;
  /** Playback position in seconds. 0 when no track is loaded. */
  currentTime: number;
  /** Track duration in seconds. Falls back to the lesson's parsed duration before the player resolves it. */
  duration: number;
  /** True from the moment a track is requested until the player reports a playable status. */
  isLoading: boolean;
  /** Start (or resume) a track. Calling with a different track switches sources. */
  play: (track: RecordedLesson) => void;
  /** Pause without releasing the current track. */
  pause: () => void;
  /** Seek to an absolute time in seconds. */
  seek: (timeSeconds: number) => void;
  /** Skip forward by `seconds` (default 30). */
  skipForward: (seconds?: number) => void;
  /** Skip backward by `seconds` (default 15). */
  skipBackward: (seconds?: number) => void;
  /** Stop playback and clear the track entirely (releases lock-screen metadata). */
  stop: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<RecordedLesson | null>(null);

  // The player's source is the current track's URL. When that changes,
  // expo-audio re-creates the underlying native player automatically.
  const player = useAudioPlayer(currentTrack?.audioUrl ?? null);
  const status = useAudioPlayerStatus(player);

  // Configure audio session once — required for background playback and
  // for audio to keep playing when the iOS silent switch is on.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch((err) => {
      Sentry.captureException(err, { extra: { context: 'AudioProvider.setAudioModeAsync' } });
    });
  }, []);

  // When a new track is loaded and is ready (duration known), bind
  // lock-screen metadata and start playback. Re-binding on every track
  // change keeps the now-playing card accurate.
  useEffect(() => {
    if (!currentTrack) return;
    if (!status.duration || status.duration <= 0) return;
    try {
      player.setActiveForLockScreen(true, {
        title: currentTrack.title,
        artist: currentTrack.speaker || 'Salafi Publications',
        albumTitle: 'Salafi Publications',
        artworkUrl: currentTrack.artworkUrl,
      });
      if (!status.playing) player.play();
    } catch (err) {
      Sentry.captureException(err, {
        extra: { context: 'AudioProvider.lockScreen', trackId: currentTrack.id },
      });
    }
    // `status.playing` deliberately omitted from deps: re-entering this
    // effect when playing flips would re-bind lock-screen + re-start, which
    // we don't want. Only re-run when track changes or duration first lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, status.duration]);

  const play = useCallback((track: RecordedLesson) => {
    if (currentTrack?.id === track.id) {
      // Same track — just resume.
      player.play();
      return;
    }
    setCurrentTrack(track);
  }, [currentTrack?.id, player]);

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  const seek = useCallback((timeSeconds: number) => {
    player.seekTo(timeSeconds);
  }, [player]);

  const skipForward = useCallback((seconds = 30) => {
    const target = Math.min(status.duration ?? 0, (status.currentTime ?? 0) + seconds);
    player.seekTo(target);
  }, [player, status.currentTime, status.duration]);

  const skipBackward = useCallback((seconds = 15) => {
    const target = Math.max(0, (status.currentTime ?? 0) - seconds);
    player.seekTo(target);
  }, [player, status.currentTime]);

  const stop = useCallback(() => {
    try {
      player.pause();
      player.setActiveForLockScreen(false);
    } catch (err) {
      Sentry.captureException(err, { extra: { context: 'AudioProvider.stop' } });
    }
    setCurrentTrack(null);
  }, [player]);

  const value = useMemo<AudioContextValue>(() => ({
    currentTrack,
    isPlaying: status.playing ?? false,
    currentTime: status.currentTime ?? 0,
    duration: status.duration ?? currentTrack?.durationSeconds ?? 0,
    isLoading: !!currentTrack && !status.duration,
    play,
    pause,
    seek,
    skipForward,
    skipBackward,
    stop,
  }), [currentTrack, status.playing, status.currentTime, status.duration, play, pause, seek, skipForward, skipBackward, stop]);

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used inside <AudioProvider>');
  return ctx;
}
