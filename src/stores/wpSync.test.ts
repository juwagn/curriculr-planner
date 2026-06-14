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

vi.mock('@/lib/storage', () => ({
  storage: { saveDoc: vi.fn(), setActiveDoc: vi.fn() },
}));

import { fetchDoc, pushDoc } from '@/lib/wp-sync';
import { storage } from '@/lib/storage';
const mockFetchDoc = vi.mocked(fetchDoc);
const mockPushDoc = vi.mocked(pushDoc);

const baseConfig = {
  enabled: true,
  baseUrl: 'https://example.com',
  links: {
    'sy1': { schoolyearKey: 'sj_2026_27', wpProfileId: 'p1', stage: 'entwurf' as const, knownVersion: 3 },
  },
};

function setDocFn() { /* no-op */ }

beforeEach(() => {
  useWpSyncStore.setState({ config: baseConfig, syncState: 'idle', message: '', conflict: null, pendingPull: null });
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

  it('returns downgrade and sets pendingPull when WP version < knownVersion', async () => {
    // baseConfig has knownVersion: 3; WP returns version 2
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wpDoc = { schoolyear: { id: 'sy1' }, events: [], categories: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [], meta: { name: 'T', lastSaved: '' } } as any;
    mockFetchDoc.mockResolvedValueOnce({ exists: true, doc: wpDoc, version: 2, stage: 'entwurf' });
    const result = await useWpSyncStore.getState().pull('sy1', setDocFn);
    expect(result).toBe('downgrade');
    const state = useWpSyncStore.getState();
    expect(state.pendingPull).not.toBeNull();
    expect(state.pendingPull?.version).toBe(2);
    expect(state.pendingPull?.knownVersion).toBe(3);
    expect(state.syncState).toBe('idle');
  });

  it('returns error when no token', async () => {
    useAuthStore.setState({ token: null, claims: null });
    const result = await useWpSyncStore.getState().pull('sy1', setDocFn);
    expect(result).toBe('error');
    expect(useWpSyncStore.getState().syncState).toBe('error');
  });
});

describe('send()', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serverDoc = { version: 3, schoolyear: { id: 'sy1', label: 'T', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15', holidays: [], quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }, categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [], meta: { name: 'T', lastSaved: '2026-01-01T00:00:00Z' } } as any;

  it('conflict response stores authorName and savedAt in conflict state', async () => {
    mockPushDoc.mockResolvedValueOnce({
      status: 'conflict',
      serverVersion: 5,
      serverDoc,
      authorName: 'Max Mustermann',
      savedAt: '2026-01-01 12:00:00',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await useWpSyncStore.getState().send({ schoolyear: { id: 'sy1' } } as any);
    expect(result).toBe('conflict');
    expect(useWpSyncStore.getState().conflict?.authorName).toBe('Max Mustermann');
    expect(useWpSyncStore.getState().conflict?.savedAt).toBe('2026-01-01 12:00:00');
  });

  it('conflict response without author sets undefined authorName', async () => {
    mockPushDoc.mockResolvedValueOnce({ status: 'conflict', serverVersion: 5, serverDoc });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await useWpSyncStore.getState().send({ schoolyear: { id: 'sy1' } } as any);
    expect(useWpSyncStore.getState().conflict?.authorName).toBeUndefined();
  });
});

describe('loadFromWp()', () => {
  const wpDoc = {
    schoolyear: { id: 'sy-load', label: '2026/27', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15', holidays: [], quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [],
    meta: { name: 'Schuljahr 2026/27', lastSaved: '2026-01-01T00:00:00Z' },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  it('saves locally, creates a link, sets active, and returns loaded', async () => {
    mockFetchDoc.mockResolvedValueOnce({ exists: true, doc: wpDoc, version: 7, stage: 'genehmigt' });
    let received: unknown = null;
    const result = await useWpSyncStore.getState().loadFromWp('sj_2026_27', 'Schuljahr 2026/27', (d) => { received = d; });

    expect(result).toBe('loaded');
    expect(storage.saveDoc).toHaveBeenCalledWith(wpDoc);
    expect(storage.setActiveDoc).toHaveBeenCalledWith('sy-load');
    expect(received).toBe(wpDoc);
    const link = useWpSyncStore.getState().config.links['sy-load'];
    expect(link).toMatchObject({ schoolyearKey: 'sj_2026_27', stage: 'genehmigt', knownVersion: 7 });
    expect(useWpSyncStore.getState().syncState).toBe('synced');
  });

  it('returns error when not authenticated', async () => {
    useAuthStore.setState({ token: null, claims: null });
    const result = await useWpSyncStore.getState().loadFromWp('sj_2026_27', 'X', () => {});
    expect(result).toBe('error');
  });

  it('returns error when the doc is not found on WP', async () => {
    mockFetchDoc.mockResolvedValueOnce({ exists: false });
    const result = await useWpSyncStore.getState().loadFromWp('sj_2026_27', 'X', () => {});
    expect(result).toBe('error');
    expect(useWpSyncStore.getState().syncState).toBe('error');
  });
});
