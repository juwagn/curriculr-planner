import { usePlannerStore } from '@/stores/planner';
import { useWpSyncStore } from '@/stores/wpSync';
import { availableActions, STAGE_LABELS, STAGE_ACTION_LABELS, type StageAction } from '@/lib/wp-stage';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export function WpSyncControls() {
  const doc = usePlannerStore((s) => s.doc);
  const setDoc = usePlannerStore((s) => s.setDoc);
  const config = useWpSyncStore((s) => s.config);
  const syncState = useWpSyncStore((s) => s.syncState);
  const message = useWpSyncStore((s) => s.message);
  const conflict = useWpSyncStore((s) => s.conflict);
  const send = useWpSyncStore((s) => s.send);
  const keepLocal = useWpSyncStore((s) => s.keepLocal);
  const clearConflict = useWpSyncStore((s) => s.clearConflict);

  if (!doc || !config.enabled) return null;
  const link = config.links[doc.schoolyear.id];
  if (!link) return null;

  const actions = availableActions(link.stage);

  function confirmPublic(action: StageAction): boolean {
    if (action === 'oeffentlich-schalten') {
      return window.confirm('Diesen Plan für das ganze Kollegium sichtbar machen?');
    }
    return true;
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="px-2 py-1 rounded-[var(--radius-pill)] bg-white/10">
        Stufe: {STAGE_LABELS[link.stage]}
      </span>
      <Button
        size="sm"
        variant="secondary"
        disabled={syncState === 'sending'}
        onClick={() => send(doc)}
      >
        Nach WordPress senden
      </Button>
      {actions.map((a) => (
        <Button
          key={a}
          size="sm"
          variant="outline"
          disabled={syncState === 'sending'}
          onClick={() => {
            if (confirmPublic(a)) send(doc, a);
          }}
        >
          {STAGE_ACTION_LABELS[a]}
        </Button>
      ))}
      {message && <span className="opacity-90">{message}</span>}

      <Dialog open={!!conflict} onOpenChange={(o) => { if (!o) clearConflict(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WordPress hat eine neuere Version</DialogTitle>
          </DialogHeader>
          <p className="text-[14px]">
            Auf WordPress liegt bereits eine neuere Fassung (Version {conflict?.serverVersion}).
            Was möchtest du tun?
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (conflict) {
                  setDoc(conflict.serverDoc);
                  clearConflict();
                }
              }}
            >
              Server-Stand laden (lokale Änderungen verwerfen)
            </Button>
            <Button onClick={() => keepLocal(doc)}>
              Meinen Stand behalten und senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
