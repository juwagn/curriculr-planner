import { describe, it, expect } from 'vitest';
import { testConnection, pushDoc, fetchDoc } from './wp-sync';
import type { WpSyncConfig } from './wp-sync-config';

const cfg: WpSyncConfig = { enabled: true, baseUrl: 'https://s.example/', username: 'admin', appPassword: 'pw', links: {} };
const fakeRes = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('wp-sync client', () => {
  it('testConnection ok', async () => {
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://s.example/wp-json/curriculr/v1/health');
      expect((init?.headers as Record<string,string>).Authorization).toBe('Basic ' + btoa('admin:pw'));
      return fakeRes(200, { ok: true, plugin: '4.6.0' });
    }) as unknown as typeof fetch;
    expect(await testConnection(cfg, fetchImpl)).toEqual({ ok: true, message: 'Verbunden (Plugin 4.6.0).' });
  });
  it('testConnection 401', async () => {
    const f = (async () => fakeRes(401, {})) as unknown as typeof fetch;
    expect((await testConnection(cfg, f)).ok).toBe(false);
  });
  it('testConnection network error', async () => {
    const f = (async () => { throw new Error('net'); }) as unknown as typeof fetch;
    const r = await testConnection(cfg, f);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('nicht erreichbar');
  });
  it('pushDoc ok returns version/stage/feedUrl and sends stage', async () => {
    const f = (async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://s.example/wp-json/curriculr/v1/doc/sj_2026_27');
      expect(init?.method).toBe('PUT');
      expect(JSON.parse(init!.body as string)).toEqual({ doc: { a: 1 }, baseVersion: 2, stage: 'oeffentlich' });
      return fakeRes(200, { status: 'ok', version: 3, stage: 'oeffentlich', feedUrl: 'https://s.example/feed.ics' });
    }) as unknown as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await pushDoc(cfg, 'sj_2026_27', { a: 1 } as any, 2, 'oeffentlich', f);
    expect(r).toEqual({ status: 'ok', version: 3, stage: 'oeffentlich', feedUrl: 'https://s.example/feed.ics' });
  });
  it('pushDoc 409 returns conflict with valid server doc', async () => {
    const sy = { id: 'sy1', label: 'Test', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15', holidays: [], quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const serverDoc = { version: 4, schoolyear: sy, categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [], meta: { name: 'Test', lastSaved: '2026-01-01T00:00:00Z' } };
    const f = (async () => fakeRes(409, { error: 'conflict', serverVersion: 5, doc: serverDoc })) as unknown as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await pushDoc(cfg, 'sj', {} as any, 1, 'entwurf', f);
    expect(r.status).toBe('conflict');
    expect(r.serverVersion).toBe(5);
    expect(r.serverDoc).toMatchObject({ version: 4 });
  });
  it('pushDoc 409 with invalid server doc returns error', async () => {
    const f = (async () => fakeRes(409, { error: 'conflict', serverVersion: 5, doc: { b: 2 } })) as unknown as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await pushDoc(cfg, 'sj', {} as any, 1, 'entwurf', f);
    expect(r.status).toBe('error');
  });
  it('fetchDoc 404 -> not exists', async () => {
    const f = (async () => fakeRes(404, {})) as unknown as typeof fetch;
    expect(await fetchDoc(cfg, 'sj', f)).toEqual({ exists: false });
  });
});
