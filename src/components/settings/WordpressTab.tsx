import { useState } from 'react';
import { useWpSyncStore } from '@/stores/wpSync';
import { usePlannerStore } from '@/stores/planner';
import { testConnection } from '@/lib/wp-sync';
import { STAGE_LABELS, type WpStage } from '@/lib/wp-stage';
import type { WpPlanLink } from '@/lib/wp-sync-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export function WordpressTab() {
  const config = useWpSyncStore((s) => s.config);
  const setConfig = useWpSyncStore((s) => s.setConfig);
  const doc = usePlannerStore((s) => s.doc);
  const [testState, setTestState] = useState({ msg: '', busy: false });

  const docId = doc?.schoolyear.id;
  const link = docId ? config.links[docId] : undefined;

  async function onTest() {
    setTestState({ msg: 'Teste…', busy: true });
    const r = await testConnection(config);
    setTestState({ msg: r.message, busy: false });
  }

  function patchLink(patch: Partial<WpPlanLink>) {
    if (!docId) return;
    const base: WpPlanLink = link ?? { schoolyearKey: '', wpProfileId: '', stage: 'entwurf', knownVersion: 0 };
    setConfig({ ...config, links: { ...config.links, [docId]: { ...base, ...patch } } });
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

      <div className="space-y-3">
        <div>
          <Label>WordPress-Adresse</Label>
          <Input value={config.baseUrl} placeholder="https://schule.example"
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })} />
        </div>
        <div>
          <Label>Benutzername</Label>
          <Input value={config.username} onChange={(e) => setConfig({ ...config, username: e.target.value })} />
        </div>
        <div>
          <Label>Application Password</Label>
          <Input type="password" value={config.appPassword}
            onChange={(e) => setConfig({ ...config, appPassword: e.target.value })} />
          <p className="text-[11px] text-[var(--color-ink-500)] mt-1">
            In WordPress unter Benutzer → Profil → „Application Passwords" erzeugen. Wird nur in diesem Browser gespeichert; jederzeit in WordPress widerrufbar.
          </p>
        </div>
        <Button variant="outline" onClick={onTest} disabled={testState.busy}>Verbindung testen</Button>
        {testState.msg && <p className="text-[13px]">{testState.msg}</p>}
      </div>

      {doc && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-[13px] font-semibold">Verknüpfung für „{doc.meta.name}"</p>
          <div>
            <Label>Schuljahr-Schlüssel (WordPress)</Label>
            <Input value={link?.schoolyearKey ?? ''} placeholder="sj_2026_27"
              onChange={(e) => patchLink({ schoolyearKey: e.target.value })} />
          </div>
          <div>
            <Label>WordPress-Profil-ID (NICHT das Live-Profil)</Label>
            <Input value={link?.wpProfileId ?? ''} placeholder="z.B. curriculr_test"
              onChange={(e) => patchLink({ wpProfileId: e.target.value })} />
            <p className="text-[11px] text-[var(--color-ink-500)] mt-1">
              Lege in WordPress ein eigenes Profil für Curriculr an. So wird euer laufender Kalender nie überschrieben.
            </p>
          </div>
          {link && (
            <div className="text-[12px] space-y-1">
              <p>Aktuelle Stufe: <strong>{STAGE_LABELS[link.stage as WpStage]}</strong></p>
              {link.feedUrl && (
                <p>Feed-URL (für IServ-Abo):{' '}
                  <a href={link.feedUrl} target="_blank" rel="noopener noreferrer"
                     className="underline break-all" style={{ color: 'var(--color-marine-500)' }}>
                    {link.feedUrl}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
