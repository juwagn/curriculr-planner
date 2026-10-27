import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { useConflicts } from '@/hooks/useConflicts';
import { getQuarterForDate } from '@/lib/schoolweeks';
import { Button } from '@/components/ui/button';

import { TriangleAlert, X } from 'lucide-react';

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
    <div className="absolute right-4 top-14 z-30 w-[calc(100vw-2rem)] max-w-96 max-h-[70vh] overflow-auto rounded-[var(--radius-default)] border border-[var(--color-ink-200)] bg-[var(--color-paper-card)] p-3 shadow-[var(--shadow-modal)]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-semibold text-[var(--color-marine-800)]">
          Konflikte ({conflicts.length})
        </div>
        <button onClick={onClose} aria-label="Konflikte schließen" className="flex size-11 items-center justify-center rounded-[var(--radius-input)] text-[var(--color-ink-500)] hover:bg-[var(--cl-bg)] lg:size-9">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {conflicts.length === 0 && (
        <div className="text-[12px] text-[var(--color-ink-500)] py-4 text-center">
          Keine Konflikte
        </div>
      )}
      <ul className="space-y-2">
        {conflicts.map((c) => {
          const isError = c.severity === 'error';
          const accent = isError ? 'var(--color-danger)' : 'var(--color-warning)';
          return (
            <li
              key={c.key}
              className="rounded-[var(--radius-block)] p-2.5"
              style={{
                background: isError
                  ? 'var(--cl-danger-bg)'
                  : 'var(--cl-warning-bg)'
              }}
            >
              <div className="flex items-start gap-1.5">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
                <span className="text-[12.5px] text-[var(--color-ink-900)] leading-snug flex-1">
                  {c.message}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => jump(c.eventIds[0])}>
                  Anzeigen
                </Button>
                <button
                  onClick={() => ignoreConflict(c.key)}
                  className="text-[0.8rem] font-medium px-2.5 py-1 rounded-[var(--radius-block)] text-[var(--color-ink-500)] hover:bg-black/5 transition-colors"
                >
                  Ignorieren
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
