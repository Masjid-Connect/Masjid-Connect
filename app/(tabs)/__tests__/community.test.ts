import { resolveCommunitySegment } from '@/lib/community-segment';

describe('resolveCommunitySegment', () => {
  it('returns "events" when the param is exactly "events"', () => {
    expect(resolveCommunitySegment('events')).toBe('events');
  });

  it('returns "announcements" when the param is exactly "announcements"', () => {
    expect(resolveCommunitySegment('announcements')).toBe('announcements');
  });

  it('defaults to "announcements" when the param is undefined', () => {
    expect(resolveCommunitySegment(undefined)).toBe('announcements');
  });

  it('defaults to "announcements" when the param is an empty string', () => {
    expect(resolveCommunitySegment('')).toBe('announcements');
  });

  it('defaults to "announcements" for any unrecognised value', () => {
    expect(resolveCommunitySegment('foo')).toBe('announcements');
    expect(resolveCommunitySegment('EVENTS')).toBe('announcements'); // case-sensitive
    expect(resolveCommunitySegment('events ')).toBe('announcements'); // whitespace rejected
  });
});
