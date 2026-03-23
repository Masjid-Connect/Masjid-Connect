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

describe('DST transition handling', () => {
  it('handles spring-forward DST correctly (last Sunday of March)', () => {
    // UK clocks spring forward: 1:00 AM → 2:00 AM on last Sunday of March.
    // Prayer times should still be valid Date objects with correct hours.
    // 2026-03-29 is last Sunday of March (spring forward)
    const springForwardTimes: PrayerTimesData = {
      fajr: new Date(2026, 2, 29, 5, 12),
      sunrise: new Date(2026, 2, 29, 6, 45),
      dhuhr: new Date(2026, 2, 29, 13, 5),
      asr: new Date(2026, 2, 29, 16, 32),
      maghrib: new Date(2026, 2, 29, 19, 28),
      isha: new Date(2026, 2, 29, 20, 55),
    };

    const entries = buildPrayerEntries(springForwardTimes);
    expect(entries).toHaveLength(6);
    // All times should be valid and in ascending order
    for (let i = 0; i < entries.length - 1; i++) {
      expect(entries[i].time.getTime()).toBeLessThan(entries[i + 1].time.getTime());
    }
  });

  it('handles autumn-fallback DST correctly (last Sunday of October)', () => {
    // UK clocks fall back: 2:00 AM → 1:00 AM on last Sunday of October.
    // 2026-10-25 is last Sunday of October (fall back)
    const fallBackTimes: PrayerTimesData = {
      fajr: new Date(2026, 9, 25, 5, 48),
      sunrise: new Date(2026, 9, 25, 7, 22),
      dhuhr: new Date(2026, 9, 25, 12, 45),
      asr: new Date(2026, 9, 25, 15, 10),
      maghrib: new Date(2026, 9, 25, 17, 52),
      isha: new Date(2026, 9, 25, 19, 18),
    };

    const entries = buildPrayerEntries(fallBackTimes);
    expect(entries).toHaveLength(6);
    for (let i = 0; i < entries.length - 1; i++) {
      expect(entries[i].time.getTime()).toBeLessThan(entries[i + 1].time.getTime());
    }

    // Formatted times should still produce valid strings
    entries.forEach((entry) => {
      const formatted12 = formatPrayerTime(entry.time, false);
      const formatted24 = formatPrayerTime(entry.time, true);
      expect(formatted12).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
      expect(formatted24).toMatch(/\d{1,2}:\d{2}/);
    });
  });
});
