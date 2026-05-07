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
  // Null until AsyncStorage resolves — see render gate below for why.
  const [themePreference, setThemePreferenceState] = useState<ThemePreference | null>(null);

  useEffect(() => {
    getThemePreference().then(setThemePreferenceState);
  }, []);

  const setThemePreference = useCallback(async (theme: ThemePreference) => {
    await persistThemePreference(theme);
    setThemePreferenceState(theme);
  }, []);

  const resolved = themePreference ?? 'system';
  const effectiveScheme: 'light' | 'dark' =
    resolved === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : resolved;

  const value = useMemo<ThemeContextValue>(() => ({
    themePreference: resolved,
    setThemePreference,
    effectiveScheme,
  }), [resolved, setThemePreference, effectiveScheme]);

  // Hold rendering until the stored preference is loaded. Without this,
  // the first render uses 'system' as a fallback — and on a system-dark
  // device with an explicit-light preference, that produces dark
  // backgrounds in components (and React Navigation theme caches) that
  // don't fully update when the preference resolves a tick later. The
  // splash overlay is already covering the screen during this window,
  // so the brief null is invisible to the user.
  if (themePreference === null) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
