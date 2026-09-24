'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from './api';

export type Role = 'BUYER' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  plainPassword?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  isAuthenticated: () => boolean;
}

function decodeExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      accessTokenExpiresAt: null,
      setAuth: (user, token) => {
        const exp = decodeExp(token);
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', token);
        }
        set({ user, accessToken: token, accessTokenExpiresAt: exp });
      },
      logout: async () => {
        try { await apiClient.post('/auth/logout'); } catch {}
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
        }
        set({ user: null, accessToken: null, accessTokenExpiresAt: null });
      },
      fetchMe: async () => {
        try {
          const data = await apiClient.get<{ user: AuthUser }>('/auth/me');
          set({ user: data.user });
        } catch {
          set({ user: null, accessToken: null, accessTokenExpiresAt: null });
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
          }
        }
      },
      hasRole: (...roles) => {
        const u = get().user;
        return !!u && roles.includes(u.role);
      },
      isAuthenticated: () => {
        const { accessToken, accessTokenExpiresAt, user } = get();
        if (!accessToken || !user) return false;
        // PRD_New V3 §Platform-Wide.1: 60-second clock skew buffer
        // prevents unexpected logouts when the token expires "right now"
        if (accessTokenExpiresAt && Date.now() > accessTokenExpiresAt + 60000) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
          }
          set({ user: null, accessToken: null, accessTokenExpiresAt: null });
          return false;
        }
        return true;
      },
    }),
    {
      name: 'ecom-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, accessTokenExpiresAt: s.accessTokenExpiresAt }),
    }
  )
);
