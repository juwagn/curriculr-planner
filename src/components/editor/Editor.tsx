import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';
import { QuarterCalendar } from './QuarterCalendar';
import { EventModal } from '@/components/event-modal/EventModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { NotesSidebar } from './NotesSidebar';

interface Props {
  onSwitchPlan(): void;
}

export function Editor({ onSwitchPlan }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-body)]">
      <EditorHeader onSwitchPlan={onSwitchPlan} />
      <EditorToolbar />
      <div className="flex-1 p-6">
        <QuarterCalendar />
      </div>
      <EventModal />
      <SettingsModal />
      <NotesSidebar />
    </div>
  );
}
