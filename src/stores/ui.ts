import { create } from 'zustand';

interface UiState {
  currentQuarter: 1 | 2 | 3 | 4;
  notesSidebarOpen: boolean;
  settingsModalOpen: boolean;
  eventModalState: { open: false } | { open: true; mode: 'create' | 'edit'; eventId?: string; presetDate?: string };

  setQuarter(q: 1 | 2 | 3 | 4): void;
  toggleNotesSidebar(): void;
  openSettings(): void;
  closeSettings(): void;
  openCreateEvent(presetDate?: string): void;
  openEditEvent(eventId: string): void;
  closeEventModal(): void;
}

export const useUiStore = create<UiState>((set) => ({
  currentQuarter: 1,
  notesSidebarOpen: false,
  settingsModalOpen: false,
  eventModalState: { open: false },

  setQuarter(q) { set({ currentQuarter: q }); },
  toggleNotesSidebar() { set((s) => ({ notesSidebarOpen: !s.notesSidebarOpen })); },
  openSettings() { set({ settingsModalOpen: true }); },
  closeSettings() { set({ settingsModalOpen: false }); },
  openCreateEvent(presetDate) {
    set({ eventModalState: { open: true, mode: 'create', presetDate } });
  },
  openEditEvent(eventId) {
    set({ eventModalState: { open: true, mode: 'edit', eventId } });
  },
  closeEventModal() { set({ eventModalState: { open: false } }); }
}));
