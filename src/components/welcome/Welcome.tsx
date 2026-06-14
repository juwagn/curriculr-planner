import { useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { storage, type DocSummary } from '@/lib/storage';
import { parseIcs, mapToEvents, type ParsedEvent } from '@/lib/ics-import';
import { createEmptyDoc, usePlannerStore } from '@/stores/planner';
import { createDemoDoc } from '@/lib/demo';
import { IcsImportDialog } from '@/components/import/IcsImportDialog';
import { BrandPanel } from './BrandPanel';
import { useAuthStore } from '@/stores/auth';
import { useWpSyncStore } from '@/stores/wpSync';
import { startIservLogin, iservLogout } from '@/lib/wp-auth-actions';
import { fetchDocList, type DocListItem } from '@/lib/wp-sync';
import { STAGE_LABELS, type WpStage } from '@/lib/wp-stage';
import { toast } from 'sonner';
import type { PlannerDocument } from '@/types';

type Source = 'local' | 'wordpress' | 'new';

interface Props {
  onCreateNew(): void;
  onOpenDoc(id: string): void;
  onImportJson(doc: PlannerDocument): void;
  onStartTour(): void;
  onEnterEditor(): void;
}

export function Welcome({ onCreateNew, onOpenDoc, onImportJson, onStartTour, onEnterEditor }: Props) {
  const [source, setSource] = useState<Source>('local');
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [wpItems, setWpItems] = useState<DocListItem[]>([]);
  const [wpLoading, setWpLoading] = useState(false);
  const [wpMsg, setWpMsg] = useState<string | null>(null);
  const icsInputRef = useRef<HTMLInputElement>(null);
  const [icsParsed, setIcsParsed] = useState<ParsedEvent[] | null>(null);

  const authed = useAuthStore((s) => s.status === 'authenticated');
  const claims = useAuthStore((s) => s.claims);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const config = useWpSyncStore((s) => s.config);
  const setConfig = useWpSyncStore((s) => s.setConfig);
  const loadFromWp = useWpSyncStore((s) => s.loadFromWp);
  const setDoc = usePlannerStore((s) => s.setDoc);

  const defaultCategories = useMemo(
    () => createEmptyDoc('_', '_', '2000-01-01', '2000-01-01', '2000-01-02').categories,
    [],
  );

  useEffect(() => { storage.listDocs().then(setDocs); }, []);

  useEffect(() => {
    if (source !== 'wordpress' || !authed || !token) return;
    setWpLoading(true);
    setWpMsg(null);
    fetchDocList(config, token).then(({ items, message }) => {
      setWpItems(items);
      setWpMsg(message ?? (items.length === 0 ? 'Keine Pläne auf WordPress.' : null));
      setWpLoading(false);
    });
  }, [source, authed, token, config]);

  const handleLogin = () => {
    if (!config.enabled) setConfig({ ...config, enabled: true });
    if (config.baseUrl) startIservLogin(config.baseUrl);
  };
  const handleLogout = () => {
    const t = token;
    logout();
    if (config.baseUrl && t) void iservLogout(config.baseUrl, t);
  };

  const handleLoadWp = async (item: DocListItem) => {
    const result = await loadFromWp(item.sj, item.name, setDoc);
    if (result === 'loaded') {
      toast.success(`Plan „${item.name}" geladen`);
      onEnterEditor();
    } else {
      toast.error(useWpSyncStore.getState().message || 'Laden fehlgeschlagen');
    }
  };

  const handleIcs = async (file: File) => {
    try {
      const events = parseIcs(await file.text());
      if (events.length === 0) { toast.error('Keine Termine in der ICS gefunden'); return; }
      setIcsParsed(events);
    } catch (e) {
      toast.error('ICS ungültig: ' + (e as Error).message);
    }
  };

  const buildDocFromIcs = (parsed: ParsedEvent[]): PlannerDocument => {
    const minStart = parsed.reduce((m, e) => (e.start < m ? e.start : m), parsed[0].start);
    const maxEnd = parsed.reduce((m, e) => (e.end > m ? e.end : m), parsed[0].end);
    const startYear = Number(minStart.slice(0, 4));
    const label = `${startYear}/${(startYear + 1) % 100}`;
    const doc = createEmptyDoc(`Import ${label}`, label, minStart, minStart, maxEnd);
    const fallbackId = doc.categories.find((c) => c.slug === 'sondertag')?.id ?? doc.categories[0].id;
    doc.events = mapToEvents(parsed, doc.categories, fallbackId);
    return doc;
  };

  const Tab = ({ id, label }: { id: Source; label: string }) => (
    <button
      onClick={() => setSource(id)}
      className={`flex-1 text-[13px] font-bold py-2 px-2 rounded-[8px] transition ${
        source === id
          ? 'bg-white text-[var(--color-marine-800)] shadow-[0_2px_8px_rgba(0,52,92,.12)]'
          : 'text-[var(--color-ink-500)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <Card
        className="max-w-4xl w-full overflow-hidden border-[var(--color-ink-200)] p-0"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr]">
          <BrandPanel
            authed={authed}
            userName={claims?.name ?? null}
            groups={claims?.groups ?? []}
            baseUrl={config.baseUrl}
            onBaseUrlChange={(url) => setConfig({ ...config, baseUrl: url })}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />

          <div className="p-7">
            <div className="text-[20px] font-extrabold text-[var(--color-ink-900)] tracking-[-0.3px]">
              Wo ist dein Plan?
            </div>
            <p className="text-[13px] text-[var(--color-ink-500)] mt-1 mb-4">
              Lokal auf diesem Gerät, auf eurem WordPress oder neu beginnen.
            </p>

            <div
              className="flex gap-1.5 p-1.5 rounded-[12px] mb-4"
              style={{ background: 'var(--color-paper-bg)' }}
            >
              <Tab id="local" label="Dieses Gerät" />
              <Tab id="wordpress" label="WordPress" />
              <Tab id="new" label="Neu" />
            </div>

            {source === 'local' && (
              <div className="space-y-2">
                {docs.length === 0 && (
                  <p className="text-[13px] text-[var(--color-ink-500)]">Noch keine Pläne auf diesem Gerät.</p>
                )}
                {docs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between border border-[var(--color-ink-200)] rounded-[12px] p-3.5"
                  >
                    <div>
                      <div className="text-[14px] font-bold text-[var(--color-ink-900)]">{d.name}</div>
                      <div className="text-[12px] text-[var(--color-ink-500)] tabular-nums">
                        {d.eventCount} Termine · {new Date(d.lastSaved).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    <Button onClick={() => onOpenDoc(d.id)}>Öffnen</Button>
                  </div>
                ))}
              </div>
            )}

            {source === 'wordpress' && (
              <div className="space-y-2">
                {!authed && (
                  <p className="text-[13px] text-[var(--color-ink-500)]">
                    Für WordPress-Pläne bitte links mit IServ einloggen.
                  </p>
                )}
                {authed && wpLoading && <p className="text-[13px] text-[var(--color-ink-500)]">Lädt…</p>}
                {authed && !wpLoading && wpMsg && (
                  <p className="text-[13px] text-[var(--color-ink-500)]">{wpMsg}</p>
                )}
                {authed && wpItems.map((it) => (
                  <div
                    key={it.sj}
                    className="flex items-center justify-between border border-[var(--color-ink-200)] rounded-[12px] p-3.5"
                  >
                    <div>
                      <div className="text-[14px] font-bold text-[var(--color-ink-900)]">
                        {it.name}
                        <span
                          className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--color-paper-bg)', color: 'var(--color-ink-500)' }}
                        >
                          {STAGE_LABELS[it.stage as WpStage]}
                        </span>
                      </div>
                      <div className="text-[12px] text-[var(--color-ink-500)] tabular-nums">
                        v{it.version}{it.authorName ? ` · ${it.authorName}` : ''}{it.updatedAt ? ` · ${it.updatedAt.slice(0, 10)}` : ''}
                      </div>
                    </div>
                    <Button onClick={() => handleLoadWp(it)}>Laden</Button>
                  </div>
                ))}
                <p className="text-[11px] text-[var(--color-ink-500)] pt-1">Geladene Pläne werden lokal gespeichert.</p>
              </div>
            )}

            {source === 'new' && (
              <div className="flex flex-col gap-2">
                <Button size="lg" onClick={onCreateNew}>+ Neuen Jahresplan erstellen</Button>
                <Button variant="outline" onClick={() => icsInputRef.current?.click()}>Aus ICS-Datei erstellen</Button>
                <div className="flex gap-2 pt-1 border-t border-[var(--color-ink-200)]">
                  <Button variant="ghost" className="flex-1" onClick={() => onImportJson(createDemoDoc())}>
                    Demo ausprobieren
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 flex items-center gap-1.5"
                    onClick={onStartTour}
                  >
                    <Play className="w-3 h-3" /> Geführte Tour
                  </Button>
                </div>
                <input
                  ref={icsInputRef}
                  type="file"
                  accept=".ics"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIcs(f); e.target.value = ''; }}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      <IcsImportDialog
        open={icsParsed !== null}
        parsed={icsParsed ?? []}
        categories={defaultCategories}
        targetSchoolyear={null}
        onCancel={() => setIcsParsed(null)}
        onConfirm={() => { if (icsParsed) onImportJson(buildDocFromIcs(icsParsed)); setIcsParsed(null); }}
      />
    </div>
  );
}
