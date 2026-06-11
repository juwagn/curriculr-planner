import { create } from 'zustand';
import type { PlannerDocument, UUID } from '@/types';
import type { WpStage, StageAction } from '@/lib/wp-stage';
import { nextStage } from '@/lib/wp-stage';
import { loadWpConfig, saveWpConfig, type WpSyncConfig, type WpPlanLink } from '@/lib/wp-sync-config';
import { pushDoc, type PushResult } from '@/lib/wp-sync';
import { useAuthStore } from '@/stores/auth';

export type WpSyncState = 'idle' | 'sending' | 'synced' | 'conflict' | 'error';

interface ConflictInfo { docId: UUID; serverVersion: number; serverDoc: PlannerDocument; }

interface WpSyncStore {
  config: WpSyncConfig;
  syncState: WpSyncState;
  message: string;
  conflict: ConflictInfo | null;

  setConfig(cfg: WpSyncConfig): void;
  linkFor(docId: UUID): WpPlanLink | undefined;
  send(doc: PlannerDocument, action?: StageAction): Promise<WpSyncState>;
  keepLocal(doc: PlannerDocument): Promise<WpSyncState>;
  clearConflict(): void;
}

export const useWpSyncStore = create<WpSyncStore>((set, get) => ({
  config: loadWpConfig(),
  syncState: 'idle',
  message: '',
  conflict: null,

  setConfig(cfg) { saveWpConfig(cfg); set({ config: cfg }); },

  linkFor(docId) { return get().config.links[docId]; },

  async send(doc, action) {
    const { config } = get();
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ syncState: 'error', message: 'Nicht angemeldet — bitte unter Einstellungen → WordPress anmelden.' });
      return 'error';
    }
    const docId = doc.schoolyear.id;
    const link = config.links[docId];
    if (!config.enabled || !link) {
      set({ syncState: 'error', message: 'Dieser Plan ist nicht mit WordPress verknüpft (Einstellungen → WordPress).' });
      return 'error';
    }
    const targetStage: WpStage = action ? (nextStage(link.stage, action) ?? link.stage) : link.stage;
    set({ syncState: 'sending', message: 'Sende an WordPress…' });
    const res: PushResult = await pushDoc(config, link.schoolyearKey, doc, link.knownVersion, targetStage, token);
    if (res.status === 'ok') {
      const newLink: WpPlanLink = { ...link, stage: res.stage ?? targetStage, knownVersion: res.version ?? link.knownVersion, feedUrl: res.feedUrl ?? link.feedUrl };
      get().setConfig({ ...config, links: { ...config.links, [docId]: newLink } });
      set({ syncState: 'synced', message: '✓ An WordPress gesendet', conflict: null });
      return 'synced';
    } else if (res.status === 'conflict') {
      set({ syncState: 'conflict', message: 'WordPress hat eine neuere Version.',
        conflict: { docId, serverVersion: res.serverVersion ?? 0, serverDoc: res.serverDoc as PlannerDocument } });
      return 'conflict';
    } else {
      set({ syncState: 'error', message: res.message ?? 'Senden fehlgeschlagen.' });
      return 'error';
    }
  },

  async keepLocal(doc) {
    const { conflict, config } = get();
    if (!conflict) return 'error';
    const link = config.links[conflict.docId];
    if (!link) return 'error';
    get().setConfig({ ...config, links: { ...config.links, [conflict.docId]: { ...link, knownVersion: conflict.serverVersion } } });
    set({ conflict: null });
    return get().send(doc);
  },

  clearConflict() { set({ conflict: null, syncState: 'idle', message: '' }); },
}));
