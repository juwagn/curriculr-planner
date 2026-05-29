import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUiStore } from '@/stores/ui';
import { SchoolyearTab } from './SchoolyearTab';
import { CategoriesTab } from './CategoriesTab';
import { GroupsTab } from './GroupsTab';
import { ExportTab } from './ExportTab';
import { ImportTab } from './ImportTab';
import { AppearanceTab } from './AppearanceTab';
import { AboutTab } from './AboutTab';

export function SettingsModal() {
  const open = useUiStore((s) => s.settingsModalOpen);
  const close = useUiStore((s) => s.closeSettings);
  if (!open) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="!max-w-[min(960px,calc(100vw-2rem))] !w-[min(960px,calc(100vw-2rem))] max-h-[90vh] overflow-auto"
      >
        <DialogTitle>Einstellungen</DialogTitle>
        <Tabs defaultValue="schoolyear" className="mt-4">
          <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1">
            <TabsTrigger value="schoolyear">Schuljahr</TabsTrigger>
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            <TabsTrigger value="groups">Gruppen</TabsTrigger>
            <TabsTrigger value="appearance">Ansicht</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="about">Über</TabsTrigger>
          </TabsList>
          <TabsContent value="schoolyear"><SchoolyearTab /></TabsContent>
          <TabsContent value="categories"><CategoriesTab /></TabsContent>
          <TabsContent value="groups"><GroupsTab /></TabsContent>
          <TabsContent value="appearance"><AppearanceTab /></TabsContent>
          <TabsContent value="export"><ExportTab /></TabsContent>
          <TabsContent value="import"><ImportTab /></TabsContent>
          <TabsContent value="about"><AboutTab /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
