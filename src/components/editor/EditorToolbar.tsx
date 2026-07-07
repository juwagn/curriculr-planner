import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Undo2, Redo2, LayoutTemplate, StickyNote } from 'lucide-react';
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

  return (
    <div className="bg-[var(--color-paper-card)] border-b border-[var(--color-ink-200)] px-6 py-2 flex items-center gap-2">
      <div
        data-tour="view-toggle"
        className="flex items-center rounded-[var(--radius-pill)] overflow-hidden mr-3"
        style={{ background: 'var(--color-paper-bg)' }}
      >
        <button
          onClick={() => setViewMode('table')}
          aria-pressed={viewMode === 'table'}
          className="px-3 py-1 text-sm font-semibold transition-colors"
          style={{
            background: viewMode === 'table' ? 'var(--color-marine-800)' : 'transparent',
            color: viewMode === 'table' ? 'var(--color-paper-card)' : 'var(--color-ink-500)',
            transitionDuration: 'var(--dur-state)',
          }}
        >
          Tabelle
        </button>
        <button
          onClick={() => setViewMode('year')}
          aria-pressed={viewMode === 'year'}
          className="px-3 py-1 text-sm font-semibold transition-colors"
          style={{
            background: viewMode === 'year' ? 'var(--color-marine-800)' : 'transparent',
            color: viewMode === 'year' ? 'var(--color-paper-card)' : 'var(--color-ink-500)',
            transitionDuration: 'var(--dur-state)',
          }}
        >
          Schuljahr
        </button>
      </div>
      {viewMode === 'table' ? (
        <div data-tour="quarter-tabs" className="flex items-center gap-2">
          {[1, 2, 3, 4].map((q) => (
            <button
              key={q}
              onClick={() => setQuarter(q as 1 | 2 | 3 | 4)}
              className="px-4 py-1.5 rounded-[var(--radius-pill)] text-sm font-semibold transition-colors"
              style={{
                background: currentQuarter === q ? 'var(--color-marine-800)' : 'var(--color-paper-bg)',
                color: currentQuarter === q ? 'var(--color-paper-card)' : 'var(--color-ink-500)',
                transitionDuration: 'var(--dur-state)',
                transitionTimingFunction: 'var(--ease-state)'
              }}
            >
              Q{q}
            </button>
          ))}
          <span className="ml-3 text-sm text-[var(--color-ink-500)] tabular-nums">{fmtRange(currentQuarter - 1)}</span>
        </div>
      ) : (
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">Jahresübersicht</span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" disabled={!canUndo} onClick={undo} aria-label="Rückgängig" title="Rückgängig (Strg+Z)">
          <Undo2 />
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={!canRedo} onClick={redo} aria-label="Wiederholen" title="Wiederholen (Strg+Umschalt+Z)">
          <Redo2 />
        </Button>
        <Button data-tour="templates-btn" variant="outline" size="sm" onClick={toggleTemplates} aria-label="Vorlagen anzeigen" title="Vorlagen">
          <LayoutTemplate />
          Vorlagen
        </Button>
        <Button variant="outline" size="sm" onClick={toggleNotes}>
          <StickyNote />
          Notizen
        </Button>
        <Button data-tour="add-event-btn" size="sm" onClick={() => openCreate()}>
          + Termin
        </Button>
      </div>
    </div>
  );
}
