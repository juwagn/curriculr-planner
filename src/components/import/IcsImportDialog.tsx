import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { mapToEvents, shiftToSchoolyear, type ParsedEvent } from '@/lib/ics-import';
import type { Category, PlanEvent, Schoolyear } from '@/types';

interface Props {
  open: boolean;
  parsed: ParsedEvent[];
  categories: Category[];
  /** Present when appending into an existing plan; enables the shift option. */
  targetSchoolyear: Schoolyear | null;
  onCancel(): void;
  onConfirm(events: PlanEvent[]): void;
}

export function IcsImportDialog({ open, parsed, categories, targetSchoolyear, onCancel, onConfirm }: Props) {
  const [shift, setShift] = useState(false);

  const fallbackId = useMemo(
    () => categories.find((c) => c.slug === 'sondertag')?.id ?? categories[0]?.id ?? '',
    [categories]
  );

  const mapped = useMemo(
    () => mapToEvents(parsed, categories, fallbackId),
    [parsed, categories, fallbackId]
  );
  const fallbackCount = mapped.filter((e) => e.categoryId === fallbackId).length;

  const confirm = () => {
    const out = shift && targetSchoolyear ? shiftToSchoolyear(mapped, targetSchoolyear) : mapped;
    onConfirm(out);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ICS importieren</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-[13px] text-[var(--color-ink-900)]">
          <p>
            {parsed.length} Termine gefunden · {mapped.length - fallbackCount} zugeordnet ·{' '}
            {fallbackCount} Fallback (Sondertag).
          </p>
          {targetSchoolyear && (
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={shift} onCheckedChange={(v) => setShift(v === true)} />
              <span>Auf aktuelles Schuljahr verschieben (Wochentag bleibt erhalten)</span>
            </label>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button onClick={confirm}>{parsed.length} Termine übernehmen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
