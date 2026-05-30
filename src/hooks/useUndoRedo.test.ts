import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useUndoRedo } from './useUndoRedo';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';
import { useHistoryStore } from '@/stores/history';
import type { PlanEvent } from '@/types/index';

function makeEvent(categoryId: string): PlanEvent {
  return {
    id: crypto.randomUUID(),
    title: 'Test-Termin',
    start: '2025-09-01',
    end: '2025-09-01',
    allDay: true,
    categoryId,
    groups: []
  };
}

beforeEach(() => {
  usePlannerStore.setState({ doc: null });
  useHistoryStore.getState().reset();
  localStorage.clear();
});

describe('useUndoRedo', () => {
  it('initially canUndo and canRedo are false', () => {
    const { result } = renderHook(() => useUndoRedo());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('canUndo becomes true after addEvent, canRedo stays false', () => {
    const doc = createEmptyDoc('Test', '25/26', '2025-08-11', '2025-08-11', '2026-06-26');
    usePlannerStore.getState().setDoc(doc);
    const { result, rerender } = renderHook(() => useUndoRedo());
    expect(result.current.canUndo).toBe(false);

    act(() => {
      usePlannerStore.getState().addEvent(makeEvent(doc.categories[0].id));
    });
    rerender();

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('Ctrl+Z undoes the last action (event removed)', () => {
    const doc = createEmptyDoc('Test', '25/26', '2025-08-11', '2025-08-11', '2026-06-26');
    usePlannerStore.getState().setDoc(doc);
    renderHook(() => useUndoRedo());

    act(() => {
      usePlannerStore.getState().addEvent(makeEvent(doc.categories[0].id));
    });
    expect(usePlannerStore.getState().doc!.events).toHaveLength(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    });

    expect(usePlannerStore.getState().doc!.events).toHaveLength(0);
  });

  it('Ctrl+Shift+Z redoes (event restored)', () => {
    const doc = createEmptyDoc('Test', '25/26', '2025-08-11', '2025-08-11', '2026-06-26');
    usePlannerStore.getState().setDoc(doc);
    renderHook(() => useUndoRedo());

    act(() => {
      usePlannerStore.getState().addEvent(makeEvent(doc.categories[0].id));
    });
    // undo first so we can redo
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    });
    expect(usePlannerStore.getState().doc!.events).toHaveLength(0);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true })
      );
    });

    expect(usePlannerStore.getState().doc!.events).toHaveLength(1);
  });

  it('Ctrl+Z is ignored when target is an INPUT element', () => {
    const doc = createEmptyDoc('Test', '25/26', '2025-08-11', '2025-08-11', '2026-06-26');
    usePlannerStore.getState().setDoc(doc);
    renderHook(() => useUndoRedo());

    act(() => {
      usePlannerStore.getState().addEvent(makeEvent(doc.categories[0].id));
    });
    expect(usePlannerStore.getState().doc!.events).toHaveLength(1);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    });

    document.body.removeChild(input);

    // undo should NOT have fired — event count stays at 1
    expect(usePlannerStore.getState().doc!.events).toHaveLength(1);
  });
});
