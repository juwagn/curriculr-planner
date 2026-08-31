import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from './history';
import type { PlannerDocument } from '@/types';

function docWithName(name: string): PlannerDocument {
  return { version: 6, schoolyear: { id: 's', label: '', firstSchoolDay: '2026-08-24', firstTeachingDay: '2026-08-31', lastSchoolDay: '2027-07-16', holidays: [], quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-09'], createdAt: '', updatedAt: '' }, categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [], meta: { name, lastSaved: '' } };
}

describe('useHistoryStore', () => {
  beforeEach(() => useHistoryStore.getState().reset());

  it('starts unable to undo or redo', () => {
    expect(useHistoryStore.getState().canUndo()).toBe(false);
    expect(useHistoryStore.getState().canRedo()).toBe(false);
  });

  it('push enables undo and clears redo', () => {
    useHistoryStore.getState().push(docWithName('a'));
    expect(useHistoryStore.getState().canUndo()).toBe(true);
    expect(useHistoryStore.getState().canRedo()).toBe(false);
  });

  it('undo returns the previous snapshot and enables redo', () => {
    useHistoryStore.getState().push(docWithName('a'));
    const restored = useHistoryStore.getState().undo(docWithName('b'));
    expect(restored?.meta.name).toBe('a');
    expect(useHistoryStore.getState().canRedo()).toBe(true);
  });

  it('redo replays forward', () => {
    useHistoryStore.getState().push(docWithName('a'));
    useHistoryStore.getState().undo(docWithName('b'));
    const redone = useHistoryStore.getState().redo(docWithName('a'));
    expect(redone?.meta.name).toBe('b');
  });

  it('caps past at 50 (drops oldest)', () => {
    for (let i = 0; i < 60; i++) useHistoryStore.getState().push(docWithName(`d${i}`));
    expect(useHistoryStore.getState().depth()).toBe(50);
  });

  it('reset clears both stacks', () => {
    useHistoryStore.getState().push(docWithName('a'));
    useHistoryStore.getState().reset();
    expect(useHistoryStore.getState().canUndo()).toBe(false);
  });
});
