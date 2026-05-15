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

  it('returns null when the param is undefined (grid landing)', () => {
    expect(resolveCommunitySegment(undefined)).toBeNull();
  });

  it('returns null when the param is an empty string', () => {
    expect(resolveCommunitySegment('')).toBeNull();
  });

  it('returns null for any unrecognised value', () => {
    expect(resolveCommunitySegment('foo')).toBeNull();
    expect(resolveCommunitySegment('EVENTS')).toBeNull(); // case-sensitive
    expect(resolveCommunitySegment('events ')).toBeNull(); // whitespace rejected
  });
});
