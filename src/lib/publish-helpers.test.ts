import { describe, it, expect } from 'vitest';
import { missingGroupCalendars } from './publish-helpers';
import type { WpCalendarGroup } from './wp-sync-config';

const cal = (group: string | null): WpCalendarGroup => ({ group, label: group ?? 'Alle', feedUrl: null });

describe('missingGroupCalendars', () => {
  it('returns groups without a provisioned calendar', () => {
    expect(missingGroupCalendars(['Eltern', 'Kollegium'], [cal(null), cal('Kollegium')])).toEqual(['Eltern']);
  });
  it('ignores the main calendar (group null)', () => {
    expect(missingGroupCalendars(['Eltern'], [cal(null)])).toEqual(['Eltern']);
  });
  it('returns empty when everything is provisioned', () => {
    expect(missingGroupCalendars(['Eltern'], [cal(null), cal('Eltern')])).toEqual([]);
  });
  it('returns empty for no groups', () => {
    expect(missingGroupCalendars([], [])).toEqual([]);
  });
});
