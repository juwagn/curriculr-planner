import { describe, it, expect } from 'vitest';
import { PlanEventSchema, SchoolyearSchema, PlannerDocumentSchema, migrate, EventTemplateSchema } from './schemas';

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
      version: 5,
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
      templates: [],
      meta: { name: 'Plan', lastSaved: 'now' }
    };
    expect(PlannerDocumentSchema.safeParse(doc).success).toBe(true);
  });
});

describe('migrate v1 -> v2 -> v3', () => {
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

  it('chains v1 all the way to v4 (adds ignoredConflicts + templates)', () => {
    const migrated = migrate(v1Doc);
    expect(migrated.version).toBe(5);
    expect(migrated.ignoredConflicts).toEqual([]);
    expect(migrated.templates).toEqual([]);
  });

  it('migrates a v2 doc to v4', () => {
    const v2 = { ...v1Doc, version: 2, ignoredConflicts: ['x'] };
    const migrated = migrate(v2);
    expect(migrated.version).toBe(5);
    expect(migrated.ignoredConflicts).toEqual(['x']);
    expect(migrated.templates).toEqual([]);
  });
});

describe('EventTemplateSchema', () => {
  it('accepts an all-day template without times', () => {
    const t = { id: 't1', name: 'Konferenz', categoryId: 'c1', allDay: true, defaultGroups: [] };
    expect(EventTemplateSchema.safeParse(t).success).toBe(true);
  });

  it('requires times when not all-day', () => {
    const t = { id: 't1', name: 'FK', categoryId: 'c1', allDay: false, defaultGroups: [] };
    expect(EventTemplateSchema.safeParse(t).success).toBe(false);
  });

  it('rejects empty name', () => {
    const t = { id: 't1', name: '', categoryId: 'c1', allDay: true, defaultGroups: [] };
    expect(EventTemplateSchema.safeParse(t).success).toBe(false);
  });
});

describe('migrate v2 → v3', () => {
  it('adds templates: [] to a v2 doc and chains to v4', () => {
    const v2 = { version: 2, ignoredConflicts: [] };
    const out = migrate(v2);
    expect(out.version).toBe(5);
    expect(out.templates).toEqual([]);
  });

  it('chains v1 → v4 (ignoredConflicts AND templates added)', () => {
    const v1 = { version: 1 };
    const out = migrate(v1);
    expect(out.version).toBe(5);
    expect(out.ignoredConflicts).toEqual([]);
    expect(out.templates).toEqual([]);
  });

  it('leaves an existing templates array untouched when migrating v3 → v4', () => {
    const v3 = { version: 3, ignoredConflicts: [], templates: [{ id: 't1' }] };
    const out = migrate(v3);
    expect(out.version).toBe(5);
    expect(out.templates).toEqual([{ id: 't1' }]);
  });
});

describe('migrate v3 → v4', () => {
  const v3Doc = {
    version: 3,
    schoolyear: {
      id: 'sy1',
      label: '2026/27',
      firstSchoolDay: '2026-08-10',
      firstTeachingDay: '2026-08-12',
      lastSchoolDay: '2027-07-15',
      holidays: [
        { id: 'h1', label: 'Herbstferien', start: '2026-10-12', end: '2026-10-24' }
      ],
      quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-16'],
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z'
    },
    categories: [],
    events: [],
    annotations: [],
    availableGroups: [],
    ignoredConflicts: [],
    templates: [],
    meta: { name: 'Plan', lastSaved: '2026-05-01T00:00:00.000Z' }
  };

  it('bumps version to 4 and defaults holiday.type to ferien', () => {
    const out = migrate(v3Doc) as typeof v3Doc & { version: number };
    expect(out.version).toBe(5);
    expect((out.schoolyear.holidays[0] as unknown as { type: string }).type).toBe('ferien');
  });

  it('migrated doc passes the current schema', () => {
    const out = migrate(v3Doc);
    expect(() => PlannerDocumentSchema.parse(out)).not.toThrow();
  });
});
