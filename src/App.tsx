import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { Welcome } from '@/components/welcome/Welcome';
import { Wizard } from '@/components/wizard/Wizard';
import { Editor } from '@/components/editor/Editor';
import { PlanSwitcherDialog } from '@/components/welcome/PlanSwitcherDialog';
import { storage } from '@/lib/storage';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { exchangeToken } from '@/lib/wp-auth';
import { useAuthStore, loadSession } from '@/stores/auth';
import { useWpSyncStore } from '@/stores/wpSync';
import { loadWpConfig } from '@/lib/wp-sync-config';
import { createDemoDoc } from '@/lib/demo';
import { toast } from 'sonner';
import type { PlannerDocument, UUID } from '@/types';

type Route = 'loading' | 'welcome' | 'wizard' | 'editor';

export default function App() {
  const [route, setRoute] = useState<Route>('loading');
  const [planSwitcherOpen, setPlanSwitcherOpen] = useState(false);
  const setDoc = usePlannerStore((s) => s.setDoc);
  const setTourPending = useUiStore((s) => s.setTourPending);

  useEffect(() => {
    async function boot() {
      // Restore token from sessionStorage (survives hard reload, cleared on tab close)
      const session = loadSession();
      if (session) useAuthStore.getState().setToken(session.token, session.claims);

      // Intercept SSO handoff: WP redirects back with #auth=<one-time-code> or #auth_error=<reason>
      const hash = window.location.hash;
      if (hash.startsWith('#auth_error=')) {
        history.replaceState({}, '', location.pathname + location.search);
        toast.error('Anmeldung abgelehnt — ' + decodeURIComponent(hash.slice(12)));
      } else if (hash.startsWith('#auth=')) {
        const exchangeCode = decodeURIComponent(hash.slice(6));
        // Strip from URL immediately to prevent reuse on reload
        history.replaceState({}, '', location.pathname + location.search);
        const cfg = loadWpConfig();
        if (cfg.baseUrl) {
          const result = await exchangeToken(cfg.baseUrl, exchangeCode);
          if (result) {
            useAuthStore.getState().setToken(result.token, result.claims);
          } else {
            toast.error('Anmeldung fehlgeschlagen — bitte erneut versuchen.');
          }
        }
      }

      // Normal doc routing
      const id = await storage.getActiveDoc();
      if (!id) {
        setRoute('welcome');
        return;
      }
      try {
        const doc = await storage.loadDoc(id);
        setDoc(doc);
        setRoute('editor');
        const wpState = useWpSyncStore.getState();
        if (useAuthStore.getState().token && wpState.config.enabled && wpState.config.links[id]) {
          void wpState.pull(id, setDoc);
        }
      } catch {
        await storage.setActiveDoc(null);
        setRoute('welcome');
      }
    }
    void boot();
  }, [setDoc]);

  const openDoc = async (id: UUID) => {
    const doc = await storage.loadDoc(id);
    setDoc(doc);
    await storage.setActiveDoc(id);
    setRoute('editor');
  };

  const startTour = async () => {
    const doc = createDemoDoc();
    await storage.saveDoc(doc);
    await storage.setActiveDoc(doc.schoolyear.id);
    setDoc(doc);
    setTourPending(true);
    setRoute('editor');
  };

  const importDoc = async (doc: PlannerDocument) => {
    try {
      await storage.saveDoc(doc);
      await storage.setActiveDoc(doc.schoolyear.id);
      setDoc(doc);
      setRoute('editor');
    } catch (err) {
      toast.error('Import fehlgeschlagen: ' + (err as Error).message);
    }
  };

  return (
    <>
      <Toaster richColors position="bottom-right" />
      {route === 'loading' && (
        <div className="min-h-screen flex items-center justify-center text-[13px] text-[var(--color-ink-500)]">
          Lädt…
        </div>
      )}
      {route === 'welcome' && (
        <Welcome
          onCreateNew={() => setRoute('wizard')}
          onOpenDoc={openDoc}
          onImportJson={importDoc}
          onStartTour={startTour}
          onEnterEditor={() => setRoute('editor')}
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
