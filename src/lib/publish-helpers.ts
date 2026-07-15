import type { WpCalendarGroup } from './wp-sync-config';

/** Planner groups that have no provisioned WP group calendar yet. */
export function missingGroupCalendars(
  availableGroups: string[],
  provisioned: WpCalendarGroup[],
): string[] {
  const have = new Set(
    provisioned.map((c) => c.group).filter((g): g is string => typeof g === 'string' && g !== ''),
  );
  return availableGroups.filter((g) => !have.has(g));
}
