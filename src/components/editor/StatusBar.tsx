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
  entwurf:     'Nur für Sie sichtbar',
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
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {isEnabled ? (
          <>
            <Popover open={pillOpen} onOpenChange={(o) => void handlePillOpenChange(o)}>
              <PopoverTrigger asChild>
                <button className="flex min-h-11 items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--cl-line)] px-3 py-1 transition-colors hover:bg-[var(--cl-bg)] lg:min-h-9" style={{ transitionDuration: 'var(--dur-state)' }}>
                  <span
                    aria-hidden
                    className="inline-block size-2 rounded-full"
                    style={{ background: STAGE_COLOR[stage] }}
                  />
                  <span className="font-medium">{STAGE_LABELS[stage]}</span>
                  {link.knownVersion > 0 && (
                    <span className="text-[12px] text-[var(--cl-ink-500)] tabular-nums">· v{link.knownVersion}</span>
                  )}
                  <span className="text-[12px] text-[var(--cl-ink-500)] hidden lg:inline">
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
                      Sie haben zuletzt gesendet: {formatPushedAt(link!.lastPushedAt!)}
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
                variant="outline"
                onClick={() => setPublishOpen(true)}
                className="h-11 px-3 text-[13px] lg:h-9"
              >
                Veröffentlichen
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => startIservLogin(config.baseUrl)}
                className="h-11 px-3 text-[13px] lg:h-9"
              >
                Mit IServ anmelden
              </Button>
            )}
          </>
        ) : (
          <button
            onClick={() => openSettings('publish')}
            className="min-h-11 px-1 text-[12px] text-[var(--cl-ink-500)] underline hover:text-[var(--cl-ink-900)] lg:min-h-9"
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
            {pendingPull?.knownVersion} bekannt. Ihr aktueller lokaler Stand wird überschrieben.
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
            )}{' '}Was möchten Sie tun?
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
                  if (r === 'synced') toast.success('Ihr Stand wurde gesendet.');
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
