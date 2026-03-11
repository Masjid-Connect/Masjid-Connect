import { buildPrayerEntries, getNextPrayer, getCountdown, formatPrayerTime } from '../prayer';
import type { PrayerTimesData } from '@/types';

function makeTimes(hoursFromNow: number[]): PrayerTimesData {
  const now = Date.now();
  return {
    fajr: new Date(now + hoursFromNow[0] * 3600000),
    sunrise: new Date(now + hoursFromNow[1] * 3600000),
    dhuhr: new Date(now + hoursFromNow[2] * 3600000),
    asr: new Date(now + hoursFromNow[3] * 3600000),
    maghrib: new Date(now + hoursFromNow[4] * 3600000),
    isha: new Date(now + hoursFromNow[5] * 3600000),
  };
}

describe('buildPrayerEntries', () => {
  it('returns 6 prayer entries in correct order', () => {
    const times = makeTimes([1, 2, 3, 4, 5, 6]);
    const entries = buildPrayerEntries(times);

    expect(entries).toHaveLength(6);
    expect(entries[0].name).toBe('fajr');
    expect(entries[0].label).toBe('Fajr');
    expect(entries[5].name).toBe('isha');
  });
});

describe('getNextPrayer', () => {
  it('returns the next upcoming prayer', () => {
    // All in the future
    const times = makeTimes([1, 2, 3, 4, 5, 6]);
    expect(getNextPrayer(times)).toBe('fajr');
  });

  it('skips past prayers', () => {
    // fajr and sunrise in the past, dhuhr is next
    const times = makeTimes([-2, -1, 1, 3, 5, 7]);
    expect(getNextPrayer(times)).toBe('dhuhr');
  });

  it('returns fajr when all prayers have passed', () => {
    const times = makeTimes([-6, -5, -4, -3, -2, -1]);
    expect(getNextPrayer(times)).toBe('fajr');
  });
});

describe('getCountdown', () => {
  it('formats hours and minutes', () => {
    const target = new Date(Date.now() + 2 * 3600000 + 30 * 60000);
    const result = getCountdown(target);
    expect(result).toMatch(/2h 3\dm/);
  });

  it('formats minutes only when less than 1 hour', () => {
    const target = new Date(Date.now() + 45 * 60000);
    const result = getCountdown(target);
    expect(result).toMatch(/4\dm/);
  });
});

describe('formatPrayerTime', () => {
  it('formats in 12-hour mode', () => {
    const date = new Date(2024, 0, 1, 14, 30);
    expect(formatPrayerTime(date, false)).toBe('2:30 PM');
  });

  it('formats in 24-hour mode', () => {
    const date = new Date(2024, 0, 1, 14, 30);
    expect(formatPrayerTime(date, true)).toBe('14:30');
  });
});
