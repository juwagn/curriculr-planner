import { create } from 'zustand';
import type { AppTokenClaims } from '@/lib/wp-auth';

const SESSION_KEY = 'curriculr-auth-session';

function saveSession(token: string, claims: AppTokenClaims): void {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, claims })); } catch { /* storage blocked */ }
}

function clearSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export function loadSession(): { token: string; claims: AppTokenClaims } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string; claims?: AppTokenClaims };
    if (typeof parsed.token !== 'string' || !parsed.claims) return null;
    if (typeof parsed.claims.exp === 'number' && parsed.claims.exp < Date.now() / 1000) {
      clearSession();
      return null;
    }
    return { token: parsed.token, claims: parsed.claims };
  } catch {
    return null;
  }
}

interface AuthStore {
  status: 'unauthenticated' | 'authenticated';
  token: string | null;
  claims: AppTokenClaims | null;
  setToken(token: string, claims: AppTokenClaims): void;
  logout(): void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  status: 'unauthenticated',
  token: null,
  claims: null,
  setToken(token, claims) {
    saveSession(token, claims);
    set({ status: 'authenticated', token, claims });
  },
  logout() {
    clearSession();
    set({ status: 'unauthenticated', token: null, claims: null });
  },
}));
