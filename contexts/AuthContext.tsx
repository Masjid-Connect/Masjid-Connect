import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { auth, pushTokens } from '@/lib/api';
import { registerForPushNotifications } from '@/lib/notifications';
import { evictAllCachedData } from '@/lib/storage';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  date_joined: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        }
      } catch (err) {
        if (cancelled) return;
        const isNetworkError = err instanceof TypeError || (err instanceof Error && err.message.includes('network'));
        if (isNetworkError) {
          console.warn('Auth hydration network error — preserving cached state');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    // Register push token for all users (anonymous or authenticated)
    syncPushToken();

    return () => { cancelled = true; };
  }, [syncPushToken]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await auth.login(email, password);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await evictAllCachedData();
    await auth.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
  }), [user, isLoading, login, logout]);

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
