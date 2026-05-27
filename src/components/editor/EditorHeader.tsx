import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { ExportDropdown } from '@/components/export/ExportDropdown';

interface Props {
  onSwitchPlan(): void;
}

export function EditorHeader({ onSwitchPlan }: Props) {
  const doc = usePlannerStore((s) => s.doc);
  const savingState = usePlannerStore((s) => s.savingState);
  const openSettings = useUiStore((s) => s.openSettings);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);

  if (!doc) return null;

  const stateLabel = {
    idle: '● Gespeichert',
    saving: '○ Speichert…',
    saved: '● Gespeichert',
    error: '⚠ Fehler beim Speichern'
  }[savingState];

  return (
    <header className="bg-[var(--color-marine-800)] text-[var(--color-paper-card)]">
      <div className="px-6 py-3 flex items-center gap-4" style={{ minHeight: 48 }}>
        <img src="/curriculr-logo.svg" alt="Curriculr" className="h-6" />
        <button
          onClick={onSwitchPlan}
          className="text-[15px] font-semibold hover:opacity-80 flex items-center gap-1 transition-opacity"
          style={{ transitionDuration: 'var(--dur-state)' }}
        >
          {doc.meta.name} <span className="opacity-60">▼</span>
        </button>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-[var(--radius-pill)] bg-white/10 tabular-nums">{stateLabel}</span>
          <div className="flex items-center bg-white/10 rounded-[var(--radius-pill)] overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className="px-3 py-1 font-semibold transition-colors"
              style={{
                background: viewMode === 'table' ? 'var(--color-gelb-500)' : 'transparent',
                color: viewMode === 'table' ? 'var(--color-ink-900)' : undefined,
                transitionDuration: 'var(--dur-state)'
              }}
            >
              Tabelle
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className="px-3 py-1 font-semibold transition-colors"
              style={{
                background: viewMode === 'calendar' ? 'var(--color-gelb-500)' : 'transparent',
                color: viewMode === 'calendar' ? 'var(--color-ink-900)' : undefined,
                transitionDuration: 'var(--dur-state)'
              }}
            >
              Kalender
            </button>
          </div>
          <Button variant="ghost" size="icon" onClick={openSettings} className="text-[var(--color-paper-card)] hover:bg-white/10 hover:text-[var(--color-paper-card)]">
            <SettingsIcon className="w-4 h-4" />
          </Button>
          <ExportDropdown />
        </div>
      </div>
    </header>
  );
}
