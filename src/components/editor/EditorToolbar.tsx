import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Undo2, Redo2, LayoutTemplate, Plus, StickyNote } from 'lucide-react';
import { getQuarterRange } from '@/lib/schoolweeks';

export function EditorToolbar() {
  const doc = usePlannerStore((s) => s.doc);
  const currentQuarter = useUiStore((s) => s.currentQuarter);
  const setQuarter = useUiStore((s) => s.setQuarter);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const toggleNotes = useUiStore((s) => s.toggleNotesSidebar);
  const toggleTemplates = useUiStore((s) => s.toggleTemplatesSidebar);
  const openCreate = useUiStore((s) => s.openCreateEvent);
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  if (!doc) return null;

  const sy = doc.schoolyear;

  const fmtRange = (i: number) => {
    const r = getQuarterRange((i + 1) as 1 | 2 | 3 | 4, sy);
    return `${format(parseISO(r.startDate), 'MMM yyyy', { locale: de })} – ${format(parseISO(r.endDate), 'MMM yyyy', { locale: de })}`;
  };

  const tabClass = (active: boolean) =>
    `relative -mb-px flex min-h-11 min-w-11 items-center justify-center border-b-2 px-3 text-[15px] font-semibold transition-colors lg:min-h-9 ${
      active
        ? 'border-[var(--cl-marine-800)] text-[var(--cl-marine-800)]'
        : 'border-transparent text-[var(--cl-ink-500)] hover:text-[var(--cl-ink-900)]'
    }`;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[var(--cl-line)] bg-[var(--cl-surface)] px-4 md:px-6">
      <div data-tour="view-toggle" role="group" aria-label="Ansicht" className="mr-3 flex items-center">
        <button onClick={() => setViewMode('table')} aria-pressed={viewMode === 'table'} className={tabClass(viewMode === 'table')}>
          Tabelle
        </button>
        <button onClick={() => setViewMode('year')} aria-pressed={viewMode === 'year'} className={tabClass(viewMode === 'year')}>
          Schuljahr
        </button>
      </div>
      {viewMode === 'table' ? (
        <div data-tour="quarter-tabs" role="group" aria-label="Quartal" className="flex items-center">
          {[1, 2, 3, 4].map((q) => (
            <button
              key={q}
              onClick={() => setQuarter(q as 1 | 2 | 3 | 4)}
              aria-pressed={currentQuarter === q}
              className={tabClass(currentQuarter === q)}
            >
              Q{q}
            </button>
          ))}
          <span className="ml-3 hidden text-[13px] text-[var(--cl-ink-500)] tabular-nums sm:inline">{fmtRange(currentQuarter - 1)}</span>
        </div>
      ) : (
        <span className="text-[15px] font-semibold text-[var(--cl-ink-900)]">Jahresübersicht</span>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2 py-2">
        <Button variant="ghost" size="icon-sm" className="size-11 lg:size-9" disabled={!canUndo} onClick={undo} aria-label="Rückgängig" title="Rückgängig (Strg+Z)">
          <Undo2 />
        </Button>
        <Button variant="ghost" size="icon-sm" className="size-11 lg:size-9" disabled={!canRedo} onClick={redo} aria-label="Wiederholen" title="Wiederholen (Strg+Umschalt+Z)">
          <Redo2 />
        </Button>
        <Button data-tour="templates-btn" variant="outline" size="sm" className="h-11 px-3 text-[13px] lg:h-9" onClick={toggleTemplates} aria-label="Vorlagen anzeigen" title="Vorlagen">
          <LayoutTemplate />
          Vorlagen
        </Button>
        <Button variant="outline" size="sm" className="h-11 px-3 text-[13px] lg:h-9" onClick={toggleNotes}>
          <StickyNote />
          Notizen
        </Button>
        <Button data-tour="add-event-btn" size="sm" className="h-11 px-3 text-[13px] lg:h-9" onClick={() => openCreate()}>
          <Plus />
          Termin anlegen
        </Button>
      </div>
    </div>
  );
}
