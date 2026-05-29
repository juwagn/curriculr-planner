import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { usePlannerStore } from '@/stores/planner';
import { mapToEvents, parseIcs, type ParsedEvent } from '@/lib/ics-import';
import { parseKonverterXlsx } from '@/lib/excel-import';
import { IcsImportDialog } from '@/components/import/IcsImportDialog';
import { toast } from 'sonner';

export function ImportTab() {
  const doc = usePlannerStore((s) => s.doc);
  const addEvent = usePlannerStore((s) => s.addEvent);
  const updateSchoolyear = usePlannerStore((s) => s.updateSchoolyear);
  const fileRef = useRef<HTMLInputElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedEvent[] | null>(null);
  const [importFerien, setImportFerien] = useState(false);

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

  const onXlsx = async (file: File) => {
    const current = usePlannerStore.getState().doc;
    if (!current) return;
    try {
      const { schoolyear, parsed: parsedEvents } = parseKonverterXlsx(await file.arrayBuffer());
      if (parsedEvents.length === 0) {
        toast.error('Keine Termine in der Excel-Datei gefunden');
        return;
      }
      const fallbackId =
        current.categories.find((c) => c.slug === 'sondertag')?.id ?? current.categories[0].id;
      const events = mapToEvents(parsedEvents, current.categories, fallbackId);
      events.forEach((ev) => addEvent(ev));
      if (importFerien && schoolyear?.holidays && schoolyear.holidays.length > 0) {
        updateSchoolyear({ holidays: [...current.schoolyear.holidays, ...schoolyear.holidays] });
      }
      toast.success(`${events.length} Termine importiert`);
    } catch (e) {
      toast.error('Excel ungültig: ' + (e as Error).message);
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
          events.forEach((ev) => addEvent(ev));
          setParsed(null);
          toast.success(`${events.length} Termine importiert`);
        }}
      />

      <div className="border-t border-[var(--color-ink-200)] pt-4 space-y-4">
        <p className="text-[13px] text-[var(--color-ink-500)]">
          Excel-Datei (Konverter-Format) in den aktuellen Plan einfügen.
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--color-ink-900)]">
          <Checkbox checked={importFerien} onCheckedChange={(v) => setImportFerien(v === true)} />
          <span>Ferien aus Datei übernehmen</span>
        </label>
        <Button variant="outline" onClick={() => xlsxRef.current?.click()}>
          Excel-Datei wählen
        </Button>
        <input
          ref={xlsxRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onXlsx(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
