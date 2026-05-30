import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { DragEndEvent } from '@dnd-kit/core';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';

const TEMPLATE_PREFIX = 'template:';

/**
 * Shared drag-end handler for the editor views (WeekTable + YearGrid). Handles
 * three drag sources, all dropping onto day cells (`data.type === 'cell'`):
 *  - template chips from TemplatesSidebar → create event from template
 *  - resize-end handles → extend an event's end date
 *  - event blocks → move an event (preserving its span)
 */
export function handleEditorDragEnd(e: DragEndEvent): void {
  const { active, over } = e;
  if (!over) return;
  const overData = over.data.current as { type?: string; iso?: string } | undefined;
  if (overData?.type !== 'cell' || !overData.iso) return;
  const dropIso = overData.iso;

  // Template drop (click-to-place's drag counterpart).
  if (String(active.id).startsWith(TEMPLATE_PREFIX)) {
    const tid = String(active.id).slice(TEMPLATE_PREFIX.length);
    const newId = usePlannerStore.getState().createEventFromTemplate(tid, dropIso);
    if (newId) {
      useUiStore.getState().openEditEvent(newId);
      useUiStore.getState().armTemplate(null);
    }
    return;
  }

  const activeData = active.data.current as { type?: string; eventId?: string } | undefined;
  const doc = usePlannerStore.getState().doc;
  if (!doc) return;
  const updateEvent = usePlannerStore.getState().updateEvent;

  if (activeData?.type === 'resize-end') {
    const id = activeData.eventId;
    if (!id) return;
    const ev = doc.events.find((x) => x.id === id);
    if (!ev) return;
    const clamped = dropIso < ev.start ? ev.start : dropIso;
    if (clamped !== ev.end) updateEvent(id, { end: clamped });
    return;
  }

  if (activeData?.type !== 'event') return;
  const id = activeData.eventId;
  if (!id) return;
  const ev = doc.events.find((x) => x.id === id);
  if (!ev || ev.start === dropIso) return;
  const span = differenceInCalendarDays(parseISO(ev.end), parseISO(ev.start));
  const newEnd = format(addDays(parseISO(dropIso), span), 'yyyy-MM-dd');
  updateEvent(id, { start: dropIso, end: newEnd });
}
