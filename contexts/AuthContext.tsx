import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { auth, pushTokens } from '@/lib/api';
import { registerForPushNotifications } from '@/lib/notifications';

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
  loginWithSocial: (provider: 'apple' | 'google', identityToken: string, name?: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncPushToken = useCallback(async () => {
    try {
      const token = await registerForPushNotifications();
      if (token && (Platform.OS === 'ios' || Platform.OS === 'android')) {
        await pushTokens.register(token, Platform.OS);
      }
    } catch {
      // Non-critical — push registration can fail silently
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await auth.hydrate();
        if (auth.isLoggedIn && auth.user) {
          setUser(auth.user);
          syncPushToken();
        }
      } catch {
        // Token invalid or expired — stay logged out (anonymous mode)
      } finally {
        setIsLoading(false);
      }
    })();
  }, [syncPushToken]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await auth.login(email, password);
    setUser(data.user);
    syncPushToken();
  }, [syncPushToken]);

  const loginWithSocial = useCallback(async (provider: 'apple' | 'google', identityToken: string, name?: string) => {
    const data = await auth.socialLogin(provider, identityToken, name);
    setUser(data.user);
    syncPushToken();
  }, [syncPushToken]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const data = await auth.register(email, password, name);
    setUser(data.user);
    syncPushToken();
  }, [syncPushToken]);

  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        loginWithSocial,
        register,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
