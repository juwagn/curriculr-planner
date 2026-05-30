import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragStartEvent } from '@dnd-kit/core';
import { usePlannerStore } from '@/stores/planner';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';
import { QuarterCalendar } from './QuarterCalendar';
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
            {viewMode === 'table' ? <WeekTable /> : viewMode === 'year' ? <YearGrid /> : <QuarterCalendar />}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {draggedTemplate ? (
            <div className="flex items-center gap-2 rounded-md border border-[var(--color-ink-200)] bg-[var(--color-paper-card)] px-2 py-1 text-sm shadow-[var(--shadow-modal)]">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: draggedColor }} />
              {draggedTemplate.name}
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
