import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';

interface Props {
  onOpenExport(): void;
  onSwitchPlan(): void;
}

export function EditorHeader({ onOpenExport, onSwitchPlan }: Props) {
  const doc = usePlannerStore((s) => s.doc);
  const savingState = usePlannerStore((s) => s.savingState);
  const openSettings = useUiStore((s) => s.openSettings);

  if (!doc) return null;

  const stateLabel = {
    idle: '● Gespeichert',
    saving: '○ Speichert…',
    saved: '● Gespeichert',
    error: '⚠ Fehler beim Speichern'
  }[savingState];

  return (
    <header className="bg-[var(--color-primary-900)] text-white">
      <div className="px-6 py-3 flex items-center gap-4">
        <img src="/curriculr-logo.svg" alt="Curriculr" className="h-6" />
        <button onClick={onSwitchPlan} className="text-sm hover:opacity-80 flex items-center gap-1">
          {doc.meta.name} <span className="opacity-60">▼</span>
        </button>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-full bg-white/10">{stateLabel}</span>
          <div className="flex items-center bg-white/10 rounded-full overflow-hidden">
            <span className="px-3 py-1 bg-[var(--color-accent-warning)] text-black font-semibold rounded-full">
              Quartal
            </span>
            <span className="px-3 py-1 opacity-50 cursor-not-allowed" title="Phase 2">
              Schuljahr
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={openSettings} className="text-white hover:bg-white/10">
            <SettingsIcon className="w-4 h-4" />
          </Button>
          <Button onClick={onOpenExport} className="bg-[var(--color-accent-success)] hover:bg-emerald-700">
            Export ↓
          </Button>
        </div>
      </div>
    </header>
  );
}
