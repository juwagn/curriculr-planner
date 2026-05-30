import { create } from 'zustand';
import type { PlannerDocument } from '@/types';

const CAP = 50;

interface HistoryState {
  past: PlannerDocument[];
  future: PlannerDocument[];
  push(snapshot: PlannerDocument): void;
  undo(current: PlannerDocument): PlannerDocument | null;
  redo(current: PlannerDocument): PlannerDocument | null;
  canUndo(): boolean;
  canRedo(): boolean;
  depth(): number;
  reset(): void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  push(snapshot) {
    const past = [...get().past, snapshot];
    if (past.length > CAP) past.shift();
    set({ past, future: [] });
  },
  undo(current) {
    const past = [...get().past];
    const prev = past.pop();
    if (prev === undefined) return null;
    set({ past, future: [...get().future, current] });
    return prev;
  },
  redo(current) {
    const future = [...get().future];
    const next = future.pop();
    if (next === undefined) return null;
    set({ future, past: [...get().past, current] });
    return next;
  },
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  depth: () => get().past.length,
  reset: () => set({ past: [], future: [] })
}));
