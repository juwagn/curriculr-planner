import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import { parseIcs, type ParsedEvent } from '@/lib/ics-import';
import { IcsImportDialog } from '@/components/import/IcsImportDialog';
import { toast } from 'sonner';

export function ImportTab() {
  const doc = usePlannerStore((s) => s.doc);
  const addEvents = usePlannerStore((s) => s.addEvents);
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedEvent[] | null>(null);

  const onFile = async (file: File) => {
    try {
      const events = parseIcs(await file.text());
      if (events.length === 0) {
        toast.error('Keine Termine in der ICS gefunden');
        return;
      }
      setParsed(events);
    } catch (e) {
      toast.error('ICS ungültig: ' + (e as Error).message);
    }
  };

  if (!doc) return null;

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[var(--color-ink-500)]">
        ICS-Datei (z.B. Vorjahresplan) in den aktuellen Plan einfügen.
      </p>
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
          if (f) onFile(f);
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
    </div>
  );
}
