# SPA Redesign (Ansatz B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the SPA settings navigation from 11 tabs (5 groups) to 7 tabs (3 groups) and replace the hidden `WpSyncControls` with a permanently visible `StatusBar` + `PublishDialog`, making publishing discoverable for non-technical school staff.

**Architecture:** Phase 1 (Tasks 1–4) are independent quick wins that ship cleanly on their own. Phase 2 (Tasks 5–9) builds the new publish surface and can only start after Phase 1 is merged. Both phases produce TypeScript-clean, lint-clean code.

**Tech Stack:** React 19, TypeScript strict, Zustand, Tailwind v4 (CSS-variable tokens), shadcn/ui primitives, Vite

**Spec:** `docs/superpowers/specs/2026-06-30-system-audit-neugestaltung-design.md`

## Global Constraints

- TypeScript strict — no `any`, no `@ts-ignore`
- Never hardcode brand hex — use `var(--color-marine-800)` etc.
- All UI copy German; identifiers/comments English
- Import alias: always `@/...`, never deep relative paths
- Run `npm run typecheck && npm run lint` before every commit — must be zero errors/warnings
- Do NOT touch: `App.tsx`, `stores/planner.ts`, `stores/auth.ts`, `stores/history.ts`, `lib/` (except wp-sync-config.ts and wpSync.ts), `components/wizard/`, `components/welcome/`, `components/ui/`
- `PrivacyTab.tsx` has a legally required Vibecoding disclosure — preserve it verbatim in `InfoTab.tsx`

---

## Phase 1 — Quick Wins

---

### Task 1: Stage Terminology

**Files:**
- Modify: `src/lib/wp-stage.ts`
- Modify: `src/components/editor/WpSyncControls.tsx` (STAGE_HINT only — file removed in Task 9)

**Interfaces:**
- Produces: `STAGE_LABELS.genehmigt === 'Intern'` and `STAGE_ACTION_LABELS.freigeben === 'Intern freigeben'`

- [ ] **Step 1: Update `src/lib/wp-stage.ts`**

Replace the `STAGE_LABELS` and `STAGE_ACTION_LABELS` objects:

```ts
export const STAGE_LABELS: Record<WpStage, string> = {
  entwurf:     'Entwurf',
  genehmigt:   'Intern',
  oeffentlich: 'Öffentlich',
};

export const STAGE_ACTION_LABELS: Record<StageAction, string> = {
  'freigeben':            'Intern freigeben',
  'oeffentlich-schalten': 'Öffentlich schalten',
};
```

- [ ] **Step 2: Update `STAGE_HINT` in `WpSyncControls.tsx`**

Locate the `STAGE_HINT` constant (top of file) and update the `genehmigt` entry:

```ts
const STAGE_HINT: Record<WpStage, string> = {
  entwurf:     'Nur für dich sichtbar (Entwurf).',
  genehmigt:   'Intern — Kollegium sieht die Entwurf-Vorschau. „Öffentlich schalten" macht den Plan auf der Schulwebsite sichtbar.',
  oeffentlich: 'Öffentlich — der Plan erscheint auf der Schulwebsite.',
};
```

- [ ] **Step 3: Verify**

```bash
cd curriculr-planner && npm run typecheck && npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/lib/wp-stage.ts src/components/editor/WpSyncControls.tsx
git commit -m "refactor: rename stage 'Genehmigt' to 'Intern' in terminology constants"
```

---

### Task 2: Merge AppearanceTab + SchoolTab

**Files:**
- Modify: `src/components/settings/AppearanceTab.tsx`

**Interfaces:**
- Consumes: `usePlannerStore` (`doc`, `updateMeta`), `useUiStore` (`density`, `setDensity`)
- Produces: single `<AppearanceTab />` component covering density + school name + school info

- [ ] **Step 1: Rewrite `src/components/settings/AppearanceTab.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useUiStore, type Density } from '@/stores/ui';
import { usePlannerStore } from '@/stores/planner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const OPTIONS: Array<{ value: Density; label: string; description: string }> = [
  { value: 'auto',     label: 'Automatisch', description: 'Zeilen füllen den verfügbaren Platz im aktiven Quartal' },
  { value: 'compact',  label: 'Kompakt',     description: 'Feste Zeilenhöhe ~70px, viele Wochen sichtbar' },
  { value: 'standard', label: 'Standard',    description: 'Feste Zeilenhöhe ~110px, ausgewogen' },
  { value: 'roomy',    label: 'Geräumig',    description: 'Feste Zeilenhöhe ~150px, viel Platz pro Termin' },
];

export function AppearanceTab() {
  const density    = useUiStore((s) => s.density);
  const setDensity = useUiStore((s) => s.setDensity);
  const doc        = usePlannerStore((s) => s.doc);
  const updateMeta = usePlannerStore((s) => s.updateMeta);

  const [schoolName, setSchoolName] = useState(doc?.meta.schoolName ?? '');
  const [schoolInfo, setSchoolInfo] = useState(doc?.meta.schoolInfo ?? '');

  useEffect(() => {
    setSchoolName(doc?.meta.schoolName ?? '');
    setSchoolInfo(doc?.meta.schoolInfo ?? '');
  }, [doc?.meta.schoolName, doc?.meta.schoolInfo]);

  const saveSchool = () => {
    updateMeta({
      schoolName: schoolName.trim() || undefined,
      schoolInfo: schoolInfo.trim() || undefined,
    });
    toast.success('Schuldaten gespeichert');
  };

  return (
    <div className="space-y-6">
      {/* Darstellung */}
      <div className="space-y-3">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Zeilen-Dichte (Tabellen-Ansicht)
        </h3>
        <p className="text-[12px] text-[var(--color-ink-500)]">
          Bestimmt die Mindesthöhe der Wochen-Zeilen. Wird pro Browser gespeichert.
        </p>
        <div className="grid gap-2">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-[var(--radius-default)] border cursor-pointer transition-colors ${
                density === opt.value
                  ? 'border-[var(--color-marine-700)] bg-[var(--color-marine-100)]/40'
                  : 'border-[var(--color-ink-200)] hover:bg-[var(--color-paper-bg)]/60'
              }`}
              style={{ transitionDuration: 'var(--dur-state)' }}
            >
              <input
                type="radio"
                name="density"
                value={opt.value}
                checked={density === opt.value}
                onChange={() => setDensity(opt.value)}
                className="mt-1 accent-[var(--color-marine-800)]"
              />
              <div>
                <div className="text-[13px] font-semibold text-[var(--color-ink-900)]">{opt.label}</div>
                <div className="text-[12px] text-[var(--color-ink-500)]">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Ausdruck */}
      <div className="space-y-4 pt-2 border-t border-[var(--color-ink-200)]">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Ausdruck
        </h3>
        <div className="space-y-1.5">
          <label htmlFor="school-name" className="text-[13px] font-semibold text-[var(--color-ink-900)]">Schulname</label>
          <p className="text-[12px] text-[var(--color-ink-500)]">Erscheint als Überschrift im PDF-Ausdruck.</p>
          <Input
            id="school-name"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="z. B. Grundschule Musterstadt"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="school-info" className="text-[13px] font-semibold text-[var(--color-ink-900)]">Schulinfos (optional)</label>
          <p className="text-[12px] text-[var(--color-ink-500)]">Adresse, Schulleitung o. Ä. — erscheint in der Fußzeile.</p>
          <Textarea
            id="school-info"
            value={schoolInfo}
            onChange={(e) => setSchoolInfo(e.target.value)}
            placeholder="z. B. Schulleitung: M. Müller · Dorfstr. 1 · 12345 Musterstadt"
            rows={3}
          />
        </div>
        <Button onClick={saveSchool}>Speichern</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
cd curriculr-planner && npm run typecheck && npm run lint
```

Expected: 0 errors. (`SchoolTab.tsx` still exists, not yet deleted — that happens in Task 4.)

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/AppearanceTab.tsx
git commit -m "feat: merge SchoolTab school-name + print settings into AppearanceTab"
```

---

### Task 3: Create InfoTab

**Files:**
- Create: `src/components/settings/InfoTab.tsx`

**Interfaces:**
- Produces: `<InfoTab />` — read-only, no props, no store writes. Contains About + Privacy content.

- [ ] **Step 1: Create `src/components/settings/InfoTab.tsx`**

```tsx
const REPO_URL    = 'https://github.com/juwagn/curriculr-planner';
const APP_VERSION = '1.6.0';

type ChangelogEntry = { version: string; date: string; highlights: string[] };

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.6.0',
    date: '11.06.2026',
    highlights: [
      'IServ-SSO-Anmeldung: Login über IServ, App-Token nur im RAM (kein localStorage)',
      'Alle WordPress-Aufrufe mit Bearer-Token gesichert — Application Password entfernt',
      'CSP-Header im Produktions-Build (kein unsafe-inline/eval)',
      'Datenschutz-Tab in den Einstellungen',
    ],
  },
  {
    version: '1.5.0',
    date: '01.06.2026',
    highlights: [
      'Eigene Kategorien anlegen und löschen (Einstellungen → Kategorien)',
      'Sicheres Löschen: genutzte Kategorien werden vor dem Entfernen umgehängt',
      'Neuer Farbwähler mit abgestimmter Palette plus freier Farbwahl',
      'Hover-Vorschau im Schuljahr-Grid (Titel + Kategorie-Badge)',
    ],
  },
  {
    version: '1.4.0',
    date: '01.06.2026',
    highlights: [
      'Geführte Tour (8 Schritte) durch die wichtigsten Editor-Funktionen',
      'Hilfe-Modal über den ?-Button mit 5 Referenz-Sektionen',
    ],
  },
  {
    version: '1.3.0',
    date: '30.05.2026',
    highlights: [
      'Ferien & Feiertage automatisch per Bundesland-Auswahl vorbefüllen',
      'Feiertage in Wochentabelle und Schuljahr-Grid markiert',
      'Datumsfelder wieder direkt eintippbar; Termine in Ferienwochen sichtbar',
    ],
  },
  {
    version: '1.2.0',
    date: '30.05.2026',
    highlights: [
      'Termin-Vorlagen: Sidebar (Drag & Drop / Klick) + Verwaltung in den Einstellungen',
      'Excel-Import von Konverter-Dateien (inkl. Excel-Datums- und Zeitwerten)',
      'Schuljahr-Grid: neue Jahresansicht (Monate × Tage)',
      'Rückgängig/Wiederholen mit Strg+Z / Strg+Umschalt+Z und Toolbar',
    ],
  },
];

const linkClass =
  'text-[var(--color-marine-700)] underline underline-offset-2 hover:text-[var(--color-marine-800)] transition-colors';

export function InfoTab() {
  return (
    <div className="space-y-6 text-[13px] text-[var(--color-ink-900)]">

      {/* Über */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[15px] font-semibold text-[var(--color-marine-800)]">Curriculr Planner</h3>
          <p>Version: <span className="tabular-nums">{APP_VERSION}</span></p>
          <p className="text-[var(--color-ink-500)]">Standalone-Tool zur Erstellung des Jahresterminplans.</p>
        </div>
        <div className="space-y-1">
          <p>
            Entwickelt von <span className="font-medium">Julian Wagner</span>{' '}
            <span className="text-[var(--color-ink-500)]">· Curricular</span>
          </p>
          <p>
            <a href={REPO_URL} className={linkClass}
               style={{ transitionDuration: 'var(--dur-state)' }} target="_blank" rel="noreferrer">
              Quellcode auf GitHub
            </a>
            {' · '}
            <a href={`${REPO_URL}/blob/main/CHANGELOG.md`} className={linkClass}
               style={{ transitionDuration: 'var(--dur-state)' }} target="_blank" rel="noreferrer">
              Vollständiger Changelog
            </a>
          </p>
          <p className="text-[12px] text-[var(--color-ink-500)]">MIT-Lizenz</p>
        </div>
        <div className="space-y-3">
          <h4 className="text-[13px] font-semibold text-[var(--color-marine-800)]">Änderungsverlauf</h4>
          <ul className="space-y-3">
            {CHANGELOG.map((entry) => (
              <li key={entry.version} className="space-y-1">
                <p className="font-medium">
                  Version <span className="tabular-nums">{entry.version}</span>{' '}
                  <span className="text-[12px] font-normal text-[var(--color-ink-500)]">– {entry.date}</span>
                </p>
                <ul className="ml-4 list-disc space-y-0.5 marker:text-[var(--color-ink-500)]">
                  {entry.highlights.map((h) => <li key={h}>{h}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Datenschutz — legally required, do NOT remove or abridge */}
      <div className="space-y-5 pt-2 border-t border-[var(--color-ink-200)]">
        <div className="space-y-1">
          <h3 className="text-[15px] font-semibold text-[var(--color-marine-800)]">Datenschutz &amp; Transparenz</h3>
          <p className="text-[var(--color-ink-500)]">
            Informationen zur Datenverarbeitung bei aktivierter IServ-Anmeldung.
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold">Verarbeitete Daten</h4>
          <p>
            Bei aktivierter IServ-Anmeldung werden folgende Daten verarbeitet: IServ-Kennung
            (<code className="text-[12px] font-mono bg-[var(--color-paper-bg)] px-1 rounded">sub</code>),
            Anzeigename und freigegebene Gruppen — sowie die Plandaten des Schuljahres.
          </p>
          <p>
            Das App-Token wird im{' '}
            <code className="text-[12px] font-mono bg-[var(--color-paper-bg)] px-1 rounded">sessionStorage</code>{' '}
            des Browsers gespeichert — nicht in{' '}
            <code className="text-[12px] font-mono bg-[var(--color-paper-bg)] px-1 rounded">localStorage</code>{' '}
            oder Cookies. Es wird beim Schließen des Browser-Tabs automatisch gelöscht.
            IServ-Zugangsdaten werden nicht gespeichert.
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold">Speicherorte</h4>
          <p>Plandaten werden auf dem WordPress-Server (Hoster w3w.de, DE/EU) gespeichert.</p>
          <p>
            Die Planner-Oberfläche wird von <strong>GitHub Pages</strong> (GitHub/Microsoft, USA)
            geladen; dabei wird die IP-Adresse in ein Drittland übertragen. Dort werden{' '}
            <em>keine</em> Plandaten verarbeitet (nur statisches JavaScript/CSS). Zweck:
            gemeinsame Terminplanung. Rechtsgrundlage und Ansprechpartner: siehe schulisches
            Datenschutzkonzept.
          </p>
        </div>
        <div
          className="p-4 rounded-[var(--radius-default)] space-y-1"
          style={{ borderLeft: '4px solid var(--color-marine-800)', background: 'var(--color-paper-bg)' }}
        >
          <p className="font-semibold">Hinweis („Vibecoding")</p>
          <p className="text-[var(--color-ink-700)]">
            Diese Werkzeuge (Planner und WordPress-Plugin) wurden im Wege des „Vibecodings" —
            also KI-gestützter Softwareentwicklung — erstellt. Vor dem produktiven Einsatz
            mit personenbezogenen Daten sind die übliche Sorgfalt, Tests und eine
            datenschutzrechtliche Bewertung anzuwenden.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
cd curriculr-planner && npm run typecheck && npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/InfoTab.tsx
git commit -m "feat: add InfoTab merging About changelog + Privacy disclosure"
```

---

### Task 4: SettingsModal Phase 1 — Remove 4 Tabs, Add 2

**Files:**
- Modify: `src/stores/ui.ts`
- Modify: `src/components/settings/SettingsModal.tsx`
- Delete: `src/components/settings/SchoolTab.tsx`
- Delete: `src/components/settings/AboutTab.tsx`
- Delete: `src/components/settings/PrivacyTab.tsx`

**Interfaces:**
- Consumes: merged `AppearanceTab`, new `InfoTab`
- Produces: `SettingsTab` type without `school`, `about`, `privacy`; `info` added; `export`/`import`/`wordpress` kept (removed in Task 9)

- [ ] **Step 1: Update `SettingsTab` type in `src/stores/ui.ts`**

Replace lines 6–17 with:

```ts
export type SettingsTab =
  | 'schoolyear'
  | 'categories'
  | 'groups'
  | 'templates'
  | 'appearance'
  | 'export'
  | 'import'
  | 'wordpress'
  | 'info';
```

(`school`, `about`, `privacy` removed; `info` added; `export`/`import`/`wordpress` remain for now.)

- [ ] **Step 2: Rewrite imports + NAV_GROUPS + CONTENT in `src/components/settings/SettingsModal.tsx`**

```tsx
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useUiStore, type SettingsTab } from '@/stores/ui';
import { SchoolyearTab } from './SchoolyearTab';
import { CategoriesTab } from './CategoriesTab';
import { GroupsTab }     from './GroupsTab';
import { TemplatesTab }  from './TemplatesTab';
import { ExportTab }     from './ExportTab';
import { ImportTab }     from './ImportTab';
import { AppearanceTab } from './AppearanceTab';
import { WordpressTab }  from './WordpressTab';
import { InfoTab }       from './InfoTab';

const NAV_GROUPS: { group: string; items: { value: SettingsTab; label: string }[] }[] = [
  {
    group: 'Inhalt',
    items: [
      { value: 'schoolyear', label: 'Schuljahr & Quartale' },
      { value: 'categories', label: 'Kategorien' },
      { value: 'groups',     label: 'Gruppen' },
      { value: 'templates',  label: 'Vorlagen' },
    ],
  },
  {
    group: 'Ausgabe',
    items: [
      { value: 'appearance', label: 'Darstellung & Druck' },
      { value: 'wordpress',  label: 'Veröffentlichung' },
    ],
  },
  {
    group: 'Info',
    items: [
      { value: 'info', label: 'Info & Datenschutz' },
    ],
  },
];

const CONTENT: Record<SettingsTab, React.ReactNode> = {
  schoolyear: <SchoolyearTab />,
  categories: <CategoriesTab />,
  groups:     <GroupsTab />,
  templates:  <TemplatesTab />,
  appearance: <AppearanceTab />,
  export:     <ExportTab />,
  import:     <ImportTab />,
  wordpress:  <WordpressTab />,
  info:       <InfoTab />,
};
```

Keep the `SettingsModal` function body (everything after `CONTENT`) unchanged.

- [ ] **Step 3: Verify before deletion**

```bash
cd curriculr-planner && npm run typecheck && npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Delete the three dead tab files**

```bash
rm curriculr-planner/src/components/settings/SchoolTab.tsx
rm curriculr-planner/src/components/settings/AboutTab.tsx
rm curriculr-planner/src/components/settings/PrivacyTab.tsx
```

- [ ] **Step 5: Verify after deletion**

```bash
cd curriculr-planner && npm run typecheck && npm run lint
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add -u
git add src/components/settings/SettingsModal.tsx src/stores/ui.ts
git commit -m "refactor: Settings nav 11→9 tabs — merge Appearance+School, add Info, drop old tabs"
```

---

## Phase 2 — Core Redesign

---

### Task 5: Add `lastPushedAt` to WpPlanLink

**Files:**
- Modify: `src/lib/wp-sync-config.ts`
- Modify: `src/stores/wpSync.ts`

**Interfaces:**
- Produces: `WpPlanLink.lastPushedAt?: string` (ISO 8601); set on every successful `send()`

- [ ] **Step 1: Add field to `WpPlanLink` interface in `src/lib/wp-sync-config.ts`**

After `provisionedCalendars?: WpCalendarGroup[];` (line ~33), add:

```ts
/** ISO 8601 timestamp of the last successful push to WordPress. */
lastPushedAt?: string;
```

- [ ] **Step 2: Parse it in `parseLink()` in `src/lib/wp-sync-config.ts`**

After the `wpProfileId` line (~line 98), add:

```ts
const lastPushedAt = typeof l.lastPushedAt === 'string' ? l.lastPushedAt : undefined;
```

Add to the return spread (after `wpProfileId`):

```ts
...(lastPushedAt ? { lastPushedAt } : {}),
```

- [ ] **Step 3: Set it in `send()` success path in `src/stores/wpSync.ts`**

In the `if (res.status === 'ok')` branch (~line 61), update `newLink`:

```ts
const newLink: WpPlanLink = {
  ...link,
  stage:        res.stage        ?? targetStage,
  knownVersion: res.version      ?? link.knownVersion,
  feedUrl:      res.feedUrl      ?? link.feedUrl,
  lastPushedAt: new Date().toISOString(),
};
```

- [ ] **Step 4: Verify**

```bash
cd curriculr-planner && npm run typecheck && npm run lint
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/wp-sync-config.ts src/stores/wpSync.ts
git commit -m "feat: track lastPushedAt timestamp in WpPlanLink for StatusBar display"
```

---

### Task 6: Create PublishTab

Merges `WordpressTab` + `ExportTab` + `ImportTab` into one tab with three clearly labelled sections.

**Files:**
- Create: `src/components/settings/PublishTab.tsx`

**Read before implementing:**
- `src/components/export/ExportDropdown.tsx` — identify which functions/hooks trigger ICS and Excel downloads. The Export section of PublishTab reuses those same triggers.

**Interfaces:**
- Consumes: `useWpSyncStore`, `usePlannerStore`, `useAuthStore`, `postProfileMap`, `startIservLogin`, `iservLogout`, `testConnection`, `parseIcs`, `IcsImportDialog`, plus export triggers from ExportDropdown
- Produces: `<PublishTab />` with WordPress + Kalender + Export + Import sections

- [ ] **Step 1: Read `src/components/export/ExportDropdown.tsx`**

Identify the export trigger functions (ICS download, Excel download). Note their names for use in Step 2.

- [ ] **Step 2: Create `src/components/settings/PublishTab.tsx`**

```tsx
import { useState, useRef } from 'react';
import { useWpSyncStore } from '@/stores/wpSync';
import { usePlannerStore } from '@/stores/planner';
import { useAuthStore } from '@/stores/auth';
import { testConnection, postProfileMap } from '@/lib/wp-sync';
import { startIservLogin, iservLogout } from '@/lib/wp-auth-actions';
import { STAGE_LABELS, type WpStage } from '@/lib/wp-stage';
import type { WpPlanLink, WpCalendarGroup } from '@/lib/wp-sync-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { parseIcs, type ParsedEvent } from '@/lib/ics-import';
import { IcsImportDialog } from '@/components/import/IcsImportDialog';
import { toast } from 'sonner';
// Add import for export trigger functions identified in Step 1

export function PublishTab() {
  const config     = useWpSyncStore((s) => s.config);
  const setConfig  = useWpSyncStore((s) => s.setConfig);
  const doc        = usePlannerStore((s) => s.doc);
  const addEvents  = usePlannerStore((s) => s.addEvents);
  const authStatus = useAuthStore((s) => s.status);
  const claims     = useAuthStore((s) => s.claims);
  const token      = useAuthStore((s) => s.token);
  const logout     = useAuthStore((s) => s.logout);

  const [testState, setTestState] = useState({ msg: '', busy: false });
  const [pmStatus, setPmStatus]   = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [parsed, setParsed]       = useState<ParsedEvent[] | null>(null);
  const fileRef                   = useRef<HTMLInputElement>(null);

  const docId = doc?.schoolyear.id;
  const link  = docId ? config.links[docId] : undefined;

  const suggestedSjKey = doc?.schoolyear.id
    ? `sj_${doc.schoolyear.id.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
    : '';
  const suggestedLabel = doc?.meta?.name ?? '';

  function handleLogin() {
    if (!config.enabled || !config.baseUrl) return;
    startIservLogin(config.baseUrl);
  }

  function handleLogout() {
    const currentToken = token;
    logout();
    if (config.baseUrl && currentToken) void iservLogout(config.baseUrl, currentToken);
  }

  async function onTest() {
    if (!token) return;
    setTestState({ msg: 'Teste…', busy: true });
    const r = await testConnection(config, token);
    setTestState({ msg: r.message, busy: false });
  }

  function patchLink(patch: Partial<WpPlanLink>) {
    if (!docId) return;
    const base: WpPlanLink = link ?? {
      schoolyearKey:   suggestedSjKey,
      schoolyearLabel: suggestedLabel,
      stage:           'entwurf',
      knownVersion:    0,
    };
    setConfig({ ...config, links: { ...config.links, [docId]: { ...base, ...patch } } });
  }

  const calendarGroups: string[]              = link?.calendarGroups        ?? [];
  const provisionedCalendars: WpCalendarGroup[] = link?.provisionedCalendars ?? [];

  function toggleGroup(group: string) {
    const next = calendarGroups.includes(group)
      ? calendarGroups.filter((g) => g !== group)
      : [...calendarGroups, group];
    patchLink({ calendarGroups: next });
  }

  async function onSendProfileMap() {
    if (!token || !docId || !link) return;
    const sj    = link.schoolyearKey;
    const label = link.schoolyearLabel || link.schoolyearKey;
    setPmStatus('sending');
    const result = await postProfileMap(config, token, sj, label, calendarGroups);
    if (result.status === 'ok') {
      patchLink({ provisionedCalendars: result.calendars ?? [] });
      setPmStatus('ok');
    } else {
      setPmStatus('error');
    }
  }

  async function onFile(file: File) {
    try {
      const events = parseIcs(await file.text());
      if (events.length === 0) { toast.error('Keine Termine in der ICS gefunden'); return; }
      setParsed(events);
    } catch (e) {
      toast.error('ICS ungültig: ' + (e as Error).message);
    }
  }

  const availableGroups = doc?.availableGroups ?? [];

  return (
    <div className="space-y-6 max-w-xl">

      {/* WordPress-Verbindung */}
      <section className="space-y-4">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          WordPress-Verbindung
        </h3>
        <p className="text-[13px] text-[var(--color-ink-500)]">
          Optional. Ohne Verbindung: Planner arbeitet lokal mit Export-Funktion.
        </p>
        <label className="flex items-center gap-2 text-[14px]">
          <Checkbox
            checked={config.enabled}
            onCheckedChange={(v) => setConfig({ ...config, enabled: !!v })}
          />
          WordPress-Synchronisation aktivieren
        </label>
        <div>
          <Label>WordPress-Adresse</Label>
          <Input
            value={config.baseUrl}
            placeholder="https://schule.example"
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
          />
        </div>
        <div className="space-y-3 border-t pt-4">
          <p className="text-[13px] font-semibold">Anmeldung (IServ-SSO)</p>
          {authStatus === 'authenticated' && claims ? (
            <div className="space-y-2">
              <p className="text-[13px]">
                Angemeldet als <strong>{claims.name}</strong>
                <span className="ml-2 text-[11px] text-[var(--color-ink-500)]">({claims.groups.join(', ')})</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={onTest} disabled={testState.busy}>Verbindung testen</Button>
                <Button variant="outline" onClick={handleLogout}>Abmelden</Button>
              </div>
              {testState.msg && <p className="text-[13px]">{testState.msg}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] text-[var(--color-ink-500)]">Anmeldung über IServ erforderlich.</p>
              <Button onClick={handleLogin} disabled={!config.baseUrl || !config.enabled}>
                Mit IServ anmelden
              </Button>
              {!config.baseUrl && (
                <p className="text-[11px] text-[var(--color-warning)]">Zuerst WordPress-Adresse eintragen.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Kalender einrichten */}
      {doc && config.enabled && authStatus === 'authenticated' && (
        <section className="space-y-4 border-t pt-4">
          <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
            Kalender einrichten
          </h3>
          <p className="text-[13px] font-medium text-[var(--color-ink-900)]">
            Plan: „{doc.meta.name}"
          </p>
          <div className="rounded-md bg-[var(--color-marine-100)] border border-[var(--color-marine-500)] p-3 space-y-1">
            <p className="text-[12px] text-[var(--color-ink-500)]">
              WordPress legt automatisch einen <strong>Haupt-Kalender mit allen Terminen</strong> an.
              Zusätzlich kannst du separate Kalender je Gruppe einrichten.
            </p>
          </div>
          <div className="flex items-center gap-2 opacity-60">
            <Checkbox checked disabled />
            <span className="text-[13px]">Alle Termine (immer aktiv, für Kollegium)</span>
          </div>
          {availableGroups.length > 0 ? (
            availableGroups.map((g) => (
              <label key={g} className="flex items-center gap-2 text-[13px] cursor-pointer">
                <Checkbox checked={calendarGroups.includes(g)} onCheckedChange={() => toggleGroup(g)} />
                {g}
              </label>
            ))
          ) : (
            <p className="text-[12px] text-[var(--color-ink-500)]">
              Keine Gruppen definiert. Füge Gruppen unter Inhalt → Gruppen hinzu.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              onClick={onSendProfileMap}
              disabled={pmStatus === 'sending' || !link?.schoolyearKey}
            >
              {pmStatus === 'sending' ? 'Einrichten…' : 'Kalender einrichten →'}
            </Button>
            {pmStatus === 'ok'    && <p className="text-[12px] text-[var(--color-status-green)]">✓ Eingerichtet</p>}
            {pmStatus === 'error' && <p className="text-[12px] text-[var(--color-danger)]">Fehler beim Einrichten</p>}
          </div>
          {provisionedCalendars.length > 0 && (
            <div className="rounded-md border border-[var(--color-marine-200)] p-3 space-y-2">
              <p className="text-[12px] font-semibold text-[var(--color-ink-700)]">
                Kalender-Links (für IServ-Abo):
              </p>
              {provisionedCalendars.map((cal) => (
                <div key={cal.group ?? '__main'} className="text-[12px] flex items-start gap-2 flex-wrap">
                  <span className="font-medium shrink-0">{cal.group ?? 'Alle Termine'}:</span>
                  {cal.feedUrl ? (
                    <>
                      <a href={cal.feedUrl} target="_blank" rel="noopener noreferrer"
                         className="underline break-all" style={{ color: 'var(--color-marine-500)' }}>
                        {cal.feedUrl}
                      </a>
                      <button
                        onClick={() => {
                          void navigator.clipboard.writeText(cal.feedUrl!);
                          toast.success('Link kopiert');
                        }}
                        className="shrink-0 text-[11px] px-1.5 py-0.5 rounded border border-[var(--color-ink-300)] hover:bg-[var(--color-paper-bg)]"
                      >
                        Kopieren
                      </button>
                    </>
                  ) : (
                    <em className="text-[var(--color-ink-400)]">wird nach erstem Veröffentlichen gesetzt</em>
                  )}
                </div>
              ))}
            </div>
          )}
          <details className="text-[12px]">
            <summary className="cursor-pointer text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)] select-none">
              Erweitert (Schuljahr-Schlüssel)
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <Label>Schuljahr-Schlüssel (WP)</Label>
                <Input
                  value={link?.schoolyearKey ?? suggestedSjKey}
                  placeholder="sj_2026_27"
                  onChange={(e) => patchLink({ schoolyearKey: e.target.value })}
                />
                <p className="text-[11px] text-[var(--color-ink-500)] mt-1">
                  Identifiziert das Schuljahr in WordPress eindeutig. Wird automatisch vorgeschlagen.
                </p>
              </div>
              <div>
                <Label>Schuljahr-Label (WP)</Label>
                <Input
                  value={link?.schoolyearLabel ?? suggestedLabel}
                  placeholder="2026/27"
                  onChange={(e) => patchLink({ schoolyearLabel: e.target.value })}
                />
              </div>
            </div>
            {link && (
              <p className="text-[12px] mt-2">
                Aktuelle Stufe: <strong>{STAGE_LABELS[link.stage as WpStage]}</strong>
              </p>
            )}
          </details>
        </section>
      )}

      {/* Export */}
      <section className="space-y-3 border-t pt-4">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Export
        </h3>
        <p className="text-[13px] text-[var(--color-ink-500)]">
          Plan als Datei exportieren. Das Export-Menü oben rechts bietet dieselben Optionen.
        </p>
        {/* Add ICS and Excel download buttons here using the trigger functions from ExportDropdown.
            Identified in Step 1 above. */}
      </section>

      {/* Import */}
      <section className="space-y-3 border-t pt-4">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Import
        </h3>
        <p className="text-[13px] text-[var(--color-ink-500)]">
          ICS-Datei (z.B. Vorjahresplan) in den aktuellen Plan einfügen.
        </p>
        {doc && (
          <>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              ICS-Datei wählen
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".ics"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = '';
              }}
            />
            <IcsImportDialog
              open={parsed !== null}
              parsed={parsed ?? []}
              categories={doc.categories}
              targetSchoolyear={doc.schoolyear}
              onCancel={() => setParsed(null)}
              onConfirm={(events) => {
                addEvents(events);
                setParsed(null);
                toast.success(`${events.length} Termine importiert`);
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
cd curriculr-planner && npm run typecheck && npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/PublishTab.tsx
git commit -m "feat: add PublishTab merging WordPress + Calendar setup + Export + Import"
```

---

### Task 7: Create StatusBar

Permanently visible status strip. Replaces `WpSyncControls`. Owns Downgrade + Konflikt dialogs.

**Files:**
- Create: `src/components/editor/StatusBar.tsx`

**Interfaces:**
- Consumes: `usePlannerStore` (doc, setDoc), `useWpSyncStore` (config, conflict, pendingPull, clearConflict, confirmPull, cancelPull, keepLocal), `useUiStore` (openSettings)
- Produces: `<StatusBar />` — stage pill + last-pushed timestamp + [Veröffentlichen] + Downgrade/Konflikt dialogs

- [ ] **Step 1: Create `src/components/editor/StatusBar.tsx`**

```tsx
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore } from '@/stores/planner';
import { useWpSyncStore } from '@/stores/wpSync';
import { useUiStore } from '@/stores/ui';
import { STAGE_LABELS, type WpStage } from '@/lib/wp-stage';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
// PublishDialog added in Task 8 — placeholder for now
const PublishDialog = (_: { open: boolean; onClose(): void }) => null;

const STAGE_COLOR: Record<WpStage, string> = {
  entwurf:     'var(--color-warning)',
  genehmigt:   'var(--color-marine-500)',
  oeffentlich: 'var(--color-status-green)',
};

const STAGE_DESCRIPTION: Record<WpStage, string> = {
  entwurf:     'Nur für dich sichtbar',
  genehmigt:   'Kollegium sieht die Entwurf-Vorschau',
  oeffentlich: 'Erscheint auf der Schulwebsite',
};

function formatPushedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return isToday
    ? `heute, ${time} Uhr`
    : `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}, ${time} Uhr`;
}

export function StatusBar() {
  const doc          = usePlannerStore((s) => s.doc);
  const setDoc       = usePlannerStore((s) => s.setDoc);
  const openSettings = useUiStore((s) => s.openSettings);

  const { config, conflict, pendingPull, clearConflict, confirmPull, cancelPull, keepLocal } =
    useWpSyncStore(
      useShallow((s) => ({
        config:        s.config,
        conflict:      s.conflict,
        pendingPull:   s.pendingPull,
        clearConflict: s.clearConflict,
        confirmPull:   s.confirmPull,
        cancelPull:    s.cancelPull,
        keepLocal:     s.keepLocal,
      }))
    );

  const [publishOpen, setPublishOpen] = useState(false);

  if (!doc) return null;

  const link      = config.links[doc.schoolyear.id];
  const stage     = (link?.stage ?? 'entwurf') as WpStage;
  const isEnabled = config.enabled && !!link;

  return (
    <>
      <div className="flex items-center gap-3 text-xs">
        {isEnabled ? (
          <>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-white/10">
              <span
                aria-hidden
                className="inline-block size-2 rounded-full"
                style={{ background: STAGE_COLOR[stage] }}
              />
              <span className="font-medium">{STAGE_LABELS[stage]}</span>
              <span className="text-[11px] opacity-50 hidden sm:inline">
                — {STAGE_DESCRIPTION[stage]}
              </span>
            </div>
            {link.lastPushedAt && (
              <span className="text-[11px] opacity-50 whitespace-nowrap hidden md:inline">
                Gesendet: {formatPushedAt(link.lastPushedAt)}
              </span>
            )}
            <Button
              size="sm"
              onClick={() => setPublishOpen(true)}
              className="bg-white/15 hover:bg-white/25 text-[var(--color-paper-card)] border border-white/20 text-[12px] px-3 py-1 h-auto"
            >
              Veröffentlichen
            </Button>
          </>
        ) : (
          <button
            onClick={() => openSettings('wordpress')}
            className="text-[11px] opacity-40 hover:opacity-70 transition-opacity underline"
            style={{ transitionDuration: 'var(--dur-state)' }}
          >
            Nicht verbunden
          </button>
        )}
      </div>

      <PublishDialog open={publishOpen} onClose={() => setPublishOpen(false)} />

      {/* Downgrade-Warnung */}
      <Dialog open={!!pendingPull} onOpenChange={(o) => { if (!o) cancelPull(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ältere Version laden?</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-[var(--color-ink-500)]">
            WordPress hat Version {pendingPull?.version}, aber hier ist bereits Version{' '}
            {pendingPull?.knownVersion} bekannt. Dein aktueller lokaler Stand wird überschrieben.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => cancelPull()}>Abbrechen</Button>
            <Button onClick={() => { confirmPull(setDoc); toast.success('Stand von WordPress geladen.'); }}>
              Trotzdem laden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konflikt (409) */}
      <Dialog open={!!conflict} onOpenChange={(o) => { if (!o) clearConflict(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WordPress hat eine neuere Version</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-[var(--color-ink-500)]">
            Auf WordPress liegt bereits eine neuere Fassung (Version {conflict?.serverVersion}).
            {conflict?.authorName && (
              <> Gespeichert von{' '}
                <strong className="font-semibold text-[var(--color-ink-900)]">{conflict.authorName}</strong>.
              </>
            )}{' '}Was möchtest du tun?
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (conflict) { setDoc(conflict.serverDoc); clearConflict(); toast.success('Server-Stand geladen.'); }
              }}
            >
              Server-Stand laden
            </Button>
            <Button
              onClick={() => {
                void keepLocal(doc).then((r) => {
                  if (r === 'synced') toast.success('Dein Stand wurde gesendet.');
                  else toast.error(useWpSyncStore.getState().message || 'Fehler beim Senden.');
                });
              }}
            >
              Meinen Stand behalten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Verify**

```bash
cd curriculr-planner && npm run typecheck && npm run lint
```

Expected: 0 errors. (PublishDialog placeholder renders null.)

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/StatusBar.tsx
git commit -m "feat: add StatusBar with stage display, Downgrade + Konflikt dialogs"
```

---

### Task 8: Create PublishDialog and Wire Into StatusBar

**Files:**
- Create: `src/components/editor/PublishDialog.tsx`
- Modify: `src/components/editor/StatusBar.tsx`

**Interfaces:**
- Consumes: `useWpSyncStore` (send, syncState, config), `usePlannerStore` (doc)
- Produces: `<PublishDialog open onClose />` — sends doc + optional stage advancement; `StatusBar` uses real import

- [ ] **Step 1: Create `src/components/editor/PublishDialog.tsx`**

```tsx
import { useState } from 'react';
import { usePlannerStore } from '@/stores/planner';
import { useWpSyncStore } from '@/stores/wpSync';
import {
  STAGE_LABELS, availableActions, type WpStage, type StageAction,
} from '@/lib/wp-stage';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose(): void;
}

const STAGE_DESCRIPTION: Record<WpStage, string> = {
  entwurf:     'Nur für dich sichtbar',
  genehmigt:   'Kollegium sieht die Entwurf-Vorschau',
  oeffentlich: 'Erscheint auf der Schulwebsite',
};

// Which action transitions INTO each stage
const ACTION_FOR_TARGET: Partial<Record<WpStage, StageAction>> = {
  genehmigt:   'freigeben',
  oeffentlich: 'oeffentlich-schalten',
};

export function PublishDialog({ open, onClose }: Props) {
  const doc       = usePlannerStore((s) => s.doc);
  const send      = useWpSyncStore((s) => s.send);
  const syncState = useWpSyncStore((s) => s.syncState);
  const config    = useWpSyncStore((s) => s.config);

  const link    = doc ? config.links[doc.schoolyear.id] : undefined;
  const stage   = (link?.stage ?? 'entwurf') as WpStage;
  const actions = availableActions(stage);

  const [selectedAction, setSelectedAction] = useState<StageAction | null>(null);

  const isSending = syncState === 'sending';

  async function onPublish() {
    if (!doc) return;
    const result = await send(doc, selectedAction ?? undefined);
    if (result === 'synced') {
      toast.success(selectedAction ? 'Plan veröffentlicht.' : 'Plan an WordPress gesendet.');
      onClose();
    } else if (result === 'conflict') {
      onClose(); // Conflict handled by StatusBar dialogs
    } else {
      toast.error(useWpSyncStore.getState().message || 'Senden fehlgeschlagen.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan veröffentlichen</DialogTitle>
          <DialogDescription>
            Sendet den aktuellen Plan an WordPress. Optional: Sichtbarkeit ändern.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-[13px]">
            Aktuelle Sichtbarkeit:{' '}
            <strong className="font-semibold text-[var(--color-ink-900)]">{STAGE_LABELS[stage]}</strong>
            <span className="text-[var(--color-ink-500)] ml-2">— {STAGE_DESCRIPTION[stage]}</span>
          </p>

          {actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] text-[var(--color-ink-500)]">
                Sichtbarkeit nach dem Veröffentlichen:
              </p>
              {/* Keep current stage */}
              <label className="flex items-start gap-3 p-3 rounded-[var(--radius-default)] border cursor-pointer border-[var(--color-ink-200)] hover:bg-[var(--color-paper-bg)]/60">
                <input
                  type="radio" name="publish-action"
                  checked={selectedAction === null}
                  onChange={() => setSelectedAction(null)}
                  className="mt-0.5 accent-[var(--color-marine-800)]"
                />
                <div>
                  <div className="text-[13px] font-semibold">{STAGE_LABELS[stage]}</div>
                  <div className="text-[12px] text-[var(--color-ink-500)]">
                    {STAGE_DESCRIPTION[stage]} (unverändert)
                  </div>
                </div>
              </label>
              {/* Available next stages */}
              {actions.map((action) => {
                const targetStage = (Object.entries(ACTION_FOR_TARGET) as [WpStage, StageAction][])
                  .find(([, a]) => a === action)?.[0];
                if (!targetStage) return null;
                return (
                  <label key={action}
                    className="flex items-start gap-3 p-3 rounded-[var(--radius-default)] border cursor-pointer border-[var(--color-ink-200)] hover:bg-[var(--color-paper-bg)]/60"
                  >
                    <input
                      type="radio" name="publish-action"
                      checked={selectedAction === action}
                      onChange={() => setSelectedAction(action)}
                      className="mt-0.5 accent-[var(--color-marine-800)]"
                    />
                    <div>
                      <div className="text-[13px] font-semibold">{STAGE_LABELS[targetStage]}</div>
                      <div className="text-[12px] text-[var(--color-ink-500)]">
                        {STAGE_DESCRIPTION[targetStage]}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <p className="text-[12px] text-[var(--color-ink-400)]">
            IServ synchronisiert sich nach dem Veröffentlichen automatisch (innerhalb 1 Stunde).
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSending}>Abbrechen</Button>
          <Button onClick={() => void onPublish()} disabled={isSending || !doc}>
            {isSending ? 'Sende…' : 'Jetzt veröffentlichen →'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Replace placeholder in `StatusBar.tsx`**

Find the two lines with the placeholder:
```ts
// PublishDialog added in Task 8 — placeholder for now
const PublishDialog = (_: { open: boolean; onClose(): void }) => null;
```

Replace with:
```ts
import { PublishDialog } from './PublishDialog';
```

- [ ] **Step 3: Verify**

```bash
cd curriculr-planner && npm run typecheck && npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/PublishDialog.tsx src/components/editor/StatusBar.tsx
git commit -m "feat: add PublishDialog with stage selection; wire real import into StatusBar"
```

---

### Task 9: Wire EditorHeader + SettingsModal Phase 2 + Delete Dead Files

**Files:**
- Modify: `src/components/editor/EditorHeader.tsx`
- Modify: `src/components/settings/SettingsModal.tsx`
- Modify: `src/stores/ui.ts`
- Modify: `src/components/settings/InfoTab.tsx` (add v1.7.0 changelog entry)
- Modify: `package.json` (version bump)
- Delete: `src/components/editor/WpSyncControls.tsx`
- Delete: `src/components/settings/WordpressTab.tsx`
- Delete: `src/components/settings/ExportTab.tsx`
- Delete: `src/components/settings/ImportTab.tsx`

**Interfaces:**
- Consumes: `StatusBar` (Task 7), `PublishTab` (Task 6)
- Produces: final state — `WpSyncControls` and old tabs gone

- [ ] **Step 1: Update `src/components/editor/EditorHeader.tsx`**

Remove `WpSyncControls` import and add `StatusBar`:

```ts
// Remove:
import { WpSyncControls } from './WpSyncControls';

// Add:
import { StatusBar } from './StatusBar';
```

In the JSX, find `<WpSyncControls />` and replace with `<StatusBar />`.

- [ ] **Step 2: Update `SettingsTab` type in `src/stores/ui.ts` — final state**

Replace the `SettingsTab` union:

```ts
export type SettingsTab =
  | 'schoolyear'
  | 'categories'
  | 'groups'
  | 'templates'
  | 'appearance'
  | 'publish'
  | 'info';
```

Search for any `openSettings('wordpress')` calls in `ui.ts` or other files and update to `openSettings('publish')`.

- [ ] **Step 3: Update `SettingsModal.tsx` — final state**

```tsx
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useUiStore, type SettingsTab } from '@/stores/ui';
import { SchoolyearTab } from './SchoolyearTab';
import { CategoriesTab } from './CategoriesTab';
import { GroupsTab }     from './GroupsTab';
import { TemplatesTab }  from './TemplatesTab';
import { AppearanceTab } from './AppearanceTab';
import { PublishTab }    from './PublishTab';
import { InfoTab }       from './InfoTab';

const NAV_GROUPS: { group: string; items: { value: SettingsTab; label: string }[] }[] = [
  {
    group: 'Inhalt',
    items: [
      { value: 'schoolyear', label: 'Schuljahr & Quartale' },
      { value: 'categories', label: 'Kategorien' },
      { value: 'groups',     label: 'Gruppen' },
      { value: 'templates',  label: 'Vorlagen' },
    ],
  },
  {
    group: 'Ausgabe',
    items: [
      { value: 'appearance', label: 'Darstellung & Druck' },
      { value: 'publish',    label: 'Veröffentlichung & Export' },
    ],
  },
  {
    group: 'Info',
    items: [
      { value: 'info', label: 'Info & Datenschutz' },
    ],
  },
];

const CONTENT: Record<SettingsTab, React.ReactNode> = {
  schoolyear: <SchoolyearTab />,
  categories: <CategoriesTab />,
  groups:     <GroupsTab />,
  templates:  <TemplatesTab />,
  appearance: <AppearanceTab />,
  publish:    <PublishTab />,
  info:       <InfoTab />,
};
```

Keep the `SettingsModal` function body unchanged.

- [ ] **Step 4: Add v1.7.0 changelog entry to `InfoTab.tsx`**

Prepend to the `CHANGELOG` array in `src/components/settings/InfoTab.tsx`:

```ts
{
  version: '1.7.0',
  date: '30.06.2026',
  highlights: [
    'Neue Navigationsstruktur: 7 Tabs in 3 Gruppen (Inhalt / Ausgabe / Info)',
    'StatusBar: Veröffentlichungs-Stufe und letzter Push immer sichtbar im Editor',
    'Veröffentlichen-Dialog mit Sichtbarkeits-Auswahl (Entwurf / Intern / Öffentlich)',
    'Veröffentlichung & Export: WordPress, Kalender-Einrichtung, Export und Import in einem Tab',
    'Stage-Begriff „Genehmigt" umbenannt in „Intern" (beschreibt Sichtbarkeit, nicht Prozess)',
  ],
},
```

Also update `const APP_VERSION = '1.6.0';` → `'1.7.0'`.

- [ ] **Step 5: Bump version in `package.json`**

Find `"version": "..."` and increment minor: e.g. `"1.6.0"` → `"1.7.0"`.

- [ ] **Step 6: Verify typecheck before deletion**

```bash
cd curriculr-planner && npm run typecheck && npm run lint
```

Expected: 0 errors.

- [ ] **Step 7: Delete dead files**

```bash
rm curriculr-planner/src/components/editor/WpSyncControls.tsx
rm curriculr-planner/src/components/settings/WordpressTab.tsx
rm curriculr-planner/src/components/settings/ExportTab.tsx
rm curriculr-planner/src/components/settings/ImportTab.tsx
```

- [ ] **Step 8: Final verify**

```bash
cd curriculr-planner && npm run typecheck && npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 9: Commit**

```bash
git add -u
git add src/components/editor/EditorHeader.tsx
git add src/components/settings/SettingsModal.tsx
git add src/stores/ui.ts
git add src/components/settings/InfoTab.tsx
git add package.json
git commit -m "feat: SPA redesign v1.7.0 — StatusBar, PublishDialog, PublishTab, 7-tab nav"
```

---

## Self-Review

**Spec coverage:**

| Problem | Resolution |
|---------|------------|
| P-02 Stage never visible | StatusBar always shows stage pill ✓ |
| P-03 12-step publish flow | [Veröffentlichen] button + PublishDialog in header ✓ |
| P-04 Schuljahr-Schlüssel visible | Hidden behind `<details>` in PublishTab ✓ |
| P-05 11 tabs | → 7 tabs ✓ |
| P-11 WP/Export/Import separate | → merged PublishTab ✓ |
| P-14 Stage terms technical | "Genehmigt" → "Intern" ✓ |
| P-15 Appearance + School separate | → merged AppearanceTab ✓ |
| P-16 Über + Datenschutz separate | → merged InfoTab ✓ |
| P-17 WpSyncControls hidden | → StatusBar always visible ✓ |

**Open risk:** Manual `pull()` was exposed in WpSyncControls. This plan does NOT add a pull button to StatusBar or PublishDialog — only the conflict/downgrade dialogs (which trigger pull automatically). If users need on-demand pull, add a "Aktualisieren" button to PublishDialog in a follow-up.

**Type consistency:** `SettingsTab` is updated twice — Task 4 (intermediate) and Task 9 (final). The intermediate state keeps `export`, `import`, `wordpress` to avoid breaking the existing component imports before those components exist. Task 9 removes them atomically with the file deletions.

**`StatusBar` reference to `openSettings('wordpress')`:** Updated to `openSettings('publish')` in Task 9. Search any other call sites in the codebase: `grep -r "openSettings.*wordpress" src/`.
