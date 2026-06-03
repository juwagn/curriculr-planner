import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui';
import { usePlannerStore } from '@/stores/planner';
import { openPrintWindow } from '@/lib/print-window';

export function PrintDialog() {
  const open = useUiStore((s) => s.printDialogOpen);
  const close = useUiStore((s) => s.closePrintDialog);
  const scope = useUiStore((s) => s.printScope);
  const setScope = useUiStore((s) => s.setPrintScope);
  const orientation = useUiStore((s) => s.printOrientation);
  const setOrientation = useUiStore((s) => s.setPrintOrientation);
  const currentQuarter = useUiStore((s) => s.currentQuarter);

  const handlePrint = () => {
    const doc = usePlannerStore.getState().doc;
    if (!doc) return;
    openPrintWindow(doc, scope, currentQuarter, orientation);
    close();
  };

  if (!open) return null;

  const radioRow = (label: string, checked: boolean, onChange: () => void) => (
    <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[var(--color-ink-900)]">
      <input type="radio" checked={checked} onChange={onChange} className="accent-[var(--color-marine-800)]" />
      {label}
    </label>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Als PDF drucken</DialogTitle>
        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Umfang</p>
            {radioRow('Aktuelles Quartal', scope === 'currentQuarter', () => setScope('currentQuarter'))}
            {radioRow('Ganzes Schuljahr (Q1–4)', scope === 'allQuarters', () => setScope('allQuarters'))}
          </div>
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Format</p>
            {radioRow('Hochformat (A4)', orientation === 'portrait', () => setOrientation('portrait'))}
            {radioRow('Querformat (A4)', orientation === 'landscape', () => setOrientation('landscape'))}
          </div>
          <Button className="w-full" onClick={handlePrint}>
            Drucken / Als PDF speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
