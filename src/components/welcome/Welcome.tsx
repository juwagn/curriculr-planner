import { useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { storage, type DocSummary } from '@/lib/storage';
import { parseIcs, mapToEvents, type ParsedEvent } from '@/lib/ics-import';
import { parseKonverterXlsx } from '@/lib/excel-import';
import { createEmptyDoc } from '@/stores/planner';
import { createDemoDoc } from '@/lib/demo';
import { IcsImportDialog } from '@/components/import/IcsImportDialog';
import { toast } from 'sonner';
import type { PlannerDocument } from '@/types';

interface Props {
  onCreateNew(): void;
  onOpenDoc(id: string): void;
  onImportJson(doc: PlannerDocument): void;
  onStartTour(): void;
}

export function Welcome({ onCreateNew, onOpenDoc, onImportJson, onStartTour }: Props) {
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const icsInputRef = useRef<HTMLInputElement>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const [icsParsed, setIcsParsed] = useState<ParsedEvent[] | null>(null);
  const defaultCategories = useMemo(
    () => createEmptyDoc('_', '_', '2000-01-01', '2000-01-01', '2000-01-02').categories,
    []
  );

  useEffect(() => {
    storage.listDocs().then(setDocs);
  }, []);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const doc = await storage.importJson(text);
      onImportJson(doc);
      toast.success('Backup geladen');
    } catch (err) {
      toast.error('Backup ungültig: ' + (err as Error).message);
    }
  };

  const handleIcs = async (file: File) => {
    try {
      const events = parseIcs(await file.text());
      if (events.length === 0) {
        toast.error('Keine Termine in der ICS gefunden');
        return;
      }
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

  const handleXlsx = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const { schoolyear, parsed } = parseKonverterXlsx(buffer);
      if (parsed.length === 0) {
        toast.error('Keine Termine in der Excel-Datei gefunden');
        return;
      }
      // Excel carries no schoolyear bounds — derive them from the event range,
      // mirroring the ICS new-plan path (buildDocFromIcs).
      const minStart = parsed.reduce((m, e) => (e.start < m ? e.start : m), parsed[0].start);
      const maxEnd = parsed.reduce((m, e) => (e.end > m ? e.end : m), parsed[0].end);
      const startYear = Number(minStart.slice(0, 4));
      const label = `${startYear}/${(startYear + 1) % 100}`;
      const doc = createEmptyDoc(`Import ${label}`, label, minStart, minStart, maxEnd);
      if (schoolyear?.holidays && schoolyear.holidays.length > 0) {
        doc.schoolyear.holidays = schoolyear.holidays;
      }
      const fallbackId = doc.categories.find((c) => c.slug === 'sondertag')?.id ?? doc.categories[0].id;
      doc.events = mapToEvents(parsed, doc.categories, fallbackId);
      onImportJson(doc);
      toast.success(`${doc.events.length} Termine aus Excel importiert`);
    } catch (e) {
      toast.error('Excel ungültig: ' + (e as Error).message);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full p-10 shadow-[var(--shadow-modal)] border-[var(--color-ink-200)]">
        <div className="text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}curriculr-logo-dark.svg`} alt="Curriculr" className="h-12 mx-auto mb-3" onError={(e) => { e.currentTarget.src = `${import.meta.env.BASE_URL}curriculr-logo.svg`; }} />
          <h1 className="text-[length:var(--fs-display)] font-bold leading-[var(--lh-display)] tracking-[var(--ls-display)] text-[var(--color-marine-800)]">Planner</h1>
          <p className="text-[13px] text-[var(--color-ink-500)] mt-2">
            Jahresterminplan für die Schulleitung
          </p>
        </div>

        {docs.length > 0 && (
          <div className="mb-8">
            <div className="text-[12px] font-semibold text-[var(--color-ink-500)] mb-3 uppercase tracking-[0.05em]">
              Gespeicherte Pläne
            </div>
            <ul className="space-y-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between p-4 rounded-[var(--radius-default)] border border-[var(--color-ink-200)] bg-[var(--color-paper-card)]"
                >
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--color-ink-900)]">{d.name}</div>
                    <div className="text-[12px] text-[var(--color-ink-500)] mt-1 tabular-nums">
                      {d.eventCount} Termine · Zuletzt {new Date(d.lastSaved).toLocaleString('de-DE')}
                    </div>
                  </div>
                  <Button onClick={() => onOpenDoc(d.id)}>Öffnen</Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* Primary action */}
          <Button size="lg" onClick={onCreateNew}>
            + Neuen Jahresplan erstellen
          </Button>

          {/* Import group */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="text-[11px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em] px-1">
              Aus Datei importieren
            </div>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              JSON-Backup laden
            </Button>
            <Button variant="outline" onClick={() => icsInputRef.current?.click()}>
              Aus ICS-Datei erstellen
            </Button>
            <Button variant="outline" onClick={() => xlsxInputRef.current?.click()}>
              Aus Excel-Datei erstellen
            </Button>
          </div>

          {/* Utility group */}
          <div className="flex flex-col gap-1 pt-1 border-t border-[var(--color-ink-200)]">
            <Button variant="ghost" onClick={() => onImportJson(createDemoDoc())}>
              Demo ausprobieren
            </Button>
            <Button variant="ghost" onClick={onStartTour} className="flex items-center gap-1.5">
              <Play className="w-3 h-3" />
              Geführte Tour starten
            </Button>
          </div>

          {/* Hidden file inputs — keep these exactly as-is */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <input
            ref={icsInputRef}
            type="file"
            accept=".ics"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleIcs(f);
              e.target.value = '';
            }}
          />
          <input
            ref={xlsxInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleXlsx(f);
              e.target.value = '';
            }}
          />
        </div>
      </Card>
      <IcsImportDialog
        open={icsParsed !== null}
        parsed={icsParsed ?? []}
        categories={defaultCategories}
        targetSchoolyear={null}
        onCancel={() => setIcsParsed(null)}
        onConfirm={() => {
          if (icsParsed) onImportJson(buildDocFromIcs(icsParsed));
          setIcsParsed(null);
        }}
      />
    </div>
  );
}
