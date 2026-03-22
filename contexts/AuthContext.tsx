import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, pushTokens } from '@/lib/api';
import { registerForPushNotifications } from '@/lib/notifications';

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
  loginWithGoogleCode: (code: string, codeVerifier: string, redirectUri: string) => Promise<void>;
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
        } else {
          // Check if user previously chose guest mode
          const guestFlag = await AsyncStorage.getItem(GUEST_KEY);
          if (guestFlag === 'true') {
            setIsGuest(true);
          }
        }
      } catch {
        // Token invalid or expired — stay logged out
      } finally {
        setIsLoading(false);
      }
    })();
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

  const loginWithGoogleCode = useCallback(async (code: string, codeVerifier: string, redirectUri: string) => {
    const data = await auth.googleCodeExchange(code, codeVerifier, redirectUri);
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
    await auth.logout();
    setUser(null);
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_KEY);
  }, []);

  const deleteAccount = useCallback(async (password?: string) => {
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
    loginWithGoogleCode,
    register,
    continueAsGuest,
    logout,
    deleteAccount,
  }), [user, isGuest, isLoading, hasCompletedOnboarding, login, loginWithSocial, loginWithGoogleCode, register, continueAsGuest, logout, deleteAccount]);

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
