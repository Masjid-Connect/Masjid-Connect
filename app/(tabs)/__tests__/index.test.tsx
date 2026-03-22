import React from 'react';
import { render, screen } from '@testing-library/react-native';

// --- Mocks ---

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    effectiveScheme: 'light',
    themePreference: 'system',
    setThemePreference: jest.fn(),
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: ({ children }: any) => children,
  Stack: { Screen: () => null },
}));

jest.mock('@/hooks/usePrayerTimes', () => ({
  usePrayerTimes: () => ({
    prayers: [],
    nextPrayer: null,
    countdown: '',
    windowProgress: 0,
    hijriDate: null,
    isLoading: false,
    source: 'static',
    jamaahAvailable: true,
    isEstimated: false,
    use24h: false,
    refresh: jest.fn(),
    selectedDate: new Date('2026-03-22'),
    isToday: true,
    goToNextDay: jest.fn(),
    goToPrevDay: jest.fn(),
    goToToday: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/components/brand/SkiaAtmosphericGradient', () => ({
  SkiaAtmosphericGradient: () => null,
}));

jest.mock('@/components/prayer/DateNavigator', () => ({
  DateNavigator: () => null,
}));

jest.mock('@/lib/prayerGradients', () => ({
  getAtmosphericGradient: () => ['#000', '#111', '#222'],
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: ({ children }: any) => children,
  Path: () => null,
  Group: ({ children }: any) => children,
  Rect: () => null,
  LinearGradient: () => null,
  vec: jest.fn(),
  Skia: {
    Path: { MakeFromSVGString: jest.fn(() => 'mock-path') },
  },
}));

jest.mock('@/components/brand/IslamicPattern', () => ({
  IslamicPattern: () => null,
}));

jest.mock('@/hooks/useReadAnnouncements', () => ({
  useReadAnnouncements: () => ({ unreadCount: 0 }),
}));

// --- Tests ---

import PrayerTimesScreen from '@/app/(tabs)/index';

describe('PrayerTimesScreen', () => {
  it('renders without crashing', () => {
    render(<PrayerTimesScreen />);
    expect(screen.toJSON()).not.toBeNull();
  });
});
