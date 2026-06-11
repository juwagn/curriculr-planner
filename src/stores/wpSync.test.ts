import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWpSyncStore } from './wpSync';
import { useAuthStore } from './auth';

vi.mock('@/lib/wp-sync', () => ({
  pushDoc: vi.fn(),
  fetchDoc: vi.fn(),
}));

vi.mock('@/lib/wp-sync-config', () => ({
  loadWpConfig: () => ({ enabled: false, baseUrl: '', links: {} }),
  saveWpConfig: vi.fn(),
}));

import { fetchDoc } from '@/lib/wp-sync';
const mockFetchDoc = vi.mocked(fetchDoc);

const baseConfig = {
  enabled: true,
  baseUrl: 'https://example.com',
  links: {
    'sy1': { schoolyearKey: 'sj_2026_27', wpProfileId: 'p1', stage: 'entwurf' as const, knownVersion: 3 },
  },
};

function setDocFn() { /* no-op */ }

beforeEach(() => {
  useWpSyncStore.setState({ config: baseConfig, syncState: 'idle', message: '', conflict: null });
  useAuthStore.setState({ token: 'tok123', claims: null });
});

describe('pull()', () => {
  it('returns error and sets error state on 401 (non-empty message from fetchDoc)', async () => {
    mockFetchDoc.mockResolvedValueOnce({ exists: false, message: 'Token ungültig.' });
    const result = await useWpSyncStore.getState().pull('sy1', setDocFn);
    expect(result).toBe('error');
    expect(useWpSyncStore.getState().syncState).toBe('error');
    expect(useWpSyncStore.getState().message).toBe('Token ungültig.');
  });

  it('returns not-found and sets idle state on 404 (no message from fetchDoc)', async () => {
    mockFetchDoc.mockResolvedValueOnce({ exists: false });
    const result = await useWpSyncStore.getState().pull('sy1', setDocFn);
    expect(result).toBe('not-found');
    expect(useWpSyncStore.getState().syncState).toBe('idle');
  });

  it('returns error when no token', async () => {
    useAuthStore.setState({ token: null, claims: null });
    const result = await useWpSyncStore.getState().pull('sy1', setDocFn);
    expect(result).toBe('error');
    expect(useWpSyncStore.getState().syncState).toBe('error');
  });
});
