import { useState } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { Announcements, DragStartEvent, ScreenReaderInstructions } from '@dnd-kit/core';
import { usePlannerStore } from '@/stores/planner';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';
import { WeekTable } from './WeekTable';
import { YearGrid } from './YearGrid';
import { TemplatesSidebar } from './TemplatesSidebar';
import { EventModal } from '@/components/event-modal/EventModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { NotesSidebar } from './NotesSidebar';
import { useUiStore } from '@/stores/ui';
import { handleEditorDragEnd } from './useEditorDragEnd';
import { TourManager } from '@/components/tour/TourManager';
import { HelpModal } from '@/components/help/HelpModal';
import { PrintDialog } from '@/components/print/PrintDialog';

interface Props {
  onSwitchPlan(): void;
}

// German screen-reader instructions + live-region announcements for keyboard DnD
// (WCAG 2.1.1). dnd-kit shows `screenReaderInstructions.draggable` via a hidden
// element referenced by `aria-describedby` (wired automatically through the
// `attributes` spread on each draggable node).
const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'Leertaste hebt den Termin auf. Pfeiltasten verschieben ihn während des Ziehens. ' +
    'Leertaste legt ihn an der neuen Position ab, Escape bricht den Vorgang ab.',
};

const announcements: Announcements = {
  onDragStart() {
    return 'Termin aufgenommen.';
  },
  onDragOver({ over }) {
    return over ? 'Termin befindet sich über einem Ablagebereich.' : 'Termin befindet sich über keinem Ablagebereich.';
  },
  onDragEnd({ over }) {
    return over ? 'Termin wurde abgelegt.' : 'Termin wurde nicht abgelegt.';
  },
  onDragCancel() {
    return 'Verschieben abgebrochen.';
  },
};

export function Editor({ onSwitchPlan }: Props) {
  const viewMode = useUiStore((s) => s.viewMode);
  const templatesSidebarOpen = useUiStore((s) => s.templatesSidebarOpen);
  const doc = usePlannerStore((s) => s.doc);
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(null);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  // Require a small drag distance so plain clicks (open/edit, arm template)
  // are not swallowed by the pointer sensor. KeyboardSensor gives Tab/Space/
  // arrow-key/Escape drag-and-drop for keyboard-only users (WCAG 2.1.1).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const draggedTemplate = draggedTemplateId
    ? doc?.templates.find((t) => t.id === draggedTemplateId) ?? null
    : null;
  const draggedColor = draggedTemplate
    ? doc?.categories.find((c) => c.id === draggedTemplate.categoryId)?.color
    : undefined;

  const draggedEvent = draggedEventId
    ? doc?.events.find((ev) => ev.id === draggedEventId) ?? null
    : null;
  const draggedEventColor = draggedEvent
    ? doc?.categories.find((c) => c.id === draggedEvent.categoryId)?.color
    : undefined;

  const resetDrag = () => {
    setDraggedTemplateId(null);
    setDraggedEventId(null);
  };

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setDraggedTemplateId(id.startsWith('template:') ? id.slice('template:'.length) : null);
    // Only event-move drags get a follow-cursor preview; resize handles do not.
    setDraggedEventId(id.startsWith('event:') ? id.slice('event:'.length) : null);
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--color-paper-bg)] overflow-hidden">
      <EditorHeader onSwitchPlan={onSwitchPlan} />
      <EditorToolbar />
      <DndContext
        sensors={sensors}
        accessibility={{ announcements, screenReaderInstructions }}
        onDragStart={onDragStart}
        onDragEnd={(e) => {
          handleEditorDragEnd(e);
          resetDrag();
        }}
        onDragCancel={resetDrag}
      >
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {templatesSidebarOpen && <TemplatesSidebar />}
          <div className="flex-1 min-h-0 p-6 overflow-auto">
            {viewMode === 'year' ? <YearGrid /> : <WeekTable />}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {draggedTemplate ? (
            <div className="flex cursor-grabbing items-center gap-2.5 rounded-lg border border-[var(--color-ink-200)] bg-[var(--color-paper-card)] px-3 py-2 shadow-[var(--shadow-modal)] ring-2 ring-[var(--color-gelb-400)]">
              <span
                className="inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: draggedColor }}
              />
              <span className="text-sm font-medium text-[var(--color-ink-900)]">{draggedTemplate.name}</span>
              <span className="ml-1 rounded bg-[var(--color-paper-bg)] px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-[var(--color-ink-500)]">
                {draggedTemplate.allDay
                  ? 'ganztägig'
                  : `${draggedTemplate.startTime ?? ''}–${draggedTemplate.endTime ?? ''}`}
              </span>
            </div>
          ) : draggedEvent ? (
            <div className="flex max-w-[16rem] cursor-grabbing items-center gap-2.5 rounded-lg border border-[var(--color-ink-200)] bg-[var(--color-paper-card)] px-3 py-2 shadow-[var(--shadow-modal)] ring-2 ring-[var(--color-gelb-400)]">
              <span
                className="inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: draggedEventColor }}
              />
              {!draggedEvent.allDay && draggedEvent.startTime && (
                <span className="shrink-0 text-[11px] font-bold tabular-nums text-[var(--color-ink-500)]">
                  {draggedEvent.startTime}
                </span>
              )}
              <span className="truncate text-sm font-medium text-[var(--color-ink-900)]">{draggedEvent.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <EventModal />
      <SettingsModal />
      <NotesSidebar />
      <TourManager />
      <HelpModal />
      <PrintDialog />
    </div>
  );
}
