import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUiStore } from '@/stores/ui';
import { SchoolyearTab } from './SchoolyearTab';
import { CategoriesTab } from './CategoriesTab';
import { GroupsTab } from './GroupsTab';
import { ExportTab } from './ExportTab';
import { AboutTab } from './AboutTab';

export function SettingsModal() {
  const open = useUiStore((s) => s.settingsModalOpen);
  const close = useUiStore((s) => s.closeSettings);
  if (!open) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogTitle>Einstellungen</DialogTitle>
        <Tabs defaultValue="schoolyear" className="mt-4">
          <TabsList>
            <TabsTrigger value="schoolyear">Schuljahr</TabsTrigger>
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            <TabsTrigger value="groups">Gruppen</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="about">Über</TabsTrigger>
          </TabsList>
          <TabsContent value="schoolyear"><SchoolyearTab /></TabsContent>
          <TabsContent value="categories"><CategoriesTab /></TabsContent>
          <TabsContent value="groups"><GroupsTab /></TabsContent>
          <TabsContent value="export"><ExportTab /></TabsContent>
          <TabsContent value="about"><AboutTab /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
