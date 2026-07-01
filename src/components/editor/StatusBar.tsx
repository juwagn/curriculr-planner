import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore } from '@/stores/planner';
import { useWpSyncStore } from '@/stores/wpSync';
import { useUiStore } from '@/stores/ui';
import { STAGE_LABELS, type WpStage } from '@/lib/wp-stage';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
// PublishDialog added in Task 8 — placeholder for now
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PublishDialog = (_props: { open: boolean; onClose(): void }) => null;

const STAGE_COLOR: Record<WpStage, string> = {
  entwurf:     'var(--color-warning)',
  genehmigt:   'var(--color-marine-500)',
  oeffentlich: 'var(--color-status-green)',
};

const STAGE_DESCRIPTION: Record<WpStage, string> = {
  entwurf:     'Nur für dich sichtbar',
  genehmigt:   'Kollegium sieht die Entwurf-Vorschau',
  oeffentlich: 'Erscheint auf der Schulwebsite',
};

function formatPushedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return isToday
    ? `heute, ${time} Uhr`
    : `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}, ${time} Uhr`;
}

export function StatusBar() {
  const doc          = usePlannerStore((s) => s.doc);
  const setDoc       = usePlannerStore((s) => s.setDoc);
  const openSettings = useUiStore((s) => s.openSettings);

  const { config, conflict, pendingPull, clearConflict, confirmPull, cancelPull, keepLocal } =
    useWpSyncStore(
      useShallow((s) => ({
        config:        s.config,
        conflict:      s.conflict,
        pendingPull:   s.pendingPull,
        clearConflict: s.clearConflict,
        confirmPull:   s.confirmPull,
        cancelPull:    s.cancelPull,
        keepLocal:     s.keepLocal,
      }))
    );

  const [publishOpen, setPublishOpen] = useState(false);

  if (!doc) return null;

  const link      = config.links[doc.schoolyear.id];
  const stage     = (link?.stage ?? 'entwurf') as WpStage;
  const isEnabled = config.enabled && !!link;

  return (
    <>
      <div className="flex items-center gap-3 text-xs">
        {isEnabled ? (
          <>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-white/10">
              <span
                aria-hidden
                className="inline-block size-2 rounded-full"
                style={{ background: STAGE_COLOR[stage] }}
              />
              <span className="font-medium">{STAGE_LABELS[stage]}</span>
              <span className="text-[11px] opacity-50 hidden sm:inline">
                — {STAGE_DESCRIPTION[stage]}
              </span>
            </div>
            {link.lastPushedAt && (
              <span className="text-[11px] opacity-50 whitespace-nowrap hidden md:inline">
                Gesendet: {formatPushedAt(link.lastPushedAt)}
              </span>
            )}
            <Button
              size="sm"
              onClick={() => setPublishOpen(true)}
              className="bg-white/15 hover:bg-white/25 text-[var(--color-paper-card)] border border-white/20 text-[12px] px-3 py-1 h-auto"
            >
              Veröffentlichen
            </Button>
          </>
        ) : (
          <button
            onClick={() => openSettings('wordpress')}
            className="text-[11px] opacity-40 hover:opacity-70 transition-opacity underline"
            style={{ transitionDuration: 'var(--dur-state)' }}
          >
            Nicht verbunden
          </button>
        )}
      </div>

      <PublishDialog open={publishOpen} onClose={() => setPublishOpen(false)} />

      {/* Downgrade-Warnung */}
      <Dialog open={!!pendingPull} onOpenChange={(o) => { if (!o) cancelPull(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ältere Version laden?</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-[var(--color-ink-500)]">
            WordPress hat Version {pendingPull?.version}, aber hier ist bereits Version{' '}
            {pendingPull?.knownVersion} bekannt. Dein aktueller lokaler Stand wird überschrieben.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => cancelPull()}>Abbrechen</Button>
            <Button onClick={() => { confirmPull(setDoc); toast.success('Stand von WordPress geladen.'); }}>
              Trotzdem laden
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
          <p className="text-[14px] text-[var(--color-ink-500)]">
            Auf WordPress liegt bereits eine neuere Fassung (Version {conflict?.serverVersion}).
            {conflict?.authorName && (
              <> Gespeichert von{' '}
                <strong className="font-semibold text-[var(--color-ink-900)]">{conflict.authorName}</strong>.
              </>
            )}{' '}Was möchtest du tun?
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (conflict) { setDoc(conflict.serverDoc); clearConflict(); toast.success('Server-Stand geladen.'); }
              }}
            >
              Server-Stand laden
            </Button>
            <Button
              onClick={() => {
                void keepLocal(doc).then((r) => {
                  if (r === 'synced') toast.success('Dein Stand wurde gesendet.');
                  else toast.error(useWpSyncStore.getState().message || 'Fehler beim Senden.');
                });
              }}
            >
              Meinen Stand behalten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
