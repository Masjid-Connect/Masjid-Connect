/**
 * Strict UUID v4 (or any well-formed UUID) validator.
 *
 * Used at deep-link boundaries where we have to treat the incoming id
 * as untrusted (Seat 28: never trust a value from a push payload to be
 * a real event we can render). Matches the standard 8-4-4-4-12
 * hex-with-hyphens layout — does NOT match a 36-char string of arbitrary
 * hex / hyphens, which a looser regex would accept.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
