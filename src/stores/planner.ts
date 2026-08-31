import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { useHistoryStore } from './history';
import type { PlannerDocument, PlanEvent, Category, EventTemplate, WeekAnnotation, UUID, ISODate } from '@/types';
import { annotationsForWeek, mondayOfWeek } from '@/lib/annotations';

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: ['konferenz', 'fk'] },
  { label: 'Elternabend', color: '#2F9E8F', slug: 'elternabend', keywords: ['elternabend', 'eltern'] },
  { label: 'Wandertag', color: '#D9A23B', slug: 'wandertag', keywords: ['wandertag', 'ausflug'] },
  { label: 'Prüfung', color: '#D46A6A', slug: 'pruefung', keywords: ['prüfung', 'klausur', 'abitur'] },
  { label: 'Sonderveranstaltung', color: '#7C72C4', slug: 'sonder', keywords: ['fest', 'feier'] },
  { label: 'Schließtag', color: '#647488', slug: 'schliesstag', keywords: ['schließ', 'frei'] },
  { label: 'Sondertag', color: '#D98B5F', slug: 'sondertag', keywords: [] }
];

const DEFAULT_GROUPS = ['Kollegium', 'Eltern', 'Klassen 5-7', 'Klassen 8-10', 'Sek I', 'Sek II'];

function uid(): string {
  return crypto.randomUUID();
}

export function createEmptyDoc(
  name: string,
  label: string,
  firstSchoolDay: string,
  firstTeachingDay: string,
  lastSchoolDay: string
): PlannerDocument {
  const now = new Date().toISOString();
  return {
    version: 6,
    schoolyear: {
      id: uid(),
      label,
      firstSchoolDay,
      firstTeachingDay,
      lastSchoolDay,
      holidays: [],
      quarterBoundaries: [],
      createdAt: now,
      updatedAt: now
    },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uid() })),
    events: [],
    annotations: [],
    availableGroups: [...DEFAULT_GROUPS],
    ignoredConflicts: [],
    templates: [],
    meta: { name, lastSaved: now }
  };
}

type SavingState = 'idle' | 'saving' | 'saved' | 'error';

interface PlannerState {
  doc: PlannerDocument | null;
  savingState: SavingState;

  setDoc(doc: PlannerDocument | null): void;
  loadDoc(id: UUID): Promise<void>;
  saveDoc(): Promise<void>;

  addEvent(e: PlanEvent): void;
  addEvents(list: PlanEvent[]): void;
  updateEvent(id: UUID, patch: Partial<PlanEvent>): void;
  deleteEvent(id: UUID): void;

  addAnnotation(weekStart: ISODate, text: string): UUID;
  updateAnnotation(id: UUID, patch: Pick<WeekAnnotation, 'text'>): void;
  deleteAnnotation(id: UUID): void;
  moveAnnotation(id: UUID, weekStart: ISODate, beforeId?: UUID): void;
  reorderAnnotations(weekStart: ISODate, annotationIds: UUID[]): void;

  updateSchoolyear(patch: Partial<PlannerDocument['schoolyear']>): void;
  updateCategories(cats: Category[]): void;
  updateGroups(groups: string[]): void;
  reassignCategory(fromId: UUID, toId: UUID): void;
  updateMeta(patch: Partial<PlannerDocument['meta']>): void;

  ignoreConflict(key: string): void;
  unignoreConflict(key: string): void;

  addTemplate(t: EventTemplate): void;
  updateTemplate(id: UUID, patch: Partial<EventTemplate>): void;
  deleteTemplate(id: UUID): void;
  createEventFromTemplate(templateId: UUID, date: ISODate): UUID | null;

  undo(): void;
  redo(): void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastAnnotationId: string | null = null;

function debouncedSave(get: () => PlannerState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await get().saveDoc();
  }, 300);
}

function snapshot(get: () => PlannerState) {
  const doc = get().doc;
  if (doc) useHistoryStore.getState().push(doc);
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  doc: null,
  savingState: 'idle',

  setDoc(doc) {
    set({ doc });
    useHistoryStore.getState().reset();
    lastAnnotationId = null;
  },

  async loadDoc(id) {
    const doc = await storage.loadDoc(id);
    set({ doc });
    await storage.setActiveDoc(id);
  },

  async saveDoc() {
    const doc = get().doc;
    if (!doc) return;
    set({ savingState: 'saving' });
    try {
      const stamped = { ...doc, meta: { ...doc.meta, lastSaved: new Date().toISOString() } };
      await storage.saveDoc(stamped);
      set({ doc: stamped, savingState: 'saved' });
    } catch {
      set({ savingState: 'error' });
    }
  },

  addEvent(e) {
    const doc = get().doc;
    if (!doc) return;
    snapshot(get);
    lastAnnotationId = null;
    set({ doc: { ...doc, events: [...doc.events, e] } });
    debouncedSave(get);
  },

  addEvents(list) {
    const doc = get().doc;
    if (!doc || list.length === 0) return;
    snapshot(get);
    lastAnnotationId = null;
    set({ doc: { ...doc, events: [...doc.events, ...list] } });
    debouncedSave(get);
  },

  updateEvent(id, patch) {
    const doc = get().doc;
    if (!doc) return;
    snapshot(get);
    lastAnnotationId = null;
    set({
      doc: {
        ...doc,
        events: doc.events.map((e) => (e.id === id ? { ...e, ...patch } : e))
      }
    });
    debouncedSave(get);
  },

  deleteEvent(id) {
    const doc = get().doc;
    if (!doc) return;
    snapshot(get);
    lastAnnotationId = null;
    set({ doc: { ...doc, events: doc.events.filter((e) => e.id !== id) } });
    debouncedSave(get);
  },

  addAnnotation(weekStart, text) {
    const doc = get().doc;
    if (!doc) return '';
    snapshot(get);
    lastAnnotationId = null;
    const normalizedWeekStart = mondayOfWeek(weekStart);
    const currentWeek = annotationsForWeek(doc.annotations, normalizedWeekStart);
    const normalizedExisting = new Map(currentWeek.map((item, order) => [item.id, order]));
    const annotation: WeekAnnotation = {
      id: uid(), weekStart: normalizedWeekStart, text,
      order: currentWeek.length,
      updatedAt: new Date().toISOString()
    };
    set({
      doc: {
        ...doc,
        annotations: [...doc.annotations.map((item) =>
          item.weekStart === normalizedWeekStart
            ? { ...item, order: normalizedExisting.get(item.id) ?? item.order }
            : item
        ), annotation]
      }
    });
    debouncedSave(get);
    return annotation.id;
  },

  updateAnnotation(id, patch) {
    const doc = get().doc;
    if (!doc) return;
    if (lastAnnotationId !== id) {
      snapshot(get);
      lastAnnotationId = id;
    }
    set({ doc: { ...doc, annotations: doc.annotations.map((annotation) => annotation.id === id ? { ...annotation, ...patch, updatedAt: new Date().toISOString() } : annotation) } });
    debouncedSave(get);
  },

  deleteAnnotation(id) {
    const doc = get().doc;
    if (!doc) return;
    snapshot(get);
    lastAnnotationId = null;
    const removed = doc.annotations.find((annotation) => annotation.id === id);
    const remaining = doc.annotations.filter((annotation) => annotation.id !== id);
    const ranks = removed
      ? new Map(annotationsForWeek(remaining, removed.weekStart).map((item, order) => [item.id, order]))
      : new Map<string, number>();
    set({ doc: { ...doc, annotations: remaining.map((item) =>
      removed && item.weekStart === removed.weekStart
        ? { ...item, order: ranks.get(item.id) ?? item.order }
        : item
    ) } });
    debouncedSave(get);
  },

  moveAnnotation(id, weekStart, beforeId) {
    const doc = get().doc;
    if (!doc) return;
    const normalizedWeekStart = mondayOfWeek(weekStart);
    const annotation = doc.annotations.find((item) => item.id === id);
    if (!annotation || (annotation.weekStart === normalizedWeekStart && !beforeId)) return;
    if (beforeId === id) return;
    snapshot(get);
    lastAnnotationId = null;
    const now = new Date().toISOString();
    const sourceWeekStart = annotation.weekStart;
    const withoutActive = doc.annotations.filter((item) => item.id !== id);
    const source = annotationsForWeek(withoutActive, sourceWeekStart);
    const target = sourceWeekStart === normalizedWeekStart
      ? source
      : annotationsForWeek(withoutActive, normalizedWeekStart);
    const beforeIndex = beforeId ? target.findIndex((item) => item.id === beforeId) : -1;
    const targetWithActive = [...target];
    targetWithActive.splice(beforeIndex >= 0 ? beforeIndex : targetWithActive.length, 0, {
      ...annotation,
      weekStart: normalizedWeekStart,
      updatedAt: now
    });
    const sourceRanks = new Map(source.map((item, order) => [item.id, order]));
    const targetRanks = new Map(targetWithActive.map((item, order) => [item.id, order]));
    set({
      doc: {
        ...doc,
        annotations: doc.annotations.map((item) => {
          if (targetRanks.has(item.id)) {
            return {
              ...item,
              weekStart: normalizedWeekStart,
              order: targetRanks.get(item.id) ?? item.order,
              updatedAt: item.id === id ? now : item.updatedAt
            };
          }
          if (sourceWeekStart !== normalizedWeekStart && sourceRanks.has(item.id)) {
            return { ...item, order: sourceRanks.get(item.id) ?? item.order };
          }
          return item;
        })
      }
    });
    debouncedSave(get);
  },

  reorderAnnotations(weekStart, annotationIds) {
    const doc = get().doc;
    if (!doc) return;
    const normalizedWeekStart = mondayOfWeek(weekStart);
    const known = new Set(annotationsForWeek(doc.annotations, normalizedWeekStart).map((item) => item.id));
    if (annotationIds.length !== known.size || annotationIds.some((id) => !known.has(id))) return;
    snapshot(get);
    lastAnnotationId = null;
    const ranks = new Map(annotationIds.map((id, order) => [id, order]));
    set({ doc: { ...doc, annotations: doc.annotations.map((item) => item.weekStart === normalizedWeekStart ? { ...item, order: ranks.get(item.id) ?? item.order, updatedAt: new Date().toISOString() } : item) } });
    debouncedSave(get);
  },

  updateSchoolyear(patch) {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        schoolyear: { ...doc.schoolyear, ...patch, updatedAt: new Date().toISOString() }
      }
    });
    debouncedSave(get);
  },

  updateCategories(categories) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, categories } });
    debouncedSave(get);
  },

  updateGroups(availableGroups) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, availableGroups } });
    debouncedSave(get);
  },

  reassignCategory(fromId, toId) {
    const doc = get().doc;
    if (!doc || fromId === toId) return;
    set({
      doc: {
        ...doc,
        events: doc.events.map((e) =>
          e.categoryId === fromId ? { ...e, categoryId: toId } : e
        ),
        templates: doc.templates.map((t) =>
          t.categoryId === fromId ? { ...t, categoryId: toId } : t
        )
      }
    });
    debouncedSave(get);
  },

  updateMeta(patch) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, meta: { ...doc.meta, ...patch } } });
    debouncedSave(get);
  },

  ignoreConflict(key) {
    const doc = get().doc;
    if (!doc || doc.ignoredConflicts.includes(key)) return;
    set({ doc: { ...doc, ignoredConflicts: [...doc.ignoredConflicts, key] } });
    debouncedSave(get);
  },

  unignoreConflict(key) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, ignoredConflicts: doc.ignoredConflicts.filter((k) => k !== key) } });
    debouncedSave(get);
  },

  addTemplate(t) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, templates: [...doc.templates, t] } });
    debouncedSave(get);
  },

  updateTemplate(id, patch) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, templates: doc.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) } });
    debouncedSave(get);
  },

  deleteTemplate(id) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, templates: doc.templates.filter((t) => t.id !== id) } });
    debouncedSave(get);
  },

  createEventFromTemplate(templateId, date) {
    const doc = get().doc;
    if (!doc) return null;
    const t = doc.templates.find((x) => x.id === templateId);
    if (!t) return null;
    const id = crypto.randomUUID();
    const event: PlanEvent = {
      id,
      title: t.defaultTitle ?? t.name,
      start: date,
      end: date,
      allDay: t.allDay,
      startTime: t.allDay ? undefined : t.startTime,
      endTime: t.allDay ? undefined : t.endTime,
      categoryId: t.categoryId,
      notes: undefined,
      location: undefined,
      groups: [...t.defaultGroups]
    };
    snapshot(get);
    lastAnnotationId = null;
    set({ doc: { ...doc, events: [...doc.events, event] } });
    debouncedSave(get);
    return id;
  },

  undo() {
    const doc = get().doc;
    if (!doc) return;
    const prev = useHistoryStore.getState().undo(doc);
    if (prev) {
      set({ doc: prev });
      lastAnnotationId = null;
      debouncedSave(get);
    }
  },

  redo() {
    const doc = get().doc;
    if (!doc) return;
    const next = useHistoryStore.getState().redo(doc);
    if (next) {
      set({ doc: next });
      lastAnnotationId = null;
      debouncedSave(get);
    }
  }
}));
