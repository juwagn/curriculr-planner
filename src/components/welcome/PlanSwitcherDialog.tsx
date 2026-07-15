import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { storage, type DocSummary } from '@/lib/storage';
import { usePlannerStore } from '@/stores/planner';
import { useAuthStore } from '@/stores/auth';
import { useWpSyncStore } from '@/stores/wpSync';
import { fetchDocList, type DocListItem } from '@/lib/wp-sync';
import { startIservLogin } from '@/lib/wp-auth-actions';
import { STAGE_LABELS, type WpStage } from '@/lib/wp-stage';
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
  const [wpItems, setWpItems] = useState<DocListItem[]>([]);
  const [wpLoading, setWpLoading] = useState(false);
  const [wpMsg, setWpMsg] = useState<string | null>(null);
  const setDoc = usePlannerStore((s) => s.setDoc);
  const currentDoc = usePlannerStore((s) => s.doc);
  const authed = useAuthStore((s) => s.status === 'authenticated');
  const token = useAuthStore((s) => s.token);
  const config = useWpSyncStore((s) => s.config);
  const loadFromWp = useWpSyncStore((s) => s.loadFromWp);

  useEffect(() => {
    if (open) {
      storage.listDocs().then((docs) => {
        setDocs(docs);
        setConfirmDeleteId(null);
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open || !config.enabled || !authed || !token) return;
    const ac = new AbortController();
    Promise.resolve()
      .then(() => {
        if (ac.signal.aborted) return;
        setWpLoading(true);
        setWpMsg(null);
        return fetchDocList(config, token);
      })
      .then((result) => {
        if (!result || ac.signal.aborted) return;
        const { items, message } = result;
        setWpItems(items);
        setWpMsg(message ?? (items.length === 0 ? 'Keine Pläne auf WordPress.' : null));
        setWpLoading(false);
      });
    return () => { ac.abort(); };
  }, [open, config, authed, token]);

  const loadWp = async (item: DocListItem) => {
    const result = await loadFromWp(item.sj, item.name, setDoc);
    if (result === 'loaded') {
      toast.success(`Plan „${item.name}" von WordPress geladen`);
      onClose();
    } else {
      toast.error(useWpSyncStore.getState().message || 'Laden fehlgeschlagen');
    }
  };

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

        {config.enabled && (
          <div className="mt-2 pt-4 border-t border-[var(--color-ink-200)] space-y-2">
            <p className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
              Auf WordPress
            </p>
            {!authed && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-[var(--color-ink-500)]">
                  Für die gemeinsamen Pläne mit IServ anmelden.
                </p>
                <Button size="sm" variant="outline" onClick={() => startIservLogin(config.baseUrl)} disabled={!config.baseUrl}>
                  Mit IServ anmelden
                </Button>
              </div>
            )}
            {authed && wpLoading && <p className="text-[13px] text-[var(--color-ink-500)]">Lädt…</p>}
            {authed && !wpLoading && wpMsg && <p className="text-[13px] text-[var(--color-ink-500)]">{wpMsg}</p>}
            {authed && !wpLoading && wpItems.map((it) => (
              <div
                key={it.sj}
                className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-default)] border border-[var(--color-ink-200)]"
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--color-ink-900)] truncate">
                    {it.name}
                    <span
                      className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--color-paper-bg)', color: 'var(--color-ink-500)' }}
                    >
                      {STAGE_LABELS[it.stage as WpStage]}
                    </span>
                  </div>
                  <div className="text-[12px] text-[var(--color-ink-500)] tabular-nums">
                    v{it.version}{it.authorName ? ` · ${it.authorName}` : ''}{it.updatedAt ? ` · ${it.updatedAt.slice(0, 10)}` : ''}
                  </div>
                </div>
                <Button size="sm" onClick={() => loadWp(it)}>Laden</Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 pt-4 border-t border-[var(--color-ink-200)]">
          <Button variant="outline" onClick={() => { onClose(); onCreateNew(); }}>
            + Neuen Plan erstellen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
