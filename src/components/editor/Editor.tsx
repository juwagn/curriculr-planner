import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
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
  // Require a small drag distance so plain clicks (open/edit, arm template)
  // are not swallowed by the pointer sensor.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  return (
    <div className="h-screen flex flex-col bg-[var(--color-paper-bg)] overflow-hidden">
      <EditorHeader onSwitchPlan={onSwitchPlan} />
      <EditorToolbar />
      <DndContext sensors={sensors} onDragEnd={handleEditorDragEnd}>
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {templatesSidebarOpen && <TemplatesSidebar />}
          <div className="flex-1 min-h-0 p-6 overflow-auto">
            {viewMode === 'table' ? <WeekTable /> : viewMode === 'year' ? <YearGrid /> : <QuarterCalendar />}
          </div>
        </div>
      </DndContext>
      <EventModal />
      <SettingsModal />
      <NotesSidebar />
    </div>
  );
}
