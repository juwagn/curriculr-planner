import { create } from 'zustand';
import type { AppTokenClaims } from '@/lib/wp-auth';

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
  setToken(token, claims) { set({ status: 'authenticated', token, claims }); },
  logout() { set({ status: 'unauthenticated', token: null, claims: null }); },
}));
