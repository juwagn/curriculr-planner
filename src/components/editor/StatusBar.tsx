import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore } from '@/stores/planner';
import { useWpSyncStore } from '@/stores/wpSync';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { startIservLogin } from '@/lib/wp-auth-actions';
import { STAGE_LABELS, type WpStage } from '@/lib/wp-stage';
import { fetchLatestRevision, type LatestRevision } from '@/lib/wp-sync';
import { relativeTime } from '@/hooks/usePresence';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { PublishDialog } from './PublishDialog';

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

  const authStatus = useAuthStore((s) => s.status);
  const authClaims = useAuthStore((s) => s.claims);
  const token      = useAuthStore((s) => s.token);

  const [publishOpen, setPublishOpen] = useState(false);
  const [pillOpen, setPillOpen]       = useState(false);
  const [latest, setLatest]           = useState<LatestRevision | null>(null);
  const [latestLoading, setLatestLoading] = useState(false);

  if (!doc) return null;

  const link           = config.links[doc.schoolyear.id];
  const stage          = (link?.stage ?? 'entwurf') as WpStage;
  const isEnabled      = config.enabled && !!link;
  const isAuthenticated = authStatus === 'authenticated';

  async function handlePillOpenChange(open: boolean) {
    setPillOpen(open);
    if (!open || !link || !token) return;
    setLatestLoading(true);
    const rev = await fetchLatestRevision(config, link.schoolyearKey, token);
    setLatestLoading(false);
    setLatest(rev === 'unauthorized' ? null : rev);
  }

  const latestRel = latest ? relativeTime(latest.savedAt) : '';
  const latestWhen = latest
    ? (latestRel || new Date(latest.savedAt.replace(' ', 'T')).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))
    : '';
  const showOwnPush = !!link?.lastPushedAt && (!latest || latest.authorSub !== authClaims?.sub);

  return (
    <>
      <div className="flex items-center gap-3 text-xs">
        {isEnabled ? (
          <>
            <Popover open={pillOpen} onOpenChange={(o) => void handlePillOpenChange(o)}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-white/10 hover:bg-white/15 transition-colors" style={{ transitionDuration: 'var(--dur-state)' }}>
                  <span
                    aria-hidden
                    className="inline-block size-2 rounded-full"
                    style={{ background: STAGE_COLOR[stage] }}
                  />
                  <span className="font-medium">{STAGE_LABELS[stage]}</span>
                  {link.knownVersion > 0 && (
                    <span className="text-[11px] opacity-70 tabular-nums">· v{link.knownVersion}</span>
                  )}
                  <span className="text-[11px] opacity-50 hidden sm:inline">
                    — {STAGE_DESCRIPTION[stage]}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="text-[var(--color-ink-900)]">
                <div className="flex items-center gap-1.5">
                  <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: STAGE_COLOR[stage] }} />
                  <span className="font-semibold text-[13px]">{STAGE_LABELS[stage]}</span>
                </div>
                <p className="text-[12px] text-[var(--color-ink-500)] -mt-1">{STAGE_DESCRIPTION[stage]}</p>
                <div className="border-t border-[var(--color-ink-200)] pt-2 space-y-1">
                  {latestLoading && <p className="text-[12px] text-[var(--color-ink-500)]">Lädt…</p>}
                  {!latestLoading && latest && (
                    <p className="text-[12px]">
                      Zuletzt gespeichert von{' '}
                      <strong className="font-semibold">{latest.authorName || 'Unbekannt'}</strong>
                      {latestWhen && <>, {latestWhen}</>} · Version {latest.version}
                    </p>
                  )}
                  {!latestLoading && !latest && (
                    <p className="text-[12px] text-[var(--color-ink-500)]">Keine Speicherhistorie verfügbar.</p>
                  )}
                  {showOwnPush && (
                    <p className="text-[12px] text-[var(--color-ink-500)]">
                      Du hast zuletzt gesendet: {formatPushedAt(link!.lastPushedAt!)}
                    </p>
                  )}
                </div>
                {stage === 'oeffentlich' && link?.feedUrl && (
                  <a
                    href={link.feedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[12px] font-medium underline pt-1"
                    style={{ color: 'var(--color-marine-500)' }}
                  >
                    <ExternalLink className="size-3" aria-hidden /> Live-Kalender öffnen
                  </a>
                )}
              </PopoverContent>
            </Popover>
            {isAuthenticated ? (
              <Button
                size="sm"
                onClick={() => setPublishOpen(true)}
                className="bg-white/15 hover:bg-white/25 text-[var(--color-paper-card)] border border-white/20 text-[12px] px-3 py-1 h-auto"
              >
                Veröffentlichen
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => startIservLogin(config.baseUrl)}
                className="bg-white/15 hover:bg-white/25 text-[var(--color-paper-card)] border border-white/20 text-[12px] px-3 py-1 h-auto"
              >
                Mit IServ anmelden
              </Button>
            )}
          </>
        ) : (
          <button
            onClick={() => openSettings('publish')}
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
