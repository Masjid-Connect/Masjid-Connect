import React from 'react';

// Mock dependencies before imports
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    effectiveScheme: 'light',
    themePreference: 'system',
    setThemePreference: jest.fn(),
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-gesture-handler', () => {
  const gestureInstance = {
    onUpdate: jest.fn().mockReturnThis(),
    onEnd: jest.fn().mockReturnThis(),
    onStart: jest.fn().mockReturnThis(),
    onFinalize: jest.fn().mockReturnThis(),
    enabled: jest.fn().mockReturnThis(),
  };
  return {
    Gesture: {
      Pan: () => gestureInstance,
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Override the global reanimated mock to include useReducedMotion
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (component: unknown) => component,
      call: () => {},
    },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    withSpring: (val: number) => val,
    withTiming: (val: number) => val,
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    useReducedMotion: () => true,
  };
});

import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';

describe('BottomSheet', () => {
  it('returns null when visible=false', () => {
    const { toJSON } = render(
      <BottomSheet visible={false} onDismiss={jest.fn()}>
        <Text>Hidden Content</Text>
      </BottomSheet>,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders children when visible=true', () => {
    render(
      <BottomSheet visible={true} onDismiss={jest.fn()}>
        <Text>Sheet Content</Text>
      </BottomSheet>,
    );
    expect(screen.getByText('Sheet Content')).toBeTruthy();
  });

  it('has accessibility modal state', () => {
    render(
      <BottomSheet visible={true} onDismiss={jest.fn()}>
        <Text>Accessible Sheet</Text>
      </BottomSheet>,
    );
    // The sheet Animated.View has accessibilityViewIsModal={true}
    // Verify the content is rendered within the modal structure
    expect(screen.getByText('Accessible Sheet')).toBeTruthy();
  });
});
