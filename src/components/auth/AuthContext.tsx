'use client';

import { createContext, useContext } from 'react';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

export type AuthMode = 'server' | 'local';

type AuthContextValue = {
  user: AuthUser | null;
  mode: AuthMode | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  mode: null,
  loading: true,
  logout: async () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
