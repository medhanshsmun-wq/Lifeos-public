'use client';

import { useCallback, useEffect, useState } from 'react';
import PinGate from './PinGate';
import { AuthContext, type AuthUser, type AuthMode } from './AuthContext';
import { switchUser, initializeDb } from '@/lib/db';
import { readLocalSession, clearLocalSession } from '@/lib/auth/clientSession';
import { getLocalAccountById } from '@/lib/auth/localAccounts';
import ArcReactorLoader from '@/components/ArcReactorLoader';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);

  const bootstrapUser = useCallback(async (u: AuthUser, authMode: AuthMode) => {
    switchUser(u.id);
    await initializeDb(u.name);
    setUser(u);
    setMode(authMode);
    setDbReady(true);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const local = readLocalSession();
      if (local?.mode === 'local') {
        const acc = await getLocalAccountById(local.accountId);
        if (acc?.id) {
          await bootstrapUser(
            { id: acc.id, name: acc.name, email: acc.email },
            'local'
          );
          return;
        }
        clearLocalSession();
      }

      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.user?.id) {
        await bootstrapUser(data.user, data.mode || 'server');
        return;
      }

      setUser(null);
      setMode(null);
      setDbReady(false);
    } finally {
      setLoading(false);
    }
  }, [bootstrapUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      /* ignore */
    }
    clearLocalSession();
    setUser(null);
    setMode(null);
    setDbReady(false);
    setLoading(false);
  }, []);

  const onAuthenticated = useCallback(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return <ArcReactorLoader visible={true} />;
  }

  if (!user || !dbReady) {
    return <PinGate onAuthenticated={onAuthenticated} />;
  }

  return (
    <AuthContext.Provider value={{ user, mode, loading: false, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
