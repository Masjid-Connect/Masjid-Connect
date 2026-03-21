import AsyncStorage from '@react-native-async-storage/async-storage';
import {
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

// AsyncStorage is automatically mocked by jest-expo

beforeEach(async () => {
  await AsyncStorage.clear();
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
