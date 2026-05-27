import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { storage, type DocSummary } from '@/lib/storage';
import { toast } from 'sonner';

interface Props {
  onCreateNew(): void;
  onOpenDoc(id: string): void;
  onImportJson(doc: import('@/types').PlannerDocument): void;
}

export function Welcome({ onCreateNew, onOpenDoc, onImportJson }: Props) {
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full p-10 shadow-[var(--shadow-modal)]">
        <div className="text-center mb-8">
          <img src="/curriculr-logo-dark.svg" alt="Curriculr" className="h-12 mx-auto mb-3" onError={(e) => { e.currentTarget.src = '/curriculr-logo.svg'; }} />
          <h1 className="text-2xl font-bold text-[var(--color-primary-900)]">Planner</h1>
          <p className="text-[var(--color-text-muted)] mt-2">
            Jahresterminplan für die Schulleitung
          </p>
        </div>

        {docs.length > 0 && (
          <div className="mb-8">
            <div className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">
              Gespeicherte Pläne
            </div>
            <ul className="space-y-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-white"
                >
                  <div>
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">
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
          <Button size="lg" onClick={onCreateNew}>
            + Neuen Jahresplan erstellen
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            JSON-Backup laden
          </Button>
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
          <div className="text-xs text-[var(--color-text-muted)] mt-4 text-center">
            Phase 2: Excel-Import + ICS-Vorjahresplan
          </div>
        </div>
      </Card>
    </div>
  );
}
