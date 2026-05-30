import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore, createEmptyDoc } from './planner';
import { useHistoryStore } from './history';
import type { EventTemplate } from '@/types';

describe('usePlannerStore', () => {
  beforeEach(() => {
    usePlannerStore.setState({ doc: null, savingState: 'idle' });
    localStorage.clear();
  });

  it('starts with no doc', () => {
    expect(usePlannerStore.getState().doc).toBeNull();
  });

  it('sets a doc', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    usePlannerStore.getState().setDoc(doc);
    expect(usePlannerStore.getState().doc?.meta.name).toBe('Test');
  });

  it('adds an event', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    usePlannerStore.getState().setDoc(doc);
    usePlannerStore.getState().addEvent({
      id: 'e1',
      title: 'Wandertag',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: []
    });
    expect(usePlannerStore.getState().doc?.events).toHaveLength(1);
  });

  it('updates an event', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e1',
      title: 'Wandertag',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: []
    });
    usePlannerStore.getState().setDoc(doc);
    usePlannerStore.getState().updateEvent('e1', { title: 'Sportfest' });
    expect(usePlannerStore.getState().doc?.events[0].title).toBe('Sportfest');
  });

  it('deletes an event', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e1',
      title: 'X',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: []
    });
    usePlannerStore.getState().setDoc(doc);
    usePlannerStore.getState().deleteEvent('e1');
    expect(usePlannerStore.getState().doc?.events).toHaveLength(0);
  });

  it('sets annotation for schoolweek', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    usePlannerStore.getState().setDoc(doc);
    usePlannerStore.getState().setAnnotation(2, 'FK-Woche');
    const ann = usePlannerStore.getState().doc?.annotations.find((a) => a.schoolweek === 2);
    expect(ann?.text).toBe('FK-Woche');
  });

  it('createEmptyDoc produces 7 default categories', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    expect(doc.categories.length).toBe(7);
    expect(doc.categories.map((c) => c.slug)).toContain('sondertag');
  });

  it('ignores and un-ignores a conflict key', () => {
    const store = usePlannerStore.getState();
    const doc = createEmptyDoc('T', '25/26', '2025-08-11', '2025-08-11', '2026-06-26');
    store.setDoc(doc);
    usePlannerStore.getState().ignoreConflict('weekend|e1|2025-09-06');
    expect(usePlannerStore.getState().doc?.ignoredConflicts).toContain('weekend|e1|2025-09-06');
    usePlannerStore.getState().unignoreConflict('weekend|e1|2025-09-06');
    expect(usePlannerStore.getState().doc?.ignoredConflicts).not.toContain('weekend|e1|2025-09-06');
  });
});

describe('templates', () => {
  beforeEach(() => {
    usePlannerStore.setState({ doc: null });
    localStorage.clear();
  });

  function freshDoc() {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    usePlannerStore.getState().setDoc(doc);
    return doc;
  }

  it('createEmptyDoc starts with empty templates array', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    expect(doc.templates).toEqual([]);
  });

  it('adds a template', () => {
    const doc = freshDoc();
    const t: EventTemplate = { id: 't1', name: 'Konferenz', categoryId: doc.categories[0].id, allDay: true, defaultGroups: [] };
    usePlannerStore.getState().addTemplate(t);
    expect(usePlannerStore.getState().doc?.templates).toHaveLength(1);
  });

  it('updates a template', () => {
    const doc = freshDoc();
    usePlannerStore.getState().addTemplate({ id: 't1', name: 'X', categoryId: doc.categories[0].id, allDay: true, defaultGroups: [] });
    usePlannerStore.getState().updateTemplate('t1', { name: 'Gesamtkonferenz' });
    expect(usePlannerStore.getState().doc?.templates[0].name).toBe('Gesamtkonferenz');
  });

  it('deletes a template', () => {
    const doc = freshDoc();
    usePlannerStore.getState().addTemplate({ id: 't1', name: 'X', categoryId: doc.categories[0].id, allDay: true, defaultGroups: [] });
    usePlannerStore.getState().deleteTemplate('t1');
    expect(usePlannerStore.getState().doc?.templates).toHaveLength(0);
  });

  it('createEventFromTemplate makes an event with template defaults + pushes history', () => {
    const doc = createEmptyDoc('T', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    usePlannerStore.getState().setDoc(doc);
    usePlannerStore.getState().addTemplate({ id: 't1', name: 'FK', categoryId: doc.categories[0].id, allDay: false, startTime: '14:00', endTime: '16:00', defaultGroups: ['Kollegium'] });
    const id = usePlannerStore.getState().createEventFromTemplate('t1', '2026-09-16');
    const ev = usePlannerStore.getState().doc?.events.find((e) => e.id === id);
    expect(ev).toMatchObject({ title: 'FK', start: '2026-09-16', end: '2026-09-16', allDay: false, startTime: '14:00', endTime: '16:00', groups: ['Kollegium'] });
    expect(useHistoryStore.getState().canUndo()).toBe(true);
  });
});

describe('undo/redo integration', () => {
  beforeEach(() => {
    usePlannerStore.setState({ doc: null });
    useHistoryStore.getState().reset();
    localStorage.clear();
  });

  function withEvent() {
    const doc = createEmptyDoc('T', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    usePlannerStore.getState().setDoc(doc);
    usePlannerStore.getState().addEvent({ id: 'e1', title: 'X', start: '2026-09-15', end: '2026-09-15', allDay: true, categoryId: doc.categories[0].id, groups: [] });
    return doc;
  }

  it('addEvent pushes an undo snapshot; undo() removes the event', () => {
    withEvent();
    expect(useHistoryStore.getState().canUndo()).toBe(true);
    usePlannerStore.getState().undo();
    expect(usePlannerStore.getState().doc?.events).toHaveLength(0);
  });

  it('redo re-applies the event', () => {
    withEvent();
    usePlannerStore.getState().undo();
    usePlannerStore.getState().redo();
    expect(usePlannerStore.getState().doc?.events).toHaveLength(1);
  });

  it('setDoc resets history (load/switch starts clean)', () => {
    withEvent();
    usePlannerStore.getState().setDoc(createEmptyDoc('U', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16'));
    expect(useHistoryStore.getState().canUndo()).toBe(false);
  });

  it('addTemplate does NOT push history (Settings-level)', () => {
    const doc = createEmptyDoc('T', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    usePlannerStore.getState().setDoc(doc);
    usePlannerStore.getState().addTemplate({ id: 't1', name: 'X', categoryId: doc.categories[0].id, allDay: true, defaultGroups: [] });
    expect(useHistoryStore.getState().canUndo()).toBe(false);
  });
});
