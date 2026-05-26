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
      <aside className="fixed top-0 right-0 h-full w-80 bg-white border-l shadow-lg z-40 flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-primary-900)]">Anmerkungen</h3>
          <button onClick={toggle} className="p-1 hover:bg-gray-100 rounded">
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
                className={`w-full text-left p-3 rounded-lg border transition ${
                  has
                    ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                }`}
              >
                <div className="text-xs font-semibold text-[var(--color-primary-900)]">
                  SW {w.index.toString().padStart(2, '0')} · {w.startDate.slice(5)} – {w.endDate.slice(5)}
                </div>
                <div className={`text-sm mt-1 ${has ? '' : 'italic text-gray-400'}`}>
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
