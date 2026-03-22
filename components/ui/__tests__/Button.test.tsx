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

import { render, screen, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders title text', () => {
    render(<Button title="Submit" onPress={jest.fn()} />);
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button title="Press Me" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows ActivityIndicator when loading=true', () => {
    const { UNSAFE_getByType } = render(
      <Button title="Loading" onPress={jest.fn()} loading />,
    );
    // When loading, the title text should not be rendered
    expect(screen.queryByText('Loading')).toBeNull();
    // ActivityIndicator should be present — import and check by type
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button title="Disabled" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('applies compact style', () => {
    render(<Button title="Compact" onPress={jest.fn()} compact />);
    const button = screen.getByRole('button');
    // The button should render successfully with compact prop
    expect(button).toBeTruthy();
    expect(screen.getByText('Compact')).toBeTruthy();
  });

  it('triggers haptic feedback on press', () => {
    render(<Button title="Haptic" onPress={jest.fn()} />);
    fireEvent.press(screen.getByRole('button'));
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light,
    );
  });
});
