import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { usePlannerStore } from '@/stores/planner';
import { useWpSyncStore } from '@/stores/wpSync';
import { availableActions, STAGE_LABELS, STAGE_ACTION_LABELS, type StageAction, type WpStage } from '@/lib/wp-stage';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Stufen-Farbe (Punkt + Text). Farbe NIE allein — immer mit Label.
const STAGE_COLOR: Record<WpStage, string> = {
  entwurf: 'var(--color-warning)',
  genehmigt: 'var(--color-marine-500)',
  oeffentlich: 'var(--color-status-green)',
};

const STAGE_HINT: Record<WpStage, string> = {
  entwurf: 'Nur die Leitung sieht den Entwurf (geschützter Link).',
  genehmigt: 'Genehmigt — noch nicht öffentlich. „Öffentlich schalten" macht ihn fürs Kollegium sichtbar.',
  oeffentlich: 'Öffentlich — das ganze Kollegium sieht diesen Plan.',
};

function StageDot({ stage }: { stage: WpStage }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2 rounded-full"
      style={{ background: STAGE_COLOR[stage] }}
    />
  );
}

function formatSavedAt(raw: string): string {
  const d = new Date(raw.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return ` am ${date} um ${time} Uhr`;
}

function showSyncToast(syncState: string, message: string, successMsg: string) {
  if (syncState === 'synced') toast.success(successMsg);
  else if (syncState === 'error') toast.error(message || 'Senden fehlgeschlagen.');
}

export function WpSyncControls() {
  const doc = usePlannerStore((s) => s.doc);
  const setDoc = usePlannerStore((s) => s.setDoc);
  const { config, syncState, conflict, send, pull, keepLocal, clearConflict } = useWpSyncStore(
    useShallow((s) => ({ config: s.config, syncState: s.syncState,
      conflict: s.conflict, send: s.send, pull: s.pull,
      keepLocal: s.keepLocal, clearConflict: s.clearConflict }))
  );

  const [open, setOpen] = useState(false);
  const [confirmPublic, setConfirmPublic] = useState(false);

  if (!doc || !config.enabled) return null;
  const link = config.links[doc.schoolyear.id];
  if (!link) return null;

  const stage = link.stage;
  const actions = availableActions(stage);
  const sending = syncState === 'sending';

  async function run(action?: StageAction) {
    if (!doc) return;
    setOpen(false);
    const result = await send(doc, action);
    showSyncToast(result, useWpSyncStore.getState().message, 'An WordPress gesendet.');
  }

  async function onKeepLocal() {
    if (!doc) return;
    const result = await keepLocal(doc);
    showSyncToast(result, useWpSyncStore.getState().message, 'Dein Stand wurde gesendet.');
  }

  function onAction(action: StageAction) {
    if (action === 'oeffentlich-schalten') {
      setOpen(false);
      setConfirmPublic(true);
    } else {
      void run(action);
    }
  }

  async function onPull() {
    if (!doc) return;
    setOpen(false);
    const result = await pull(doc.schoolyear.id, setDoc);
    if (result === 'pulled') toast.success('Stand von WordPress geladen.');
    else if (result === 'error') toast.error(useWpSyncStore.getState().message || 'Laden fehlgeschlagen.');
    else toast.info('Noch kein Plan auf WordPress vorhanden.');
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Veröffentlichen — Stufe ${STAGE_LABELS[stage]}`}
            className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-white/10 hover:bg-white/20 transition-colors"
            style={{ transitionDuration: 'var(--dur-state)' }}
          >
            <StageDot stage={stage} />
            <span className="font-medium">{STAGE_LABELS[stage]}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-72 p-0 text-[var(--color-text-main)]">
          <div className="px-4 py-3 border-b border-[var(--color-ink-200)]">
            <p className="text-[13px] font-semibold">Veröffentlichen</p>
            <div className="mt-1.5 flex items-center gap-2 text-[13px]">
              <StageDot stage={stage} />
              <span style={{ color: STAGE_COLOR[stage] }} className="font-medium">{STAGE_LABELS[stage]}</span>
              <span className="text-[var(--color-text-muted)]">
                · {link.knownVersion > 0 ? `auf WordPress (v${link.knownVersion})` : 'noch nicht gesendet'}
              </span>
            </div>
          </div>

          <div className="p-3 space-y-2">
            <Button className="w-full justify-center" disabled={sending} onClick={() => void run()}>
              {sending ? 'Sende…' : 'Nach WordPress senden'}
            </Button>

            <Button variant="outline" className="w-full justify-center" disabled={sending} onClick={() => void onPull()}>
              Aktualisieren
            </Button>

            {actions.map((a) => (
              <Button key={a} variant="outline" className="w-full justify-center"
                disabled={sending} onClick={() => onAction(a)}>
                {STAGE_ACTION_LABELS[a]}
              </Button>
            ))}

            <p className="text-[11px] text-[var(--color-text-muted)] pt-1">{STAGE_HINT[stage]}</p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Bestätigung: Öffentlich schalten */}
      <Dialog open={confirmPublic} onOpenChange={setConfirmPublic}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Für das ganze Kollegium sichtbar machen?</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-[var(--color-text-muted)]">
            Der Plan „{doc.meta.name}" wird damit öffentlich und für alle im Kollegium sichtbar.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmPublic(false)}>Abbrechen</Button>
            <Button onClick={() => { setConfirmPublic(false); void run('oeffentlich-schalten'); }}>
              Öffentlich schalten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konflikt (409) */}
      <Dialog open={!!conflict} onOpenChange={(o) => { if (!o) clearConflict(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WordPress hat eine neuere Version</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-[var(--color-text-muted)]">
            Auf WordPress liegt bereits eine neuere Fassung (Version {conflict?.serverVersion}).
            {conflict?.authorName && (
              <> Gespeichert von <strong className="font-semibold text-[var(--color-text-main)]">{conflict.authorName}</strong>
              {conflict.savedAt ? formatSavedAt(conflict.savedAt) : ''}.</>
            )}
            {' '}Was möchtest du tun?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline"
              onClick={() => { if (conflict) { setDoc(conflict.serverDoc); clearConflict(); toast.success('Server-Stand geladen.'); } }}>
              Server-Stand laden
            </Button>
            <Button onClick={() => void onKeepLocal()}>Meinen Stand behalten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
