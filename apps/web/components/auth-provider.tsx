'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  authApi,
  getStoredUser,
  hasAuth,
  logoutAuth,
  onAuthChange,
  saveStoredUser,
  SessionUser,
} from '@/lib/api';

type AuthClaims = {
  sub: string;
  email: string;
  roles: string[];
  tenantId?: string;
};

type Profile = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string | null;
  roles: string[];
};

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  authenticated: boolean;
  restore: () => Promise<SessionUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const restore = useCallback(async () => {
    if (!hasAuth()) {
      setUser(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      const claims = await authApi<AuthClaims>('/auth/session');
      const profile = await authApi<Profile>('/users/me').catch(() => null);
      const stored = getStoredUser();
      const next: SessionUser = {
        id: profile?.id ?? claims.sub,
        email: profile?.email ?? claims.email,
        name: profile?.name ?? stored?.name,
        avatarUrl: profile?.avatarUrl ?? stored?.avatarUrl,
        roles: claims.roles ?? profile?.roles ?? stored?.roles ?? [],
        tenantId: claims.tenantId ?? stored?.tenantId,
      };
      saveStoredUser(next);
      setUser(next);
      return next;
    } catch {
      const stored = getStoredUser();
      setUser(stored);
      return stored;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUser(getStoredUser());
    void restore();

    return onAuthChange(() => {
      setUser(getStoredUser());
      if (!hasAuth()) setLoading(false);
    });
  }, [restore]);

  const logout = useCallback(async () => {
    await logoutAuth();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    authenticated: !!user || hasAuth(),
    restore,
    logout,
  }), [user, loading, restore, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthSession debe usarse dentro de AuthProvider');
  return context;
}
