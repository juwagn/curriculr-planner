import { describe, it, expect } from 'vitest';
import { detectConflicts } from './conflicts';
import type { PlannerDocument, PlanEvent } from '@/types';

function baseDoc(events: PlanEvent[]): PlannerDocument {
  return {
    version: 2,
    schoolyear: {
      id: 's', label: '25/26',
      firstSchoolDay: '2025-08-11', firstTeachingDay: '2025-08-11', lastSchoolDay: '2026-06-26',
      holidays: [{ id: 'h1', label: 'Herbstferien', start: '2025-10-13', end: '2025-10-24' }],
      quarterBoundaries: ['2025-10-31', '2026-01-31', '2026-04-15'],
      createdAt: '', updatedAt: ''
    },
    categories: [
      { id: 'cP', label: 'Prüfung', color: '#E02424', slug: 'pruefung', keywords: [] },
      { id: 'cK', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: [] },
      { id: 'cS', label: 'Sonderveranstaltung', color: '#7C3AED', slug: 'sonder', keywords: [] }
    ],
    events,
    annotations: [], availableGroups: [], ignoredConflicts: [],
    meta: { name: 'T', lastSaved: '' }
  };
}

function ev(over: Partial<PlanEvent>): PlanEvent {
  return {
    id: over.id ?? 'e1', title: 'X', start: '2025-09-01', end: '2025-09-01',
    allDay: true, categoryId: 'cK', groups: [], ...over
  };
}

describe('detectConflicts', () => {
  it('flags an event inside the holidays as ferien', () => {
    const c = detectConflicts(baseDoc([ev({ id: 'e1', start: '2025-10-15', end: '2025-10-15' })]));
    expect(c.some((x) => x.type === 'ferien' && x.eventIds.includes('e1'))).toBe(true);
  });

  it('escalates a Prüfung in the holidays to category-in-ferien (error)', () => {
    const c = detectConflicts(baseDoc([ev({ id: 'e1', categoryId: 'cP', start: '2025-10-15', end: '2025-10-15' })]));
    const hit = c.find((x) => x.type === 'category-in-ferien');
    expect(hit?.severity).toBe('error');
  });

  it('flags out-of-range events as error', () => {
    const c = detectConflicts(baseDoc([ev({ id: 'e1', start: '2026-07-01', end: '2026-07-01' })]));
    const hit = c.find((x) => x.type === 'outside-schoolyear');
    expect(hit?.severity).toBe('error');
  });

  it('does NOT flag an event ending exactly on lastSchoolDay', () => {
    const c = detectConflicts(baseDoc([ev({ id: 'e1', start: '2026-06-26', end: '2026-06-26' })]));
    expect(c.some((x) => x.type === 'outside-schoolyear')).toBe(false);
  });

  it('flags weekend events', () => {
    const c = detectConflicts(baseDoc([ev({ id: 'e1', start: '2025-09-06', end: '2025-09-06' })])); // Sat
    expect(c.some((x) => x.type === 'weekend')).toBe(true);
  });

  it('flags duplicate all-day events on the same date', () => {
    const c = detectConflicts(baseDoc([
      ev({ id: 'e1', start: '2025-09-01', end: '2025-09-01' }),
      ev({ id: 'e2', start: '2025-09-01', end: '2025-09-01' })
    ]));
    const hit = c.find((x) => x.type === 'duplicate-allday');
    expect(hit?.eventIds.sort()).toEqual(['e1', 'e2']);
  });

  it('flags overload day when more than 3 events overlap', () => {
    const evs = ['e1', 'e2', 'e3', 'e4'].map((id) => ev({ id, start: '2025-09-01', end: '2025-09-01' }));
    const c = detectConflicts(baseDoc(evs));
    expect(c.some((x) => x.type === 'overload-day')).toBe(true);
  });

  it('produces stable keys across recompute', () => {
    const d = baseDoc([ev({ id: 'e1', start: '2025-09-06', end: '2025-09-06' })]);
    const a = detectConflicts(d).map((x) => x.key).sort();
    const b = detectConflicts(d).map((x) => x.key).sort();
    expect(a).toEqual(b);
  });
});
