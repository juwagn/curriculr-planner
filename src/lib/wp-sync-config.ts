import type { UUID } from '@/types';
import type { WpStage } from './wp-stage';

const KEY = 'curriculr-planner:wp-sync';

const VALID_STAGES = new Set<string>(['entwurf', 'genehmigt', 'oeffentlich']);

/** Calendar returned by REST provisioning. */
export interface WpCalendarGroup {
  group: string | null;
  label: string;
  feedUrl: string | null;
}

/**
 * @deprecated Use WpCalendarGroup instead.
 * Kept for backward-compat until WordpressTab is updated in Task 6.
 */
export interface CalendarMapping {
  group: string | null;
  profileId: string;
}

export interface WpPlanLink {
  schoolyearKey: string;
  schoolyearLabel: string;
  stage: WpStage;
  knownVersion: number;
  feedUrl?: string;
  /** Selected group names to provision as separate calendars. */
  calendarGroups?: string[];
  /** Last-provisioned calendars with feed URLs (set after successful send). */
  provisionedCalendars?: WpCalendarGroup[];
  /** ISO 8601 timestamp of the last successful push to WordPress. */
  lastPushedAt?: string;
  /**
   * @deprecated Remove after WordpressTab is updated in Task 6.
   */
  wpProfileId?: string;
  /**
   * @deprecated Remove after WordpressTab is updated in Task 6.
   */
  calendarMappings?: CalendarMapping[];
}

export interface WpSyncConfig {
  enabled: boolean;
  baseUrl: string;
  links: Record<UUID, WpPlanLink>;
}

export const EMPTY_CONFIG: WpSyncConfig = {
  enabled: false, baseUrl: '', links: {},
};

/**
 * Deterministic WP schoolyear key from the schoolyear label, e.g.
 * '2026/27' → 'sj_2026_27'. Every browser derives the same key for the same
 * schoolyear, so colleagues read/write the same wp_curriculr_docs row.
 * Must stay within the REST route charset [a-z0-9_-] (see curriculr-data-layer.php).
 */
export function sjKeyFromLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug ? `sj_${slug}` : '';
}

function parseCalendarGroups(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const groups = raw
    .filter((g): g is string => typeof g === 'string' && g.length > 0);
  return groups.length > 0 ? groups : undefined;
}

function parseProvisionedCalendars(raw: unknown): WpCalendarGroup[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const cals = raw
    .filter((c): c is Record<string, unknown> => c !== null && typeof c === 'object')
    .map((c): WpCalendarGroup | null => {
      const label = typeof c.label === 'string' ? c.label : '';
      if (!label) return null;
      const group = typeof c.group === 'string' ? c.group : null;
      const feedUrl = typeof c.feedUrl === 'string' ? c.feedUrl : null;
      return { group, label, feedUrl };
    })
    .filter((c): c is WpCalendarGroup => c !== null);
  return cals.length > 0 ? cals : undefined;
}

function parseCalendarMappings(raw: unknown): CalendarMapping[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const parsed = raw
    .filter((m): m is Record<string, unknown> => m !== null && typeof m === 'object')
    .map((m): CalendarMapping | null => {
      const pid = typeof m.profileId === 'string' ? m.profileId : '';
      if (!pid) return null;
      const group = typeof m.group === 'string' ? m.group : null;
      return { profileId: pid, group };
    })
    .filter((m): m is CalendarMapping => m !== null);
  return parsed.length > 0 ? parsed : undefined;
}

function parseLink(v: unknown): WpPlanLink | null {
  if (!v || typeof v !== 'object') return null;
  const l = v as Record<string, unknown>;
  const stage = typeof l.stage === 'string' && VALID_STAGES.has(l.stage) ? (l.stage as WpStage) : 'entwurf';
  const feedUrl = typeof l.feedUrl === 'string' && /^https:\/\//i.test(l.feedUrl) ? l.feedUrl : undefined;
  const calendarGroups = parseCalendarGroups(l.calendarGroups);
  const provisionedCalendars = parseProvisionedCalendars(l.provisionedCalendars);
  const calendarMappings = parseCalendarMappings(l.calendarMappings);
  const wpProfileId = typeof l.wpProfileId === 'string' ? l.wpProfileId : undefined;
  const lastPushedAt = typeof l.lastPushedAt === 'string' ? l.lastPushedAt : undefined;
  return {
    schoolyearKey:   typeof l.schoolyearKey   === 'string' ? l.schoolyearKey   : '',
    schoolyearLabel: typeof l.schoolyearLabel  === 'string' ? l.schoolyearLabel  : '',
    stage,
    knownVersion: typeof l.knownVersion === 'number' ? l.knownVersion : 0,
    ...(feedUrl              ? { feedUrl }              : {}),
    ...(calendarGroups       ? { calendarGroups }       : {}),
    ...(provisionedCalendars ? { provisionedCalendars } : {}),
    ...(lastPushedAt         ? { lastPushedAt }         : {}),
    ...(calendarMappings     ? { calendarMappings }     : {}),
    ...(wpProfileId          ? { wpProfileId }          : {}),
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
    return { enabled: !!p.enabled, baseUrl: typeof p.baseUrl === 'string' ? p.baseUrl : '', links };
  } catch {
    return structuredClone(EMPTY_CONFIG);
  }
}

export function saveWpConfig(cfg: WpSyncConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}
