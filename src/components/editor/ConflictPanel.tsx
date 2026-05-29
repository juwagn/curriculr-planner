import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { useConflicts } from '@/hooks/useConflicts';
import { getQuarterForDate } from '@/lib/schoolweeks';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose(): void;
}

export function ConflictPanel({ open, onClose }: Props) {
  const conflicts = useConflicts();
  const doc = usePlannerStore((s) => s.doc);
  const ignoreConflict = usePlannerStore((s) => s.ignoreConflict);
  const setQuarter = useUiStore((s) => s.setQuarter);
  const openEdit = useUiStore((s) => s.openEditEvent);

  if (!open || !doc) return null;

  const jump = (eventId: string) => {
    const ev = doc.events.find((e) => e.id === eventId);
    if (!ev) return;
    setQuarter(getQuarterForDate(ev.start, doc.schoolyear));
    openEdit(eventId);
    onClose();
  };

  return (
    <div className="absolute right-4 top-14 z-30 w-96 max-h-[70vh] overflow-auto rounded-[var(--radius-default)] border border-[var(--color-ink-200)] bg-[var(--color-paper-card)] p-3 shadow-[var(--shadow-modal)]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-semibold text-[var(--color-marine-800)]">
          Konflikte ({conflicts.length})
        </div>
        <button onClick={onClose} className="text-[var(--color-ink-500)] text-[13px]">
          ✕
        </button>
      </div>
      {conflicts.length === 0 && (
        <div className="text-[12px] text-[var(--color-ink-500)] py-4 text-center">
          Keine Konflikte 🎉
        </div>
      )}
      <ul className="space-y-2">
        {conflicts.map((c) => (
          <li
            key={c.key}
            className="rounded-[var(--radius-block)] border border-[var(--color-ink-200)] p-2"
          >
            <div className="flex items-start gap-1.5">
              <span style={{ color: c.severity === 'error' ? '#E02424' : '#B45309' }}>⚠</span>
              <span className="text-[12.5px] text-[var(--color-ink-900)] leading-snug flex-1">
                {c.message}
              </span>
            </div>
            <div className="flex gap-2 mt-1.5">
              <Button size="sm" variant="outline" onClick={() => jump(c.eventIds[0])}>
                Anzeigen
              </Button>
              <Button size="sm" variant="ghost" onClick={() => ignoreConflict(c.key)}>
                Ignorieren
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
