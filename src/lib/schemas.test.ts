import { describe, it, expect } from 'vitest';
import { PlanEventSchema, SchoolyearSchema, PlannerDocumentSchema, migrate } from './schemas';

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
      version: 2,
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
      ignoredConflicts: [],
      meta: { name: 'Plan', lastSaved: 'now' }
    };
    expect(PlannerDocumentSchema.safeParse(doc).success).toBe(true);
  });
});

describe('migrate v1 -> v2', () => {
  const v1Doc = {
    version: 1,
    schoolyear: {
      id: 'sy1', label: '2025/26',
      firstSchoolDay: '2025-08-11', firstTeachingDay: '2025-08-11', lastSchoolDay: '2026-06-26',
      holidays: [], quarterBoundaries: ['2025-10-31', '2026-01-31', '2026-04-15'],
      createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z'
    },
    categories: [{ id: 'c1', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: [] }],
    events: [],
    annotations: [],
    availableGroups: [],
    meta: { name: 'Test', lastSaved: '2025-01-01T00:00:00.000Z' }
  };

  it('adds ignoredConflicts and bumps version', () => {
    const migrated = migrate(v1Doc);
    expect(migrated.version).toBe(2);
    expect(migrated.ignoredConflicts).toEqual([]);
    expect(PlannerDocumentSchema.safeParse(migrated).success).toBe(true);
  });

  it('leaves an already-v2 doc untouched', () => {
    const v2 = { ...v1Doc, version: 2, ignoredConflicts: ['x'] };
    const migrated = migrate(v2);
    expect(migrated.version).toBe(2);
    expect(migrated.ignoredConflicts).toEqual(['x']);
  });
});
