import { isUuid } from '@/lib/uuid';

describe('isUuid', () => {
  it('accepts a canonical UUID', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('accepts uppercase hex', () => {
    expect(isUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
  });

  it('rejects 36 hyphens (the loose-regex trap)', () => {
    expect(isUuid('-'.repeat(36))).toBe(false);
  });

  it('rejects strings of the wrong length', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // 35
    expect(isUuid('123e4567-e89b-12d3-a456-4266141740000')).toBe(false); // 37
    expect(isUuid('')).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(isUuid('zzze4567-e89b-12d3-a456-426614174000')).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid({ id: '123e4567-e89b-12d3-a456-426614174000' })).toBe(false);
  });

  it('rejects strings with extraneous whitespace', () => {
    expect(isUuid(' 123e4567-e89b-12d3-a456-426614174000')).toBe(false);
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000 ')).toBe(false);
  });
});
