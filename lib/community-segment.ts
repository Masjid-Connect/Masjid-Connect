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
 * Resolve the `segment` search param into a CommunitySegment or null.
 *
 *   - Exact match on 'live' | 'lessons' | 'events' | 'announcements' → that segment.
 *   - Anything else (undefined, empty, unknown value, whitespace,
 *     wrong case) → null. Null means "no specific segment requested,"
 *     and the screen should land on its 2×2 grid.
 *
 * Matching is intentionally strict — search params come from our own
 * deep-link handler, so we want exact values only. A stray param
 * shouldn't quietly route to lessons.
 */
export function resolveCommunitySegment(
  param: string | undefined,
): CommunitySegment | null {
  if (param === 'live') return 'live';
  if (param === 'events') return 'events';
  if (param === 'announcements') return 'announcements';
  if (param === 'lessons') return 'lessons';
  return null;
}
