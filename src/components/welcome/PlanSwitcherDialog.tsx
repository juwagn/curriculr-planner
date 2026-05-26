import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { storage, type DocSummary } from '@/lib/storage';
import { usePlannerStore } from '@/stores/planner';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose(): void;
  onCreateNew(): void;
}

export function PlanSwitcherDialog({ open, onClose, onCreateNew }: Props) {
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const setDoc = usePlannerStore((s) => s.setDoc);
  const currentDoc = usePlannerStore((s) => s.doc);

  useEffect(() => {
    if (open) storage.listDocs().then(setDocs);
  }, [open]);

  const switchTo = async (id: string) => {
    const doc = await storage.loadDoc(id);
    setDoc(doc);
    await storage.setActiveDoc(id);
    onClose();
    toast.success(`Plan "${doc.meta.name}" geöffnet`);
  };

  const removeDoc = async (id: string, name: string) => {
    if (!confirm(`Plan "${name}" wirklich löschen?`)) return;
    await storage.deleteDoc(id);
    setDocs(docs.filter((d) => d.id !== id));
    toast.success('Plan gelöscht');
  };

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Pläne verwalten</DialogTitle>
        <div className="space-y-2 mt-4">
          {docs.map((d) => (
            <div
              key={d.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                d.id === currentDoc?.schoolyear.id ? 'bg-[var(--color-primary-100)] border-[var(--color-primary-500)]' : ''
              }`}
            >
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {d.eventCount} Termine · {new Date(d.lastSaved).toLocaleString('de-DE')}
                </div>
              </div>
              <div className="flex gap-2">
                {d.id !== currentDoc?.schoolyear.id && (
                  <Button size="sm" onClick={() => switchTo(d.id)}>Öffnen</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => removeDoc(d.id, d.name)}>✕</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => { onClose(); onCreateNew(); }}>
            + Neuen Plan erstellen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
