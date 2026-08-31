import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from './storage';
import type { PlannerDocument } from '@/types';

const sampleDoc: PlannerDocument = {
  version: 6,
  schoolyear: {
    id: 'sy1',
    label: '2026/27',
    firstSchoolDay: '2026-08-24',
    firstTeachingDay: '2026-08-31',
    lastSchoolDay: '2027-07-16',
    holidays: [],
    quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-09'],
    createdAt: '2026-05-26T00:00:00Z',
    updatedAt: '2026-05-26T00:00:00Z'
  },
  categories: [],
  events: [],
  annotations: [],
  availableGroups: [],
  ignoredConflicts: [],
  templates: [],
  meta: { name: 'Plan', lastSaved: '2026-05-26T00:00:00Z' }
};

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  it('saves + loads a document', async () => {
    const doc = { ...sampleDoc, schoolyear: { ...sampleDoc.schoolyear, id: 'doc1' } };
    await adapter.saveDoc(doc);
    const loaded = await adapter.loadDoc('doc1');
    expect(loaded).toEqual(doc);
  });

  it('lists saved docs', async () => {
    await adapter.saveDoc({ ...sampleDoc, schoolyear: { ...sampleDoc.schoolyear, id: 'a' } });
    await adapter.saveDoc({ ...sampleDoc, schoolyear: { ...sampleDoc.schoolyear, id: 'b' } });
    const list = await adapter.listDocs();
    expect(list.map((d) => d.id).sort()).toEqual(['a', 'b']);
  });

  it('deletes a document', async () => {
    const doc = { ...sampleDoc, schoolyear: { ...sampleDoc.schoolyear, id: 'doc1' } };
    await adapter.saveDoc(doc);
    await adapter.deleteDoc('doc1');
    await expect(adapter.loadDoc('doc1')).rejects.toThrow();
  });

  it('rejects invalid schema on load', async () => {
    localStorage.setItem('curriculr-planner:doc:bad', JSON.stringify({ foo: 'bar' }));
    localStorage.setItem('curriculr-planner:docs', JSON.stringify(['bad']));
    await expect(adapter.loadDoc('bad')).rejects.toThrow(/Invalid/);
  });

  it('tracks active doc', async () => {
    await adapter.setActiveDoc('doc1');
    expect(await adapter.getActiveDoc()).toBe('doc1');
  });

  it('exports JSON backup string', () => {
    const json = adapter.exportJson(sampleDoc);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(6);
    expect(parsed.meta.name).toBe('Plan');
  });

  it('imports valid JSON backup', async () => {
    const json = JSON.stringify(sampleDoc);
    const imported = await adapter.importJson(json);
    expect(imported.schoolyear.label).toBe('2026/27');
  });

  it('rejects malformed JSON on import', async () => {
    await expect(adapter.importJson('{not json}')).rejects.toThrow();
  });

  it('migrates a v1 doc on load', async () => {
    const v1 = {
      version: 1,
      schoolyear: {
        id: 'sy-mig', label: '2025/26',
        firstSchoolDay: '2025-08-11', firstTeachingDay: '2025-08-11', lastSchoolDay: '2026-06-26',
        holidays: [], quarterBoundaries: ['2025-10-31', '2026-01-31', '2026-04-15'],
        createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z'
      },
      categories: [{ id: 'c1', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: [] }],
      events: [], annotations: [], availableGroups: [],
      meta: { name: 'Alt', lastSaved: '2025-01-01T00:00:00.000Z' }
    };
    localStorage.setItem('curriculr-planner:doc:sy-mig', JSON.stringify(v1));
    localStorage.setItem('curriculr-planner:docs', JSON.stringify(['sy-mig']));

    const loaded = await adapter.loadDoc('sy-mig');
    expect(loaded.version).toBe(6);
    expect(loaded.ignoredConflicts).toEqual([]);
  });

  it('migrates a v1 doc on importJson', async () => {
    const v1Json = JSON.stringify({
      version: 1,
      schoolyear: {
        id: 'sy-imp', label: '2025/26',
        firstSchoolDay: '2025-08-11', firstTeachingDay: '2025-08-11', lastSchoolDay: '2026-06-26',
        holidays: [], quarterBoundaries: ['2025-10-31', '2026-01-31', '2026-04-15'],
        createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z'
      },
      categories: [{ id: 'c1', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: [] }],
      events: [], annotations: [], availableGroups: [],
      meta: { name: 'Alt', lastSaved: '2025-01-01T00:00:00.000Z' }
    });
    const doc = await adapter.importJson(v1Json);
    expect(doc.version).toBe(6);
    expect(doc.ignoredConflicts).toEqual([]);
  });
});
