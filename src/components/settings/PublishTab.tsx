import { useState, useRef, useEffect } from 'react';
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
import { parseIcs, type ParsedEvent } from '@/lib/ics-import';
import { IcsImportDialog } from '@/components/import/IcsImportDialog';
import { toast } from 'sonner';
import { buildIcs, slugify } from '@/lib/ics-export';
import { buildExcel } from '@/lib/excel-export';

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PublishTab() {
  const config     = useWpSyncStore((s) => s.config);
  const setConfig  = useWpSyncStore((s) => s.setConfig);
  const doc        = usePlannerStore((s) => s.doc);
  const addEvents  = usePlannerStore((s) => s.addEvents);
  const authStatus = useAuthStore((s) => s.status);
  const claims     = useAuthStore((s) => s.claims);
  const token      = useAuthStore((s) => s.token);
  const logout     = useAuthStore((s) => s.logout);

  const [testState, setTestState] = useState({ msg: '', busy: false });
  const [pmStatus, setPmStatus]   = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [parsed, setParsed]       = useState<ParsedEvent[] | null>(null);
  const fileRef                   = useRef<HTMLInputElement>(null);

  const docId = doc?.schoolyear.id;
  const link  = docId ? config.links[docId] : undefined;

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
      schoolyearKey:   suggestedSjKey,
      schoolyearLabel: suggestedLabel,
      stage:           'entwurf',
      knownVersion:    0,
    };
    setConfig({ ...config, links: { ...config.links, [docId]: { ...base, ...patch } } });
  }

  // Ohne diesen Effekt bleibt `link` undefined, bis die Nutzerin zufällig ein
  // Gruppen-Checkbox oder "Erweitert"-Feld anfasst — bis dahin ist der
  // "Kalender einrichten"-Button disabled und StatusBar zeigt dauerhaft
  // "Nicht verbunden", obwohl Login + Verbindungstest bereits erfolgreich sind.
  useEffect(() => {
    if (docId && config.enabled && authStatus === 'authenticated' && !link) {
      patchLink({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, config.enabled, authStatus, link]);

  const calendarGroups: string[]              = link?.calendarGroups        ?? [];
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

  async function onFile(file: File) {
    try {
      const events = parseIcs(await file.text());
      if (events.length === 0) { toast.error('Keine Termine in der ICS gefunden'); return; }
      setParsed(events);
    } catch (e) {
      toast.error('ICS ungültig: ' + (e as Error).message);
    }
  }

  const availableGroups = doc?.availableGroups ?? [];

  const exportIcs = () => {
    if (!doc) return;
    const ics = buildIcs(doc);
    downloadBlob(`${slugify(doc.meta.name)}.ics`, new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    toast.success('ICS heruntergeladen');
  };

  const exportExcel = () => {
    if (!doc) return;
    const buf = buildExcel(doc);
    downloadBlob(`${slugify(doc.meta.name)}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    toast.success('Excel heruntergeladen');
  };

  return (
    <div className="space-y-6 max-w-xl">

      {/* WordPress-Verbindung */}
      <section className="space-y-4">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          WordPress-Verbindung
        </h3>
        <p className="text-[13px] text-[var(--color-ink-500)]">
          Optional. Ohne Verbindung: Planner arbeitet lokal mit Export-Funktion.
        </p>
        <label className="flex items-center gap-2 text-[14px]">
          <Checkbox
            checked={config.enabled}
            onCheckedChange={(v) => setConfig({ ...config, enabled: !!v })}
          />
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
      </section>

      {/* Kalender einrichten */}
      {doc && config.enabled && authStatus === 'authenticated' && (
        <section className="space-y-4 border-t pt-4">
          <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
            Kalender einrichten
          </h3>
          <p className="text-[13px] font-medium text-[var(--color-ink-900)]">
            Plan: „{doc.meta.name}"
          </p>
          <div className="rounded-md bg-[var(--color-marine-100)] border border-[var(--color-marine-500)] p-3 space-y-1">
            <p className="text-[12px] text-[var(--color-ink-500)]">
              WordPress legt automatisch einen <strong>Haupt-Kalender mit allen Terminen</strong> an.
              Zusätzlich kannst du separate Kalender je Gruppe einrichten.
            </p>
          </div>
          <div className="flex items-center gap-2 opacity-60">
            <Checkbox checked disabled />
            <span className="text-[13px]">Alle Termine (immer aktiv, für Kollegium)</span>
          </div>
          {availableGroups.length > 0 ? (
            availableGroups.map((g) => (
              <label key={g} className="flex items-center gap-2 text-[13px] cursor-pointer">
                <Checkbox checked={calendarGroups.includes(g)} onCheckedChange={() => toggleGroup(g)} />
                {g}
              </label>
            ))
          ) : (
            <p className="text-[12px] text-[var(--color-ink-500)]">
              Keine Gruppen definiert. Füge Gruppen unter Inhalt → Gruppen hinzu.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              onClick={onSendProfileMap}
              disabled={pmStatus === 'sending' || !link?.schoolyearKey}
            >
              {pmStatus === 'sending' ? 'Einrichten…' : 'Kalender einrichten →'}
            </Button>
            {pmStatus === 'ok'    && <p className="text-[12px] text-[var(--color-status-green)]">✓ Eingerichtet</p>}
            {pmStatus === 'error' && <p className="text-[12px] text-[var(--color-danger)]">Fehler beim Einrichten</p>}
          </div>
          {provisionedCalendars.length > 0 && (
            <div className="rounded-md border border-[var(--color-marine-200)] p-3 space-y-2">
              <p className="text-[12px] font-semibold text-[var(--color-ink-700)]">
                Kalender-Links (für IServ-Abo):
              </p>
              {provisionedCalendars.map((cal) => {
                const feedUrl = cal.feedUrl;
                return (
                <div key={cal.group ?? '__main'} className="text-[12px] flex items-start gap-2 flex-wrap">
                  <span className="font-medium shrink-0">{cal.group ?? 'Alle Termine'}:</span>
                  {feedUrl ? (
                    <>
                      <a href={feedUrl} target="_blank" rel="noopener noreferrer"
                         className="underline break-all" style={{ color: 'var(--color-marine-500)' }}>
                        {feedUrl}
                      </a>
                      <button
                        onClick={() => {
                          void navigator.clipboard.writeText(feedUrl);
                          toast.success('Link kopiert');
                        }}
                        className="shrink-0 text-[11px] px-1.5 py-0.5 rounded border border-[var(--color-ink-300)] hover:bg-[var(--color-paper-bg)]"
                      >
                        Kopieren
                      </button>
                    </>
                  ) : (
                    <em className="text-[var(--color-ink-400)]">wird nach erstem Veröffentlichen gesetzt</em>
                  )}
                </div>
              );
              })}
            </div>
          )}
          <details className="text-[12px]">
            <summary className="cursor-pointer text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)] select-none">
              Erweitert (Schuljahr-Schlüssel)
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <Label>Schuljahr-Schlüssel (WP)</Label>
                <Input
                  value={link?.schoolyearKey ?? suggestedSjKey}
                  placeholder="sj_2026_27"
                  onChange={(e) => patchLink({ schoolyearKey: e.target.value })}
                />
                <p className="text-[11px] text-[var(--color-ink-500)] mt-1">
                  Identifiziert das Schuljahr in WordPress eindeutig. Wird automatisch vorgeschlagen.
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
              <p className="text-[12px] mt-2">
                Aktuelle Stufe: <strong>{STAGE_LABELS[link.stage as WpStage]}</strong>
              </p>
            )}
          </details>
        </section>
      )}

      {/* Export */}
      <section className="space-y-3 border-t pt-4">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Export
        </h3>
        <p className="text-[13px] text-[var(--color-ink-500)]">
          Plan als Datei exportieren. Das Export-Menü oben rechts bietet dieselben Optionen.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportIcs} disabled={!doc}>
            ICS-Datei (.ics)
          </Button>
          <Button variant="outline" onClick={exportExcel} disabled={!doc}>
            Excel-Konverter-Format (.xlsx)
          </Button>
        </div>
        <p className="text-[12px] text-[var(--color-ink-500)]">
          Keine IServ-SSO-Anbindung? Lade das „JSON-Backup" (Export-Menü oben rechts) herunter und
          trage es im WordPress-Backend unter Einstellungen → Schul-Terminplan → Schuljahre in der
          Karte des jeweiligen Schuljahres hoch.
        </p>
      </section>

      {/* Import */}
      <section className="space-y-3 border-t pt-4">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Import
        </h3>
        <p className="text-[13px] text-[var(--color-ink-500)]">
          ICS-Datei (z.B. Vorjahresplan) in den aktuellen Plan einfügen.
        </p>
        {doc && (
          <>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              ICS-Datei wählen
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".ics"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = '';
              }}
            />
            <IcsImportDialog
              open={parsed !== null}
              parsed={parsed ?? []}
              categories={doc.categories}
              targetSchoolyear={doc.schoolyear}
              onCancel={() => setParsed(null)}
              onConfirm={(events) => {
                addEvents(events);
                setParsed(null);
                toast.success(`${events.length} Termine importiert`);
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}
