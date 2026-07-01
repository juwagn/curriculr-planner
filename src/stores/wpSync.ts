import { create } from 'zustand';
import type { PlannerDocument, UUID } from '@/types';
import type { WpStage, StageAction } from '@/lib/wp-stage';
import { nextStage } from '@/lib/wp-stage';
import { loadWpConfig, saveWpConfig, type WpSyncConfig, type WpPlanLink } from '@/lib/wp-sync-config';
import { pushDoc, fetchDoc, type PushResult } from '@/lib/wp-sync';
import { useAuthStore } from '@/stores/auth';
import { storage } from '@/lib/storage';

export type WpSyncState = 'idle' | 'sending' | 'synced' | 'conflict' | 'error';

interface ConflictInfo { docId: UUID; serverVersion: number; serverDoc: PlannerDocument; authorName?: string; savedAt?: string; }
interface PendingPull { docId: UUID; doc: PlannerDocument; version: number; stage: WpStage; knownVersion: number; }

interface WpSyncStore {
  config: WpSyncConfig;
  syncState: WpSyncState;
  message: string;
  conflict: ConflictInfo | null;
  pendingPull: PendingPull | null;

  setConfig(cfg: WpSyncConfig): void;
  linkFor(docId: UUID): WpPlanLink | undefined;
  send(doc: PlannerDocument, action?: StageAction): Promise<WpSyncState>;
  keepLocal(doc: PlannerDocument): Promise<WpSyncState>;
  clearConflict(): void;
  pull(docId: UUID, setDocFn: (doc: PlannerDocument) => void): Promise<'pulled' | 'not-found' | 'error' | 'downgrade'>;
  confirmPull(setDocFn: (doc: PlannerDocument) => void): void;
  cancelPull(): void;
  loadFromWp(sj: string, name: string, setDocFn: (doc: PlannerDocument) => void): Promise<'loaded' | 'error'>;
}

export const useWpSyncStore = create<WpSyncStore>((set, get) => ({
  config: loadWpConfig(),
  syncState: 'idle',
  message: '',
  conflict: null,
  pendingPull: null,

  setConfig(cfg) { saveWpConfig(cfg); set({ config: cfg }); },

  linkFor(docId) { return get().config.links[docId]; },

  async send(doc, action) {
    const { config } = get();
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ syncState: 'error', message: 'Nicht angemeldet — bitte unter Einstellungen → Veröffentlichung anmelden.' });
      return 'error';
    }
    const docId = doc.schoolyear.id;
    const link = config.links[docId];
    if (!config.enabled || !link) {
      set({ syncState: 'error', message: 'Dieser Plan ist nicht mit WordPress verknüpft (Einstellungen → Veröffentlichung).' });
      return 'error';
    }
    const targetStage: WpStage = action ? (nextStage(link.stage, action) ?? link.stage) : link.stage;
    set({ syncState: 'sending', message: 'Sende an WordPress…' });
    const res: PushResult = await pushDoc(config, link.schoolyearKey, doc, link.knownVersion, targetStage, token);
    if (res.status === 'ok') {
      const newLink: WpPlanLink = {
        ...link,
        stage:        res.stage        ?? targetStage,
        knownVersion: res.version      ?? link.knownVersion,
        feedUrl:      res.feedUrl      ?? link.feedUrl,
        lastPushedAt: new Date().toISOString(),
      };
      get().setConfig({ ...config, links: { ...config.links, [docId]: newLink } });
      set({ syncState: 'synced', message: '✓ An WordPress gesendet', conflict: null });
      return 'synced';
    } else if (res.status === 'conflict') {
      set({ syncState: 'conflict', message: 'WordPress hat eine neuere Version.',
        conflict: { docId, serverVersion: res.serverVersion ?? 0, serverDoc: res.serverDoc as PlannerDocument,
          authorName: res.authorName, savedAt: res.savedAt } });
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

  async pull(docId, setDocFn) {
    const { config } = get();
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ syncState: 'error', message: 'Nicht angemeldet — bitte unter Einstellungen → Veröffentlichung anmelden.' });
      return 'error';
    }
    const link = config.links[docId];
    if (!config.enabled || !link) {
      set({ syncState: 'error', message: 'Dieser Plan ist nicht mit WordPress verknüpft.' });
      return 'error';
    }
    set({ syncState: 'sending', message: 'Lade von WordPress…' });
    const res = await fetchDoc(config, link.schoolyearKey, token);
    if (!res.exists) {
      if (res.message) {
        set({ syncState: 'error', message: res.message });
        return 'error';
      }
      set({ syncState: 'idle', message: 'Dokument nicht auf WordPress gefunden.' });
      return 'not-found';
    }
    if (!res.doc) {
      set({ syncState: 'error', message: res.message ?? 'Ungültige Antwort vom Server.' });
      return 'error';
    }
    const wpVer = res.version ?? 0;
    if (wpVer < link.knownVersion) {
      set({
        syncState: 'idle',
        message: '',
        pendingPull: { docId, doc: res.doc as PlannerDocument, version: wpVer, stage: res.stage ?? link.stage, knownVersion: link.knownVersion },
      });
      return 'downgrade';
    }
    const newLink: WpPlanLink = { ...link, knownVersion: wpVer, stage: res.stage ?? link.stage };
    get().setConfig({ ...config, links: { ...config.links, [docId]: newLink } });
    setDocFn(res.doc);
    set({ syncState: 'synced', message: '✓ Stand von WordPress geladen', conflict: null });
    return 'pulled';
  },

  confirmPull(setDocFn) {
    const { pendingPull, config } = get();
    if (!pendingPull) return;
    const link = config.links[pendingPull.docId];
    if (link) {
      const newLink: WpPlanLink = { ...link, knownVersion: pendingPull.version, stage: pendingPull.stage };
      get().setConfig({ ...config, links: { ...config.links, [pendingPull.docId]: newLink } });
    }
    setDocFn(pendingPull.doc);
    set({ pendingPull: null, syncState: 'synced', message: '✓ Stand von WordPress geladen', conflict: null });
  },

  cancelPull() { set({ pendingPull: null, syncState: 'idle', message: '' }); },

  async loadFromWp(sj, name, setDocFn) {
    const { config } = get();
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ syncState: 'error', message: 'Nicht angemeldet — bitte mit IServ anmelden.' });
      return 'error';
    }
    set({ syncState: 'sending', message: `Lade „${name}" von WordPress…` });
    const res = await fetchDoc(config, sj, token);
    if (!res.exists || !res.doc) {
      set({ syncState: 'error', message: res.message ?? 'Plan nicht auf WordPress gefunden.' });
      return 'error';
    }
    const doc = res.doc as PlannerDocument;
    const docId = doc.schoolyear.id;
    const version = res.version ?? 0;
    const stage = res.stage ?? 'entwurf';
    await storage.saveDoc(doc);
    await storage.setActiveDoc(docId);
    const link: WpPlanLink = {
      schoolyearKey: sj,
      schoolyearLabel: name,
      stage,
      knownVersion: version,
    };
    get().setConfig({ ...config, enabled: true, links: { ...config.links, [docId]: link } });
    setDocFn(doc);
    set({ syncState: 'synced', message: '✓ Von WordPress geladen', conflict: null });
    return 'loaded';
  },
}));
