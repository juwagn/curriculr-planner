import { useState } from 'react';
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useConflicts } from '@/hooks/useConflicts';
import { EditorOverflowMenu } from './EditorOverflowMenu';
import { ConflictPanel } from './ConflictPanel';
import { StatusBar } from './StatusBar';
import { useAuthStore } from '@/stores/auth';
import { useWpSyncStore } from '@/stores/wpSync';
import { usePresence, relativeTime } from '@/hooks/usePresence';
import { toast } from 'sonner';

interface Props {
  onSwitchPlan(): void;
}

export function EditorHeader({ onSwitchPlan }: Props) {
  const doc = usePlannerStore((s) => s.doc);
  const setDoc = usePlannerStore((s) => s.setDoc);
  const presence = usePresence(doc?.schoolyear.id);
  const savingState = usePlannerStore((s) => s.savingState);
  const conflicts = useConflicts();
  const [panelOpen, setPanelOpen] = useState(false);
  const hasError = conflicts.some((c) => c.severity === 'error');
  const authStatus = useAuthStore((s) => s.status);
  const authClaims = useAuthStore((s) => s.claims);
  const authToken = useAuthStore((s) => s.token);
  const authLogout = useAuthStore((s) => s.logout);
  const wpBaseUrl = useWpSyncStore((s) => s.config.baseUrl);
  const wpLinks = useWpSyncStore((s) => s.config.links);
  const wpPull = useWpSyncStore((s) => s.pull);
  const [pulling, setPulling] = useState(false);

  function handleLogout() {
    const currentToken = authToken;
    authLogout();
    if (wpBaseUrl && currentToken) {
      fetch(`${wpBaseUrl.replace(/\/+$/, '')}/wp-json/curriculr/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
      }).catch(() => {});
    }
  }

  if (!doc) return null;

  const stateIndicator = {
    idle:   <><CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Gespeichert</>,
    saving: <><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Speichert…</>,
    saved:  <><CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Gespeichert</>,
    error:  <><AlertTriangle className="w-3 h-3" aria-hidden="true" /> Fehler beim Speichern</>,
  }[savingState];

  const presenceRel = presence?.authorName ? relativeTime(presence.savedAt) : '';
  const saveStatusTitle = presenceRel ? `${presence!.authorName} hat ${presenceRel} gespeichert` : undefined;

  // Server has a newer version than this browser knows → visible banner with pull CTA.
  const link = wpLinks[doc.schoolyear.id];
  const hasServerUpdate = !!presence && !!link && presence.version > link.knownVersion;

  async function handlePullUpdate() {
    setPulling(true);
    const result = await wpPull(doc!.schoolyear.id, setDoc);
    setPulling(false);
    if (result === 'pulled') toast.success('Aktueller Stand von WordPress geladen.');
    else if (result === 'error') toast.error(useWpSyncStore.getState().message || 'Laden fehlgeschlagen.');
  }

  return (
    <header className="relative bg-[var(--color-marine-800)] text-[var(--color-paper-card)]">
      <div className="px-6 py-3 flex items-center gap-4" style={{ minHeight: 48 }}>
        <img src={`${import.meta.env.BASE_URL}curriculr-logo.svg`} alt="Curriculr" className="h-6" />
        <button
          data-tour="plan-name"
          onClick={onSwitchPlan}
          className="text-[15px] font-semibold hover:opacity-80 flex items-center gap-1 transition-opacity"
          style={{ transitionDuration: 'var(--dur-state)' }}
        >
          {doc.meta.name} <span className="opacity-60">▼</span>
        </button>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5" title={saveStatusTitle}>
            {stateIndicator}
          </span>
          {conflicts.length > 0 && (
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="flex items-center gap-1 rounded-[var(--radius-block)] px-2.5 py-1.5 text-[12.5px] font-semibold"
              style={{
                background: hasError ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)' : 'var(--color-gelb-100)',
                color: hasError ? 'var(--color-danger)' : 'var(--color-warning)'
              }}
            >
              <AlertTriangle className="w-3 h-3" aria-hidden="true" /> {conflicts.length} {conflicts.length === 1 ? 'Konflikt' : 'Konflikte'}
            </button>
          )}
          <StatusBar />
          {authStatus === 'authenticated' && authClaims && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-white/10 text-[13px]">
              <span>{authClaims.name}</span>
              <button
                onClick={handleLogout}
                aria-label="Abmelden"
                title="Abmelden"
                className="opacity-60 hover:opacity-100 transition-opacity"
                style={{ transitionDuration: 'var(--dur-state)' }}
              >
                ✕
              </button>
            </div>
          )}
          <EditorOverflowMenu />
        </div>
      </div>
      {hasServerUpdate && (
        <div
          className="px-6 py-2 flex items-center gap-3 text-[13px]"
          style={{ background: 'var(--color-gelb-100)', color: 'var(--color-ink-900)' }}
          role="status"
        >
          <span>
            <strong>{presence!.authorName || 'Jemand'}</strong> hat
            {presenceRel ? ` ${presenceRel}` : ''} eine neue Version gespeichert (v{presence!.version}).
          </span>
          <button
            onClick={() => void handlePullUpdate()}
            disabled={pulling}
            className="font-semibold underline disabled:opacity-50"
          >
            {pulling ? 'Lädt…' : 'Jetzt aktualisieren'}
          </button>
        </div>
      )}
      <ConflictPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </header>
  );
}
