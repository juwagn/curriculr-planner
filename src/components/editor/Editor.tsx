import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';
import { QuarterCalendar } from './QuarterCalendar';
import { WeekTable } from './WeekTable';
import { EventModal } from '@/components/event-modal/EventModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { NotesSidebar } from './NotesSidebar';
import { useUiStore } from '@/stores/ui';

interface Props {
  onSwitchPlan(): void;
}

export function Editor({ onSwitchPlan }: Props) {
  const viewMode = useUiStore((s) => s.viewMode);
  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg-body)] overflow-hidden">
      <EditorHeader onSwitchPlan={onSwitchPlan} />
      <EditorToolbar />
      <div className="flex-1 min-h-0 p-6 overflow-auto">
        {viewMode === 'table' ? <WeekTable /> : <QuarterCalendar />}
      </div>
      <EventModal />
      <SettingsModal />
      <NotesSidebar />
    </div>
  );
}
