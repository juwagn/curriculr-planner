import type { PlannerDocument } from '@/types';
import type { WpStage } from './wp-stage';
import type { WpSyncConfig } from './wp-sync-config';

export type FetchLike = typeof fetch;

export interface PushResult {
  status: 'ok' | 'conflict' | 'error';
  version?: number;
  stage?: WpStage;
  feedUrl?: string;
  serverDoc?: PlannerDocument;
  serverVersion?: number;
  message?: string;
}

const NOT_REACHABLE = 'WordPress nicht erreichbar — Internet/Adresse prüfen.';
const BAD_AUTH = 'Benutzer oder Application Password falsch.';

function authHeader(cfg: WpSyncConfig): string {
  return 'Basic ' + btoa(`${cfg.username}:${cfg.appPassword}`);
}
function base(cfg: WpSyncConfig): string {
  return cfg.baseUrl.replace(/\/+$/, '') + '/wp-json/curriculr/v1';
}

export async function testConnection(cfg: WpSyncConfig, fetchImpl: FetchLike = fetch): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetchImpl(`${base(cfg)}/health`, { headers: { Authorization: authHeader(cfg) } });
    if (res.status === 401) return { ok: false, message: BAD_AUTH };
    if (!res.ok) return { ok: false, message: `Server antwortete mit ${res.status}.` };
    const data = await res.json();
    return { ok: true, message: `Verbunden (Plugin ${data.plugin ?? '?'}).` };
  } catch {
    return { ok: false, message: NOT_REACHABLE };
  }
}

export async function pushDoc(
  cfg: WpSyncConfig, schoolyearKey: string, doc: PlannerDocument, baseVersion: number, stage: WpStage,
  fetchImpl: FetchLike = fetch,
): Promise<PushResult> {
  try {
    const res = await fetchImpl(`${base(cfg)}/doc/${encodeURIComponent(schoolyearKey)}`, {
      method: 'PUT',
      headers: { Authorization: authHeader(cfg), 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc, baseVersion, stage }),
    });
    if (res.status === 409) {
      const data = await res.json();
      return { status: 'conflict', serverVersion: data.serverVersion, serverDoc: data.doc };
    }
    if (res.status === 401) return { status: 'error', message: BAD_AUTH };
    if (!res.ok) return { status: 'error', message: `Server antwortete mit ${res.status}.` };
    const data = await res.json();
    return { status: 'ok', version: data.version, stage: data.stage, feedUrl: data.feedUrl };
  } catch {
    return { status: 'error', message: NOT_REACHABLE };
  }
}

export async function fetchDoc(
  cfg: WpSyncConfig, schoolyearKey: string, fetchImpl: FetchLike = fetch,
): Promise<{ exists: boolean; version?: number; doc?: PlannerDocument; stage?: WpStage; message?: string }> {
  try {
    const res = await fetchImpl(`${base(cfg)}/doc/${encodeURIComponent(schoolyearKey)}`, { headers: { Authorization: authHeader(cfg) } });
    if (res.status === 404) return { exists: false };
    if (!res.ok) return { exists: false, message: `Server antwortete mit ${res.status}.` };
    const data = await res.json();
    return { exists: true, version: data.version, doc: data.doc, stage: data.stage };
  } catch {
    return { exists: false, message: NOT_REACHABLE };
  }
}
