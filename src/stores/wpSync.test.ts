import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWpSyncStore } from './wpSync';
import { useAuthStore } from './auth';
import { usePlannerStore } from './planner';

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
    'sy1': { schoolyearKey: 'sj_2026_27', schoolyearLabel: '2026/27', stage: 'entwurf' as const, knownVersion: 3 },
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
    expect(link).toMatchObject({ schoolyearKey: 'sj_2026_27', stage: 'genehmigt', knownVersion: 7, syncedLastSaved: '2026-01-01T00:00:00Z' });
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

describe('pull() on autostart (TS-01)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mkDoc = (lastSaved: string, title = 'Lokal'): any => ({
    schoolyear: { id: 'sy1' }, events: [{ id: 'e1', title }], categories: [], annotations: [],
    availableGroups: [], ignoredConflicts: [], templates: [], meta: { name: 'Muster-Gesamtschule', lastSaved },
  });
  const linkWith = (syncedLastSaved?: string) => ({
    ...baseConfig,
    links: { sy1: { ...baseConfig.links.sy1, ...(syncedLastSaved ? { syncedLastSaved } : {}) } },
  });

  beforeEach(() => { vi.mocked(storage.saveDoc).mockClear(); });

  it('keeps the local plan when WP has the same version and local edits were made after the last push', async () => {
    const local = mkDoc('2026-11-10T10:05:00Z');
    usePlannerStore.setState({ doc: local });
    useWpSyncStore.setState({ config: linkWith('2026-11-10T10:00:00Z') });
    mockFetchDoc.mockResolvedValueOnce({ exists: true, doc: mkDoc('2026-11-10T10:00:00Z', 'Server'), version: 3, stage: 'entwurf' });
    const setDoc = vi.fn();
    const result = await useWpSyncStore.getState().pull('sy1', setDoc);
    expect(result).toBe('up-to-date');
    expect(setDoc).not.toHaveBeenCalled();
    expect(usePlannerStore.getState().doc).toBe(local);
    expect(useWpSyncStore.getState().conflict).toBeNull();
  });

  it('takes over a newer WP version when there are no local unsent changes', async () => {
    usePlannerStore.setState({ doc: mkDoc('2026-11-10T10:00:00Z') });
    useWpSyncStore.setState({ config: linkWith('2026-11-10T10:00:00Z') });
    const wpDoc = mkDoc('2026-11-11T08:00:00Z', 'Server');
    mockFetchDoc.mockResolvedValueOnce({ exists: true, doc: wpDoc, version: 4, stage: 'genehmigt' });
    const setDoc = vi.fn();
    const result = await useWpSyncStore.getState().pull('sy1', setDoc);
    expect(result).toBe('pulled');
    expect(setDoc).toHaveBeenCalledWith(wpDoc);
    expect(storage.saveDoc).toHaveBeenCalledWith(wpDoc);
    expect(useWpSyncStore.getState().config.links.sy1).toMatchObject({
      knownVersion: 4, stage: 'genehmigt', syncedLastSaved: '2026-11-11T08:00:00Z',
    });
  });

  it('does not silently replace local unsent changes when WP is newer, raises a conflict instead', async () => {
    const local = mkDoc('2026-11-10T10:05:00Z');
    usePlannerStore.setState({ doc: local });
    useWpSyncStore.setState({ config: linkWith('2026-11-10T10:00:00Z') });
    const wpDoc = mkDoc('2026-11-11T08:00:00Z', 'Server');
    mockFetchDoc.mockResolvedValueOnce({ exists: true, doc: wpDoc, version: 4, stage: 'entwurf' });
    const setDoc = vi.fn();
    const result = await useWpSyncStore.getState().pull('sy1', setDoc);
    expect(result).toBe('conflict');
    expect(setDoc).not.toHaveBeenCalled();
    expect(storage.saveDoc).not.toHaveBeenCalled();
    expect(usePlannerStore.getState().doc).toBe(local);
    const s = useWpSyncStore.getState();
    expect(s.syncState).toBe('conflict');
    expect(s.conflict).toMatchObject({ docId: 'sy1', serverVersion: 4, serverDoc: wpDoc });
    expect(s.config.links.sy1.knownVersion).toBe(3);
  });

  it('treats a link without sync baseline as having unsent changes', async () => {
    usePlannerStore.setState({ doc: mkDoc('2026-11-10T10:00:00Z') });
    useWpSyncStore.setState({ config: linkWith() });
    mockFetchDoc.mockResolvedValueOnce({ exists: true, doc: mkDoc('2026-11-11T08:00:00Z', 'Server'), version: 4, stage: 'entwurf' });
    const setDoc = vi.fn();
    expect(await useWpSyncStore.getState().pull('sy1', setDoc)).toBe('conflict');
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('discards the pull result when the local plan changed while the request was running', async () => {
    usePlannerStore.setState({ doc: mkDoc('2026-11-10T10:00:00Z') });
    useWpSyncStore.setState({ config: linkWith('2026-11-10T10:00:00Z') });
    const edited = mkDoc('2026-11-10T10:00:00Z', 'Waehrenddessen bearbeitet');
    mockFetchDoc.mockImplementationOnce(async () => {
      usePlannerStore.setState({ doc: edited });
      return { exists: true, doc: mkDoc('2026-11-11T08:00:00Z', 'Server'), version: 4, stage: 'entwurf' };
    });
    const setDoc = vi.fn();
    const result = await useWpSyncStore.getState().pull('sy1', setDoc);
    expect(result).toBe('discarded');
    expect(setDoc).not.toHaveBeenCalled();
    expect(usePlannerStore.getState().doc).toBe(edited);
    expect(useWpSyncStore.getState().config.links.sy1.knownVersion).toBe(3);
  });
});

describe('send() records the sync baseline', () => {
  it('stores meta.lastSaved of the pushed doc as syncedLastSaved', async () => {
    mockPushDoc.mockResolvedValueOnce({ status: 'ok', version: 4 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await useWpSyncStore.getState().send({ schoolyear: { id: 'sy1' }, meta: { name: 'T', lastSaved: '2026-11-10T10:00:00Z' } } as any);
    expect(useWpSyncStore.getState().config.links.sy1).toMatchObject({ knownVersion: 4, syncedLastSaved: '2026-11-10T10:00:00Z' });
  });
});

describe('acceptServer() — "Server-Stand laden" (TS-03)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serverDoc = { schoolyear: { id: 'sy1' }, events: [], meta: { name: 'T', lastSaved: '2026-11-11T08:00:00Z' } } as any;

  it('sets knownVersion, saves locally, and the next push uses the server version (no repeated 409)', async () => {
    vi.mocked(storage.saveDoc).mockClear();
    useWpSyncStore.setState({ syncState: 'conflict', conflict: { docId: 'sy1', serverVersion: 5, serverDoc } });
    const setDoc = vi.fn();
    await useWpSyncStore.getState().acceptServer(setDoc);
    const s = useWpSyncStore.getState();
    expect(setDoc).toHaveBeenCalledWith(serverDoc);
    expect(storage.saveDoc).toHaveBeenCalledWith(serverDoc);
    expect(s.conflict).toBeNull();
    expect(s.config.links.sy1).toMatchObject({ knownVersion: 5, syncedLastSaved: '2026-11-11T08:00:00Z' });

    mockPushDoc.mockClear();
    mockPushDoc.mockResolvedValueOnce({ status: 'ok', version: 6 });
    expect(await useWpSyncStore.getState().send(serverDoc)).toBe('synced');
    expect(mockPushDoc.mock.calls[0][3]).toBe(5);
  });
});
