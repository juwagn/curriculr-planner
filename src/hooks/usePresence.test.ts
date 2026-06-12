import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { relativeTime, usePresence } from './usePresence';
import { useAuthStore } from '@/stores/auth';
import { useWpSyncStore } from '@/stores/wpSync';

vi.mock('@/lib/wp-sync', () => ({
  fetchLatestRevision: vi.fn(),
  pushDoc: vi.fn(),
  fetchDoc: vi.fn(),
}));

vi.mock('@/lib/wp-sync-config', () => ({
  loadWpConfig: () => ({ enabled: false, baseUrl: '', links: {} }),
  saveWpConfig: vi.fn(),
}));

import { fetchLatestRevision } from '@/lib/wp-sync';
const mockFetch = vi.mocked(fetchLatestRevision);

const baseConfig = {
  enabled: true,
  baseUrl: 'https://example.com',
  links: { 'sy1': { schoolyearKey: 'sj_2026_27', wpProfileId: 'p1', stage: 'entwurf' as const, knownVersion: 3 } },
};

beforeEach(() => {
  useAuthStore.setState({ status: 'authenticated', token: 'tok', claims: { sub: 'me', name: 'Ich', groups: [], exp: 9999999999 } });
  useWpSyncStore.setState({ config: baseConfig, syncState: 'idle', message: '', conflict: null });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('relativeTime', () => {
  it('returns "gerade eben" for < 1 min ago', () => {
    const now = new Date();
    now.setSeconds(now.getSeconds() - 30);
    const raw = now.toISOString().replace('T', ' ').slice(0, 19);
    expect(relativeTime(raw)).toBe('gerade eben');
  });

  it('returns "vor X Min" for 1–59 min ago', () => {
    const d = new Date(Date.now() - 5 * 60_000);
    const raw = d.toISOString().replace('T', ' ').slice(0, 19);
    expect(relativeTime(raw)).toBe('vor 5 Min');
  });

  it('returns "vor X Std" for 1–23 hours ago', () => {
    const d = new Date(Date.now() - 2 * 3_600_000);
    const raw = d.toISOString().replace('T', ' ').slice(0, 19);
    expect(relativeTime(raw)).toBe('vor 2 Std');
  });

  it('returns "" for ≥ 24 hours ago', () => {
    const d = new Date(Date.now() - 25 * 3_600_000);
    const raw = d.toISOString().replace('T', ' ').slice(0, 19);
    expect(relativeTime(raw)).toBe('');
  });

  it('returns "" for unparseable string', () => {
    expect(relativeTime('not-a-date')).toBe('');
  });
});

describe('usePresence', () => {
  it('returns null when not authenticated', async () => {
    useAuthStore.setState({ status: 'unauthenticated', token: null, claims: null });
    const { result } = renderHook(() => usePresence('sy1'));
    await act(async () => { await Promise.resolve(); });
    expect(result.current).toBeNull();
  });

  it('returns latest revision from another user', async () => {
    mockFetch.mockResolvedValueOnce({ version: 5, authorName: 'Max', authorSub: 'other', savedAt: '2026-06-01 10:00:00' });
    const { result } = renderHook(() => usePresence('sy1'));
    await act(async () => { await Promise.resolve(); });
    expect(result.current?.authorName).toBe('Max');
    expect(result.current?.authorSub).toBe('other');
  });

  it('returns null when latest revision is own save', async () => {
    mockFetch.mockResolvedValueOnce({ version: 5, authorName: 'Ich', authorSub: 'me', savedAt: '2026-06-01 10:00:00' });
    const { result } = renderHook(() => usePresence('sy1'));
    await act(async () => { await Promise.resolve(); });
    expect(result.current).toBeNull();
  });

  it('polls again after 60 seconds', async () => {
    mockFetch
      .mockResolvedValueOnce({ version: 5, authorName: 'Max', authorSub: 'other', savedAt: '2026-06-01 10:00:00' })
      .mockResolvedValueOnce({ version: 6, authorName: 'Anna', authorSub: 'u2', savedAt: '2026-06-01 11:00:00' });
    const { result } = renderHook(() => usePresence('sy1'));
    await act(async () => { await Promise.resolve(); });
    expect(result.current?.authorName).toBe('Max');
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    expect(result.current?.authorName).toBe('Anna');
  });
});
