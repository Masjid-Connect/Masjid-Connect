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

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    register: jest.fn(),
    isAuthenticated: false,
  }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// --- Tests ---

import SignUpScreen from '@/app/(auth)/sign-up';

describe('SignUpScreen', () => {
  it('renders without crashing', () => {
    render(<SignUpScreen />);
    expect(screen.toJSON()).not.toBeNull();
  });
});
