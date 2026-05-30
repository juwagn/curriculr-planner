import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragStartEvent } from '@dnd-kit/core';
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

interface Props {
  onSwitchPlan(): void;
}

export function Editor({ onSwitchPlan }: Props) {
  const viewMode = useUiStore((s) => s.viewMode);
  const templatesSidebarOpen = useUiStore((s) => s.templatesSidebarOpen);
  const doc = usePlannerStore((s) => s.doc);
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(null);
  // Require a small drag distance so plain clicks (open/edit, arm template)
  // are not swallowed by the pointer sensor.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const draggedTemplate = draggedTemplateId
    ? doc?.templates.find((t) => t.id === draggedTemplateId) ?? null
    : null;
  const draggedColor = draggedTemplate
    ? doc?.categories.find((c) => c.id === draggedTemplate.categoryId)?.color
    : undefined;

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setDraggedTemplateId(id.startsWith('template:') ? id.slice('template:'.length) : null);
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--color-paper-bg)] overflow-hidden">
      <EditorHeader onSwitchPlan={onSwitchPlan} />
      <EditorToolbar />
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={(e) => {
          handleEditorDragEnd(e);
          setDraggedTemplateId(null);
        }}
        onDragCancel={() => setDraggedTemplateId(null)}
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
          ) : null}
        </DragOverlay>
      </DndContext>
      <EventModal />
      <SettingsModal />
      <NotesSidebar />
    </div>
  );
}
