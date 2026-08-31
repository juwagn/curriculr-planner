import { beforeEach, describe, expect, it } from 'vitest';
import type { DragEndEvent } from '@dnd-kit/core';
import { createEmptyDoc, usePlannerStore } from '@/stores/planner';
import { handleEditorDragEnd } from './useEditorDragEnd';

function annotationDrag(annotationId: string, weekStart: string): DragEndEvent {
  return {
    active: { id: `annotation:${annotationId}`, data: { current: { type: 'annotation', annotationId } } },
    over: { id: `annotation-cell:${weekStart}`, data: { current: { type: 'annotation-cell', weekStart } } }
  } as unknown as DragEndEvent;
}

function annotationCardDrag(annotationId: string, beforeId: string, weekStart: string): DragEndEvent {
  return {
    active: { id: `annotation:${annotationId}`, data: { current: { type: 'annotation', annotationId } } },
    over: { id: `annotation-card:${beforeId}`, data: { current: { type: 'annotation-card', annotationId: beforeId, weekStart } } }
  } as unknown as DragEndEvent;
}

describe('handleEditorDragEnd annotation drops', () => {
  beforeEach(() => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    usePlannerStore.setState({ doc });
  });

  it('moves exactly the dragged annotation to the target week', () => {
    const id = usePlannerStore.getState().addAnnotation('2026-11-23', 'TaTü');
    handleEditorDragEnd(annotationDrag(id, '2026-11-30'));
    expect(usePlannerStore.getState().doc?.annotations).toMatchObject([{ id, weekStart: '2026-11-30', text: 'TaTü' }]);
  });

  it('reorders a note before another card in the same week', () => {
    const first = usePlannerStore.getState().addAnnotation('2026-11-23', 'Erste');
    const second = usePlannerStore.getState().addAnnotation('2026-11-23', 'Zweite');
    const third = usePlannerStore.getState().addAnnotation('2026-11-23', 'Dritte');
    handleEditorDragEnd(annotationCardDrag(third, first, '2026-11-23'));
    const notes = usePlannerStore.getState().doc!.annotations
      .filter((annotation) => annotation.weekStart === '2026-11-23')
      .sort((left, right) => left.order - right.order);
    expect(notes.map((annotation) => annotation.id)).toEqual([third, first, second]);
  });

  it('inserts a cross-week drop before the target card and normalizes the source', () => {
    const first = usePlannerStore.getState().addAnnotation('2026-11-23', 'Erste');
    const moving = usePlannerStore.getState().addAnnotation('2026-11-23', 'Verschieben');
    const target = usePlannerStore.getState().addAnnotation('2026-11-30', 'Ziel');
    handleEditorDragEnd(annotationCardDrag(moving, target, '2026-11-30'));
    const doc = usePlannerStore.getState().doc!;
    const source = doc.annotations.filter((annotation) => annotation.weekStart === '2026-11-23').sort((left, right) => left.order - right.order);
    const destination = doc.annotations.filter((annotation) => annotation.weekStart === '2026-11-30').sort((left, right) => left.order - right.order);
    expect(source.map((annotation) => [annotation.id, annotation.order])).toEqual([[first, 0]]);
    expect(destination.map((annotation) => annotation.id)).toEqual([moving, target]);
    expect(destination.map((annotation) => annotation.order)).toEqual([0, 1]);
  });
});
