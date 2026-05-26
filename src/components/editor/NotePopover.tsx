import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import type { SchoolweekRange } from '@/lib/schoolweeks';

interface Props {
  schoolweek: number | null;
  week: SchoolweekRange | null;
  onClose(): void;
}

export function NotePopover({ schoolweek, week, onClose }: Props) {
  const doc = usePlannerStore((s) => s.doc);
  const setAnnotation = usePlannerStore((s) => s.setAnnotation);
  const deleteAnnotation = usePlannerStore((s) => s.deleteAnnotation);
  const [text, setText] = useState('');

  useEffect(() => {
    if (schoolweek === null || !doc) return;
    const a = doc.annotations.find((x) => x.schoolweek === schoolweek);
    setText(a?.text ?? '');
  }, [schoolweek, doc]);

  if (schoolweek === null || !week) return null;

  const save = () => {
    if (text.trim()) setAnnotation(schoolweek, text);
    else deleteAnnotation(schoolweek);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Anmerkung SW {schoolweek.toString().padStart(2, '0')}</DialogTitle>
        <p className="text-sm text-[var(--color-text-muted)]">
          {week.startDate} – {week.endDate}
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={500}
          autoFocus
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button onClick={save}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
