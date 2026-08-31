import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import { annotationsForWeek } from '@/lib/annotations';
import { computeSchoolweeks, type SchoolweekRange } from '@/lib/schoolweeks';

interface Props {
  week: SchoolweekRange | null;
  annotationId?: string | null;
  onClose(): void;
}

/** Editor for one note, with a week-local note list and keyboard-accessible move control. */
export function NotePopover({ week, annotationId = null, onClose }: Props) {
  const doc = usePlannerStore((state) => state.doc);
  const addAnnotation = usePlannerStore((state) => state.addAnnotation);
  const updateAnnotation = usePlannerStore((state) => state.updateAnnotation);
  const deleteAnnotation = usePlannerStore((state) => state.deleteAnnotation);
  const moveAnnotation = usePlannerStore((state) => state.moveAnnotation);
  const [selectedId, setSelectedId] = useState<string | null>(annotationId);
  const [text, setText] = useState('');
  const [targetWeekStart, setTargetWeekStart] = useState('');

  const annotations = useMemo(
    () => doc && week ? annotationsForWeek(doc.annotations, week.startDate) : [],
    [doc, week]
  );
  const selected = annotations.find((item) => item.id === selectedId) ?? null;
  const allWeeks = useMemo(() => (doc ? computeSchoolweeks(doc.schoolyear) : []), [doc]);

  useEffect(() => {
    if (!week) return;
    const next = annotationId && annotations.some((item) => item.id === annotationId)
      ? annotationId
      : annotations[0]?.id ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset draft for the requested week/note
    setSelectedId(next);
    setText(annotations.find((item) => item.id === next)?.text ?? '');
    setTargetWeekStart(week.startDate);
  }, [week, annotationId, annotations]);

  if (!week || !doc) return null;

  const select = (id: string | null) => {
    setSelectedId(id);
    setText(annotations.find((item) => item.id === id)?.text ?? '');
  };

  const save = () => {
    const trimmed = text.trim();
    if (selectedId) {
      if (trimmed) updateAnnotation(selectedId, { text });
      else deleteAnnotation(selectedId);
    } else if (trimmed) {
      addAnnotation(week.startDate, text);
    }
    onClose();
  };

  const move = () => {
    if (!selectedId || targetWeekStart === week.startDate) return;
    if (text.trim()) updateAnnotation(selectedId, { text });
    moveAnnotation(selectedId, targetWeekStart);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Anmerkungen · SW {week.index.toString().padStart(2, '0')}</DialogTitle>
        <p className="text-[13px] text-[var(--color-ink-500)] tabular-nums">
          {week.startDate} – {week.endDate}
        </p>
        {annotations.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Vorhandene Anmerkungen">
            {annotations.map((item, index) => (
              <button key={item.id} type="button" onClick={() => select(item.id)}
                className={`min-h-9 rounded-[var(--radius-block)] border px-2 text-[12px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-marine-800)] ${selectedId === item.id ? 'border-[var(--color-marine-800)] bg-[var(--color-gelb-100)] text-[var(--color-ink-900)]' : 'border-[var(--color-ink-200)] bg-[var(--color-paper-bg)] text-[var(--color-ink-500)]'}`}>
                Anmerkung {index + 1}
              </button>
            ))}
            <button type="button" onClick={() => select(null)}
              className="min-h-9 rounded-[var(--radius-block)] border border-dashed border-[var(--color-ink-300)] px-2 text-[12px] font-medium text-[var(--color-marine-800)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-marine-800)]">
              + Hinzufügen
            </button>
          </div>
        )}
        {annotations.length === 0 && <p className="text-[13px] text-[var(--color-ink-500)]">Neue Anmerkung für diese Schulwoche.</p>}
        <Textarea value={text} onChange={(event) => setText(event.target.value)} rows={4} maxLength={500} autoFocus aria-label="Text der Anmerkung" />
        {selected && (
          <div className="rounded-[var(--radius-default)] border border-[var(--color-ink-200)] bg-[var(--color-paper-bg)] p-3">
            <label className="block text-[12px] font-semibold text-[var(--color-ink-700)]" htmlFor="note-week-target">In Schulwoche verschieben …</label>
            <div className="mt-1.5 flex gap-2">
              <select id="note-week-target" value={targetWeekStart} onChange={(event) => setTargetWeekStart(event.target.value)}
                className="min-h-9 min-w-0 flex-1 rounded-[var(--radius-block)] border border-[var(--color-ink-300)] bg-[var(--color-paper-card)] px-2 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-marine-800)]">
                {allWeeks.map((item) => <option key={item.startDate} value={item.startDate}>SW {item.index.toString().padStart(2, '0')} · {item.startDate}</option>)}
              </select>
              <Button type="button" variant="outline" onClick={move} disabled={targetWeekStart === week.startDate}>Verschieben</Button>
            </div>
          </div>
        )}
        <DialogFooter>
          {selected && <Button variant="ghost" onClick={() => { deleteAnnotation(selected.id); onClose(); }}>Löschen</Button>}
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button onClick={save}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
