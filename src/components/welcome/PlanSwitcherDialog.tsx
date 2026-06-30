import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { storage, type DocSummary } from '@/lib/storage';
import { usePlannerStore } from '@/stores/planner';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose(): void;
  onCreateNew(): void;
}

export function PlanSwitcherDialog({ open, onClose, onCreateNew }: Props) {
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const setDoc = usePlannerStore((s) => s.setDoc);
  const currentDoc = usePlannerStore((s) => s.doc);

  useEffect(() => {
    if (open) {
      storage.listDocs().then(setDocs);
      setConfirmDeleteId(null);
    }
  }, [open]);

  const switchTo = async (id: string) => {
    const doc = await storage.loadDoc(id);
    setDoc(doc);
    await storage.setActiveDoc(id);
    onClose();
    toast.success(`Plan „${doc.meta.name}" geöffnet`);
  };

  const removeDoc = async (id: string, name: string) => {
    await storage.deleteDoc(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setConfirmDeleteId(null);
    toast.success(`Plan „${name}" gelöscht`);
  };

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Pläne verwalten</DialogTitle>

        <div className="space-y-2 mt-2">
          {docs.length === 0 && (
            <p className="text-[13px] text-[var(--color-ink-500)] py-2">
              Keine lokalen Pläne vorhanden.
            </p>
          )}

          {docs.map((d) => {
            const isCurrent = d.id === currentDoc?.schoolyear.id;
            const isConfirming = confirmDeleteId === d.id;

            if (isConfirming) {
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-default)] border border-[var(--color-status-red)] bg-red-50"
                >
                  <span className="text-[13px] font-medium text-[var(--color-status-red)] min-w-0 truncate">
                    „{d.name}" wirklich löschen?
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                      Abbrechen
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeDoc(d.id, d.name)}
                    >
                      Löschen
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={d.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-[var(--radius-default)] border transition-colors ${
                  isCurrent
                    ? 'bg-[var(--color-marine-100)] border-[var(--color-marine-500)]'
                    : 'border-[var(--color-ink-200)]'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--color-ink-900)] truncate">
                    {d.name}
                    {isCurrent && (
                      <span className="ml-2 text-[11px] font-medium text-[var(--color-marine-500)]">
                        (aktiv)
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[var(--color-ink-500)] tabular-nums">
                    {d.eventCount} Termine · {new Date(d.lastSaved).toLocaleString('de-DE')}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isCurrent && (
                    <Button size="sm" onClick={() => switchTo(d.id)}>
                      Öffnen
                    </Button>
                  )}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-[var(--color-ink-500)] hover:text-[var(--color-status-red)] hover:bg-red-50"
                    onClick={() => setConfirmDeleteId(d.id)}
                    aria-label={`${d.name} löschen`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 pt-4 border-t border-[var(--color-ink-200)]">
          <Button variant="outline" onClick={() => { onClose(); onCreateNew(); }}>
            + Neuen Plan erstellen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
