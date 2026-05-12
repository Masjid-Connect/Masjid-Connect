/**
 * Pure helpers for the community tab's sub-segment.
 *
 * Kept in a zero-dependency module (no React Native imports) so unit
 * tests don't have to mock the whole RN tree. Consumed by:
 *   - app/(tabs)/community.tsx — initial state + param-change effect
 *   - app/_layout.tsx (indirectly, via the segment param name on deep-links)
 */

export type CommunitySegment = 'live' | 'lessons' | 'events' | 'announcements';

/**
 * Resolve the `segment` search param into a CommunitySegment.
 * Unknown or missing values default to 'lessons' — most opens won't catch
 * a live broadcast, but recorded lessons are content-rich every time.
 * Matching is case-sensitive and does not strip whitespace — search params
 * come from our own deep-link handler, so we want exact values only.
 */
export function resolveCommunitySegment(param: string | undefined): CommunitySegment {
  if (param === 'live') return 'live';
  if (param === 'events') return 'events';
  if (param === 'announcements') return 'announcements';
  return 'lessons';
}
