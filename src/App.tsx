import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { storage } from '@/lib/storage';
import type { UUID } from '@/types';

export default function App() {
  const [route, setRoute] = useState<'loading' | 'welcome' | 'editor'>('loading');
  const [activeDocId, setActiveDocId] = useState<UUID | null>(null);

  useEffect(() => {
    storage.getActiveDoc().then((id) => {
      setActiveDocId(id);
      setRoute(id ? 'editor' : 'welcome');
    });
  }, []);

  return (
    <>
      <Toaster richColors position="bottom-right" />
      {route === 'loading' && (
        <div className="min-h-screen flex items-center justify-center text-[var(--color-text-muted)]">
          Lädt…
        </div>
      )}
      {route === 'welcome' && <div data-testid="welcome-placeholder">Welcome (placeholder)</div>}
      {route === 'editor' && <div data-testid="editor-placeholder">Editor for {activeDocId}</div>}
    </>
  );
}
