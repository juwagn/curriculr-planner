import { describe, it, expect } from 'vitest';
import { buildPrintModel } from './print-model';
import type { PlannerDocument } from '@/types';

// Minimal fixture document covering two school weeks + one holiday week
const DOC: PlannerDocument = {
  version: 4,
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
});
