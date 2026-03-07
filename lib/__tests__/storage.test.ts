import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cachePrayerTimes,
  getCachedPrayerTimes,
  getSubscribedMosqueIds,
  setSubscribedMosqueIds,
  getUserLocation,
  setUserLocation,
  getCalculationMethod,
  setCalculationMethod,
  getReminderMinutes,
  setReminderMinutes,
  getUse24h,
  setUse24h,
  getThemePreference,
  setThemePreference,
} from '../storage';
import type { PrayerTimesData } from '@/types';

// AsyncStorage is automatically mocked by jest-expo

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('prayer times cache', () => {
  const times: PrayerTimesData = {
    fajr: new Date('2024-01-01T05:30:00'),
    sunrise: new Date('2024-01-01T07:00:00'),
    dhuhr: new Date('2024-01-01T12:15:00'),
    asr: new Date('2024-01-01T15:30:00'),
    maghrib: new Date('2024-01-01T17:45:00'),
    isha: new Date('2024-01-01T19:15:00'),
  };

  it('caches and retrieves prayer times for the same date', async () => {
    await cachePrayerTimes(times, '2024-01-01');
    const cached = await getCachedPrayerTimes('2024-01-01');

    expect(cached).not.toBeNull();
    expect(cached!.fajr.toISOString()).toBe(times.fajr.toISOString());
    expect(cached!.isha.toISOString()).toBe(times.isha.toISOString());
  });

  it('returns null for a different date', async () => {
    await cachePrayerTimes(times, '2024-01-01');
    const cached = await getCachedPrayerTimes('2024-01-02');

    expect(cached).toBeNull();
  });
});

describe('subscribed mosque IDs', () => {
  it('defaults to empty array', async () => {
    const ids = await getSubscribedMosqueIds();
    expect(ids).toEqual([]);
  });

  it('stores and retrieves IDs', async () => {
    await setSubscribedMosqueIds(['mosque-1', 'mosque-2']);
    const ids = await getSubscribedMosqueIds();
    expect(ids).toEqual(['mosque-1', 'mosque-2']);
  });
});

describe('user location', () => {
  it('defaults to null', async () => {
    const loc = await getUserLocation();
    expect(loc).toBeNull();
  });

  it('stores and retrieves coordinates', async () => {
    await setUserLocation(21.4225, 39.8262);
    const loc = await getUserLocation();
    expect(loc).toEqual({ latitude: 21.4225, longitude: 39.8262 });
  });
});

describe('calculation method', () => {
  it('defaults to code 2 (ISNA)', async () => {
    const method = await getCalculationMethod();
    expect(method.code).toBe(2);
    expect(method.name).toBe('NorthAmerica');
  });

  it('stores and retrieves method', async () => {
    await setCalculationMethod(4, 'UmmAlQura');
    const method = await getCalculationMethod();
    expect(method.code).toBe(4);
    expect(method.name).toBe('UmmAlQura');
  });
});

describe('reminder minutes', () => {
  it('defaults to 15', async () => {
    const minutes = await getReminderMinutes();
    expect(minutes).toBe(15);
  });

  it('stores and retrieves custom value', async () => {
    await setReminderMinutes(30);
    const minutes = await getReminderMinutes();
    expect(minutes).toBe(30);
  });
});

describe('24h format', () => {
  it('defaults to false', async () => {
    const use24h = await getUse24h();
    expect(use24h).toBe(false);
  });

  it('stores and retrieves true', async () => {
    await setUse24h(true);
    const use24h = await getUse24h();
    expect(use24h).toBe(true);
  });
});

describe('theme preference', () => {
  it('defaults to system', async () => {
    const theme = await getThemePreference();
    expect(theme).toBe('system');
  });

  it('stores and retrieves dark', async () => {
    await setThemePreference('dark');
    const theme = await getThemePreference();
    expect(theme).toBe('dark');
  });
});
