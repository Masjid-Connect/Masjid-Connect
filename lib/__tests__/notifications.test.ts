/**
 * Regression test for the two-notification prayer scheduler.
 *
 * Locks in the May 2026 redesign:
 *   - Adhan fires AT jama'ah (sound: adhan.wav, identifier: prayer-athan-{name}).
 *   - Silent reminder fires `reminderMinutes` before jama'ah
 *     (sound: default, identifier: prayer-reminder-{name}).
 *   - Maghrib has no reminder, only an adhan.
 *   - reminderMinutes = 0 disables all reminders.
 *   - playAdhan = false disables all adhans; reminders still fire.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { schedulePrayerReminders } from '@/lib/notifications';
import { setPlayAdhan } from '@/lib/storage';
import type { PrayerTimesData } from '@/types';

// Extend the expo-notifications mock with the calls the scheduler needs that
// jest.setup.js doesn't already cover.
const notifications = Notifications as unknown as {
  scheduleNotificationAsync: jest.Mock;
  cancelScheduledNotificationAsync: jest.Mock;
  getAllScheduledNotificationsAsync: jest.Mock;
  SchedulableTriggerInputTypes: { DATE: 'date' };
};

beforeAll(() => {
  notifications.cancelScheduledNotificationAsync = jest.fn(() => Promise.resolve());
  notifications.getAllScheduledNotificationsAsync = jest.fn(() => Promise.resolve([]));
  notifications.SchedulableTriggerInputTypes = { DATE: 'date' };
});

beforeEach(() => {
  notifications.scheduleNotificationAsync.mockClear();
  notifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
});

/** Build a jama'ah set for today, all comfortably in the future. */
function buildFutureTimes(): PrayerTimesData {
  const base = new Date();
  base.setHours(base.getHours() + 2, 0, 0, 0);
  const offsetHours = (h: number) => {
    const d = new Date(base);
    d.setHours(d.getHours() + h);
    return d;
  };
  return {
    fajr: offsetHours(0),
    sunrise: offsetHours(1),
    dhuhr: offsetHours(3),
    asr: offsetHours(5),
    maghrib: offsetHours(7),
    isha: offsetHours(9),
  };
}

/** Pull `scheduleNotificationAsync` calls and group them for readable assertions. */
function summariseCalls() {
  const calls = notifications.scheduleNotificationAsync.mock.calls.map(
    ([arg]) => arg as {
      content: { sound: string; data: { type: string; prayer: string } };
      identifier: string;
    },
  );
  return {
    all: calls,
    adhans: calls.filter((c) => c.identifier.startsWith('prayer-athan-')),
    reminders: calls.filter((c) => c.identifier.startsWith('prayer-reminder-')),
  };
}

describe('schedulePrayerReminders — two-notification model', () => {
  it('default state (playAdhan on, reminderMinutes=15): 5 adhans + 4 reminders', async () => {
    await setPlayAdhan(true);
    await schedulePrayerReminders(buildFutureTimes(), 15);

    const { adhans, reminders, all } = summariseCalls();
    expect(all).toHaveLength(9);
    expect(adhans).toHaveLength(5);
    expect(reminders).toHaveLength(4);
    // Maghrib gets an adhan but NO reminder.
    expect(adhans.some((c) => c.identifier === 'prayer-athan-maghrib')).toBe(true);
    expect(reminders.some((c) => c.identifier === 'prayer-reminder-maghrib')).toBe(false);
  });

  it('adhan notifications use adhan.wav and the prayer_athan data type', async () => {
    await setPlayAdhan(true);
    await schedulePrayerReminders(buildFutureTimes(), 15);

    const { adhans } = summariseCalls();
    for (const call of adhans) {
      expect(call.content.sound).toBe('adhan.wav');
      expect(call.content.data.type).toBe('prayer_athan');
    }
  });

  it('reminder notifications use default sound and the prayer_reminder data type', async () => {
    await setPlayAdhan(true);
    await schedulePrayerReminders(buildFutureTimes(), 15);

    const { reminders } = summariseCalls();
    for (const call of reminders) {
      expect(call.content.sound).toBe('default');
      expect(call.content.data.type).toBe('prayer_reminder');
    }
  });

  it('playAdhan=false: 0 adhans, 4 reminders still fire', async () => {
    await setPlayAdhan(false);
    await schedulePrayerReminders(buildFutureTimes(), 15);

    const { adhans, reminders } = summariseCalls();
    expect(adhans).toHaveLength(0);
    expect(reminders).toHaveLength(4);
  });

  it('reminderMinutes=0: 5 adhans, 0 reminders', async () => {
    await setPlayAdhan(true);
    await schedulePrayerReminders(buildFutureTimes(), 0);

    const { adhans, reminders } = summariseCalls();
    expect(adhans).toHaveLength(5);
    expect(reminders).toHaveLength(0);
  });

  it('playAdhan=false AND reminderMinutes=0: nothing scheduled', async () => {
    await setPlayAdhan(false);
    await schedulePrayerReminders(buildFutureTimes(), 0);

    expect(summariseCalls().all).toHaveLength(0);
  });

  it('web platform: no notifications scheduled at all', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      await setPlayAdhan(true);
      await schedulePrayerReminders(buildFutureTimes(), 15);
      expect(summariseCalls().all).toHaveLength(0);
    } finally {
      Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    }
  });

  it('past fire times are skipped (no negative-time schedules)', async () => {
    await setPlayAdhan(true);
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const times: PrayerTimesData = {
      fajr: past,
      sunrise: past,
      dhuhr: future,
      asr: future,
      maghrib: future,
      isha: future,
    };
    await schedulePrayerReminders(times, 15);

    const { all } = summariseCalls();
    // Fajr (past) drops both reminder and adhan; the other four each get
    // adhan + reminder, except Maghrib which has no reminder.
    // dhuhr: 2, asr: 2, maghrib: 1, isha: 2 → 7
    expect(all).toHaveLength(7);
    expect(all.some((c) => c.identifier.includes('fajr'))).toBe(false);
  });
});
