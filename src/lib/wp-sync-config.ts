import type { UUID } from '@/types';
import type { WpStage } from './wp-stage';

const KEY = 'curriculr-planner:wp-sync';

const VALID_STAGES = new Set<string>(['entwurf', 'genehmigt', 'oeffentlich']);

export interface WpPlanLink {
  schoolyearKey: string;   // WP school-year key, e.g. 'sj_2026_27'
  wpProfileId: string;     // explicit WP profile id (never the live profile by default)
  stage: WpStage;
  knownVersion: number;    // last server version this client has seen (optimistic concurrency)
  feedUrl?: string;        // public ICS feed URL returned by WP on first PUT
}

export interface WpSyncConfig {
  enabled: boolean;
  baseUrl: string;
  username: string;
  appPassword: string;
  links: Record<UUID, WpPlanLink>;  // keyed by PlannerDocument.schoolyear.id
}

export const EMPTY_CONFIG: WpSyncConfig = {
  enabled: false, baseUrl: '', username: '', appPassword: '', links: {},
};

function parseLink(v: unknown): WpPlanLink | null {
  if (!v || typeof v !== 'object') return null;
  const l = v as Record<string, unknown>;
  const stage = typeof l.stage === 'string' && VALID_STAGES.has(l.stage) ? (l.stage as WpStage) : 'entwurf';
  const feedUrl = typeof l.feedUrl === 'string' && /^https:\/\//i.test(l.feedUrl) ? l.feedUrl : undefined;
  return {
    schoolyearKey: typeof l.schoolyearKey === 'string' ? l.schoolyearKey : '',
    wpProfileId:   typeof l.wpProfileId   === 'string' ? l.wpProfileId   : '',
    stage,
    knownVersion:  typeof l.knownVersion  === 'number' ? l.knownVersion  : 0,
    ...(feedUrl ? { feedUrl } : {}),
  };
}

export function loadWpConfig(): WpSyncConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY_CONFIG);
    const p = JSON.parse(raw);
    const rawLinks = p.links && typeof p.links === 'object' ? p.links : {};
    const links: Record<UUID, WpPlanLink> = {};
    for (const [k, v] of Object.entries(rawLinks)) {
      const parsed = parseLink(v);
      if (parsed) links[k as UUID] = parsed;
    }
    return {
      enabled:     !!p.enabled,
      baseUrl:     typeof p.baseUrl     === 'string' ? p.baseUrl     : '',
      username:    typeof p.username    === 'string' ? p.username    : '',
      appPassword: typeof p.appPassword === 'string' ? p.appPassword : '',
      links,
    };
  } catch {
    return structuredClone(EMPTY_CONFIG);
  }
}

export function saveWpConfig(cfg: WpSyncConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}
