import { create } from 'zustand';

export type ViewMode = 'table' | 'calendar' | 'year';
export type Density = 'auto' | 'compact' | 'standard' | 'roomy';

interface UiState {
  currentQuarter: 1 | 2 | 3 | 4;
  notesSidebarOpen: boolean;
  templatesSidebarOpen: boolean;
  armedTemplateId: string | null;
  settingsModalOpen: boolean;
  eventModalState: { open: false } | { open: true; mode: 'create' | 'edit'; eventId?: string; presetDate?: string };
  viewMode: ViewMode;
  density: Density;

  setQuarter(q: 1 | 2 | 3 | 4): void;
  toggleNotesSidebar(): void;
  toggleTemplatesSidebar(): void;
  armTemplate(id: string | null): void;
  openSettings(): void;
  closeSettings(): void;
  openCreateEvent(presetDate?: string): void;
  openEditEvent(eventId: string): void;
  closeEventModal(): void;
  setViewMode(v: ViewMode): void;
  setDensity(d: Density): void;
}

const PREFS_KEY = 'curriculr-planner:ui-prefs';

interface PersistedPrefs {
  viewMode?: ViewMode;
  density?: Density;
}

function loadPrefs(): PersistedPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function savePrefs(prefs: PersistedPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

const initial = loadPrefs();

export const useUiStore = create<UiState>((set, get) => ({
  currentQuarter: 1,
  notesSidebarOpen: false,
  templatesSidebarOpen: false,
  armedTemplateId: null,
  settingsModalOpen: false,
  eventModalState: { open: false },
  viewMode: initial.viewMode ?? 'table',
  density: initial.density ?? 'auto',

  setQuarter(q) { set({ currentQuarter: q }); },
  toggleNotesSidebar() { set((s) => ({ notesSidebarOpen: !s.notesSidebarOpen })); },
  toggleTemplatesSidebar() { set((s) => ({ templatesSidebarOpen: !s.templatesSidebarOpen })); },
  armTemplate(id) { set({ armedTemplateId: id }); },
  openSettings() { set({ settingsModalOpen: true }); },
  closeSettings() { set({ settingsModalOpen: false }); },
  openCreateEvent(presetDate) {
    set({ eventModalState: { open: true, mode: 'create', presetDate } });
  },
  openEditEvent(eventId) {
    set({ eventModalState: { open: true, mode: 'edit', eventId } });
  },
  closeEventModal() { set({ eventModalState: { open: false } }); },
  setViewMode(viewMode) {
    set({ viewMode });
    savePrefs({ viewMode, density: get().density });
  },
  setDensity(density) {
    set({ density });
    savePrefs({ viewMode: get().viewMode, density });
  }
}));
