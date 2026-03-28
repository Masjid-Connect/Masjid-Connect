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
}

// ── API ──────────────────────────────────────────────────────────────

const MIXLR_API_TIMEOUT_MS = 10_000;

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
