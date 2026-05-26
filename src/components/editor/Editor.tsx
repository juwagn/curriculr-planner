import { useState } from 'react';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';
import { QuarterCalendar } from './QuarterCalendar';

interface Props {
  onSwitchPlan(): void;
}

export function Editor({ onSwitchPlan }: Props) {
  const [exportOpen, setExportOpen] = useState(false);
  void exportOpen; void setExportOpen;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-body)]">
      <EditorHeader onOpenExport={() => setExportOpen(true)} onSwitchPlan={onSwitchPlan} />
      <EditorToolbar />
      <div className="flex-1 p-6">
        <QuarterCalendar />
      </div>
    </div>
  );
}
