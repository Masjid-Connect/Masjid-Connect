/**
 * Mixlr Live Audio Integration
 *
 * Fetches live broadcast status from Mixlr's API for The Salafi Masjid
 * (Salafi Publications channel). Used to show "LIVE NOW" banners and
 * open the embedded Mixlr player when a lesson is broadcasting.
 *
 * The API at api.mixlr.com is undocumented but stable — community tools
 * have relied on it since 2015+. If it ever breaks, the app gracefully
 * degrades (banner disappears, no crash).
 */

import { Sentry } from '@/lib/sentry';

// ── Mixlr channel constants ─────────────────────────────────────────

/** Mixlr channel slug — matches the URL: mixlr.com/salafi-publications */
export const MIXLR_CHANNEL_SLUG = 'salafi-publications';

/** Mixlr numeric user ID — used for the embed player URL */
export const MIXLR_USER_ID = 4895725;

/** Channel page URL — fallback if embed fails */
export const MIXLR_CHANNEL_URL = 'https://salafipublications.mixlr.com';

/** Embed player URL — renders the Mixlr player widget */
export const MIXLR_EMBED_URL = `https://mixlr.com/users/${MIXLR_USER_ID}/embed/`;

/** Polling interval for live status checks (ms) */
export const MIXLR_POLL_INTERVAL_MS = 30_000;

// ── Types ────────────────────────────────────────────────────────────

/** Shape of the Mixlr user API response (relevant fields only) */
export interface MixlrUserResponse {
  id: number;
  username: string;
  slug: string;
  url: string;
  profile_image_url: string;
  is_live: boolean;
  broadcast_ids?: number[];
  /** True when Salafi Publications has flipped the Live Stream URL toggle
   *  in their Mixlr Creators dashboard. Until this is on, no public stream
   *  URL is exposed and the app falls back to the Mixlr embed widget. */
  live_stream_url_enabled?: boolean;
  /** Most likely field name once the toggle is on; we also probe siblings. */
  live_stream_url?: string;
  stream_url?: string;
  channel: {
    name: string;
    logo_url: string;
    url: string;
    theme_color: string;
  };
}

/** Simplified live status used by the app */
export interface LiveLessonStatus {
  isLive: boolean;
  broadcastTitle: string;
  channelName: string;
  channelLogoUrl: string;
  channelUrl: string;
  embedUrl: string;
  /** Direct public stream URL when Mixlr exposes one; null otherwise.
   *  When present, the app uses expo-audio for native playback with
   *  lock-screen controls. When null, falls back to the Mixlr embed. */
  streamUrl: string | null;
}

// ── API ──────────────────────────────────────────────────────────────

const MIXLR_API_TIMEOUT_MS = 10_000;

/**
 * Pull the public Live Stream URL out of the Mixlr user payload.
 *
 * Mixlr documents the feature as "Live Stream URL" (broadcaster flips it
 * on at creators.mixlr.com/settings/live-stream-url). The API exposes
 * `live_stream_url_enabled: boolean` — that's the gate. The actual URL
 * field name we haven't confirmed against an enabled account yet, so we
 * probe the obvious candidates in priority order. Returns null when the
 * gate is off OR no candidate field carried a value, in which case the
 * live-lesson screen falls back to the existing Mixlr embed.
 *
 * If Mixlr returns the URL under a field name not in this list, the
 * fallback path keeps the app working — we just don't get the native
 * player. Patch the probe order once we see real production data.
 */
export function extractStreamUrl(data: MixlrUserResponse): string | null {
  if (!data.live_stream_url_enabled) return null;
  const candidates = [data.live_stream_url, data.stream_url];
  for (const url of candidates) {
    if (typeof url === 'string' && url.length > 0) return url;
  }
  return null;
}

/**
 * Fetch the current live status from Mixlr's API.
 * Returns null on any failure — the caller should treat this as "unknown"
 * and fall back to the last cached state.
 */
export async function fetchMixlrStatus(): Promise<LiveLessonStatus | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MIXLR_API_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.mixlr.com/users/${MIXLR_CHANNEL_SLUG}`,
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data: MixlrUserResponse = await response.json();

    return {
      isLive: data.is_live,
      broadcastTitle: data.channel.name || '',
      channelName: data.username || '',
      channelLogoUrl: data.channel.logo_url || '',
      channelUrl: data.channel.url || MIXLR_CHANNEL_URL,
      embedUrl: MIXLR_EMBED_URL,
      streamUrl: extractStreamUrl(data),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    // Network failures are expected (offline, timeout) — don't spam Sentry
    if (err instanceof Error && err.name !== 'AbortError') {
      Sentry.captureException(err, {
        extra: { context: 'fetchMixlrStatus', slug: MIXLR_CHANNEL_SLUG },
      });
    }
    return null;
  }
}
