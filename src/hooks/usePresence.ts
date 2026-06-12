import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useWpSyncStore } from '@/stores/wpSync';
import { fetchLatestRevision, type LatestRevision } from '@/lib/wp-sync';

const POLL_MS = 60_000;

export function relativeTime(raw: string): string {
  const d = new Date(raw.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std`;
  return '';
}

export function usePresence(docId: string | undefined): LatestRevision | null {
  const [latest, setLatest] = useState<LatestRevision | null>(null);
  const token = useAuthStore((s) => s.token);
  const currentSub = useAuthStore((s) => s.claims?.sub);

  useEffect(() => {
    if (!docId || !token) {
      return;
    }

    async function poll() {
      const { config } = useWpSyncStore.getState();
      const { token: currentToken } = useAuthStore.getState();
      const link = docId ? config.links[docId] : undefined;
      if (!config.enabled || !link || !currentToken) { setLatest(null); return; }
      const rev = await fetchLatestRevision(config, link.schoolyearKey, currentToken);
      setLatest(rev);
    }

    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(id);
  }, [docId, token]);

  if (latest && currentSub && latest.authorSub === currentSub) return null;
  return latest;
}
