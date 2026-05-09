/**
 * Version check — fetch the server's version policy and decide whether to
 * show an update banner / blocker on this device.
 *
 * Policy lives at GET /api/v1/version-policy/. Clients fetch on cold start
 * and on foreground transition, cache for ~6h, compare the installed app
 * version against the per-platform `recommended` and `minimum` thresholds.
 *
 * Failsafes: any network/parse error → silent (`urgency: "ok"`). Never
 * block the UI on a missing nudge.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { Sentry } from '@/lib/sentry';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.salafimasjid.app/api/v1';
const CACHE_KEY = 'version_policy_v1';
const DISMISS_KEY = 'version_policy_dismissed_at';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d
const FETCH_TIMEOUT_MS = 5_000;

type PlatformOS = 'ios' | 'android';
type BehaviourBelowMinimum = 'block' | 'soft' | 'none';
type BehaviourBelowRecommended = 'soft' | 'none';

export interface VersionPolicy {
  ios: { minimum: string; recommended: string; store_url: string };
  android: { minimum: string; recommended: string; store_url: string };
  policy: { below_minimum: BehaviourBelowMinimum; below_recommended: BehaviourBelowRecommended };
}

export type VersionCheckResult =
  | { urgency: 'ok' }
  | { urgency: 'soft'; storeUrl: string }
  | { urgency: 'block'; storeUrl: string };

/**
 * Compare two semver-shaped strings ("1.0.10" vs "1.0.9", etc.).
 * Treats malformed input as equal to avoid false positives.
 * Doctrine §3: avoid the `semver` dep — under 20 lines of code does the job.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string): number[] => {
    const parts = v.split('.').map((p) => parseInt(p, 10));
    if (parts.some(Number.isNaN)) return [];
    return parts;
  };
  const pa = parse(a);
  const pb = parse(b);
  if (pa.length === 0 || pb.length === 0) return 0;
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

/**
 * Validate the shape of the API response at the boundary.
 * Returns null if anything is wrong — caller treats null as "policy fetch failed,
 * stay silent". This is intentionally strict: a malformed response should
 * never push the client into a block state.
 */
function validatePolicy(raw: unknown): VersionPolicy | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const ios = r.ios as Record<string, unknown> | undefined;
  const android = r.android as Record<string, unknown> | undefined;
  const policy = r.policy as Record<string, unknown> | undefined;
  if (!ios || !android || !policy) return null;

  const validPlatform = (p: Record<string, unknown>): boolean =>
    typeof p.minimum === 'string' &&
    typeof p.recommended === 'string' &&
    typeof p.store_url === 'string';

  if (!validPlatform(ios) || !validPlatform(android)) return null;

  const belowMin = policy.below_minimum;
  const belowRec = policy.below_recommended;
  if (belowMin !== 'block' && belowMin !== 'soft' && belowMin !== 'none') return null;
  if (belowRec !== 'soft' && belowRec !== 'none') return null;

  return raw as VersionPolicy;
}

interface CachedPolicy {
  policy: VersionPolicy;
  fetchedAt: number;
}

async function readCache(): Promise<VersionPolicy | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPolicy;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return validatePolicy(parsed.policy);
  } catch {
    return null;
  }
}

async function writeCache(policy: VersionPolicy): Promise<void> {
  try {
    const payload: CachedPolicy = { policy, fetchedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Cache write failure is non-fatal — next call will just refetch.
  }
}

async function fetchPolicy(): Promise<VersionPolicy | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}/version-policy/`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const json = (await response.json()) as unknown;
    return validatePolicy(json);
  } catch {
    // Network errors are expected (offline, slow connection). Don't log to
    // Sentry — this would be noisy. Return null and let UI stay silent.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function platformOS(): PlatformOS | null {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return null;
}

function installedVersion(): string | null {
  // expo-application reads from Info.plist / AndroidManifest at native level.
  return Application.nativeApplicationVersion;
}

/**
 * Decide what UI (if any) to show this device given the installed version
 * and the server policy.
 *
 * Priority: minimum > recommended. If installed < minimum AND
 * `policy.below_minimum === 'block'`, returns block. Else if installed <
 * recommended AND `policy.below_recommended === 'soft'`, returns soft.
 * Else ok.
 */
export function deriveUrgency(installed: string, policy: VersionPolicy, os: PlatformOS): VersionCheckResult {
  const platform = policy[os];
  const storeUrl = platform.store_url;

  if (compareVersions(installed, platform.minimum) < 0) {
    if (policy.policy.below_minimum === 'block') return { urgency: 'block', storeUrl };
    if (policy.policy.below_minimum === 'soft') return { urgency: 'soft', storeUrl };
    return { urgency: 'ok' };
  }

  if (compareVersions(installed, platform.recommended) < 0) {
    if (policy.policy.below_recommended === 'soft') return { urgency: 'soft', storeUrl };
    return { urgency: 'ok' };
  }

  return { urgency: 'ok' };
}

/**
 * Whether the user has dismissed the soft banner recently.
 * Block tier ignores this — non-dismissible by design.
 */
async function isSoftDismissed(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export async function dismissSoftBanner(): Promise<void> {
  try {
    await AsyncStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch (error) {
    // Non-fatal — banner will reappear next session if write failed.
    Sentry.captureException(error, { extra: { context: 'dismissSoftBanner' } });
  }
}

/**
 * Top-level entry point.
 *
 * Returns the urgency this client should render. Always returns; on any
 * failure the result is `{ urgency: 'ok' }` so the UI stays silent.
 *
 * Dev/preview builds (no native version → null) are skipped — we don't
 * gate Expo Go users out of their own dev environment.
 */
export async function getVersionCheckResult(): Promise<VersionCheckResult> {
  // Dev / Expo Go: skip the check. We don't gate developers out of their
  // own running app, and Expo Go reports its own version (not the app's).
  if (__DEV__) return { urgency: 'ok' };

  const os = platformOS();
  const installed = installedVersion();
  if (!os || !installed) return { urgency: 'ok' };

  let policy = await readCache();
  if (!policy) {
    policy = await fetchPolicy();
    if (policy) await writeCache(policy);
  }
  if (!policy) return { urgency: 'ok' };

  const result = deriveUrgency(installed, policy, os);

  // Soft tier respects dismissal. Block tier does not.
  if (result.urgency === 'soft' && (await isSoftDismissed())) {
    return { urgency: 'ok' };
  }

  return result;
}
