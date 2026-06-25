import { useState } from 'react';
import { useWpSyncStore } from '@/stores/wpSync';
import { usePlannerStore } from '@/stores/planner';
import { useAuthStore } from '@/stores/auth';
import { testConnection, postProfileMap } from '@/lib/wp-sync';
import { startIservLogin, iservLogout } from '@/lib/wp-auth-actions';
import { STAGE_LABELS, type WpStage } from '@/lib/wp-stage';
import type { WpPlanLink, CalendarMapping } from '@/lib/wp-sync-config';
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
    const base: WpPlanLink = link ?? { schoolyearKey: '', wpProfileId: '', stage: 'entwurf', knownVersion: 0 };
    setConfig({ ...config, links: { ...config.links, [docId]: { ...base, ...patch } } });
  }

  const calMappings: CalendarMapping[] = link?.calendarMappings ?? [];

  function addCalMapping() {
    patchLink({ calendarMappings: [...calMappings, { group: null, profileId: '' }] });
  }

  function removeCalMapping(i: number) {
    patchLink({ calendarMappings: calMappings.filter((_, idx) => idx !== i) });
  }

  function updateCalMapping(i: number, patch: Partial<CalendarMapping>) {
    patchLink({ calendarMappings: calMappings.map((m, idx) => idx === i ? { ...m, ...patch } : m) });
  }

  async function onSendProfileMap() {
    if (!token || !docId || !link) return;
    const mappings = [
      { group: null, profileId: link.wpProfileId },
      ...calMappings,
    ].filter(m => Boolean(m.profileId));
    setPmStatus('sending');
    const result = await postProfileMap(config, token, link.schoolyearKey, mappings);
    setPmStatus(result);
  }

  return (
    <div className="space-y-5 max-w-xl">
      <p className="text-[13px] text-[var(--color-ink-500)]">
        Optional. Aus = der Planner arbeitet wie bisher (lokal + Export). Ein = du kannst Pläne an euer WordPress senden.
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

      <div className="space-y-3 border-t pt-4">
        <p className="text-[13px] font-semibold">Anmeldung (IServ-SSO)</p>
        {authStatus === 'authenticated' && claims ? (
          <div className="space-y-2">
            <p className="text-[13px]">
              Angemeldet als <strong>{claims.name}</strong>
              <span className="ml-2 text-[11px] text-[var(--color-ink-500)]">
                ({claims.groups.join(', ')})
              </span>
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={onTest} disabled={testState.busy}>
                Verbindung testen
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Abmelden
              </Button>
            </div>
            {testState.msg && <p className="text-[13px]">{testState.msg}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[12px] text-[var(--color-ink-500)]">
              Anmeldung über IServ erforderlich, um Pläne zu senden.
            </p>
            <Button
              onClick={handleLogin}
              disabled={!config.baseUrl || !config.enabled}
            >
              Mit IServ anmelden
            </Button>
            {!config.baseUrl && (
              <p className="text-[11px] text-[var(--color-warning)]">
                Zuerst WordPress-Adresse eintragen.
              </p>
            )}
          </div>
        )}
      </div>

      {doc && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-[13px] font-semibold">Verknüpfung für „{doc.meta.name}"</p>
          <div>
            <Label>Schuljahr-Schlüssel (WordPress)</Label>
            <Input
              value={link?.schoolyearKey ?? ''}
              placeholder="sj_2026_27"
              onChange={(e) => patchLink({ schoolyearKey: e.target.value })}
            />
          </div>
          <div>
            <Label>WordPress-Profil-ID (NICHT das Live-Profil)</Label>
            <Input
              value={link?.wpProfileId ?? ''}
              placeholder="z.B. curriculr_test"
              onChange={(e) => patchLink({ wpProfileId: e.target.value })}
            />
            <p className="text-[11px] text-[var(--color-ink-500)] mt-1">
              Lege in WordPress ein eigenes Profil für Curriculr an. So wird euer laufender Kalender nie überschrieben.
            </p>
          </div>
          {link && (
            <div className="text-[12px] space-y-1">
              <p>Aktuelle Stufe: <strong>{STAGE_LABELS[link.stage as WpStage]}</strong></p>
              {link.feedUrl && (
                <p>Feed-URL (für IServ-Abo):{' '}
                  <a
                    href={link.feedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline break-all"
                    style={{ color: 'var(--color-marine-500)' }}
                  >
                    {link.feedUrl}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {doc && link && config.enabled && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-[13px] font-semibold">Gruppen-Kalender</p>
          <div className="rounded-md bg-[var(--color-marine-50,#f0f5fa)] border border-[var(--color-marine-200,#c8d8e8)] p-3 space-y-1">
            <p className="text-[12px] text-[var(--color-ink-600)]">
              Der Haupt-Feed (oben) enthält alle Termine. Zusätzlich kannst du separate Feeds je Gruppe einrichten — z.B. einen Feed nur für Schulleitung-Termine.
            </p>
            <p className="text-[12px] text-[var(--color-ink-600)]">
              Termine <strong>ohne Gruppe</strong> erscheinen in allen Gruppen-Feeds.
            </p>
          </div>
          {calMappings.map((m, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                className="border border-input rounded-md px-2 py-1 text-[13px] bg-background"
                value={m.group ?? ''}
                onChange={(e) => updateCalMapping(i, { group: e.target.value || null })}
              >
                <option value="">Gruppe wählen…</option>
                {doc.availableGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <Input
                className="flex-1"
                value={m.profileId}
                placeholder="WP-Profil-ID"
                onChange={(e) => updateCalMapping(i, { profileId: e.target.value })}
              />
              <Button variant="ghost" size="sm" onClick={() => removeCalMapping(i)}>×</Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addCalMapping}>
            + Gruppe hinzufügen
          </Button>
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={onSendProfileMap} disabled={pmStatus === 'sending'}>
              {pmStatus === 'sending' ? 'Sende…' : 'Konfiguration senden'}
            </Button>
            {pmStatus === 'ok'    && <p className="text-[12px] text-green-700">✓ Gespeichert</p>}
            {pmStatus === 'error' && <p className="text-[12px] text-red-600">Fehler beim Senden</p>}
          </div>
        </div>
      )}
    </div>
  );
}
