import { describe, it, expect } from 'vitest';
import { PlanEventSchema, SchoolyearSchema, PlannerDocumentSchema } from './schemas';

describe('SchoolyearSchema', () => {
  it('accepts valid schoolyear', () => {
    const valid = {
      id: 'a',
      label: '2026/27',
      firstSchoolDay: '2026-08-24',
      firstTeachingDay: '2026-08-31',
      lastSchoolDay: '2027-07-16',
      holidays: [],
      quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-09'],
      createdAt: '2026-05-26T10:00:00Z',
      updatedAt: '2026-05-26T10:00:00Z'
    };
    expect(SchoolyearSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing fields', () => {
    expect(SchoolyearSchema.safeParse({ label: '2026/27' }).success).toBe(false);
  });
});

describe('PlanEventSchema', () => {
  it('accepts all-day event without times', () => {
    const valid = {
      id: 'e1',
      title: 'Wandertag',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: 'cat-wandertag',
      groups: ['Klassen 5-7']
    };
    expect(PlanEventSchema.safeParse(valid).success).toBe(true);
  });

  it('requires times when not all-day', () => {
    const invalid = {
      id: 'e1',
      title: 'FK',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: false,
      categoryId: 'cat-fk',
      groups: []
    };
    expect(PlanEventSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects empty title', () => {
    const invalid = {
      id: 'e1',
      title: '',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: 'cat',
      groups: []
    };
    expect(PlanEventSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('PlannerDocumentSchema', () => {
  it('accepts complete document', () => {
    const doc = {
      version: 1,
      schoolyear: {
        id: 'sy',
        label: '2026/27',
        firstSchoolDay: '2026-08-24',
        firstTeachingDay: '2026-08-31',
        lastSchoolDay: '2027-07-16',
        holidays: [],
        quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-09'],
        createdAt: 'now',
        updatedAt: 'now'
      },
      categories: [{ id: 'c1', label: 'X', color: '#FF0000', slug: 'x', keywords: [] }],
      events: [],
      annotations: [],
      availableGroups: [],
      meta: { name: 'Plan', lastSaved: 'now' }
    };
    expect(PlannerDocumentSchema.safeParse(doc).success).toBe(true);
  });
});
