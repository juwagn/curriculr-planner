import { describe, it, expect, vi } from 'vitest';
import { testConnection, pushDoc, fetchDoc, fetchLatestRevision, fetchDocList, postProfileMap } from './wp-sync';
import type { WpSyncConfig } from './wp-sync-config';

const cfg: WpSyncConfig = { enabled: true, baseUrl: 'https://s.example/', links: {} };
const token = 'test.bearer.token';
const fakeRes = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('wp-sync client', () => {
  it('testConnection ok', async () => {
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://s.example/wp-json/curriculr/v1/health');
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test.bearer.token');
      return fakeRes(200, { ok: true, plugin: '4.11.0' });
    }) as unknown as typeof fetch;
    expect(await testConnection(cfg, token, fetchImpl)).toEqual({ ok: true, message: 'Verbunden (Plugin 4.11.0).' });
  });

  it('testConnection 401 -> BAD_TOKEN message', async () => {
    const f = (async () => fakeRes(401, {})) as unknown as typeof fetch;
    const r = await testConnection(cfg, token, f);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('anmelden');
  });

  it('testConnection 403 -> BAD_TOKEN message', async () => {
    const f = (async () => fakeRes(403, {})) as unknown as typeof fetch;
    expect((await testConnection(cfg, token, f)).ok).toBe(false);
  });

  it('testConnection network error', async () => {
    const f = (async () => { throw new Error('net'); }) as unknown as typeof fetch;
    const r = await testConnection(cfg, token, f);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('nicht erreichbar');
  });

  it('pushDoc ok returns version/stage/feedUrl and sends Bearer token', async () => {
    const f = (async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://s.example/wp-json/curriculr/v1/doc/sj_2026_27');
      expect(init?.method).toBe('PUT');
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test.bearer.token');
      expect(JSON.parse(init!.body as string)).toEqual({ doc: { a: 1 }, baseVersion: 2, stage: 'oeffentlich' });
      return fakeRes(200, { status: 'ok', version: 3, stage: 'oeffentlich', feedUrl: 'https://s.example/feed.ics' });
    }) as unknown as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await pushDoc(cfg, 'sj_2026_27', { a: 1 } as any, 2, 'oeffentlich', token, f);
    expect(r).toEqual({ status: 'ok', version: 3, stage: 'oeffentlich', feedUrl: 'https://s.example/feed.ics' });
  });

  it('pushDoc 409 returns conflict with valid server doc', async () => {
    const sy = { id: 'sy1', label: 'Test', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15', holidays: [], quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const serverDoc = { version: 4, schoolyear: sy, categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [], meta: { name: 'Test', lastSaved: '2026-01-01T00:00:00Z' } };
    const f = (async () => fakeRes(409, { error: 'conflict', serverVersion: 5, doc: serverDoc })) as unknown as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await pushDoc(cfg, 'sj', {} as any, 1, 'entwurf', token, f);
    expect(r.status).toBe('conflict');
    if (r.status !== 'conflict') throw new Error('expected conflict');
    expect(r.serverVersion).toBe(5);
    expect(r.serverDoc).toMatchObject({ version: 6 });
  });

  it('pushDoc 409 with invalid server doc returns error', async () => {
    const f = (async () => fakeRes(409, { error: 'conflict', serverVersion: 5, doc: { b: 2 } })) as unknown as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await pushDoc(cfg, 'sj', {} as any, 1, 'entwurf', token, f);
    expect(r.status).toBe('error');
  });

  it('pushDoc 409 includes authorName and savedAt when present', async () => {
    const serverDoc = { version: 3, schoolyear: { id: 'sy1', label: 'T', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15', holidays: [], quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }, categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [], meta: { name: 'T', lastSaved: '2026-01-01T00:00:00Z' } };
    const f = (async () => fakeRes(409, { error: 'conflict', serverVersion: 5, doc: serverDoc, authorName: 'Max Mustermann', savedAt: '2026-01-01 12:00:00' })) as unknown as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await pushDoc(cfg, 'sj', {} as any, 1, 'entwurf', token, f);
    expect(r.status).toBe('conflict');
    if (r.status !== 'conflict') throw new Error('expected conflict');
    expect(r.authorName).toBe('Max Mustermann');
    expect(r.savedAt).toBe('2026-01-01 12:00:00');
  });

  it('pushDoc 409 without author fields returns undefined authorName/savedAt', async () => {
    const serverDoc = { version: 3, schoolyear: { id: 'sy1', label: 'T', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15', holidays: [], quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }, categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [], meta: { name: 'T', lastSaved: '2026-01-01T00:00:00Z' } };
    const f = (async () => fakeRes(409, { error: 'conflict', serverVersion: 5, doc: serverDoc })) as unknown as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await pushDoc(cfg, 'sj', {} as any, 1, 'entwurf', token, f);
    expect(r.status).toBe('conflict');
    if (r.status !== 'conflict') throw new Error('expected conflict');
    expect(r.authorName).toBeUndefined();
    expect(r.savedAt).toBeUndefined();
  });

  it('fetchDoc 404 -> not exists', async () => {
    const f = (async () => fakeRes(404, {})) as unknown as typeof fetch;
    expect(await fetchDoc(cfg, 'sj', token, f)).toEqual({ exists: false });
  });

  it('fetchDoc 200 returns doc and version', async () => {
    const sy = { id: 'sy1', label: 'Test', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15', holidays: [], quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const wpDoc = { version: 6, schoolyear: sy, categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [], meta: { name: 'Test', lastSaved: '2026-01-01T00:00:00Z' } };
    const f = (async () => fakeRes(200, { version: 7, stage: 'oeffentlich', doc: wpDoc })) as unknown as typeof fetch;
    const r = await fetchDoc(cfg, 'sj_2026_27', token, f);
    expect(r.exists).toBe(true);
    expect(r.version).toBe(7);
    expect(r.stage).toBe('oeffentlich');
    expect(r.doc).toMatchObject({ version: 6 });
  });

  it('fetchDoc 401 returns BAD_TOKEN message', async () => {
    const f = (async () => fakeRes(401, {})) as unknown as typeof fetch;
    const r = await fetchDoc(cfg, 'sj', token, f);
    expect(r.exists).toBe(false);
    expect(r.message).toMatch(/ungültig/i);
  });

  it('fetchDoc with invalid server doc returns exists:true, no doc, and a message', async () => {
    const f = (async () => fakeRes(200, { version: 7, stage: 'oeffentlich', doc: { b: 2 } })) as unknown as typeof fetch;
    const r = await fetchDoc(cfg, 'sj_2026_27', token, f);
    expect(r.exists).toBe(true);
    expect(r.doc).toBeUndefined();
    expect(r.message).toBeTruthy();
  });

  it('fetchDoc migrates an older-schema server doc', async () => {
    // version 3 doc with a holiday missing `type` — migrate() backfills it (v3→v4)
    // and bumps the version forward to the current schema (v5).
    const sy = {
      id: 'sy1', label: 'Test', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15',
      holidays: [{ id: 'h1', label: 'Sommerferien', start: '2026-07-01', end: '2026-08-01' }],
      quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    };
    const oldDoc = {
      version: 3, schoolyear: sy, categories: [], events: [], annotations: [], availableGroups: [],
      ignoredConflicts: [], templates: [], meta: { name: 'Test', lastSaved: '2026-01-01T00:00:00Z' },
    };
    const f = (async () => fakeRes(200, { version: 7, stage: 'oeffentlich', doc: oldDoc })) as unknown as typeof fetch;
    const r = await fetchDoc(cfg, 'sj_2026_27', token, f);
    expect(r.exists).toBe(true);
    expect(r.doc?.version).toBe(6);
    expect(r.doc?.schoolyear.holidays[0].type).toBe('ferien');
  });

  describe('fetchLatestRevision', () => {
    it('returns the first entry from a non-empty revisions list', async () => {
      const rows = [
        { id: 3, version: 3, author_name: 'Max Mustermann', author_sub: 'u1', created_at: '2026-06-01 10:30:00' },
        { id: 2, version: 2, author_name: 'Anna Schmidt',   author_sub: 'u2', created_at: '2026-06-01 09:00:00' },
      ];
      const f = (async (url: string, init?: RequestInit) => {
        expect(url).toBe('https://s.example/wp-json/curriculr/v1/doc/sj_2026_27/revisions');
        expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test.bearer.token');
        return fakeRes(200, rows);
      }) as unknown as typeof fetch;
      const r = await fetchLatestRevision(cfg, 'sj_2026_27', token, f);
      expect(r).toEqual({ version: 3, authorName: 'Max Mustermann', authorSub: 'u1', savedAt: '2026-06-01 10:30:00' });
    });

    it('returns null for an empty list', async () => {
      const f = (async () => fakeRes(200, [])) as unknown as typeof fetch;
      expect(await fetchLatestRevision(cfg, 'sj_2026_27', token, f)).toBeNull();
    });

    it("returns 'unauthorized' on 401 so the UI can surface an expired session", async () => {
      const f = (async () => fakeRes(401, {})) as unknown as typeof fetch;
      expect(await fetchLatestRevision(cfg, 'sj_2026_27', token, f)).toBe('unauthorized');
    });

    it("returns 'unauthorized' on 403", async () => {
      const f = (async () => fakeRes(403, {})) as unknown as typeof fetch;
      expect(await fetchLatestRevision(cfg, 'sj_2026_27', token, f)).toBe('unauthorized');
    });

    it('returns null on network error', async () => {
      const f = (async () => { throw new Error('net'); }) as unknown as typeof fetch;
      expect(await fetchLatestRevision(cfg, 'sj_2026_27', token, f)).toBeNull();
    });
  });
});

describe('fetchDocList', () => {
  const cfg = { enabled: true, baseUrl: 'https://schule.example', links: {} };

  it('parses a valid list response', async () => {
    const body = [
      { sj: 'sj_2026_27', name: 'Schuljahr 2026/27', stage: 'genehmigt', version: 12, updatedAt: '2026-06-12 09:00:00', authorName: 'M. Weber' },
      { sj: 'sj_2025_26', name: 'Schuljahr 2025/26', stage: 'oeffentlich', version: 40, updatedAt: '2026-06-03 10:00:00', authorName: 'A. Klein' },
    ];
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
    const res = await fetchDocList(cfg, 'tok', fetchImpl as unknown as typeof fetch);
    expect(res.items).toHaveLength(2);
    expect(res.items[0]).toMatchObject({ sj: 'sj_2026_27', name: 'Schuljahr 2026/27', stage: 'genehmigt', version: 12 });
    expect(res.message).toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://schule.example/wp-json/curriculr/v1/docs',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('returns BAD_TOKEN message on 401', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const res = await fetchDocList(cfg, 'tok', fetchImpl as unknown as typeof fetch);
    expect(res.items).toEqual([]);
    expect(res.message).toMatch(/abgelaufen/);
  });

  it('drops malformed items and keeps valid ones', async () => {
    const body = [
      { sj: 'ok', name: 'A', stage: 'entwurf', version: 1, updatedAt: 't', authorName: '' },
      { sj: 123, name: 'B' }, // malformed
    ];
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
    const res = await fetchDocList(cfg, 'tok', fetchImpl as unknown as typeof fetch);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].sj).toBe('ok');
  });

  it('returns NOT_REACHABLE message on network error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('boom'));
    const res = await fetchDocList(cfg, 'tok', fetchImpl as unknown as typeof fetch);
    expect(res.items).toEqual([]);
    expect(res.message).toMatch(/nicht erreichbar/);
  });
});

describe('postProfileMap', () => {
  const pmCfg: WpSyncConfig = { enabled: true, baseUrl: 'https://example.com', links: {} };
  const pmToken = 'tok';

  it('sends new-form body and returns ok + calendars', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        updated: true,
        calendars: [
          { group: null,          label: 'Alle Termine',  feedUrl: 'https://example.com/wp-json/curriculr/v1/feed/sj_2026_27/abc.ics' },
          { group: 'Schulleitung', label: 'Schulleitung', feedUrl: 'https://example.com/wp-json/curriculr/v1/feed/sj_2026_27/abc/schulleitung.ics' },
        ],
      }),
    });

    const result = await postProfileMap(pmCfg, pmToken, 'sj_2026_27', '2026/27', ['Schulleitung'], fakeFetch);

    expect(result.status).toBe('ok');
    expect(result.calendars).toHaveLength(2);
    expect(result.calendars![0].group).toBeNull();
    expect(result.calendars![1].group).toBe('Schulleitung');

    const body = JSON.parse(fakeFetch.mock.calls[0][1].body as string);
    expect(body).toEqual({ sj: 'sj_2026_27', label: '2026/27', groups: ['Schulleitung'] });
    expect(body).not.toHaveProperty('mappings'); // new form, not old form
  });

  it('returns error on non-ok response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await postProfileMap(pmCfg, pmToken, 'sj', '26/27', [], fakeFetch);
    expect(result.status).toBe('error');
  });

  it('returns error on network failure', async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await postProfileMap(pmCfg, pmToken, 'sj', '26/27', [], fakeFetch);
    expect(result.status).toBe('error');
  });
});
