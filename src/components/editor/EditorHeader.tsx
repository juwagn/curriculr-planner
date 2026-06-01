import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, HelpCircle } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { useConflicts } from '@/hooks/useConflicts';
import { ExportDropdown } from '@/components/export/ExportDropdown';
import { ConflictPanel } from './ConflictPanel';

interface Props {
  onSwitchPlan(): void;
}

export function EditorHeader({ onSwitchPlan }: Props) {
  const doc = usePlannerStore((s) => s.doc);
  const savingState = usePlannerStore((s) => s.savingState);
  const openSettings = useUiStore((s) => s.openSettings);
  const openHelp = useUiStore((s) => s.openHelp);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const conflicts = useConflicts();
  const [panelOpen, setPanelOpen] = useState(false);
  const hasError = conflicts.some((c) => c.severity === 'error');

  if (!doc) return null;

  const stateLabel = {
    idle: '● Gespeichert',
    saving: '○ Speichert…',
    saved: '● Gespeichert',
    error: '⚠ Fehler beim Speichern'
  }[savingState];

  return (
    <header className="relative bg-[var(--color-marine-800)] text-[var(--color-paper-card)]">
      <div className="px-6 py-3 flex items-center gap-4" style={{ minHeight: 48 }}>
        <img src={`${import.meta.env.BASE_URL}curriculr-logo.svg`} alt="Curriculr" className="h-6" />
        <button
          data-tour="plan-name"
          onClick={onSwitchPlan}
          className="text-[15px] font-semibold hover:opacity-80 flex items-center gap-1 transition-opacity"
          style={{ transitionDuration: 'var(--dur-state)' }}
        >
          {doc.meta.name} <span className="opacity-60">▼</span>
        </button>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-[var(--radius-pill)] bg-white/10 tabular-nums">{stateLabel}</span>
          <div
            data-tour="view-toggle"
            className="flex items-center bg-white/10 rounded-[var(--radius-pill)] overflow-hidden"
          >
            <button
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className="px-3 py-1 font-semibold transition-colors"
              style={{
                background: viewMode === 'table' ? 'var(--color-paper-card)' : 'transparent',
                color: viewMode === 'table' ? 'var(--color-marine-800)' : 'rgba(255,255,255,0.7)',
                transitionDuration: 'var(--dur-state)'
              }}
            >
              Tabelle
            </button>
            <button
              onClick={() => setViewMode('year')}
              aria-pressed={viewMode === 'year'}
              className="px-3 py-1 font-semibold transition-colors"
              style={{
                background: viewMode === 'year' ? 'var(--color-paper-card)' : 'transparent',
                color: viewMode === 'year' ? 'var(--color-marine-800)' : 'rgba(255,255,255,0.7)',
                transitionDuration: 'var(--dur-state)'
              }}
            >
              Schuljahr
            </button>
          </div>
          {conflicts.length > 0 && (
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="flex items-center gap-1 rounded-[var(--radius-block)] px-2.5 py-1.5 text-[12.5px] font-semibold"
              style={{
                background: hasError ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)' : 'var(--color-gelb-100)',
                color: hasError ? 'var(--color-danger)' : 'var(--color-warning)'
              }}
            >
              ⚠ {conflicts.length} {conflicts.length === 1 ? 'Konflikt' : 'Konflikte'}
            </button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={openHelp}
            aria-label="Hilfe"
            title="Hilfe"
            className="text-[var(--color-paper-card)] hover:bg-white/10 hover:text-[var(--color-paper-card)]"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button
            data-tour="settings-btn"
            variant="ghost"
            size="icon"
            onClick={() => openSettings()}
            className="text-[var(--color-paper-card)] hover:bg-white/10 hover:text-[var(--color-paper-card)]"
          >
            <SettingsIcon className="w-4 h-4" />
          </Button>
          <ExportDropdown />
        </div>
      </div>
      <ConflictPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </header>
  );
}
