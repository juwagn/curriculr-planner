import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { useHistoryStore } from './history';
import type { PlannerDocument, PlanEvent, Category, EventTemplate, UUID, ISODate } from '@/types';

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: ['konferenz', 'fk'] },
  { label: 'Elternabend', color: '#0E9F6E', slug: 'elternabend', keywords: ['elternabend', 'eltern'] },
  { label: 'Wandertag', color: '#FFC857', slug: 'wandertag', keywords: ['wandertag', 'ausflug'] },
  { label: 'Prüfung', color: '#E02424', slug: 'pruefung', keywords: ['prüfung', 'klausur', 'abitur'] },
  { label: 'Sonderveranstaltung', color: '#7C3AED', slug: 'sonder', keywords: ['fest', 'feier'] },
  { label: 'Schließtag', color: '#6B7280', slug: 'schliesstag', keywords: ['schließ', 'frei'] },
  { label: 'Sondertag', color: '#FFC857', slug: 'sondertag', keywords: [] }
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
    version: 3,
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

  setAnnotation(schoolweek: number, text: string): void;
  deleteAnnotation(schoolweek: number): void;

  updateSchoolyear(patch: Partial<PlannerDocument['schoolyear']>): void;
  updateCategories(cats: Category[]): void;
  updateGroups(groups: string[]): void;
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
let lastAnnoWeek: number | null = null;

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
    lastAnnoWeek = null;
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
    lastAnnoWeek = null;
    set({ doc: { ...doc, events: [...doc.events, e] } });
    debouncedSave(get);
  },

  addEvents(list) {
    const doc = get().doc;
    if (!doc || list.length === 0) return;
    snapshot(get);
    lastAnnoWeek = null;
    set({ doc: { ...doc, events: [...doc.events, ...list] } });
    debouncedSave(get);
  },

  updateEvent(id, patch) {
    const doc = get().doc;
    if (!doc) return;
    snapshot(get);
    lastAnnoWeek = null;
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
    lastAnnoWeek = null;
    set({ doc: { ...doc, events: doc.events.filter((e) => e.id !== id) } });
    debouncedSave(get);
  },

  setAnnotation(schoolweek, text) {
    const doc = get().doc;
    if (!doc) return;
    if (schoolweek !== lastAnnoWeek) {
      snapshot(get);
      lastAnnoWeek = schoolweek;
    }
    const updatedAt = new Date().toISOString();
    const existing = doc.annotations.find((a) => a.schoolweek === schoolweek);
    const annotations = existing
      ? doc.annotations.map((a) => (a.schoolweek === schoolweek ? { ...a, text, updatedAt } : a))
      : [...doc.annotations, { schoolweek, text, updatedAt }];
    set({ doc: { ...doc, annotations } });
    debouncedSave(get);
  },

  deleteAnnotation(schoolweek) {
    const doc = get().doc;
    if (!doc) return;
    snapshot(get);
    lastAnnoWeek = null;
    set({
      doc: { ...doc, annotations: doc.annotations.filter((a) => a.schoolweek !== schoolweek) }
    });
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
    lastAnnoWeek = null;
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
      lastAnnoWeek = null;
      debouncedSave(get);
    }
  },

  redo() {
    const doc = get().doc;
    if (!doc) return;
    const next = useHistoryStore.getState().redo(doc);
    if (next) {
      set({ doc: next });
      lastAnnoWeek = null;
      debouncedSave(get);
    }
  }
}));
