import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useConflicts } from './useConflicts';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';

beforeEach(() => {
  const doc = createEmptyDoc('T', '25/26', '2025-08-11', '2025-08-11', '2026-06-26');
  doc.events = [{
    id: 'e1', title: 'Sa-Termin', start: '2025-09-06', end: '2025-09-06',
    allDay: true, categoryId: doc.categories[0].id, groups: []
  }];
  usePlannerStore.getState().setDoc(doc);
});

describe('useConflicts', () => {
  it('returns the weekend conflict', () => {
    const { result } = renderHook(() => useConflicts());
    expect(result.current.some((c) => c.type === 'weekend')).toBe(true);
  });

  it('filters out ignored keys', () => {
    const { result, rerender } = renderHook(() => useConflicts());
    const key = result.current.find((c) => c.type === 'weekend')!.key;
    usePlannerStore.getState().ignoreConflict(key);
    rerender();
    expect(result.current.some((c) => c.key === key)).toBe(false);
  });
});
