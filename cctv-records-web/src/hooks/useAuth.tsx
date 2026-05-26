import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  setExternalLogout,
} from '@/api/client';
import type { AuthUser } from '@/types';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      const raw = localStorage.getItem(USER_KEY);
      if (token && raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {
      // corrupt cache → just stay logged out
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string, nextUser: AuthUser) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Let the axios refresh interceptor kick us out on a failed refresh.
  useEffect(() => {
    setExternalLogout(logout);
  }, [logout]);

  const value = useMemo<AuthState>(
    () => ({ isLoading, isAuthenticated: !!user, user, login, logout }),
    [isLoading, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
