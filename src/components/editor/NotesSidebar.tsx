import { useState } from 'react';
import { useUiStore } from '@/stores/ui';
import { usePlannerStore } from '@/stores/planner';
import { computeSchoolweeks } from '@/lib/schoolweeks';
import { NotePopover } from './NotePopover';
import { X } from 'lucide-react';

export function NotesSidebar() {
  const open = useUiStore((s) => s.notesSidebarOpen);
  const toggle = useUiStore((s) => s.toggleNotesSidebar);
  const doc = usePlannerStore((s) => s.doc);
  const [editSw, setEditSw] = useState<number | null>(null);

  if (!open || !doc) return null;

  const weeks = computeSchoolweeks(doc.schoolyear);
  const sorted = [...weeks].sort((a, b) => a.index - b.index);

  return (
    <>
      <aside
        className="fixed top-0 right-0 h-full w-80 bg-[var(--color-paper-card)] border-l border-[var(--color-ink-200)] z-40 flex flex-col"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="px-4 py-3 border-b border-[var(--color-ink-200)] flex items-center justify-between">
          <h3 className="font-semibold text-[15px] text-[var(--color-marine-800)]">Anmerkungen</h3>
          <button
            onClick={toggle}
            className="p-1 hover:bg-[var(--color-paper-bg)] rounded-[var(--radius-default)] transition-colors"
            style={{ transitionDuration: 'var(--dur-state)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sorted.map((w) => {
            const ann = doc.annotations.find((a) => a.schoolweek === w.index);
            const has = !!ann && ann.text.trim().length > 0;
            return (
              <button
                key={w.index}
                onClick={() => setEditSw(w.index)}
                className={`w-full text-left p-3 rounded-[var(--radius-default)] border transition-colors ${
                  has
                    ? 'bg-[var(--color-gelb-100)] border-[var(--color-gelb-200)] hover:bg-[var(--color-gelb-200)]/60'
                    : 'bg-[var(--color-paper-bg)] border-[var(--color-ink-200)] hover:bg-[var(--color-paper-bg)]/60'
                }`}
                style={{ transitionDuration: 'var(--dur-state)' }}
              >
                <div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-marine-800)] tabular-nums">
                  SW {w.index.toString().padStart(2, '0')} · {w.startDate.slice(5)} – {w.endDate.slice(5)}
                </div>
                <div className={`text-[13px] mt-1 ${has ? 'text-[var(--color-ink-900)]' : 'italic text-[var(--color-ink-500)]'}`}>
                  {has ? ann!.text : 'Keine Anmerkung'}
                </div>
              </button>
            );
          })}
        </div>
      </aside>
      <NotePopover
        schoolweek={editSw}
        week={editSw !== null ? sorted.find((w) => w.index === editSw) ?? null : null}
        onClose={() => setEditSw(null)}
      />
    </>
  );
}
