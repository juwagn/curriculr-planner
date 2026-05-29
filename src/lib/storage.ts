import type { PlannerDocument, UUID } from '@/types';
import { PlannerDocumentSchema, migrate } from './schemas';

const PREFIX = 'curriculr-planner';
const KEY_DOCS = `${PREFIX}:docs`;
const KEY_ACTIVE = `${PREFIX}:active`;
const keyDoc = (id: UUID) => `${PREFIX}:doc:${id}`;

export interface DocSummary {
  id: UUID;
  name: string;
  schoolyearLabel: string;
  eventCount: number;
  lastSaved: string;
}

export interface StorageAdapter {
  listDocs(): Promise<DocSummary[]>;
  loadDoc(id: UUID): Promise<PlannerDocument>;
  saveDoc(doc: PlannerDocument): Promise<void>;
  deleteDoc(id: UUID): Promise<void>;
  setActiveDoc(id: UUID | null): Promise<void>;
  getActiveDoc(): Promise<UUID | null>;
  exportJson(doc: PlannerDocument): string;
  importJson(json: string): Promise<PlannerDocument>;
}

export class LocalStorageAdapter implements StorageAdapter {
  async listDocs(): Promise<DocSummary[]> {
    const ids: UUID[] = JSON.parse(localStorage.getItem(KEY_DOCS) ?? '[]');
    return ids
      .map((id) => {
        const raw = localStorage.getItem(keyDoc(id));
        if (!raw) return null;
        try {
          const doc = JSON.parse(raw) as PlannerDocument;
          return {
            id,
            name: doc.meta.name,
            schoolyearLabel: doc.schoolyear.label,
            eventCount: doc.events.length,
            lastSaved: doc.meta.lastSaved
          };
        } catch {
          return null;
        }
      })
      .filter((x): x is DocSummary => x !== null);
  }

  async loadDoc(id: UUID): Promise<PlannerDocument> {
    const raw = localStorage.getItem(keyDoc(id));
    if (!raw) throw new Error(`Doc ${id} not found`);
    let parsed: unknown;
    try {
      parsed = migrate(JSON.parse(raw));
    } catch {
      throw new Error(`Doc ${id}: invalid JSON`);
    }
    const result = PlannerDocumentSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Invalid doc ${id}: ${result.error.message}`);
    }
    return result.data as PlannerDocument;
  }

  async saveDoc(doc: PlannerDocument): Promise<void> {
    const result = PlannerDocumentSchema.safeParse(doc);
    if (!result.success) {
      throw new Error(`Cannot save invalid doc: ${result.error.message}`);
    }
    const id = doc.schoolyear.id;
    localStorage.setItem(keyDoc(id), JSON.stringify(doc));
    const ids: UUID[] = JSON.parse(localStorage.getItem(KEY_DOCS) ?? '[]');
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(KEY_DOCS, JSON.stringify(ids));
    }
  }

  async deleteDoc(id: UUID): Promise<void> {
    localStorage.removeItem(keyDoc(id));
    const ids: UUID[] = JSON.parse(localStorage.getItem(KEY_DOCS) ?? '[]');
    localStorage.setItem(KEY_DOCS, JSON.stringify(ids.filter((x) => x !== id)));
    if ((await this.getActiveDoc()) === id) await this.setActiveDoc(null);
  }

  async setActiveDoc(id: UUID | null): Promise<void> {
    if (id === null) localStorage.removeItem(KEY_ACTIVE);
    else localStorage.setItem(KEY_ACTIVE, id);
  }

  async getActiveDoc(): Promise<UUID | null> {
    return localStorage.getItem(KEY_ACTIVE);
  }

  exportJson(doc: PlannerDocument): string {
    return JSON.stringify(doc, null, 2);
  }

  async importJson(json: string): Promise<PlannerDocument> {
    const parsed = migrate(JSON.parse(json));
    const result = PlannerDocumentSchema.safeParse(parsed);
    if (!result.success) throw new Error(`Invalid backup: ${result.error.message}`);
    return result.data as PlannerDocument;
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();
