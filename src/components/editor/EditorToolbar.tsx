import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export function EditorToolbar() {
  const doc = usePlannerStore((s) => s.doc);
  const currentQuarter = useUiStore((s) => s.currentQuarter);
  const setQuarter = useUiStore((s) => s.setQuarter);
  const toggleNotes = useUiStore((s) => s.toggleNotesSidebar);
  const openCreate = useUiStore((s) => s.openCreateEvent);

  if (!doc) return null;

  const sy = doc.schoolyear;
  const qStarts: string[] = [
    sy.firstSchoolDay,
    sy.quarterBoundaries[0],
    sy.quarterBoundaries[1],
    sy.quarterBoundaries[2]
  ];
  const qEnds: string[] = [
    sy.quarterBoundaries[0],
    sy.quarterBoundaries[1],
    sy.quarterBoundaries[2],
    sy.lastSchoolDay
  ];

  const fmtRange = (i: number) => {
    if (!qStarts[i] || !qEnds[i]) return '';
    const s = parseISO(qStarts[i]);
    const e = parseISO(qEnds[i]);
    return `${format(s, 'MMM yyyy', { locale: de })} – ${format(e, 'MMM yyyy', { locale: de })}`;
  };

  return (
    <div className="bg-[var(--color-paper-card)] border-b border-[var(--color-ink-200)] px-6 py-2 flex items-center gap-2">
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
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={toggleNotes}>
          📝 Notizen
        </Button>
        <Button size="sm" onClick={() => openCreate()}>
          + Termin
        </Button>
      </div>
    </div>
  );
}
