import { describe, it, expect } from 'vitest';
import { buildPrintModel } from './print-model';
import type { PlannerDocument } from '@/types';

// Minimal fixture document covering two school weeks + one holiday week
const DOC: PlannerDocument = {
  version: 5,
  schoolyear: {
    id: 'sy1',
    label: '2025/26',
    firstSchoolDay: '2025-09-01',
    firstTeachingDay: '2025-09-01',
    lastSchoolDay: '2026-07-31',
    holidays: [
      { id: 'h1', label: 'Herbstferien', start: '2025-10-06', end: '2025-10-17', type: 'ferien' }
    ],
    quarterBoundaries: ['2025-10-31', '2025-12-31', '2026-03-31'],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  categories: [
    { id: 'cat1', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: [] },
    { id: 'cat2', label: 'Elternabend', color: '#2F9E8F', slug: 'elternabend', keywords: [] }
  ],
  events: [
    // Event on Monday 2025-09-01 (SW 00, day 0)
    { id: 'e1', title: 'Einschulung', start: '2025-09-01', end: '2025-09-01', allDay: true, categoryId: 'cat1', groups: [] },
    // Event on Thursday 2025-09-04 (SW 00, day 3)
    { id: 'e2', title: 'Elternabend', start: '2025-09-04', end: '2025-09-04', allDay: false, startTime: '19:00', endTime: '21:00', categoryId: 'cat2', groups: [] },
    // Multi-day event spanning SW 00 Mon–Wed
    { id: 'e3', title: 'Projekttage', start: '2025-09-01', end: '2025-09-03', allDay: true, categoryId: 'cat1', groups: [] }
  ],
  annotations: [
    { schoolweek: 0, text: 'Begrüßungswoche', updatedAt: '2025-01-01T00:00:00Z' }
  ],
  availableGroups: [],
  ignoredConflicts: [],
  templates: [],
  meta: { name: 'Testplan', lastSaved: '2025-01-01T00:00:00Z', schoolName: 'Testschule' }
};

describe('buildPrintModel', () => {
  it('currentQuarter scope: returns exactly 1 section', () => {
    const model = buildPrintModel(DOC, 'currentQuarter', 1);
    expect(model.sections.length).toBe(1);
    expect(model.sections[0].quarterIndex).toBe(1);
  });

  it('allQuarters scope: returns 4 sections', () => {
    const model = buildPrintModel(DOC, 'allQuarters', 1);
    expect(model.sections.length).toBe(4);
  });

  it('first section contains week rows and holiday rows', () => {
    const model = buildPrintModel(DOC, 'currentQuarter', 1);
    const rowKinds = model.sections[0].rows.map((r) => r.type);
    expect(rowKinds).toContain('week');
    expect(rowKinds).toContain('holiday');
  });

  it('event on Monday lands in cells[0]', () => {
    const model = buildPrintModel(DOC, 'currentQuarter', 1);
    const sw0 = model.sections[0].rows.find(
      (r) => r.type === 'week' && r.swIndex === '00'
    ) as import('./print-model').PrintWeekRow;
    expect(sw0).toBeDefined();
    expect(sw0.cells[0].events.some((e) => e.title === 'Einschulung')).toBe(true);
  });

  it('event on Thursday (day 3) lands in cells[3]', () => {
    const model = buildPrintModel(DOC, 'currentQuarter', 1);
    const sw0 = model.sections[0].rows.find(
      (r) => r.type === 'week' && r.swIndex === '00'
    ) as import('./print-model').PrintWeekRow;
    expect(sw0.cells[3].events.some((e) => e.title === 'Elternabend')).toBe(true);
  });

  it('multi-day event (Mon–Wed) appears in cells 0, 1 and 2', () => {
    const model = buildPrintModel(DOC, 'currentQuarter', 1);
    const sw0 = model.sections[0].rows.find(
      (r) => r.type === 'week' && r.swIndex === '00'
    ) as import('./print-model').PrintWeekRow;
    expect(sw0.cells[0].events.some((e) => e.title === 'Projekttage')).toBe(true);
    expect(sw0.cells[1].events.some((e) => e.title === 'Projekttage')).toBe(true);
    expect(sw0.cells[2].events.some((e) => e.title === 'Projekttage')).toBe(true);
    // Must NOT appear on Thursday/Friday
    expect(sw0.cells[3].events.some((e) => e.title === 'Projekttage')).toBe(false);
  });

  it('annotation is attached to the correct week row', () => {
    const model = buildPrintModel(DOC, 'currentQuarter', 1);
    const sw0 = model.sections[0].rows.find(
      (r) => r.type === 'week' && r.swIndex === '00'
    ) as import('./print-model').PrintWeekRow;
    expect(sw0.annotation).toBe('Begrüßungswoche');
  });

  it('uses schoolName from meta', () => {
    const model = buildPrintModel(DOC, 'currentQuarter', 1);
    expect(model.schoolName).toBe('Testschule');
  });

  it('falls back to meta.name when schoolName absent', () => {
    const doc = { ...DOC, meta: { ...DOC.meta, schoolName: undefined } };
    const model = buildPrintModel(doc, 'currentQuarter', 1);
    expect(model.schoolName).toBe('Testplan');
  });

  it('timed event carries time in the event chip', () => {
    const model = buildPrintModel(DOC, 'currentQuarter', 1);
    const sw0 = model.sections[0].rows.find(
      (r) => r.type === 'week' && r.swIndex === '00'
    ) as import('./print-model').PrintWeekRow;
    const elternabend = sw0.cells[3].events.find((e) => e.title === 'Elternabend');
    expect(elternabend?.time).toBe('19:00');
  });

  it('assigns a boundary week to exactly one quarter (no overlap)', () => {
    const d = structuredClone(DOC);
    d.schoolyear.quarterBoundaries = ['2025-11-26', '2025-12-31', '2026-03-31']; // Mi 26.11 → snaps to Fr 28.11
    const model = buildPrintModel(d, 'allQuarters', 1);
    const weekDates = model.sections.flatMap((s) =>
      s.rows.filter((r) => r.type === 'week').map((r) => (r as { dateRange: string }).dateRange)
    );
    const dupes = weekDates.filter((v, i) => weekDates.indexOf(v) !== i);
    expect(dupes).toEqual([]);
  });
});

describe('PrintCell ferien flag', () => {
  it('flags individual ferien days in a half-holiday school week', () => {
    const d = structuredClone(DOC);
    d.schoolyear.holidays = [
      { id: 'x', label: 'Weihnachten', start: '2025-12-24', end: '2026-01-06', type: 'ferien' }
    ];
    // Week 2025-12-22 (Mon=22, Tue=23 school; Wed=24 start of Ferien)
    const model = buildPrintModel(d, 'allQuarters', 1);
    const allRows = model.sections.flatMap((s) => s.rows);
    const wk = allRows.find(
      (r) => r.type === 'week' && (r as { dateRange: string }).dateRange === '22.12.–26.12.'
    ) as { type: 'week'; cells: { ferien?: boolean }[] } | undefined;
    expect(wk).toBeDefined();
    expect(wk!.cells[0].ferien ?? false).toBe(false); // Mon 22.12 = school
    expect(wk!.cells[1].ferien ?? false).toBe(false); // Tue 23.12 = school
    expect(wk!.cells[2].ferien).toBe(true);           // Wed 24.12 = Ferien
    expect(wk!.cells[3].ferien).toBe(true);           // Thu 25.12 = Ferien
    expect(wk!.cells[4].ferien).toBe(true);           // Fri 26.12 = Ferien
  });
});
