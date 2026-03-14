import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getThemePreference, setThemePreference as persistThemePreference } from '@/lib/storage';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  themePreference: ThemePreference;
  setThemePreference: (theme: ThemePreference) => Promise<void>;
  effectiveScheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    getThemePreference().then(setThemePreferenceState);
  }, []);

  const setThemePreference = useCallback(async (theme: ThemePreference) => {
    await persistThemePreference(theme);
    setThemePreferenceState(theme);
  }, []);

  const effectiveScheme: 'light' | 'dark' =
    themePreference === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : themePreference;

  const value = useMemo<ThemeContextValue>(() => ({
    themePreference,
    setThemePreference,
    effectiveScheme,
  }), [themePreference, setThemePreference, effectiveScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
