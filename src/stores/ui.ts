import { create } from 'zustand';
import type { PrintScope } from '@/lib/print-model';

export type ViewMode = 'table' | 'year';
export type Density = 'auto' | 'compact' | 'standard' | 'roomy';
export type SettingsTab =
  | 'schoolyear'
  | 'categories'
  | 'groups'
  | 'templates'
  | 'appearance'
  | 'export'
  | 'import'
  | 'school'
  | 'about';

interface UiState {
  currentQuarter: 1 | 2 | 3 | 4;
  notesSidebarOpen: boolean;
  templatesSidebarOpen: boolean;
  armedTemplateId: string | null;
  settingsModalOpen: boolean;
  settingsTab: SettingsTab;
  eventModalState: { open: false } | { open: true; mode: 'create' | 'edit'; eventId?: string; presetDate?: string };
  viewMode: ViewMode;
  density: Density;
  helpOpen: boolean;
  tourPending: boolean;
  printDialogOpen: boolean;
  printScope: PrintScope;
  printOrientation: 'portrait' | 'landscape';

  setQuarter(q: 1 | 2 | 3 | 4): void;
  toggleNotesSidebar(): void;
  toggleTemplatesSidebar(): void;
  armTemplate(id: string | null): void;
  openSettings(tab?: SettingsTab): void;
  setSettingsTab(tab: SettingsTab): void;
  closeSettings(): void;
  openCreateEvent(presetDate?: string): void;
  openEditEvent(eventId: string): void;
  closeEventModal(): void;
  setViewMode(v: ViewMode): void;
  setDensity(d: Density): void;
  openHelp(): void;
  closeHelp(): void;
  setTourPending(v: boolean): void;
  openPrintDialog(): void;
  closePrintDialog(): void;
  setPrintScope(scope: PrintScope): void;
  setPrintOrientation(orientation: 'portrait' | 'landscape'): void;
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
  settingsTab: 'schoolyear',
  eventModalState: { open: false },
  // Coerce any stale persisted value (e.g. the removed 'calendar' view) to 'table'.
  viewMode: initial.viewMode === 'year' ? 'year' : 'table',
  density: initial.density ?? 'auto',
  helpOpen: false,
  tourPending: false,
  printDialogOpen: false,
  printScope: 'currentQuarter',
  printOrientation: 'portrait',

  setQuarter(q) { set({ currentQuarter: q }); },
  toggleNotesSidebar() { set((s) => ({ notesSidebarOpen: !s.notesSidebarOpen })); },
  toggleTemplatesSidebar() { set((s) => ({ templatesSidebarOpen: !s.templatesSidebarOpen })); },
  armTemplate(id) { set({ armedTemplateId: id }); },
  openSettings(tab) { set({ settingsModalOpen: true, ...(tab ? { settingsTab: tab } : {}) }); },
  setSettingsTab(tab) { set({ settingsTab: tab }); },
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
  },
  openHelp() { set({ helpOpen: true }); },
  closeHelp() { set({ helpOpen: false }); },
  setTourPending(v) { set({ tourPending: v }); },
  openPrintDialog() { set({ printDialogOpen: true }); },
  closePrintDialog() { set({ printDialogOpen: false }); },
  setPrintScope(printScope) { set({ printScope }); },
  setPrintOrientation(printOrientation) { set({ printOrientation }); },
}));
