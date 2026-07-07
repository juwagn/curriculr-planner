import { PlannerDocumentSchema, migrate } from '@/lib/schemas';
import type { PlannerDocument } from '@/types';
import type { WpStage } from './wp-stage';
import type { WpSyncConfig, WpCalendarGroup } from './wp-sync-config';

export type FetchLike = typeof fetch;

export type PushResult =
  | { status: 'ok'; version?: number; stage?: WpStage; feedUrl?: string }
  | { status: 'conflict'; serverVersion: number; serverDoc: PlannerDocument; authorName?: string; savedAt?: string }
  | { status: 'error'; message?: string };

const NOT_REACHABLE = 'WordPress nicht erreichbar — Internet/Adresse prüfen.';
const BAD_TOKEN     = 'App-Token ungültig oder abgelaufen — bitte neu anmelden.';
const BAD_URL       = 'WordPress-Adresse muss mit https:// beginnen.';

function bearerHeader(token: string): string {
  return 'Bearer ' + token;
}

function base(cfg: WpSyncConfig): string {
  const url = cfg.baseUrl.replace(/\/+$/, '');
  if (!/^https:\/\/.+/i.test(url)) throw new Error(BAD_URL);
  return url + '/wp-json/curriculr/v1';
}

function safeFeedUrl(url: unknown): string | undefined {
  return typeof url === 'string' && /^https:\/\//i.test(url) ? url : undefined;
}

export async function testConnection(
  cfg: WpSyncConfig,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetchImpl(`${base(cfg)}/health`, {
      headers: { Authorization: bearerHeader(token) },
    });
    if (res.status === 401 || res.status === 403) return { ok: false, message: BAD_TOKEN };
    if (!res.ok) return { ok: false, message: `Server antwortete mit ${res.status}.` };
    const data = await res.json();
    return { ok: true, message: `Verbunden (Plugin ${data.plugin ?? '?'}).` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : NOT_REACHABLE;
    return { ok: false, message: msg === BAD_URL ? msg : NOT_REACHABLE };
  }
}

export async function pushDoc(
  cfg: WpSyncConfig,
  schoolyearKey: string,
  doc: PlannerDocument,
  baseVersion: number,
  stage: WpStage,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<PushResult> {
  try {
    const res = await fetchImpl(`${base(cfg)}/doc/${encodeURIComponent(schoolyearKey)}`, {
      method: 'PUT',
      headers: { Authorization: bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc, baseVersion, stage }),
    });
    if (res.status === 409) {
      const data = await res.json();
      const parsed = PlannerDocumentSchema.safeParse(migrate(data.doc));
      if (!parsed.success) {
        return {
          status: 'error',
          message: 'Der auf WordPress gespeicherte Plan ist beschädigt. Bitte erneut senden oder Administrator kontaktieren.',
        };
      }
      return {
        status: 'conflict',
        serverVersion: data.serverVersion,
        serverDoc: parsed.data,
        authorName: typeof data.authorName === 'string' && data.authorName ? data.authorName : undefined,
        savedAt: typeof data.savedAt === 'string' && data.savedAt ? data.savedAt : undefined,
      };
    }
    if (res.status === 401 || res.status === 403) return { status: 'error', message: BAD_TOKEN };
    if (!res.ok) return { status: 'error', message: `Server antwortete mit ${res.status}.` };
    const data = await res.json();
    return { status: 'ok', version: data.version, stage: data.stage, feedUrl: safeFeedUrl(data.feedUrl) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : NOT_REACHABLE;
    return { status: 'error', message: msg === BAD_URL ? msg : NOT_REACHABLE };
  }
}

export interface LatestRevision {
  version: number;
  authorName: string;
  authorSub: string;
  savedAt: string;
}

export async function fetchDoc(
  cfg: WpSyncConfig,
  schoolyearKey: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ exists: boolean; version?: number; doc?: PlannerDocument; stage?: WpStage; message?: string }> {
  try {
    const res = await fetchImpl(`${base(cfg)}/doc/${encodeURIComponent(schoolyearKey)}`, {
      headers: { Authorization: bearerHeader(token) },
    });
    if (res.status === 404) return { exists: false };
    if (res.status === 401 || res.status === 403) return { exists: false, message: BAD_TOKEN };
    if (!res.ok) return { exists: false, message: `Server antwortete mit ${res.status}.` };
    const data = await res.json();
    const parsed = PlannerDocumentSchema.safeParse(migrate(data.doc));
    if (!parsed.success) {
      return {
        exists: true,
        message: 'Der auf WordPress gespeicherte Plan ist beschädigt.',
      };
    }
    return { exists: true, version: data.version, doc: parsed.data, stage: data.stage };
  } catch (err) {
    const msg = err instanceof Error ? err.message : NOT_REACHABLE;
    return { exists: false, message: msg === BAD_URL ? msg : NOT_REACHABLE };
  }
}

const STAGES = new Set<WpStage>(['entwurf', 'genehmigt', 'oeffentlich']);

export interface DocListItem {
  sj: string;
  name: string;
  stage: WpStage;
  version: number;
  updatedAt: string;
  authorName: string;
}

function parseDocListItem(v: unknown): DocListItem | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.sj !== 'string' || typeof o.name !== 'string') return null;
  const stage = typeof o.stage === 'string' && STAGES.has(o.stage as WpStage)
    ? (o.stage as WpStage) : 'entwurf';
  return {
    sj: o.sj,
    name: o.name,
    stage,
    version: typeof o.version === 'number' ? o.version : 0,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : '',
    authorName: typeof o.authorName === 'string' ? o.authorName : '',
  };
}

export async function fetchDocList(
  cfg: WpSyncConfig,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ items: DocListItem[]; message?: string }> {
  try {
    const res = await fetchImpl(`${base(cfg)}/docs`, {
      headers: { Authorization: bearerHeader(token) },
    });
    if (res.status === 401 || res.status === 403) return { items: [], message: BAD_TOKEN };
    if (!res.ok) return { items: [], message: `Server antwortete mit ${res.status}.` };
    const data = await res.json();
    if (!Array.isArray(data)) return { items: [], message: 'Ungültige Antwort vom Server.' };
    const items = data.map(parseDocListItem).filter((x): x is DocListItem => x !== null);
    return { items };
  } catch (err) {
    const msg = err instanceof Error ? err.message : NOT_REACHABLE;
    return { items: [], message: msg === BAD_URL ? msg : NOT_REACHABLE };
  }
}

export async function fetchLatestRevision(
  cfg: WpSyncConfig,
  schoolyearKey: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<LatestRevision | null> {
  try {
    const res = await fetchImpl(
      `${base(cfg)}/doc/${encodeURIComponent(schoolyearKey)}/revisions`,
      { headers: { Authorization: bearerHeader(token) } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const r = data[0];
    return {
      version:    typeof r.version     === 'number' ? r.version     : 0,
      authorName: typeof r.author_name === 'string' ? r.author_name : '',
      authorSub:  typeof r.author_sub  === 'string' ? r.author_sub  : '',
      savedAt:    typeof r.created_at  === 'string' ? r.created_at  : '',
    };
  } catch {
    return null;
  }
}

export async function postProfileMap(
  cfg: WpSyncConfig,
  token: string,
  sj: string,
  label: string,
  groups: string[],
  fetchImpl: FetchLike = fetch,
): Promise<{ status: 'ok' | 'error'; calendars?: WpCalendarGroup[] }> {
  try {
    const res = await fetchImpl(`${base(cfg)}/profile-map`, {
      method: 'POST',
      headers: { Authorization: bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sj, label, groups }),
    });
    if (!res.ok) return { status: 'error' };
    const data = await res.json() as Record<string, unknown>;
    const calendars = Array.isArray(data.calendars)
      ? (data.calendars as WpCalendarGroup[])
      : undefined;
    return { status: 'ok', calendars };
  } catch {
    return { status: 'error' };
  }
}
