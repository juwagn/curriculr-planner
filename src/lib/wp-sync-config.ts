import type { UUID } from '@/types';
import type { WpStage } from './wp-stage';

const KEY = 'curriculr-planner:wp-sync';

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

export function loadWpConfig(): WpSyncConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY_CONFIG);
    const p = JSON.parse(raw);
    return {
      enabled: !!p.enabled,
      baseUrl: typeof p.baseUrl === 'string' ? p.baseUrl : '',
      username: typeof p.username === 'string' ? p.username : '',
      appPassword: typeof p.appPassword === 'string' ? p.appPassword : '',
      links: p.links && typeof p.links === 'object' ? p.links : {},
    };
  } catch {
    return structuredClone(EMPTY_CONFIG);
  }
}

export function saveWpConfig(cfg: WpSyncConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}
