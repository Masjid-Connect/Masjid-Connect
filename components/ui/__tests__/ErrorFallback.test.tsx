import React from 'react';

// Mock dependencies before imports
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

jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = require('react-native');
  return (props: { name: string; size: number; color: string }) =>
    <Text>{props.name}</Text>;
});

import { render, screen, fireEvent } from '@testing-library/react-native';
import { ErrorFallback } from '@/components/ui/ErrorFallback';

describe('ErrorFallback', () => {
  it('renders error title and message', () => {
    const error = new Error('Test error');
    render(<ErrorFallback error={error} resetError={jest.fn()} />);

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(
      screen.getByText('An unexpected error occurred. Please try again.'),
    ).toBeTruthy();
  });

  it('shows debug info in development mode', () => {
    const error = new Error('Debug error message');
    render(<ErrorFallback error={error} resetError={jest.fn()} />);

    // __DEV__ is true in the test environment
    expect(screen.getByText('Debug error message')).toBeTruthy();
  });

  it('calls resetError when retry button pressed', () => {
    const resetError = jest.fn();
    const error = new Error('Some error');
    render(<ErrorFallback error={error} resetError={resetError} />);

    fireEvent.press(screen.getByText('Try Again'));
    expect(resetError).toHaveBeenCalledTimes(1);
  });
});
