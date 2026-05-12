/**
 * Recorded Lessons — Salafi Publications archive.
 *
 * Source of truth is the SoundCloud user RSS for `salafi-publications`
 * (user id 64548972). It's a standards-compliant podcast feed with iTunes
 * namespace, so each item ships title, link, pubDate, duration, summary,
 * MP3 enclosure, and artwork — exactly what we need to play tracks in our
 * own native UI with no SoundCloud Widget, no Client ID, no scraping.
 *
 * The same feed backs the salafisounds.com website (which embeds the
 * SoundCloud widget per post). Going to the feed directly skips both
 * WordPress and the SoundCloud iframe.
 */

import { Sentry } from '@/lib/sentry';
import type { RecordedLesson } from '@/types';

const SOUNDCLOUD_USER_ID = 64548972;
export const LESSONS_FEED_URL = `https://feeds.soundcloud.com/users/soundcloud:users:${SOUNDCLOUD_USER_ID}/sounds.rss`;

const FETCH_TIMEOUT_MS = 10_000;

/** Fetch the SoundCloud user feed and parse it into RecordedLesson[]. */
export async function fetchRecordedLessons(): Promise<RecordedLesson[] | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(LESSONS_FEED_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const xml = await response.text();
    return parseLessonsFeed(xml);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name !== 'AbortError') {
      Sentry.captureException(err, { extra: { context: 'fetchRecordedLessons' } });
    }
    return null;
  }
}

/**
 * Parse a SoundCloud user RSS feed into RecordedLesson[].
 * Tolerant: skips items missing required fields rather than throwing.
 * Exported so the unit test can verify parsing without hitting the network.
 */
export function parseLessonsFeed(xml: string): RecordedLesson[] {
  const items: RecordedLesson[] = [];
  // Match each <item>...</item> non-greedily.
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const lesson = parseItem(match[1]);
    if (lesson) items.push(lesson);
  }
  return items;
}

function parseItem(itemXml: string): RecordedLesson | null {
  const guid = extractTag(itemXml, 'guid');
  const rawTitle = extractTag(itemXml, 'title');
  const link = extractTag(itemXml, 'link');
  const pubDate = extractTag(itemXml, 'pubDate');
  const duration = extractTag(itemXml, 'itunes:duration');
  const summary = extractTag(itemXml, 'itunes:summary') ?? extractTag(itemXml, 'description');
  const enclosureUrl = extractAttribute(itemXml, 'enclosure', 'url');
  const artworkHref = extractAttribute(itemXml, 'itunes:image', 'href');

  if (!guid || !rawTitle || !link || !pubDate || !duration || !enclosureUrl) return null;

  const id = parseTrackId(guid);
  if (!id) return null;

  const { title, speaker } = splitTitleAndSpeaker(decodeEntities(rawTitle));
  const publishedAt = new Date(pubDate).toISOString();
  const durationSeconds = parseDuration(duration);

  return {
    id,
    title,
    speaker,
    publishedAt,
    durationSeconds,
    summary: summary ? decodeEntities(summary).trim() : '',
    audioUrl: enclosureUrl,
    artworkUrl: optimiseArtwork(artworkHref ?? ''),
    externalUrl: link,
  };
}

// ── Field extractors ──────────────────────────────────────────────────

function extractTag(xml: string, name: string): string | null {
  // Match <name [attrs]>...</name>. The SoundCloud feed emits `<guid
  // isPermaLink="false">…</guid>` so we have to tolerate attributes on the
  // opening tag — a bare `<guid>` regex misses every guid in the feed.
  const escaped = name.replace(/:/g, '\\:');
  const re = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i');
  const m = xml.match(re);
  if (!m) return null;
  const inner = m[1].trim();
  // Strip CDATA wrappers if present.
  const cdata = inner.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return cdata ? cdata[1] : inner;
}

function extractAttribute(xml: string, tag: string, attribute: string): string | null {
  // Self-closing or open tag — pull the attribute value directly.
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attribute}\\s*=\\s*"([^"]*)"`, 'i');
  const m = xml.match(re);
  return m ? m[1] : null;
}

// ── Field normalisation ───────────────────────────────────────────────

/** SoundCloud guid format: `tag:soundcloud,2010:tracks/2317751096` → `2317751096`. */
function parseTrackId(guid: string): string | null {
  const m = guid.match(/tracks\/(\d+)/);
  return m ? m[1] : null;
}

/** Parse `HH:MM:SS` or `MM:SS` → seconds. */
function parseDuration(value: string): number {
  const parts = value.split(':').map((p) => parseInt(p, 10));
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

/**
 * Most lesson titles end with " By {speaker}" or " - By {speaker}". Split
 * and return both pieces. If no separator, speaker is empty.
 */
function splitTitleAndSpeaker(rawTitle: string): { title: string; speaker: string } {
  const m = rawTitle.match(/^(.*?)\s+(?:-\s+)?By\s+(.+)$/i);
  if (!m) return { title: rawTitle.trim(), speaker: '' };
  return { title: m[1].trim(), speaker: m[2].trim() };
}

/**
 * SoundCloud artwork is served at multiple sizes via filename token. Default
 * feed value is `t3000x3000` which is needlessly heavy for a phone. Swap to
 * `t500x500` for hero use; consumers can swap again for thumbnails.
 */
function optimiseArtwork(url: string): string {
  if (!url) return '';
  return url.replace(/t3000x3000/g, 't500x500');
}

/**
 * Decode the small set of HTML entities the SoundCloud feed actually emits.
 * Avoids pulling a general-purpose HTML parser for ~10 entity codes.
 */
function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
