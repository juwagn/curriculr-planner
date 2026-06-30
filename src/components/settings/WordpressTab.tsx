import { useState } from 'react';
import { useWpSyncStore } from '@/stores/wpSync';
import { usePlannerStore } from '@/stores/planner';
import { useAuthStore } from '@/stores/auth';
import { testConnection, postProfileMap } from '@/lib/wp-sync';
import { startIservLogin, iservLogout } from '@/lib/wp-auth-actions';
import { STAGE_LABELS, type WpStage } from '@/lib/wp-stage';
import type { WpPlanLink, WpCalendarGroup } from '@/lib/wp-sync-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export function WordpressTab() {
  const config = useWpSyncStore((s) => s.config);
  const setConfig = useWpSyncStore((s) => s.setConfig);
  const doc = usePlannerStore((s) => s.doc);
  const authStatus = useAuthStore((s) => s.status);
  const claims = useAuthStore((s) => s.claims);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const [testState, setTestState] = useState({ msg: '', busy: false });
  const [pmStatus, setPmStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  const docId = doc?.schoolyear.id;
  const link = docId ? config.links[docId] : undefined;

  // Auto-suggest schoolyear key from doc id (doc.schoolyear.id is already slug-like)
  const suggestedSjKey = doc?.schoolyear.id
    ? `sj_${doc.schoolyear.id.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
    : '';
  const suggestedLabel = doc?.meta?.name ?? '';

  function handleLogin() {
    if (!config.enabled || !config.baseUrl) return;
    startIservLogin(config.baseUrl);
  }

  function handleLogout() {
    const currentToken = token;
    logout();
    if (config.baseUrl && currentToken) void iservLogout(config.baseUrl, currentToken);
  }

  async function onTest() {
    if (!token) return;
    setTestState({ msg: 'Teste…', busy: true });
    const r = await testConnection(config, token);
    setTestState({ msg: r.message, busy: false });
  }

  function patchLink(patch: Partial<WpPlanLink>) {
    if (!docId) return;
    const base: WpPlanLink = link ?? {
      schoolyearKey: suggestedSjKey,
      schoolyearLabel: suggestedLabel,
      stage: 'entwurf',
      knownVersion: 0,
    };
    setConfig({ ...config, links: { ...config.links, [docId]: { ...base, ...patch } } });
  }

  const calendarGroups: string[] = link?.calendarGroups ?? [];
  const provisionedCalendars: WpCalendarGroup[] = link?.provisionedCalendars ?? [];

  function toggleGroup(group: string) {
    const next = calendarGroups.includes(group)
      ? calendarGroups.filter((g) => g !== group)
      : [...calendarGroups, group];
    patchLink({ calendarGroups: next });
  }

  async function onSendProfileMap() {
    if (!token || !docId || !link) return;
    const sj    = link.schoolyearKey;
    const label = link.schoolyearLabel || link.schoolyearKey;
    setPmStatus('sending');
    const result = await postProfileMap(config, token, sj, label, calendarGroups);
    if (result.status === 'ok') {
      patchLink({ provisionedCalendars: result.calendars ?? [] });
      setPmStatus('ok');
    } else {
      setPmStatus('error');
    }
  }

  // Groups available for calendar provisioning (from the open document)
  const availableGroups = doc?.availableGroups ?? [];

  return (
    <div className="space-y-5 max-w-xl">
      <p className="text-[13px] text-[var(--color-ink-500)]">
        Optional. Aus = der Planner arbeitet lokal + Export. Ein = Pläne an WordPress senden.
      </p>

      <label className="flex items-center gap-2 text-[14px]">
        <Checkbox checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: !!v })} />
        WordPress-Synchronisation aktivieren
      </label>

      <div>
        <Label>WordPress-Adresse</Label>
        <Input
          value={config.baseUrl}
          placeholder="https://schule.example"
          onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
        />
      </div>

      {/* IServ-Anmeldung */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-[13px] font-semibold">Anmeldung (IServ-SSO)</p>
        {authStatus === 'authenticated' && claims ? (
          <div className="space-y-2">
            <p className="text-[13px]">
              Angemeldet als <strong>{claims.name}</strong>
              <span className="ml-2 text-[11px] text-[var(--color-ink-500)]">({claims.groups.join(', ')})</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={onTest} disabled={testState.busy}>Verbindung testen</Button>
              <Button variant="outline" onClick={handleLogout}>Abmelden</Button>
            </div>
            {testState.msg && <p className="text-[13px]">{testState.msg}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[12px] text-[var(--color-ink-500)]">Anmeldung über IServ erforderlich.</p>
            <Button onClick={handleLogin} disabled={!config.baseUrl || !config.enabled}>
              Mit IServ anmelden
            </Button>
            {!config.baseUrl && (
              <p className="text-[11px] text-[var(--color-warning)]">Zuerst WordPress-Adresse eintragen.</p>
            )}
          </div>
        )}
      </div>

      {/* Schuljahr-Verknüpfung */}
      {doc && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-[13px] font-semibold">Schuljahr-Verknüpfung für „{doc.meta.name}"</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Schuljahr-Schlüssel (WP)</Label>
              <Input
                value={link?.schoolyearKey ?? suggestedSjKey}
                placeholder="sj_2026_27"
                onChange={(e) => patchLink({ schoolyearKey: e.target.value })}
              />
              <p className="text-[11px] text-[var(--color-ink-500)] mt-1">
                Identifiziert das Schuljahr in WordPress eindeutig.
              </p>
            </div>
            <div>
              <Label>Schuljahr-Label (WP)</Label>
              <Input
                value={link?.schoolyearLabel ?? suggestedLabel}
                placeholder="2026/27"
                onChange={(e) => patchLink({ schoolyearLabel: e.target.value })}
              />
            </div>
          </div>
          {link && (
            <div className="text-[12px] space-y-1">
              <p>Aktuelle Stufe: <strong>{STAGE_LABELS[link.stage as WpStage]}</strong></p>
              {link.feedUrl && (
                <p>Haupt-Feed: <a href={link.feedUrl} target="_blank" rel="noopener noreferrer"
                   className="underline break-all" style={{ color: 'var(--color-marine-500)' }}>
                  {link.feedUrl}
                </a></p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Gruppen-Kalender */}
      {doc && link && config.enabled && authStatus === 'authenticated' && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-[13px] font-semibold">Kalender-Konfiguration</p>
          <div className="rounded-md bg-[var(--color-marine-100)] border border-[var(--color-marine-500)] p-3 space-y-1">
            <p className="text-[12px] text-[var(--color-ink-500)]">
              WordPress legt automatisch einen <strong>Haupt-Kalender mit allen Terminen</strong> an
              (für das Kollegium). Zusätzlich kannst du separate Kalender je Gruppe einrichten.
            </p>
            <p className="text-[12px] text-[var(--color-ink-500)]">
              Termine <strong>ohne Gruppe</strong> erscheinen in allen Gruppen-Feeds.
            </p>
          </div>

          {/* Haupt-Kalender — immer an */}
          <div className="flex items-center gap-2 opacity-60">
            <Checkbox checked disabled />
            <span className="text-[13px]">Haupt-Kalender (alle Termine) — immer aktiv</span>
          </div>

          {/* Gruppen-Checkboxen */}
          {availableGroups.length > 0 ? (
            availableGroups.map((g) => (
              <label key={g} className="flex items-center gap-2 text-[13px] cursor-pointer">
                <Checkbox
                  checked={calendarGroups.includes(g)}
                  onCheckedChange={() => toggleGroup(g)}
                />
                {g}
              </label>
            ))
          ) : (
            <p className="text-[12px] text-[var(--color-ink-500)]">
              Keine Gruppen im Planner definiert. Füge Gruppen unter Einstellungen → Gruppen hinzu.
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={onSendProfileMap} disabled={pmStatus === 'sending' || !link.schoolyearKey}>
              {pmStatus === 'sending' ? 'Sende…' : 'Konfiguration senden'}
            </Button>
            {pmStatus === 'ok'    && <p className="text-[12px] text-[var(--color-status-green)]">✓ Gespeichert</p>}
            {pmStatus === 'error' && <p className="text-[12px] text-[var(--color-status-red)]">Fehler beim Senden</p>}
          </div>

          {/* Provisioned feed URLs */}
          {provisionedCalendars.length > 0 && (
            <div className="rounded-md border border-[var(--color-marine-200)] p-3 space-y-2">
              <p className="text-[12px] font-semibold text-[var(--color-ink-700)]">Kalender-Feeds (für IServ-Abo):</p>
              {provisionedCalendars.map((cal) => (
                <div key={cal.group ?? '__main'} className="text-[12px]">
                  <span className="font-medium">{cal.group ?? 'Alle Termine'}:</span>{' '}
                  {cal.feedUrl ? (
                    <a href={cal.feedUrl} target="_blank" rel="noopener noreferrer"
                       className="underline break-all" style={{ color: 'var(--color-marine-500)' }}>
                      {cal.feedUrl}
                    </a>
                  ) : (
                    <em className="text-[var(--color-ink-400)]">wird nach Speichern des Plans gesetzt</em>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
