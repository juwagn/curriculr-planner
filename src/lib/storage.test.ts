import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from './storage';
import type { PlannerDocument } from '@/types';

const sampleDoc: PlannerDocument = {
  version: 1,
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
    expect(parsed.version).toBe(1);
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
});
