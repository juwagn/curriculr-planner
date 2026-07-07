import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Play, HardDrive, Globe, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
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

interface TabProps { id: Source; label: string; icon: ReactNode; source: Source; onSelect: (id: Source) => void; }

function WelcomeTab({ id, label, icon, source, onSelect }: TabProps) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`flex-1 text-[13px] font-bold py-2 px-2 rounded-[8px] transition ${
        source === id
          ? 'bg-white text-[var(--color-marine-800)] shadow-[0_2px_8px_rgba(0,52,92,.12)]'
          : 'text-[var(--color-ink-500)]'
      }`}
    >
      <span className="flex items-center justify-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );
}

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
  const [confirmDeleteLocalId, setConfirmDeleteLocalId] = useState<string | null>(null);
  const [wpItems, setWpItems] = useState<DocListItem[]>([]);
  const [wpLoading, setWpLoading] = useState(false);
  const [wpMsg, setWpMsg] = useState<string | null>(null);
  const icsInputRef = useRef<HTMLInputElement>(null);
  const [icsParsed, setIcsParsed] = useState<ParsedEvent[] | null>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [pendingJsonDoc, setPendingJsonDoc] = useState<PlannerDocument | null>(null);

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
    const ac = new AbortController();
    Promise.resolve()
      .then(() => {
        if (ac.signal.aborted) return;
        setWpLoading(true);
        setWpMsg(null);
        return fetchDocList(config, token);
      })
      .then((result) => {
        if (!result || ac.signal.aborted) return;
        const { items, message } = result;
        setWpItems(items);
        setWpMsg(message ?? (items.length === 0 ? 'Keine Pläne auf WordPress.' : null));
        setWpLoading(false);
      });
    return () => { ac.abort(); };
  }, [source, authed, token, config]);

  const removeLocalDoc = async (id: string, name: string) => {
    await storage.deleteDoc(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setConfirmDeleteLocalId(null);
    toast.success(`Plan „${name}" gelöscht`);
  };

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

  const handleJsonFile = async (file: File) => {
    try {
      const doc = await storage.importJson(await file.text());
      const existing = docs.find((d) => d.id === doc.schoolyear.id);
      if (existing) {
        setPendingJsonDoc(doc);
      } else {
        onImportJson(doc);
      }
    } catch (e) {
      toast.error('Import fehlgeschlagen: ' + (e as Error).message);
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
              <WelcomeTab id="local" label="Dieses Gerät" icon={<HardDrive className="w-3.5 h-3.5" />} source={source} onSelect={setSource} />
              <WelcomeTab id="wordpress" label="WordPress" icon={<Globe className="w-3.5 h-3.5" />} source={source} onSelect={setSource} />
              <WelcomeTab id="new" label="Neu" icon={<Plus className="w-3.5 h-3.5" />} source={source} onSelect={setSource} />
            </div>

            {source === 'local' && (
              <div className="space-y-2">
                <p className="text-[12px] text-[var(--color-ink-500)] mb-3">
                  Pläne werden in diesem Browser gespeichert — nur auf diesem Gerät verfügbar.
                </p>
                {docs.length === 0 && (
                  <p className="text-[13px] text-[var(--color-ink-500)]">Noch keine Pläne auf diesem Gerät.</p>
                )}
                {docs.map((d) => {
                  if (confirmDeleteLocalId === d.id) {
                    return (
                      <div
                        key={d.id}
                        className="flex items-center justify-between gap-3 border border-[var(--color-status-red)] bg-red-50 rounded-[12px] p-3.5"
                      >
                        <span className="text-[13px] font-medium text-[var(--color-status-red)] min-w-0 truncate">
                          „{d.name}" wirklich löschen?
                        </span>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteLocalId(null)}>
                            Abbrechen
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => removeLocalDoc(d.id, d.name)}>
                            Löschen
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 border border-[var(--color-ink-200)] rounded-[12px] p-3.5"
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-bold text-[var(--color-ink-900)] truncate">{d.name}</div>
                        <div className="text-[12px] text-[var(--color-ink-500)] tabular-nums">
                          {d.eventCount} Termine · {new Date(d.lastSaved).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button onClick={() => onOpenDoc(d.id)}>Öffnen</Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-[var(--color-ink-500)] hover:text-[var(--color-marine-800)]"
                          onClick={() => jsonInputRef.current?.click()}
                          aria-label={`${d.name} mit JSON-Backup ersetzen`}
                          title="Mit JSON-Backup ersetzen"
                        >
                          <Upload />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-[var(--color-ink-500)] hover:text-[var(--color-status-red)] hover:bg-red-50"
                          onClick={() => setConfirmDeleteLocalId(d.id)}
                          aria-label={`${d.name} löschen`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {source === 'wordpress' && (
              <div className="space-y-2">
                <p className="text-[12px] text-[var(--color-ink-500)] mb-3">
                  Pläne von der Schul-Website laden — gemeinsamer Stand für alle Berechtigten.
                </p>
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
              <div className="flex flex-col gap-3">
                <div className="space-y-1">
                  <Button size="lg" className="w-full" onClick={onCreateNew}>+ Neuen Jahresplan erstellen</Button>
                  <p className="text-[12px] text-[var(--color-ink-500)] px-0.5">
                    Startet den Einrichtungsassistenten — Schuljahr, Ferien und Kategorien festlegen.
                  </p>
                </div>
                <div className="space-y-1">
                  <Button variant="outline" className="w-full" onClick={() => icsInputRef.current?.click()}>Aus ICS-Datei importieren</Button>
                  <p className="text-[12px] text-[var(--color-ink-500)] px-0.5">
                    Termine aus einer bestehenden Kalenderdatei (.ics) übernehmen.
                  </p>
                </div>
                <div className="space-y-1">
                  <Button variant="outline" className="w-full" onClick={() => jsonInputRef.current?.click()}>JSON-Backup laden</Button>
                  <p className="text-[12px] text-[var(--color-ink-500)] px-0.5">
                    Vorhandenen Plan aus einer Backup-Datei (.json) einspielen.
                  </p>
                </div>
                <div className="flex flex-col gap-1 pt-1 border-t border-[var(--color-ink-200)]">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Button variant="ghost" className="w-full" onClick={() => onImportJson(createDemoDoc())}>
                        Demo ausprobieren
                      </Button>
                      <p className="text-[12px] text-[var(--color-ink-500)] text-center">
                        Beispieldaten laden
                      </p>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full flex items-center gap-1.5"
                        onClick={onStartTour}
                      >
                        <Play className="w-3 h-3" /> Geführte Tour
                      </Button>
                      <p className="text-[12px] text-[var(--color-ink-500)] text-center">
                        Interaktive Einführung
                      </p>
                    </div>
                  </div>
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

      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleJsonFile(f); e.target.value = ''; }}
      />

      <Dialog open={pendingJsonDoc !== null} onOpenChange={(o) => { if (!o) setPendingJsonDoc(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bestehenden Plan überschreiben?</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-[var(--color-ink-500)]">
            Auf diesem Gerät liegt bereits ein Plan mit demselben Schuljahr
            („{pendingJsonDoc?.meta.name}"). Die Backup-Datei überschreibt ihn unwiderruflich.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingJsonDoc(null)}>Abbrechen</Button>
            <Button
              onClick={() => {
                if (pendingJsonDoc) onImportJson(pendingJsonDoc);
                setPendingJsonDoc(null);
              }}
            >
              Überschreiben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
