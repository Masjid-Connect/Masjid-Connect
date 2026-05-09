/**
 * @jest-environment node
 */
import {
  compareVersions,
  deriveUrgency,
  type VersionPolicy,
} from '../version-check';

describe('compareVersions', () => {
  it('treats equal versions as equal', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('compares numerically, not lexicographically (1.0.10 vs 1.0.9)', () => {
    expect(compareVersions('1.0.10', '1.0.9')).toBe(1);
    expect(compareVersions('1.0.9', '1.0.10')).toBe(-1);
  });

  it('handles different segment counts (1.2 vs 1.2.0)', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.2', '1.2.1')).toBe(-1);
  });

  it('handles major bumps', () => {
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
  });

  it('returns 0 (not -1, not 1) for malformed input — fail-safe', () => {
    // Malformed input must NOT push us into a block state.
    expect(compareVersions('abc', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0', 'abc')).toBe(0);
    expect(compareVersions('', '1.0.0')).toBe(0);
  });
});

describe('deriveUrgency', () => {
  const buildPolicy = (overrides: Partial<VersionPolicy> = {}): VersionPolicy => ({
    ios: { minimum: '1.0.0', recommended: '1.0.0', store_url: 'https://apple/x' },
    android: { minimum: '1.0.0', recommended: '1.0.0', store_url: 'https://play/x' },
    policy: { below_minimum: 'block', below_recommended: 'soft' },
    ...overrides,
  });

  it('returns ok when installed equals recommended', () => {
    const policy = buildPolicy({
      ios: { minimum: '1.0.0', recommended: '1.0.2', store_url: 'https://apple/x' },
    });
    expect(deriveUrgency('1.0.2', policy, 'ios').urgency).toBe('ok');
  });

  it('returns ok when installed exceeds recommended', () => {
    const policy = buildPolicy({
      ios: { minimum: '1.0.0', recommended: '1.0.2', store_url: 'https://apple/x' },
    });
    expect(deriveUrgency('1.5.0', policy, 'ios').urgency).toBe('ok');
  });

  it('returns soft when installed is below recommended but at or above minimum', () => {
    const policy = buildPolicy({
      ios: { minimum: '1.0.0', recommended: '1.0.2', store_url: 'https://apple/x' },
    });
    const result = deriveUrgency('1.0.0', policy, 'ios');
    expect(result.urgency).toBe('soft');
    if (result.urgency === 'soft') {
      expect(result.storeUrl).toBe('https://apple/x');
    }
  });

  it('returns block when installed is below minimum and policy is block', () => {
    const policy = buildPolicy({
      ios: { minimum: '1.5.0', recommended: '1.5.0', store_url: 'https://apple/x' },
      policy: { below_minimum: 'block', below_recommended: 'soft' },
    });
    const result = deriveUrgency('1.0.0', policy, 'ios');
    expect(result.urgency).toBe('block');
  });

  it('returns soft (not block) when installed is below minimum but policy is soft', () => {
    const policy = buildPolicy({
      ios: { minimum: '1.5.0', recommended: '1.5.0', store_url: 'https://apple/x' },
      policy: { below_minimum: 'soft', below_recommended: 'soft' },
    });
    expect(deriveUrgency('1.0.0', policy, 'ios').urgency).toBe('soft');
  });

  it('returns ok when installed is below minimum and policy is none', () => {
    const policy = buildPolicy({
      ios: { minimum: '1.5.0', recommended: '1.5.0', store_url: 'https://apple/x' },
      policy: { below_minimum: 'none', below_recommended: 'soft' },
    });
    expect(deriveUrgency('1.0.0', policy, 'ios').urgency).toBe('ok');
  });

  it('uses the right platform sub-object', () => {
    // iOS recommended is high, Android recommended is low. Same installed
    // version → different urgency depending on platform.
    const policy = buildPolicy({
      ios: { minimum: '1.0.0', recommended: '2.0.0', store_url: 'https://apple/x' },
      android: { minimum: '1.0.0', recommended: '1.0.0', store_url: 'https://play/x' },
    });
    expect(deriveUrgency('1.0.0', policy, 'ios').urgency).toBe('soft');
    expect(deriveUrgency('1.0.0', policy, 'android').urgency).toBe('ok');
  });

  it('threshold equality: installed == minimum is NOT below minimum', () => {
    // The check is "below minimum", strict inequality. If you're exactly at
    // the minimum you're allowed.
    const policy = buildPolicy({
      ios: { minimum: '1.0.0', recommended: '1.0.0', store_url: 'https://apple/x' },
    });
    expect(deriveUrgency('1.0.0', policy, 'ios').urgency).toBe('ok');
  });
});
