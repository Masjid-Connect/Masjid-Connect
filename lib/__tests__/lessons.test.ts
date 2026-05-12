import * as fs from 'fs';
import * as path from 'path';

import { parseLessonsFeed } from '../lessons';

const FIXTURE_PATH = path.join(__dirname, '__fixtures__', 'lessons-feed.xml');
const fixture = fs.readFileSync(FIXTURE_PATH, 'utf8');

describe('parseLessonsFeed', () => {
  it('extracts every complete <item> from the SoundCloud feed', () => {
    const lessons = parseLessonsFeed(fixture);
    expect(lessons.length).toBeGreaterThanOrEqual(2);
  });

  it('strips the " By {speaker}" suffix and extracts speaker', () => {
    const lessons = parseLessonsFeed(fixture);
    const disputes = lessons.find((l) => l.id === '2317751096');
    expect(disputes).toBeDefined();
    expect(disputes?.title).toBe('Disputes & Differing Lead to Discord');
    expect(disputes?.speaker).toBe('Abu Idrees');
  });

  it('parses itunes:duration HH:MM:SS into seconds', () => {
    const lessons = parseLessonsFeed(fixture);
    const disputes = lessons.find((l) => l.id === '2317751096');
    // "00:19:09" → 19 * 60 + 9 = 1149
    expect(disputes?.durationSeconds).toBe(1149);
  });

  it('extracts the MP3 enclosure URL untouched', () => {
    const lessons = parseLessonsFeed(fixture);
    const disputes = lessons.find((l) => l.id === '2317751096');
    expect(disputes?.audioUrl).toBe(
      'https://feeds.soundcloud.com/stream/2317751096-salafi-publications-disputes-differing-lead-to.mp3',
    );
  });

  it('downsizes artwork from t3000x3000 to t500x500', () => {
    const lessons = parseLessonsFeed(fixture);
    const disputes = lessons.find((l) => l.id === '2317751096');
    expect(disputes?.artworkUrl).toMatch(/t500x500/);
    expect(disputes?.artworkUrl).not.toMatch(/t3000x3000/);
  });

  it('decodes HTML entities in titles', () => {
    const lessons = parseLessonsFeed(fixture);
    const disputes = lessons.find((l) => l.id === '2317751096');
    // Feed encodes "&" as "&amp;" — should decode to a single "&".
    expect(disputes?.title).toContain('&');
    expect(disputes?.title).not.toContain('&amp;');
  });

  it('converts pubDate to ISO 8601', () => {
    const lessons = parseLessonsFeed(fixture);
    const disputes = lessons.find((l) => l.id === '2317751096');
    expect(disputes?.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('handles a title without " By {speaker}" gracefully', () => {
    const lessons = parseLessonsFeed(`
      <rss><channel>
        <item>
          <guid>tag:soundcloud,2010:tracks/12345</guid>
          <title>A Standalone Title</title>
          <link>https://soundcloud.com/x/y</link>
          <pubDate>Sat, 01 Jan 2026 00:00:00 +0000</pubDate>
          <itunes:duration>00:05:00</itunes:duration>
          <description>Body</description>
          <enclosure url="https://example.com/x.mp3" type="audio/mpeg" length="100"/>
          <itunes:image href="https://example.com/art-t3000x3000.png"/>
        </item>
      </channel></rss>
    `);
    expect(lessons).toHaveLength(1);
    expect(lessons[0].title).toBe('A Standalone Title');
    expect(lessons[0].speaker).toBe('');
  });

  it('skips items missing required fields', () => {
    const lessons = parseLessonsFeed(`
      <rss><channel>
        <item>
          <title>Missing everything else</title>
        </item>
      </channel></rss>
    `);
    expect(lessons).toHaveLength(0);
  });
});
