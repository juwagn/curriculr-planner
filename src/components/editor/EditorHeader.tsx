import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, HelpCircle, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { useConflicts } from '@/hooks/useConflicts';
import { ExportDropdown } from '@/components/export/ExportDropdown';
import { ConflictPanel } from './ConflictPanel';
import { StatusBar } from './StatusBar';
import { useAuthStore } from '@/stores/auth';
import { useWpSyncStore } from '@/stores/wpSync';
import { usePresence, relativeTime } from '@/hooks/usePresence';

interface Props {
  onSwitchPlan(): void;
}

export function EditorHeader({ onSwitchPlan }: Props) {
  const doc = usePlannerStore((s) => s.doc);
  const presence = usePresence(doc?.schoolyear.id);
  const savingState = usePlannerStore((s) => s.savingState);
  const openSettings = useUiStore((s) => s.openSettings);
  const openHelp = useUiStore((s) => s.openHelp);
  const conflicts = useConflicts();
  const [panelOpen, setPanelOpen] = useState(false);
  const hasError = conflicts.some((c) => c.severity === 'error');
  const authStatus = useAuthStore((s) => s.status);
  const authClaims = useAuthStore((s) => s.claims);
  const authToken = useAuthStore((s) => s.token);
  const authLogout = useAuthStore((s) => s.logout);
  const wpBaseUrl = useWpSyncStore((s) => s.config.baseUrl);

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
          <span className="px-3 py-1 rounded-[var(--radius-pill)] bg-white/10 flex items-center gap-1.5">
            {stateIndicator}
          </span>
          {(() => {
            const rel = presence?.authorName ? relativeTime(presence.savedAt) : '';
            return rel ? (
              <span className="px-3 py-1 rounded-[var(--radius-pill)] bg-white/10 text-[12px] opacity-70 whitespace-nowrap">
                {presence!.authorName} hat {rel} gespeichert
              </span>
            ) : null;
          })()}
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
          {conflicts.length > 0 && (
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="flex items-center gap-1 rounded-[var(--radius-block)] px-2.5 py-1.5 text-[12.5px] font-semibold"
              style={{
                background: hasError ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)' : 'var(--color-gelb-100)',
                color: hasError ? 'var(--color-danger)' : 'var(--color-warning)'
              }}
            >
              ⚠ {conflicts.length} {conflicts.length === 1 ? 'Konflikt' : 'Konflikte'}
            </button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={openHelp}
            aria-label="Hilfe"
            title="Hilfe"
            className="text-[var(--color-paper-card)] hover:bg-white/10 hover:text-[var(--color-paper-card)]"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button
            data-tour="settings-btn"
            variant="ghost"
            size="icon"
            onClick={() => openSettings()}
            aria-label="Einstellungen"
            title="Einstellungen"
            className="text-[var(--color-paper-card)] hover:bg-white/10 hover:text-[var(--color-paper-card)]"
          >
            <SettingsIcon className="w-4 h-4" />
          </Button>
          <ExportDropdown />
        </div>
      </div>
      <ConflictPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </header>
  );
}
