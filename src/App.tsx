import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { Welcome } from '@/components/welcome/Welcome';
import { Wizard } from '@/components/wizard/Wizard';
import { Editor } from '@/components/editor/Editor';
import { PlanSwitcherDialog } from '@/components/welcome/PlanSwitcherDialog';
import { storage } from '@/lib/storage';
import { usePlannerStore } from '@/stores/planner';
import type { PlannerDocument, UUID } from '@/types';

type Route = 'loading' | 'welcome' | 'wizard' | 'editor';

export default function App() {
  const [route, setRoute] = useState<Route>('loading');
  const [planSwitcherOpen, setPlanSwitcherOpen] = useState(false);
  const setDoc = usePlannerStore((s) => s.setDoc);

  useEffect(() => {
    storage.getActiveDoc().then(async (id) => {
      if (!id) {
        setRoute('welcome');
        return;
      }
      try {
        const doc = await storage.loadDoc(id);
        setDoc(doc);
        setRoute('editor');
      } catch {
        await storage.setActiveDoc(null);
        setRoute('welcome');
      }
    });
  }, [setDoc]);

  const openDoc = async (id: UUID) => {
    const doc = await storage.loadDoc(id);
    setDoc(doc);
    await storage.setActiveDoc(id);
    setRoute('editor');
  };

  const importDoc = async (doc: PlannerDocument) => {
    await storage.saveDoc(doc);
    await storage.setActiveDoc(doc.schoolyear.id);
    setDoc(doc);
    setRoute('editor');
  };

  return (
    <>
      <Toaster richColors position="bottom-right" />
      {route === 'loading' && (
        <div className="min-h-screen flex items-center justify-center text-[var(--color-text-muted)]">
          Lädt…
        </div>
      )}
      {route === 'welcome' && (
        <Welcome
          onCreateNew={() => setRoute('wizard')}
          onOpenDoc={openDoc}
          onImportJson={importDoc}
        />
      )}
      {route === 'wizard' && (
        <Wizard
          onCancel={() => setRoute('welcome')}
          onComplete={async (doc) => {
            await storage.saveDoc(doc);
            await storage.setActiveDoc(doc.schoolyear.id);
            setDoc(doc);
            setRoute('editor');
          }}
        />
      )}
      {route === 'editor' && (
        <>
          <Editor onSwitchPlan={() => setPlanSwitcherOpen(true)} />
          <PlanSwitcherDialog
            open={planSwitcherOpen}
            onClose={() => setPlanSwitcherOpen(false)}
            onCreateNew={() => setRoute('wizard')}
          />
        </>
      )}
    </>
  );
}
