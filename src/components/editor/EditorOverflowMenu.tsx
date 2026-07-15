import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { useWpSyncStore } from '@/stores/wpSync';
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

export function EditorOverflowMenu() {
  const doc = usePlannerStore((s) => s.doc);
  const setDoc = usePlannerStore((s) => s.setDoc);
  const openHelp = useUiStore((s) => s.openHelp);
  const openSettings = useUiStore((s) => s.openSettings);
  const openPrintDialog = useUiStore((s) => s.openPrintDialog);
  const wpEnabled = useWpSyncStore((s) => s.config.enabled);
  const wpLink = useWpSyncStore((s) => (doc ? s.config.links[doc.schoolyear.id] : undefined));
  const wpPull = useWpSyncStore((s) => s.pull);
  if (!doc) return null;

  const pullFromWp = async () => {
    const result = await wpPull(doc.schoolyear.id, setDoc);
    if (result === 'pulled') toast.success('Aktueller Stand von WordPress geladen.');
    else if (result === 'not-found') toast.info('Plan nicht auf WordPress gefunden.');
    else if (result === 'error') toast.error(useWpSyncStore.getState().message || 'Laden fehlgeschlagen.');
    // 'downgrade' → confirmation dialog in StatusBar takes over.
  };

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
        <Button
          data-tour="overflow-menu"
          variant="ghost"
          size="icon"
          aria-label="Weitere Optionen"
          title="Weitere Optionen"
          className="text-[var(--color-paper-card)] hover:bg-white/10 hover:text-[var(--color-paper-card)]"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportIcs}>ICS-Datei (.ics)</DropdownMenuItem>
        <DropdownMenuItem onClick={exportJson}>JSON-Backup (.json)</DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel}>Excel-Konverter-Format (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={openPrintDialog}>PDF / Druck</DropdownMenuItem>
        {wpEnabled && wpLink && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void pullFromWp()}>Von WordPress laden</DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openHelp}>Hilfe</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openSettings()}>Einstellungen</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
