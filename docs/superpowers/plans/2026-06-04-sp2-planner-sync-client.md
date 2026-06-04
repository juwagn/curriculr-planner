# SP2 — Planner WordPress Sync Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, off-by-default "publish to WordPress" feature to the Planner: a WordPress settings tab, manual Send/Approve/Publish buttons with a stage badge, and clear status — without changing any existing behaviour when sync is disabled.

**Architecture:** Three framework-agnostic libs (config, stage logic, REST client) are TDD'd with Vitest. A small Zustand store orchestrates state. UI is one new settings tab + a controls strip in the editor header + a conflict dialog. The `PlannerDocument` schema is unchanged (stage lives in the sync config, not the doc).

**Tech Stack:** React 19, TypeScript (strict), Zustand, Vitest + Testing Library, shadcn/ui primitives. Repo: `curriculr-planner`. **Branch off `main`** as `feat/sp2-wp-sync`.

**Reference spec:** `docs/superpowers/specs/2026-06-04-sp2-planner-sync-client-design.md`. Depends on the `curriculr/v1` REST contract (SP1) and the `stage` field (SP1.1).

---

## File Structure
- **Create** `src/lib/wp-stage.ts` (+ `.test.ts`) — stage type, labels, transitions.
- **Create** `src/lib/wp-sync-config.ts` (+ `.test.ts`) — config type, localStorage load/save.
- **Create** `src/lib/wp-sync.ts` (+ `.test.ts`) — REST client (`testConnection`/`pushDoc`/`fetchDoc`), injectable `fetch`.
- **Create** `src/stores/wpSync.ts` — Zustand store orchestrating sync state.
- **Create** `src/components/settings/WordpressTab.tsx` (+ `.test.tsx`) — settings UI.
- **Create** `src/components/editor/WpSyncControls.tsx` — stage badge + buttons + status, conflict dialog.
- **Modify** `src/stores/ui.ts` — add `'wordpress'` to `SettingsTab`.
- **Modify** `src/components/settings/SettingsModal.tsx` — register the tab.
- **Modify** `src/components/editor/EditorHeader.tsx` — mount `WpSyncControls`.

Run tests with `npx vitest run <file>`; typecheck with `npm run typecheck`.

---

## Task 1: Stage logic (TDD)

**Files:** Create `src/lib/wp-stage.ts`, `src/lib/wp-stage.test.ts`.

- [ ] **Step 1: Failing test** — `src/lib/wp-stage.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { nextStage, availableActions, STAGE_LABELS } from './wp-stage';

describe('wp-stage', () => {
  it('labels all three stages in German', () => {
    expect(STAGE_LABELS.entwurf).toBe('Entwurf');
    expect(STAGE_LABELS.genehmigt).toBe('Genehmigt');
    expect(STAGE_LABELS.oeffentlich).toBe('Öffentlich');
  });
  it('freigeben moves entwurf -> genehmigt only', () => {
    expect(nextStage('entwurf', 'freigeben')).toBe('genehmigt');
    expect(nextStage('genehmigt', 'freigeben')).toBeNull();
    expect(nextStage('oeffentlich', 'freigeben')).toBeNull();
  });
  it('oeffentlich-schalten moves genehmigt -> oeffentlich only', () => {
    expect(nextStage('genehmigt', 'oeffentlich-schalten')).toBe('oeffentlich');
    expect(nextStage('entwurf', 'oeffentlich-schalten')).toBeNull();
  });
  it('exposes the available action per stage', () => {
    expect(availableActions('entwurf')).toEqual(['freigeben']);
    expect(availableActions('genehmigt')).toEqual(['oeffentlich-schalten']);
    expect(availableActions('oeffentlich')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/lib/wp-stage.test.ts` → fails (module missing).

- [ ] **Step 3: Implement** — `src/lib/wp-stage.ts`:
```ts
export type WpStage = 'entwurf' | 'genehmigt' | 'oeffentlich';

export const STAGE_LABELS: Record<WpStage, string> = {
  entwurf: 'Entwurf',
  genehmigt: 'Genehmigt',
  oeffentlich: 'Öffentlich',
};

export type StageAction = 'freigeben' | 'oeffentlich-schalten';

export const STAGE_ACTION_LABELS: Record<StageAction, string> = {
  'freigeben': 'Freigeben',
  'oeffentlich-schalten': 'Öffentlich schalten',
};

/** Target stage for an action, or null if the action is invalid for this stage. */
export function nextStage(stage: WpStage, action: StageAction): WpStage | null {
  if (action === 'freigeben' && stage === 'entwurf') return 'genehmigt';
  if (action === 'oeffentlich-schalten' && stage === 'genehmigt') return 'oeffentlich';
  return null;
}

/** Stage-advancing actions offered for the current stage (no backward moves — YAGNI). */
export function availableActions(stage: WpStage): StageAction[] {
  if (stage === 'entwurf') return ['freigeben'];
  if (stage === 'genehmigt') return ['oeffentlich-schalten'];
  return [];
}
```

- [ ] **Step 4: Run, verify pass** — `npx vitest run src/lib/wp-stage.test.ts` → all pass.

- [ ] **Step 5: Commit**
```bash
git add src/lib/wp-stage.ts src/lib/wp-stage.test.ts
git commit -m "feat(wp-sync): stage type + transitions"
```

---

## Task 2: Sync config + localStorage (TDD)

**Files:** Create `src/lib/wp-sync-config.ts`, `src/lib/wp-sync-config.test.ts`.

- [ ] **Step 1: Failing test** — `src/lib/wp-sync-config.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWpConfig, saveWpConfig, EMPTY_CONFIG } from './wp-sync-config';

beforeEach(() => localStorage.clear());

describe('wp-sync-config', () => {
  it('returns an empty, disabled config when nothing is stored', () => {
    expect(loadWpConfig()).toEqual(EMPTY_CONFIG);
    expect(loadWpConfig().enabled).toBe(false);
  });
  it('round-trips a saved config', () => {
    const cfg = { enabled: true, baseUrl: 'https://s.example', username: 'a', appPassword: 'p',
      links: { 'doc-1': { schoolyearKey: 'sj_2026_27', wpProfileId: 'p2', stage: 'entwurf' as const, knownVersion: 3 } } };
    saveWpConfig(cfg);
    expect(loadWpConfig()).toEqual(cfg);
  });
  it('tolerates corrupt JSON and returns the empty config', () => {
    localStorage.setItem('curriculr-planner:wp-sync', '{not json');
    expect(loadWpConfig()).toEqual(EMPTY_CONFIG);
  });
  it('fills missing fields with safe defaults', () => {
    localStorage.setItem('curriculr-planner:wp-sync', JSON.stringify({ enabled: true }));
    const cfg = loadWpConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.baseUrl).toBe('');
    expect(cfg.links).toEqual({});
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/lib/wp-sync-config.test.ts`.

- [ ] **Step 3: Implement** — `src/lib/wp-sync-config.ts`:
```ts
import type { UUID } from '@/types';
import type { WpStage } from './wp-stage';

const KEY = 'curriculr-planner:wp-sync';

export interface WpPlanLink {
  schoolyearKey: string;   // WP school-year key, e.g. 'sj_2026_27'
  wpProfileId: string;     // explicit WP profile id (never the live profile by default)
  stage: WpStage;
  knownVersion: number;    // last server version this client has seen (optimistic concurrency)
}

export interface WpSyncConfig {
  enabled: boolean;
  baseUrl: string;
  username: string;
  appPassword: string;
  links: Record<UUID, WpPlanLink>;  // keyed by PlannerDocument.schoolyear.id
}

export const EMPTY_CONFIG: WpSyncConfig = {
  enabled: false, baseUrl: '', username: '', appPassword: '', links: {},
};

export function loadWpConfig(): WpSyncConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY_CONFIG);
    const p = JSON.parse(raw);
    return {
      enabled: !!p.enabled,
      baseUrl: typeof p.baseUrl === 'string' ? p.baseUrl : '',
      username: typeof p.username === 'string' ? p.username : '',
      appPassword: typeof p.appPassword === 'string' ? p.appPassword : '',
      links: p.links && typeof p.links === 'object' ? p.links : {},
    };
  } catch {
    return structuredClone(EMPTY_CONFIG);
  }
}

export function saveWpConfig(cfg: WpSyncConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}
```

- [ ] **Step 4: Run, verify pass** — `npx vitest run src/lib/wp-sync-config.test.ts`.

- [ ] **Step 5: Commit**
```bash
git add src/lib/wp-sync-config.ts src/lib/wp-sync-config.test.ts
git commit -m "feat(wp-sync): config type + localStorage load/save"
```

---

## Task 3: REST client (TDD)

**Files:** Create `src/lib/wp-sync.ts`, `src/lib/wp-sync.test.ts`.

- [ ] **Step 1: Failing test** — `src/lib/wp-sync.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { testConnection, pushDoc, fetchDoc } from './wp-sync';
import type { WpSyncConfig } from './wp-sync-config';

const cfg: WpSyncConfig = { enabled: true, baseUrl: 'https://s.example/', username: 'admin', appPassword: 'pw', links: {} };
const fakeRes = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('wp-sync client', () => {
  it('testConnection ok', async () => {
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://s.example/wp-json/curriculr/v1/health');
      expect((init?.headers as Record<string,string>).Authorization).toBe('Basic ' + btoa('admin:pw'));
      return fakeRes(200, { ok: true, plugin: '4.6.0' });
    }) as unknown as typeof fetch;
    expect(await testConnection(cfg, fetchImpl)).toEqual({ ok: true, message: 'Verbunden (Plugin 4.6.0).' });
  });
  it('testConnection 401', async () => {
    const f = (async () => fakeRes(401, {})) as unknown as typeof fetch;
    expect((await testConnection(cfg, f)).ok).toBe(false);
  });
  it('testConnection network error', async () => {
    const f = (async () => { throw new Error('net'); }) as unknown as typeof fetch;
    const r = await testConnection(cfg, f);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('nicht erreichbar');
  });
  it('pushDoc ok returns version/stage/feedUrl and sends stage', async () => {
    const f = (async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://s.example/wp-json/curriculr/v1/doc/sj_2026_27');
      expect(init?.method).toBe('PUT');
      expect(JSON.parse(init!.body as string)).toEqual({ doc: { a: 1 }, baseVersion: 2, stage: 'oeffentlich' });
      return fakeRes(200, { status: 'ok', version: 3, stage: 'oeffentlich', feedUrl: 'https://s.example/feed.ics' });
    }) as unknown as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await pushDoc(cfg, 'sj_2026_27', { a: 1 } as any, 2, 'oeffentlich', f);
    expect(r).toEqual({ status: 'ok', version: 3, stage: 'oeffentlich', feedUrl: 'https://s.example/feed.ics' });
  });
  it('pushDoc 409 returns conflict with server data', async () => {
    const f = (async () => fakeRes(409, { error: 'conflict', serverVersion: 5, doc: { b: 2 } })) as unknown as typeof fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await pushDoc(cfg, 'sj', {} as any, 1, 'entwurf', f);
    expect(r.status).toBe('conflict');
    expect(r.serverVersion).toBe(5);
    expect(r.serverDoc).toEqual({ b: 2 });
  });
  it('fetchDoc 404 -> not exists', async () => {
    const f = (async () => fakeRes(404, {})) as unknown as typeof fetch;
    expect(await fetchDoc(cfg, 'sj', f)).toEqual({ exists: false });
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/lib/wp-sync.test.ts`.

- [ ] **Step 3: Implement** — `src/lib/wp-sync.ts`:
```ts
import type { PlannerDocument } from '@/types';
import type { WpStage } from './wp-stage';
import type { WpSyncConfig } from './wp-sync-config';

export type FetchLike = typeof fetch;

export interface PushResult {
  status: 'ok' | 'conflict' | 'error';
  version?: number;
  stage?: WpStage;
  feedUrl?: string;
  serverDoc?: PlannerDocument;
  serverVersion?: number;
  message?: string;
}

const NOT_REACHABLE = 'WordPress nicht erreichbar — Internet/Adresse prüfen.';
const BAD_AUTH = 'Benutzer oder Application Password falsch.';

function authHeader(cfg: WpSyncConfig): string {
  return 'Basic ' + btoa(`${cfg.username}:${cfg.appPassword}`);
}
function base(cfg: WpSyncConfig): string {
  return cfg.baseUrl.replace(/\/+$/, '') + '/wp-json/curriculr/v1';
}

export async function testConnection(cfg: WpSyncConfig, fetchImpl: FetchLike = fetch): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetchImpl(`${base(cfg)}/health`, { headers: { Authorization: authHeader(cfg) } });
    if (res.status === 401) return { ok: false, message: BAD_AUTH };
    if (!res.ok) return { ok: false, message: `Server antwortete mit ${res.status}.` };
    const data = await res.json();
    return { ok: true, message: `Verbunden (Plugin ${data.plugin ?? '?'}).` };
  } catch {
    return { ok: false, message: NOT_REACHABLE };
  }
}

export async function pushDoc(
  cfg: WpSyncConfig, schoolyearKey: string, doc: PlannerDocument, baseVersion: number, stage: WpStage,
  fetchImpl: FetchLike = fetch,
): Promise<PushResult> {
  try {
    const res = await fetchImpl(`${base(cfg)}/doc/${encodeURIComponent(schoolyearKey)}`, {
      method: 'PUT',
      headers: { Authorization: authHeader(cfg), 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc, baseVersion, stage }),
    });
    if (res.status === 409) {
      const data = await res.json();
      return { status: 'conflict', serverVersion: data.serverVersion, serverDoc: data.doc };
    }
    if (res.status === 401) return { status: 'error', message: BAD_AUTH };
    if (!res.ok) return { status: 'error', message: `Server antwortete mit ${res.status}.` };
    const data = await res.json();
    return { status: 'ok', version: data.version, stage: data.stage, feedUrl: data.feedUrl };
  } catch {
    return { status: 'error', message: NOT_REACHABLE };
  }
}

export async function fetchDoc(
  cfg: WpSyncConfig, schoolyearKey: string, fetchImpl: FetchLike = fetch,
): Promise<{ exists: boolean; version?: number; doc?: PlannerDocument; stage?: WpStage; message?: string }> {
  try {
    const res = await fetchImpl(`${base(cfg)}/doc/${encodeURIComponent(schoolyearKey)}`, { headers: { Authorization: authHeader(cfg) } });
    if (res.status === 404) return { exists: false };
    if (!res.ok) return { exists: false, message: `Server antwortete mit ${res.status}.` };
    const data = await res.json();
    return { exists: true, version: data.version, doc: data.doc, stage: data.stage };
  } catch {
    return { exists: false, message: NOT_REACHABLE };
  }
}
```

- [ ] **Step 4: Run, verify pass** — `npx vitest run src/lib/wp-sync.test.ts`.

- [ ] **Step 5: Commit**
```bash
git add src/lib/wp-sync.ts src/lib/wp-sync.test.ts
git commit -m "feat(wp-sync): REST client (test/push/fetch) with injectable fetch"
```

---

## Task 4: Zustand sync store

**Files:** Create `src/stores/wpSync.ts`.

- [ ] **Step 1: Implement the store** — `src/stores/wpSync.ts`:
```ts
import { create } from 'zustand';
import type { PlannerDocument, UUID } from '@/types';
import type { WpStage, StageAction } from '@/lib/wp-stage';
import { nextStage } from '@/lib/wp-stage';
import { loadWpConfig, saveWpConfig, type WpSyncConfig, type WpPlanLink } from '@/lib/wp-sync-config';
import { pushDoc, type PushResult } from '@/lib/wp-sync';

export type WpSyncState = 'idle' | 'sending' | 'synced' | 'conflict' | 'error';

interface ConflictInfo { docId: UUID; serverVersion: number; serverDoc: PlannerDocument; }

interface WpSyncStore {
  config: WpSyncConfig;
  syncState: WpSyncState;
  message: string;
  conflict: ConflictInfo | null;

  setConfig(cfg: WpSyncConfig): void;
  linkFor(docId: UUID): WpPlanLink | undefined;
  /** Push the doc; if action given, advance the stage on success. */
  send(doc: PlannerDocument, action?: StageAction): Promise<void>;
  /** Resolve a 409 by keeping local: re-push at server version. */
  keepLocal(doc: PlannerDocument): Promise<void>;
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
    const docId = doc.schoolyear.id;
    const link = config.links[docId];
    if (!config.enabled || !link) {
      set({ syncState: 'error', message: 'Dieser Plan ist nicht mit WordPress verknüpft (Einstellungen → WordPress).' });
      return;
    }
    const targetStage: WpStage = action ? (nextStage(link.stage, action) ?? link.stage) : link.stage;
    set({ syncState: 'sending', message: 'Sende an WordPress…' });
    const res: PushResult = await pushDoc(config, link.schoolyearKey, doc, link.knownVersion, targetStage);
    if (res.status === 'ok') {
      const links = { ...config.links, [docId]: { ...link, stage: res.stage ?? targetStage, knownVersion: res.version ?? link.knownVersion } };
      const newCfg = { ...config, links };
      saveWpConfig(newCfg);
      set({ config: newCfg, syncState: 'synced', message: '✓ An WordPress gesendet', conflict: null });
    } else if (res.status === 'conflict') {
      set({ syncState: 'conflict', message: 'WordPress hat eine neuere Version.',
        conflict: { docId, serverVersion: res.serverVersion ?? 0, serverDoc: res.serverDoc as PlannerDocument } });
    } else {
      set({ syncState: 'error', message: res.message ?? 'Senden fehlgeschlagen.' });
    }
  },

  async keepLocal(doc) {
    const { conflict, config } = get();
    if (!conflict) return;
    const link = config.links[conflict.docId];
    if (!link) return;
    // Adopt the server version as the new base, then re-push local unchanged.
    const links = { ...config.links, [conflict.docId]: { ...link, knownVersion: conflict.serverVersion } };
    set({ config: { ...config, links }, conflict: null });
    await get().send(doc);
  },

  clearConflict() { set({ conflict: null, syncState: 'idle', message: '' }); },
}));
```

- [ ] **Step 2: Typecheck**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add src/stores/wpSync.ts
git commit -m "feat(wp-sync): zustand store orchestrating send + conflict"
```

---

## Task 5: WordPress settings tab

**Files:** Modify `src/stores/ui.ts`; Create `src/components/settings/WordpressTab.tsx`; Modify `src/components/settings/SettingsModal.tsx`.

- [ ] **Step 1: Add `'wordpress'` to the `SettingsTab` union** in `src/stores/ui.ts` (in the `export type SettingsTab =` list, add `| 'wordpress'`).

- [ ] **Step 2: Create `src/components/settings/WordpressTab.tsx`:**
```tsx
import { useState } from 'react';
import { useWpSyncStore } from '@/stores/wpSync';
import { usePlannerStore } from '@/stores/planner';
import { testConnection } from '@/lib/wp-sync';
import { STAGE_LABELS, type WpStage } from '@/lib/wp-stage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export function WordpressTab() {
  const config = useWpSyncStore((s) => s.config);
  const setConfig = useWpSyncStore((s) => s.setConfig);
  const doc = usePlannerStore((s) => s.doc);
  const [testMsg, setTestMsg] = useState('');
  const [testing, setTesting] = useState(false);

  const docId = doc?.schoolyear.id;
  const link = docId ? config.links[docId] : undefined;

  async function onTest() {
    setTesting(true);
    setTestMsg('Teste…');
    const r = await testConnection(config);
    setTestMsg(r.message);
    setTesting(false);
  }

  return (
    <div className="space-y-5 max-w-xl">
      <p className="text-[13px] text-[var(--color-ink-500)]">
        Optional. Aus = der Planner arbeitet wie bisher (lokal + Export). Ein = du kannst Pläne an euer WordPress senden.
      </p>

      <label className="flex items-center gap-2 text-[14px]">
        <Checkbox checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: !!v })} />
        WordPress-Synchronisation aktivieren
      </label>

      <div className="space-y-3">
        <div><Label>WordPress-Adresse</Label>
          <Input value={config.baseUrl} placeholder="https://schule.example"
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })} /></div>
        <div><Label>Benutzername</Label>
          <Input value={config.username} onChange={(e) => setConfig({ ...config, username: e.target.value })} /></div>
        <div><Label>Application Password</Label>
          <Input type="password" value={config.appPassword}
            onChange={(e) => setConfig({ ...config, appPassword: e.target.value })} />
          <p className="text-[11px] text-[var(--color-ink-500)] mt-1">
            In WordPress unter Benutzer → Profil → „Application Passwords" erzeugen. Wird nur in diesem Browser gespeichert; jederzeit in WordPress widerrufbar.
          </p></div>
        <Button variant="outline" onClick={onTest} disabled={testing}>Verbindung testen</Button>
        {testMsg && <p className="text-[13px]">{testMsg}</p>}
      </div>

      {doc && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-[13px] font-semibold">Verknüpfung für „{doc.meta.name}"</p>
          <div><Label>Schuljahr-Schlüssel (WordPress)</Label>
            <Input value={link?.schoolyearKey ?? ''} placeholder="sj_2026_27"
              onChange={(e) => docId && setConfig({ ...config, links: { ...config.links,
                [docId]: { schoolyearKey: e.target.value, wpProfileId: link?.wpProfileId ?? '',
                  stage: link?.stage ?? 'entwurf', knownVersion: link?.knownVersion ?? 0 } } })} /></div>
          <div><Label>WordPress-Profil-ID (NICHT das Live-Profil)</Label>
            <Input value={link?.wpProfileId ?? ''} placeholder="z.B. curriculr_test"
              onChange={(e) => docId && setConfig({ ...config, links: { ...config.links,
                [docId]: { schoolyearKey: link?.schoolyearKey ?? '', wpProfileId: e.target.value,
                  stage: link?.stage ?? 'entwurf', knownVersion: link?.knownVersion ?? 0 } } })} />
            <p className="text-[11px] text-[var(--color-ink-500)] mt-1">
              Lege in WordPress ein eigenes Profil für Curriculr an. So wird euer laufender Kalender nie überschrieben.
            </p></div>
          {link && <p className="text-[12px]">Aktuelle Stufe: <strong>{STAGE_LABELS[link.stage as WpStage]}</strong></p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Register the tab in `src/components/settings/SettingsModal.tsx`** — add the import `import { WordpressTab } from './WordpressTab';`, add a trigger in the `TabsList` (after the `import` trigger): `<TabsTrigger value="wordpress">WordPress</TabsTrigger>`, and a content block: `<TabsContent value="wordpress"><WordpressTab /></TabsContent>`.

- [ ] **Step 4: Typecheck + lint**
```bash
npm run typecheck && npm run lint
```
Expected: clean.

- [ ] **Step 5: Commit**
```bash
git add src/stores/ui.ts src/components/settings/WordpressTab.tsx src/components/settings/SettingsModal.tsx
git commit -m "feat(wp-sync): WordPress settings tab + per-plan link"
```

---

## Task 6: Editor controls (badge, buttons, status, conflict dialog)

**Files:** Create `src/components/editor/WpSyncControls.tsx`; Modify `src/components/editor/EditorHeader.tsx`.

- [ ] **Step 1: Create `src/components/editor/WpSyncControls.tsx`:**
```tsx
import { usePlannerStore } from '@/stores/planner';
import { useWpSyncStore } from '@/stores/wpSync';
import { availableActions, STAGE_LABELS, STAGE_ACTION_LABELS, type StageAction } from '@/lib/wp-stage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export function WpSyncControls() {
  const doc = usePlannerStore((s) => s.doc);
  const setDoc = usePlannerStore((s) => s.setDoc);
  const config = useWpSyncStore((s) => s.config);
  const syncState = useWpSyncStore((s) => s.syncState);
  const message = useWpSyncStore((s) => s.message);
  const conflict = useWpSyncStore((s) => s.conflict);
  const send = useWpSyncStore((s) => s.send);
  const keepLocal = useWpSyncStore((s) => s.keepLocal);
  const clearConflict = useWpSyncStore((s) => s.clearConflict);

  if (!doc || !config.enabled) return null;
  const link = config.links[doc.schoolyear.id];
  if (!link) return null;

  const actions = availableActions(link.stage);

  function confirmPublic(action: StageAction): boolean {
    if (action === 'oeffentlich-schalten') {
      return window.confirm('Diesen Plan für das ganze Kollegium sichtbar machen?');
    }
    return true;
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="px-2 py-1 rounded-[var(--radius-pill)] bg-white/10">Stufe: {STAGE_LABELS[link.stage]}</span>
      <Button size="sm" variant="secondary" disabled={syncState === 'sending'} onClick={() => send(doc)}>
        Nach WordPress senden
      </Button>
      {actions.map((a) => (
        <Button key={a} size="sm" variant="outline" disabled={syncState === 'sending'}
          onClick={() => { if (confirmPublic(a)) send(doc, a); }}>
          {STAGE_ACTION_LABELS[a]}
        </Button>
      ))}
      {message && <span className="opacity-90">{message}</span>}

      <Dialog open={!!conflict} onOpenChange={(o) => { if (!o) clearConflict(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>WordPress hat eine neuere Version</DialogTitle></DialogHeader>
          <p className="text-[14px]">
            Auf WordPress liegt bereits eine neuere Fassung (Version {conflict?.serverVersion}).
            Was möchtest du tun?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { if (conflict) { setDoc(conflict.serverDoc); clearConflict(); } }}>
              Server-Stand laden (lokale Änderungen verwerfen)
            </Button>
            <Button onClick={() => keepLocal(doc)}>Meinen Stand behalten und senden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```
> Verify `setDoc` exists on the planner store (it does — used when switching plans). If the dialog primitives differ, match the existing `src/components/ui/dialog.tsx` exports.

- [ ] **Step 2: Mount it in `src/components/editor/EditorHeader.tsx`** — add the import `import { WpSyncControls } from './WpSyncControls';`, and render `<WpSyncControls />` inside the right-hand `<div className="ml-auto flex items-center gap-3 text-xs">` block, right after the `savingState` `<span>…{stateLabel}</span>`.

- [ ] **Step 3: Typecheck + lint**
```bash
npm run typecheck && npm run lint
```
Expected: clean. Fix any prop/exports mismatch against the actual `ui/dialog.tsx` and planner store.

- [ ] **Step 4: Commit**
```bash
git add src/components/editor/WpSyncControls.tsx src/components/editor/EditorHeader.tsx
git commit -m "feat(wp-sync): editor stage badge, send/approve/publish buttons, conflict dialog"
```

---

## Task 7: Component test for the settings tab

**Files:** Create `src/components/settings/WordpressTab.test.tsx`.

- [ ] **Step 1: Write the test** — `src/components/settings/WordpressTab.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordpressTab } from './WordpressTab';
import { useWpSyncStore } from '@/stores/wpSync';
import { EMPTY_CONFIG } from '@/lib/wp-sync-config';

beforeEach(() => {
  localStorage.clear();
  useWpSyncStore.setState({ config: structuredClone(EMPTY_CONFIG), syncState: 'idle', message: '', conflict: null });
});

describe('WordpressTab', () => {
  it('toggles enabled and persists it', () => {
    render(<WordpressTab />);
    const checkbox = screen.getByRole('checkbox');
    expect(useWpSyncStore.getState().config.enabled).toBe(false);
    fireEvent.click(checkbox);
    expect(useWpSyncStore.getState().config.enabled).toBe(true);
    expect(JSON.parse(localStorage.getItem('curriculr-planner:wp-sync')!).enabled).toBe(true);
  });
  it('stores the WordPress address', () => {
    render(<WordpressTab />);
    fireEvent.change(screen.getByPlaceholderText('https://schule.example'), { target: { value: 'https://x.de' } });
    expect(useWpSyncStore.getState().config.baseUrl).toBe('https://x.de');
  });
});
```
> The planner store's `doc` is `null` in this test, so the per-plan link section is hidden — these assertions only touch the global config section.

- [ ] **Step 2: Run, verify pass** — `npx vitest run src/components/settings/WordpressTab.test.tsx`.

- [ ] **Step 3: Commit**
```bash
git add src/components/settings/WordpressTab.test.tsx
git commit -m "test(wp-sync): WordpressTab enable + address"
```

---

## Task 8: Full verification

- [ ] **Step 1: Run the whole suite + typecheck + lint + build**
```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```
Expected: typecheck clean, lint clean (max-warnings 0), all tests pass, build succeeds.

- [ ] **Step 2: Manual sanity (dev server)** — `npm run dev`, open the app, Settings → WordPress: with sync **off**, confirm the editor shows no WordPress controls and everything behaves as before (the non-disruption guarantee). Enable + fill dummy values → the Send/stage controls appear for a linked plan.

- [ ] **Step 3: Commit any fixes**
```bash
git add -A && git commit -m "chore(wp-sync): verification fixes"
```

---

## Self-Review (author)
- **Spec coverage:** §4.1 settings tab → Task 5; §4.2 per-plan link → Tasks 2/5; §4.3 client → Task 3; §4.4 badge/buttons/status → Task 6; §4.5 conflict (409) → Tasks 4/6; §4.7 config storage → Task 2; §2 non-disruption (off by default, controls hidden when disabled/unlinked) → Tasks 5/6 + Task 8 step 2. §4.6 load-on-boot is intentionally deferred (optional; `fetchDoc` exists for it) — note in the PR.
- **Type consistency:** `WpStage`/`StageAction` from `wp-stage` used everywhere; `WpPlanLink.knownVersion` set in config, read in store `send`, updated on ok; `PushResult` fields (`version`/`stage`/`feedUrl`/`serverVersion`/`serverDoc`) consistent between `wp-sync.ts` and the store.
- **YAGNI:** no auto-sync, no offline queue, no backward stage moves — matches spec §8.
- **Integration risks to verify during execution:** exact exports of `src/components/ui/dialog.tsx`, `checkbox.tsx`, and that `usePlannerStore` exposes `setDoc` — Task 6 step 3 typecheck catches mismatches.
