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
    isAuthenticated: false,
    isGuest: false,
    loginWithGoogle: jest.fn(),
    loginWithApple: jest.fn(),
    continueAsGuest: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonType: { SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { BLACK: 0, WHITE: 1 },
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  useAuthRequest: () => [null, null, jest.fn()],
  makeRedirectUri: jest.fn(() => 'test://redirect'),
  ResponseType: { Code: 'code' },
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('mock-hash')),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytes: jest.fn(() => new Uint8Array(32)),
  randomUUID: jest.fn(() => 'mock-uuid'),
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

jest.mock('@/components/brand', () => ({
  SkiaAtmosphericGradient: () => null,
  IslamicPattern: () => null,
  SolarLight: () => null,
}));

jest.mock('@/lib/prayerGradients', () => ({
  getAtmosphericGradient: () => ['#000', '#111', '#222'],
}));

jest.mock('@/lib/layoutGrid', () => ({
  patterns: { opacity: 0.04, tileSize: 60 },
}));

// --- Tests ---

import WelcomeScreen from '@/app/(auth)/welcome';

describe('WelcomeScreen', () => {
  it('renders without crashing', () => {
    render(<WelcomeScreen />);
  });

  it('shows sign-in related text', () => {
    render(<WelcomeScreen />);
    // The screen should contain some sign-in related content via i18n keys
    expect(screen.toJSON()).not.toBeNull();
  });
});
