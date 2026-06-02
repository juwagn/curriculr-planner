import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { storage } from '@/lib/storage';
import { buildIcs, slugify } from '@/lib/ics-export';
import { buildExcel } from '@/lib/excel-export';
import { toast } from 'sonner';

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportDropdown() {
  const doc = usePlannerStore((s) => s.doc);
  const openPrintDialog = useUiStore((s) => s.openPrintDialog);
  if (!doc) return null;

  const slug = slugify(doc.meta.name);
  const today = new Date().toISOString().slice(0, 10);

  const exportIcs = () => {
    const ics = buildIcs(doc);
    downloadBlob(`${slug}.ics`, new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    toast.success('ICS heruntergeladen');
  };

  const exportJson = () => {
    const json = storage.exportJson(doc);
    downloadBlob(`curriculr-backup-${today}.json`, new Blob([json], { type: 'application/json' }));
    toast.success('Backup heruntergeladen');
  };

  const exportExcel = () => {
    const buf = buildExcel(doc);
    downloadBlob(`${slug}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    toast.success('Excel heruntergeladen');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button data-tour="export-btn">
          Export ↓
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportIcs}>ICS-Datei (.ics)</DropdownMenuItem>
        <DropdownMenuItem onClick={exportJson}>JSON-Backup (.json)</DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel}>Excel-Konverter-Format (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={openPrintDialog}>PDF / Druck</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
