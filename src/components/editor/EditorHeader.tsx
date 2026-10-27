import { useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Loader2, AlertTriangle, Pencil, X } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useConflicts } from '@/hooks/useConflicts';
import { EditorOverflowMenu } from './EditorOverflowMenu';
import { ConflictPanel } from './ConflictPanel';
import { StatusBar } from './StatusBar';
import { useAuthStore } from '@/stores/auth';
import { useWpSyncStore } from '@/stores/wpSync';
import { usePresence, relativeTime } from '@/hooks/usePresence';
import { toast } from 'sonner';
import { Logo } from '@/components/ui/logo';

interface Props {
  onSwitchPlan(): void;
}

export function EditorHeader({ onSwitchPlan }: Props) {
  const doc = usePlannerStore((s) => s.doc);
  const setDoc = usePlannerStore((s) => s.setDoc);
  const updateMeta = usePlannerStore((s) => s.updateMeta);
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
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

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

  function startRename() {
    setNameDraft(doc!.meta.name);
    setRenaming(true);
    // Input mounts this tick — focus/select next frame so it's actually in the DOM.
    requestAnimationFrame(() => nameInputRef.current?.select());
  }

  function commitRename() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== doc!.meta.name) {
      updateMeta({ name: trimmed });
      toast.success('Plan umbenannt');
    }
    setRenaming(false);
  }

  const stateIndicator = {
    idle:   <><CheckCircle2 className="h-4 w-4 sm:h-3 sm:w-3" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Gespeichert</span></>,
    saving: <><Loader2 className="h-4 w-4 sm:h-3 sm:w-3 animate-spin" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Speichert…</span></>,
    saved:  <><CheckCircle2 className="h-4 w-4 sm:h-3 sm:w-3" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Gespeichert</span></>,
    error:  <><AlertTriangle className="h-4 w-4 sm:h-3 sm:w-3" aria-hidden="true" /><span>Fehler beim Speichern</span></>,
  }[savingState];

  // A save shows as "Ihr anderes Gerät" when it carries this account's sub — covers editing
  // the same plan from a second browser/device under one IServ login.
  const isOwnAccount = !!presence && presence.authorSub === authClaims?.sub;
  const presenceLabel = presence ? (isOwnAccount ? 'Ihr anderes Gerät' : presence.authorName || 'Jemand') : '';
  const presenceRel = presence?.authorName ? relativeTime(presence.savedAt) : '';
  const saveStatusTitle = presenceRel ? `${presenceLabel} hat ${presenceRel} gespeichert` : undefined;

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
    <header className="relative border-b border-[var(--cl-line)] bg-[var(--cl-surface)] text-[var(--cl-ink-900)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 md:px-6" style={{ minHeight: 56 }}>
        <Logo className="h-6 w-auto shrink-0" />
        {renaming ? (
          <input
            ref={nameInputRef}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
              else if (e.key === 'Escape') { e.preventDefault(); setRenaming(false); }
            }}
            aria-label="Plan umbenennen"
            className="h-11 rounded-[var(--radius-input)] border border-[var(--cl-border)] bg-[var(--cl-surface)] px-2 text-[15px] font-semibold outline-none focus-visible:shadow-[var(--cl-focus-ring)] lg:h-9"
            style={{ width: `${Math.max(nameDraft.length, 6)}ch` }}
          />
        ) : (
          <h1 className="m-0 flex min-w-0 items-center gap-0.5 text-[15px] font-semibold">
            <button
              data-tour="plan-name"
              onClick={onSwitchPlan}
              className="flex min-h-11 min-w-0 items-center gap-1 rounded-[var(--radius-input)] px-1 text-[15px] font-semibold hover:bg-[var(--cl-bg)] lg:min-h-9"
              aria-label={`Plan wechseln, aktuell ${doc.meta.name}`}
            >
              <span className="truncate">{doc.meta.name}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--cl-ink-500)]" aria-hidden="true" />
            </button>
            <button
              onClick={startRename}
              aria-label="Plan umbenennen"
              title="Plan umbenennen"
              className="flex size-11 items-center justify-center rounded-[var(--radius-input)] text-[var(--cl-ink-500)] hover:bg-[var(--cl-bg)] hover:text-[var(--cl-ink-900)] lg:size-9"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          </h1>
        )}
        <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs sm:ml-auto sm:w-auto sm:justify-end">
          <span className="flex items-center gap-1.5 text-[var(--cl-ink-500)]" role="status" title={saveStatusTitle}>
            {stateIndicator}
          </span>
          {conflicts.length > 0 && (
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="flex min-h-11 items-center gap-1.5 rounded-[var(--radius-input)] border px-3 text-[13px] font-semibold lg:min-h-9"
              style={{
                background: hasError ? 'var(--cl-danger-bg)' : 'var(--cl-warning-bg)',
                borderColor: hasError ? 'var(--cl-danger)' : 'var(--cl-warning)',
                color: hasError ? 'var(--cl-danger)' : 'var(--cl-warning)'
              }}
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {conflicts.length} {conflicts.length === 1 ? 'Konflikt' : 'Konflikte'}
            </button>
          )}
          <StatusBar />
          {authStatus === 'authenticated' && authClaims && (
            <div className="flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--cl-bg)] pl-3 text-[13px]">
              <span>{authClaims.name}</span>
              <button
                onClick={handleLogout}
                aria-label="Abmelden"
                title="Abmelden"
                className="flex size-11 items-center justify-center rounded-full text-[var(--cl-ink-500)] hover:text-[var(--cl-ink-900)] lg:size-9"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
          <EditorOverflowMenu />
        </div>
      </div>
      {hasServerUpdate && (
        <div
          className="flex flex-wrap items-center gap-3 border-t border-[var(--cl-gold-500)] px-4 py-2 text-[13px] md:px-6"
          style={{ background: 'var(--cl-gold-100)', color: 'var(--cl-ink-900)' }}
          role="status"
        >
          <span>
            <strong>{presenceLabel}</strong> hat
            {presenceRel ? ` ${presenceRel}` : ''} eine neue Version gespeichert (v{presence!.version}).
          </span>
          <button
            onClick={() => void handlePullUpdate()}
            disabled={pulling}
            className="min-h-11 font-semibold underline disabled:opacity-50 lg:min-h-9"
          >
            {pulling ? 'Lädt…' : 'Jetzt aktualisieren'}
          </button>
        </div>
      )}
      <ConflictPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </header>
  );
}
