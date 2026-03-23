import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { auth, pushTokens } from '@/lib/api';
import { registerForPushNotifications } from '@/lib/notifications';
import { evictAllCachedData } from '@/lib/storage';

const GUEST_KEY = 'has_chosen_guest';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  date_joined: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithSocial: (provider: 'apple' | 'google', token: string, name?: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const syncPushToken = useCallback(async (retryCount = 0) => {
    try {
      const token = await registerForPushNotifications();
      if (token && (Platform.OS === 'ios' || Platform.OS === 'android')) {
        await pushTokens.register(token, Platform.OS);
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { context: 'push_token_registration', retry: retryCount } });
      if (retryCount < 2) {
        setTimeout(() => syncPushToken(retryCount + 1), 5000 * (retryCount + 1));
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await auth.hydrate();
        if (cancelled) return;
        if (auth.isLoggedIn && auth.user) {
          setUser(auth.user);
          syncPushToken();
        } else {
          // Check if user previously chose guest mode
          const guestFlag = await AsyncStorage.getItem(GUEST_KEY);
          if (guestFlag === 'true') {
            setIsGuest(true);
          }
        }
      } catch (err) {
        if (cancelled) return;
        // Q20: Distinguish network error from invalid token
        const isNetworkError = err instanceof TypeError || (err instanceof Error && err.message.includes('network'));
        if (isNetworkError) {
          // Network failure — preserve any cached user state, don't log out
          // User may still have a valid token but no connectivity
          console.warn('Auth hydration network error — preserving cached state');
        }
        // Invalid token / other error — stay logged out (default state)
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [syncPushToken]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await auth.login(email, password);
    setUser(data.user);
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_KEY);
    syncPushToken();
  }, [syncPushToken]);

  const loginWithSocial = useCallback(async (provider: 'apple' | 'google', token: string, name?: string) => {
    const data = await auth.socialLogin(provider, token, name);
    setUser(data.user);
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_KEY);
    syncPushToken();
  }, [syncPushToken]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const data = await auth.register(email, password, name);
    setUser(data.user);
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_KEY);
    syncPushToken();
  }, [syncPushToken]);

  const continueAsGuest = useCallback(async () => {
    setIsGuest(true);
    await AsyncStorage.setItem(GUEST_KEY, 'true');
  }, []);

  const logout = useCallback(async () => {
    await evictAllCachedData();
    await auth.logout();
    setUser(null);
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_KEY);
  }, []);

  const deleteAccount = useCallback(async (password?: string) => {
    await evictAllCachedData();
    await auth.deleteAccount(password);
    setUser(null);
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_KEY);
  }, []);

  // Skip onboarding — go straight to tabs. Auth is optional, accessible from Settings.
  const hasCompletedOnboarding = true;

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: user !== null,
    isGuest,
    isLoading,
    hasCompletedOnboarding,
    login,
    loginWithSocial,
    register,
    continueAsGuest,
    logout,
    deleteAccount,
  }), [user, isGuest, isLoading, hasCompletedOnboarding, login, loginWithSocial, register, continueAsGuest, logout, deleteAccount]);

  return (
    <AuthContext.Provider
      value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
