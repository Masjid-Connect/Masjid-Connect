import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from '@/lib/api';

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
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await auth.hydrate();
        if (auth.isLoggedIn && auth.user) {
          setUser(auth.user);
        }
      } catch {
        // Token invalid or expired — stay logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await auth.login(email, password);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const data = await auth.register(email, password, name);
    setUser(data.user);
  }, []);

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
