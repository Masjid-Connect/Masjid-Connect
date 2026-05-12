import { resolveCommunitySegment } from '@/lib/community-segment';

describe('resolveCommunitySegment', () => {
  it('returns "events" when the param is exactly "events"', () => {
    expect(resolveCommunitySegment('events')).toBe('events');
  });

  it('returns "announcements" when the param is exactly "announcements"', () => {
    expect(resolveCommunitySegment('announcements')).toBe('announcements');
  });

  it('returns "live" when the param is exactly "live"', () => {
    expect(resolveCommunitySegment('live')).toBe('live');
  });

  it('returns "lessons" when the param is exactly "lessons"', () => {
    expect(resolveCommunitySegment('lessons')).toBe('lessons');
  });

  it('defaults to "lessons" when the param is undefined', () => {
    expect(resolveCommunitySegment(undefined)).toBe('lessons');
  });

  it('defaults to "lessons" when the param is an empty string', () => {
    expect(resolveCommunitySegment('')).toBe('lessons');
  });

  it('defaults to "lessons" for any unrecognised value', () => {
    expect(resolveCommunitySegment('foo')).toBe('lessons');
    expect(resolveCommunitySegment('EVENTS')).toBe('lessons'); // case-sensitive
    expect(resolveCommunitySegment('events ')).toBe('lessons'); // whitespace rejected
  });
});
