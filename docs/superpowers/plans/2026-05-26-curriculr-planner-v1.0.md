# Curriculr Planner v1.0 (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone web tool for school principals to plan an annual school schedule, exportable as ICS for the existing WordPress plugin.

**Architecture:** Single-page React app with client-side persistence via LocalStorage. Wizard onboards users with school year metadata, editor presents a quarter-based calendar with drag-drop event management. Exports as ICS, JSON, Excel.

**Tech Stack:** Vite 5 + React 19 + TypeScript (strict) + Tailwind v4 + shadcn/ui + FullCalendar React + Zustand + react-hook-form + Zod + date-fns + xlsx + Vitest + Testing-Library

**Spec:** `docs/superpowers/specs/2026-05-26-curriculr-planner-design.md`

**Repo location:** New Git repo at `Y:\Schule\Projekte Schul-IT\curriculr-planner\` (sibling to the WordPress plugin repo). All file paths in this plan are relative to that new repo unless prefixed.

---

## File Structure Overview

```
curriculr-planner/
├─ src/
│  ├─ main.tsx                          Task 2
│  ├─ App.tsx                           Task 5
│  ├─ types/index.ts                    Task 3
│  ├─ lib/
│  │  ├─ schemas.ts                     Task 3
│  │  ├─ storage.ts                     Task 4
│  │  ├─ schoolweeks.ts                 Task 6
│  │  ├─ colors.ts                      Task 14
│  │  ├─ ics-export.ts                  Task 21
│  │  └─ excel-export.ts                Task 23
│  ├─ stores/
│  │  ├─ planner.ts                     Task 7
│  │  └─ ui.ts                          Task 7
│  ├─ components/
│  │  ├─ ui/                            Task 5 (shadcn add)
│  │  ├─ welcome/Welcome.tsx            Task 8
│  │  ├─ wizard/
│  │  │  ├─ Wizard.tsx                  Task 9
│  │  │  ├─ Step1Schoolyear.tsx         Task 9
│  │  │  ├─ Step2Categories.tsx         Task 10
│  │  │  └─ Step3Review.tsx             Task 11
│  │  ├─ editor/
│  │  │  ├─ Editor.tsx                  Task 12
│  │  │  ├─ EditorHeader.tsx            Task 12
│  │  │  ├─ EditorToolbar.tsx           Task 13
│  │  │  ├─ QuarterCalendar.tsx         Task 14
│  │  │  ├─ DayCellContent.tsx          Task 15
│  │  │  ├─ EventChip.tsx               Task 14
│  │  │  ├─ NotePopover.tsx             Task 19
│  │  │  └─ NotesSidebar.tsx            Task 20
│  │  ├─ event-modal/EventModal.tsx     Task 16
│  │  ├─ event-modal/GroupChipsInput.tsx Task 16
│  │  ├─ settings/SettingsModal.tsx     Task 17
│  │  └─ export/ExportDropdown.tsx      Task 22
│  └─ styles/globals.css                Task 5
├─ public/
│  └─ curriculr-logo.svg                Task 5
├─ tests/                               Per-task colocated under src/
├─ index.html                           Task 2
├─ package.json                         Task 1
├─ vite.config.ts                       Task 1
├─ vitest.config.ts                     Task 1
├─ tailwind.config.ts                   Task 2
├─ tsconfig.json                        Task 1
├─ .gitignore                           Task 1
├─ README.md                            Task 1
└─ .github/workflows/deploy.yml         Task 24
```

---

## Task 1: Repo Init & Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Create new directory + init git**

Run from parent dir `Y:\Schule\Projekte Schul-IT\`:
```bash
mkdir curriculr-planner
cd curriculr-planner
git init
git branch -m main
```

Expected: empty repo on `main` branch.

- [ ] **Step 2: Scaffold Vite + React + TS project**

```bash
pnpm create vite@latest . --template react-ts --yes
```

This generates `package.json`, `index.html`, `src/App.tsx`, `src/main.tsx`, `tsconfig.json`, `vite.config.ts`.

- [ ] **Step 3: Replace `tsconfig.json` with strict config**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Install runtime dependencies**

```bash
pnpm add react react-dom zustand react-hook-form zod date-fns \
  @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction \
  xlsx clsx class-variance-authority lucide-react
```

- [ ] **Step 5: Install dev dependencies**

```bash
pnpm add -D typescript @types/react @types/react-dom \
  @vitejs/plugin-react vite vitest @vitest/ui jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  tailwindcss @tailwindcss/vite postcss autoprefixer \
  eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-react-hooks eslint-plugin-react-refresh
```

- [ ] **Step 6: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  server: { port: 5173 }
});
```

- [ ] **Step 7: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts']
  }
});
```

- [ ] **Step 8: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 9: Update `package.json` scripts**

Replace `scripts` block:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run",
  "test:ui": "vitest --ui",
  "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 10: Create `.gitignore`**

```
node_modules
dist
.vite
.DS_Store
*.local
.env*
coverage
.idea
.vscode
*.log
```

- [ ] **Step 11: Create `README.md`**

```markdown
# Curriculr Planner

Standalone web tool for school principals to create an annual school schedule.

## Quick Start

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # watch mode
pnpm test:run     # single run
pnpm build        # production bundle in dist/
```

## Spec

See [spec document](docs/spec.md) for full requirements.

## License

MIT
```

- [ ] **Step 12: Verify build + test toolchain works**

```bash
pnpm install
pnpm typecheck
pnpm test:run
```

Expected: `typecheck` passes (no errors). `test:run` reports `No test files found, exiting with code 0`.

- [ ] **Step 13: Commit**

```bash
git add .
git commit -m "chore: init repo with Vite + React + TS + Tailwind + Vitest"
```

---

## Task 2: Tailwind v4 Setup + Curriculr Brand Tokens

**Files:**
- Create: `src/styles/globals.css`
- Create: `tailwind.config.ts`
- Modify: `src/main.tsx`
- Modify: `index.html`

- [ ] **Step 1: Create `src/styles/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-primary-900: #00345C;
  --color-primary-700: #00467D;
  --color-primary-500: #0058A0;
  --color-primary-100: #E6F4FF;
  --color-accent-warning: #FFC857;
  --color-accent-success: #0E9F6E;
  --color-accent-error: #E02424;
  --color-bg-body: #F3F5F9;
  --color-text-main: #111827;
  --color-text-muted: #4B5563;

  --font-family-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont,
    'Segoe UI', sans-serif;

  --radius-card: 14px;
  --radius-btn: 9999px;
  --radius-input: 8px;

  --shadow-card: 0 18px 40px rgba(15, 23, 42, 0.15);
  --shadow-btn: 0 2px 8px rgba(0, 70, 125, 0.25);
  --shadow-focus: 0 0 0 3px rgba(0, 70, 125, 0.25);
}

html, body {
  height: 100%;
  background: var(--color-bg-body);
  color: var(--color-text-main);
  font-family: var(--font-family-sans);
  -webkit-font-smoothing: antialiased;
}

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

- [ ] **Step 2: Update `src/main.tsx` to import globals**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: Replace `index.html`**

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/curriculr-logo.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Curriculr Planner</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Copy Curriculr logo SVG**

Create `public/curriculr-logo.svg` with the SVG markup from `Y:\Schule\Projekte Schul-IT\Wordpress Plugin Terminplaner\konverter\Terminplan_Konverter.html` lines 633–640 (extract just the `<svg>...</svg>` element, save standalone).

Read source:
```bash
# Run from plugin repo:
sed -n '633,640p' 'Y:/Schule/Projekte Schul-IT/Wordpress Plugin Terminplaner/konverter/Terminplan_Konverter.html'
```

Wrap output in `<?xml version="1.0" encoding="UTF-8"?>` prefix and save to `public/curriculr-logo.svg`.

- [ ] **Step 5: Replace `src/App.tsx` with brand-test stub**

```tsx
export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <img src="/curriculr-logo.svg" alt="Curriculr" className="h-12 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[var(--color-primary-900)]">
          Planner — Setup OK
        </h1>
        <p className="text-[var(--color-text-muted)] mt-2">
          Tailwind + Brand-Tokens funktionieren.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Start dev server + visual smoke test**

```bash
pnpm dev
```

Open `http://localhost:5173` in browser. Verify: Logo visible, "Setup OK"-Heading in dark blue, light gray background. Stop server.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat(style): Tailwind v4 + Curriculr brand tokens + logo"
```

---

## Task 3: Domain Types + Zod Schemas

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/schemas.ts`
- Create: `src/lib/schemas.test.ts`

- [ ] **Step 1: Write the failing schema tests**

`src/lib/schemas.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { PlanEventSchema, SchoolyearSchema, PlannerDocumentSchema } from './schemas';

describe('SchoolyearSchema', () => {
  it('accepts valid schoolyear', () => {
    const valid = {
      id: 'a',
      label: '2026/27',
      firstSchoolDay: '2026-08-24',
      firstTeachingDay: '2026-08-31',
      lastSchoolDay: '2027-07-16',
      holidays: [],
      quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-09'],
      createdAt: '2026-05-26T10:00:00Z',
      updatedAt: '2026-05-26T10:00:00Z'
    };
    expect(SchoolyearSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing fields', () => {
    expect(SchoolyearSchema.safeParse({ label: '2026/27' }).success).toBe(false);
  });
});

describe('PlanEventSchema', () => {
  it('accepts all-day event without times', () => {
    const valid = {
      id: 'e1',
      title: 'Wandertag',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: 'cat-wandertag',
      groups: ['Klassen 5-7']
    };
    expect(PlanEventSchema.safeParse(valid).success).toBe(true);
  });

  it('requires times when not all-day', () => {
    const invalid = {
      id: 'e1',
      title: 'FK',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: false,
      categoryId: 'cat-fk',
      groups: []
    };
    expect(PlanEventSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects empty title', () => {
    const invalid = {
      id: 'e1',
      title: '',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: 'cat',
      groups: []
    };
    expect(PlanEventSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('PlannerDocumentSchema', () => {
  it('accepts complete document', () => {
    const doc = {
      version: 1,
      schoolyear: {
        id: 'sy',
        label: '2026/27',
        firstSchoolDay: '2026-08-24',
        firstTeachingDay: '2026-08-31',
        lastSchoolDay: '2027-07-16',
        holidays: [],
        quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-09'],
        createdAt: 'now',
        updatedAt: 'now'
      },
      categories: [{ id: 'c1', label: 'X', color: '#FF0000', slug: 'x', keywords: [] }],
      events: [],
      annotations: [],
      availableGroups: [],
      meta: { name: 'Plan', lastSaved: 'now' }
    };
    expect(PlannerDocumentSchema.safeParse(doc).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test:run schemas
```

Expected: FAIL — module `./schemas` does not exist.

- [ ] **Step 3: Create `src/types/index.ts`**

```ts
export type ISODate = string;
export type ISOTime = string;
export type UUID = string;

export interface Holiday {
  id: UUID;
  label: string;
  start: ISODate;
  end: ISODate;
}

export interface Schoolyear {
  id: UUID;
  label: string;
  firstSchoolDay: ISODate;
  firstTeachingDay: ISODate;
  lastSchoolDay: ISODate;
  holidays: Holiday[];
  quarterBoundaries: ISODate[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: UUID;
  label: string;
  color: string;
  slug: string;
  keywords: string[];
}

export interface PlanEvent {
  id: UUID;
  title: string;
  start: ISODate;
  end: ISODate;
  startTime?: ISOTime;
  endTime?: ISOTime;
  allDay: boolean;
  categoryId: UUID;
  notes?: string;
  location?: string;
  groups: string[];
}

export interface WeekAnnotation {
  schoolweek: number;
  text: string;
  updatedAt: string;
}

export interface PlannerDocument {
  version: 1;
  schoolyear: Schoolyear;
  categories: Category[];
  events: PlanEvent[];
  annotations: WeekAnnotation[];
  availableGroups: string[];
  meta: {
    name: string;
    lastSaved: string;
  };
}
```

- [ ] **Step 4: Create `src/lib/schemas.ts`**

```ts
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required');
const isoTime = z.string().regex(/^\d{2}:\d{2}$/, 'HH:mm required');

export const HolidaySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  start: isoDate,
  end: isoDate
});

export const SchoolyearSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  firstSchoolDay: isoDate,
  firstTeachingDay: isoDate,
  lastSchoolDay: isoDate,
  holidays: z.array(HolidaySchema),
  quarterBoundaries: z.array(isoDate).length(3),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const CategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  slug: z.string().min(1),
  keywords: z.array(z.string())
});

export const PlanEventSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1, 'Titel erforderlich'),
    start: isoDate,
    end: isoDate,
    startTime: isoTime.optional(),
    endTime: isoTime.optional(),
    allDay: z.boolean(),
    categoryId: z.string().min(1),
    notes: z.string().optional(),
    location: z.string().optional(),
    groups: z.array(z.string())
  })
  .refine((e) => (e.allDay ? true : !!e.startTime && !!e.endTime), {
    message: 'Zeiten erforderlich wenn nicht ganztägig',
    path: ['startTime']
  })
  .refine((e) => e.end >= e.start, {
    message: 'Endedatum muss ≥ Startdatum sein',
    path: ['end']
  });

export const WeekAnnotationSchema = z.object({
  schoolweek: z.number().int().nonnegative(),
  text: z.string(),
  updatedAt: z.string()
});

export const PlannerDocumentSchema = z.object({
  version: z.literal(1),
  schoolyear: SchoolyearSchema,
  categories: z.array(CategorySchema),
  events: z.array(PlanEventSchema),
  annotations: z.array(WeekAnnotationSchema),
  availableGroups: z.array(z.string()),
  meta: z.object({
    name: z.string().min(1),
    lastSaved: z.string()
  })
});
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test:run schemas
```

Expected: PASS — 6 tests.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(types): domain types + Zod schemas with tests"
```

---

## Task 4: Storage Layer (LocalStorage Adapter)

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/storage.test.ts`

- [ ] **Step 1: Write the failing storage tests**

`src/lib/storage.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from './storage';
import type { PlannerDocument } from '@/types';

const sampleDoc: PlannerDocument = {
  version: 1,
  schoolyear: {
    id: 'sy1',
    label: '2026/27',
    firstSchoolDay: '2026-08-24',
    firstTeachingDay: '2026-08-31',
    lastSchoolDay: '2027-07-16',
    holidays: [],
    quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-09'],
    createdAt: '2026-05-26T00:00:00Z',
    updatedAt: '2026-05-26T00:00:00Z'
  },
  categories: [],
  events: [],
  annotations: [],
  availableGroups: [],
  meta: { name: 'Plan', lastSaved: '2026-05-26T00:00:00Z' }
};

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  it('saves + loads a document', async () => {
    const doc = { ...sampleDoc, schoolyear: { ...sampleDoc.schoolyear, id: 'doc1' } };
    await adapter.saveDoc(doc);
    const loaded = await adapter.loadDoc('doc1');
    expect(loaded).toEqual(doc);
  });

  it('lists saved docs', async () => {
    await adapter.saveDoc({ ...sampleDoc, schoolyear: { ...sampleDoc.schoolyear, id: 'a' } });
    await adapter.saveDoc({ ...sampleDoc, schoolyear: { ...sampleDoc.schoolyear, id: 'b' } });
    const list = await adapter.listDocs();
    expect(list.map((d) => d.id).sort()).toEqual(['a', 'b']);
  });

  it('deletes a document', async () => {
    const doc = { ...sampleDoc, schoolyear: { ...sampleDoc.schoolyear, id: 'doc1' } };
    await adapter.saveDoc(doc);
    await adapter.deleteDoc('doc1');
    await expect(adapter.loadDoc('doc1')).rejects.toThrow();
  });

  it('rejects invalid schema on load', async () => {
    localStorage.setItem('curriculr-planner:doc:bad', JSON.stringify({ foo: 'bar' }));
    localStorage.setItem('curriculr-planner:docs', JSON.stringify(['bad']));
    await expect(adapter.loadDoc('bad')).rejects.toThrow(/Invalid/);
  });

  it('tracks active doc', async () => {
    await adapter.setActiveDoc('doc1');
    expect(await adapter.getActiveDoc()).toBe('doc1');
  });

  it('exports JSON backup string', () => {
    const json = adapter.exportJson(sampleDoc);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.meta.name).toBe('Plan');
  });

  it('imports valid JSON backup', async () => {
    const json = JSON.stringify(sampleDoc);
    const imported = await adapter.importJson(json);
    expect(imported.schoolyear.label).toBe('2026/27');
  });

  it('rejects malformed JSON on import', async () => {
    await expect(adapter.importJson('{not json}')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test:run storage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/storage.ts`**

```ts
import type { PlannerDocument, UUID } from '@/types';
import { PlannerDocumentSchema } from './schemas';

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
      parsed = JSON.parse(raw);
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
    const parsed = JSON.parse(json);
    const result = PlannerDocumentSchema.safeParse(parsed);
    if (!result.success) throw new Error(`Invalid backup: ${result.error.message}`);
    return result.data as PlannerDocument;
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();
```

- [ ] **Step 4: Run tests — verify pass**

```bash
pnpm test:run storage
```

Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(storage): LocalStorage adapter with Zod validation"
```

---

## Task 5: shadcn/ui Setup + App Shell

**Files:**
- Modify: `src/App.tsx`
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Adds shadcn components: `button`, `input`, `label`, `dialog`, `select`, `popover`, `checkbox`, `textarea`, `toast`

- [ ] **Step 1: Init shadcn**

```bash
pnpm dlx shadcn@latest init -y
```

Answer prompts:
- TS: yes
- Style: default
- Base color: slate
- CSS variables: yes
- Tailwind config: `tailwind.config.ts`
- Components: `@/components/ui`
- Utils: `@/lib/utils`

This creates `components.json` and `src/lib/utils.ts`.

- [ ] **Step 2: Add needed components**

```bash
pnpm dlx shadcn@latest add button input label dialog select popover checkbox textarea sonner card tabs dropdown-menu
```

- [ ] **Step 3: Replace `src/App.tsx` with router shell stub**

```tsx
import { useEffect, useState } from 'react';
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

  if (route === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--color-text-muted)]">
        Lädt…
      </div>
    );
  }

  if (route === 'welcome') {
    return <div data-testid="welcome-placeholder">Welcome (placeholder)</div>;
  }

  return <div data-testid="editor-placeholder">Editor for {activeDocId}</div>;
}
```

- [ ] **Step 4: Add `<Toaster />` to App**

Replace return blocks to include Sonner Toaster at root:
```tsx
import { Toaster } from '@/components/ui/sonner';
// ...
return (
  <>
    <Toaster richColors position="bottom-right" />
    {/* existing routes */}
  </>
);
```

- [ ] **Step 5: Smoke test**

```bash
pnpm dev
```

Open browser, verify "Welcome (placeholder)" appears (assuming clean LocalStorage). Open DevTools, run `localStorage.setItem('curriculr-planner:active', 'test')`, reload — verify "Editor for test" appears.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(app): shadcn/ui setup + router shell with active-doc detection"
```

---

## Task 6: Schoolweeks Computation

**Files:**
- Create: `src/lib/schoolweeks.ts`
- Create: `src/lib/schoolweeks.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/schoolweeks.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeSchoolweeks, isHoliday, isWeekend } from './schoolweeks';
import type { Schoolyear } from '@/types';

const sy: Schoolyear = {
  id: 'sy',
  label: '2026/27',
  firstSchoolDay: '2026-08-24',
  firstTeachingDay: '2026-08-31',
  lastSchoolDay: '2027-07-16',
  holidays: [
    { id: 'h1', label: 'Herbst', start: '2026-10-19', end: '2026-10-30' },
    { id: 'h2', label: 'Weihnachten', start: '2026-12-23', end: '2027-01-07' }
  ],
  quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-09'],
  createdAt: '',
  updatedAt: ''
};

describe('isWeekend', () => {
  it('detects Saturday', () => expect(isWeekend('2026-08-29')).toBe(true));
  it('detects Sunday', () => expect(isWeekend('2026-08-30')).toBe(true));
  it('rejects Monday', () => expect(isWeekend('2026-08-31')).toBe(false));
});

describe('isHoliday', () => {
  it('detects date inside Herbst', () =>
    expect(isHoliday('2026-10-25', sy.holidays)).toEqual({ id: 'h1', label: 'Herbst', start: '2026-10-19', end: '2026-10-30' }));
  it('returns null for non-holiday date', () =>
    expect(isHoliday('2026-09-15', sy.holidays)).toBeNull());
  it('includes start + end inclusively', () => {
    expect(isHoliday('2026-10-19', sy.holidays)).not.toBeNull();
    expect(isHoliday('2026-10-30', sy.holidays)).not.toBeNull();
  });
});

describe('computeSchoolweeks', () => {
  it('returns SW 00 starting at firstSchoolDay (Monday)', () => {
    const weeks = computeSchoolweeks(sy);
    expect(weeks[0]).toEqual({
      index: 0,
      startDate: '2026-08-24',
      endDate: '2026-08-28'
    });
  });

  it('skips weeks fully in holidays', () => {
    const weeks = computeSchoolweeks(sy);
    const dates = weeks.map((w) => w.startDate);
    // Herbst SW (19.–23.10) should NOT appear
    expect(dates).not.toContain('2026-10-19');
  });

  it('emits sequential indices', () => {
    const weeks = computeSchoolweeks(sy);
    weeks.forEach((w, i) => expect(w.index).toBe(i));
  });

  it('stops at lastSchoolDay', () => {
    const weeks = computeSchoolweeks(sy);
    const last = weeks[weeks.length - 1];
    expect(last.startDate <= '2027-07-16').toBe(true);
  });

  it('produces 40+ weeks for full schoolyear', () => {
    const weeks = computeSchoolweeks(sy);
    expect(weeks.length).toBeGreaterThanOrEqual(38);
    expect(weeks.length).toBeLessThanOrEqual(45);
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

```bash
pnpm test:run schoolweeks
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/schoolweeks.ts`**

```ts
import { parseISO, format, addDays, startOfWeek, getDay, isWithinInterval } from 'date-fns';
import type { Schoolyear, Holiday, ISODate } from '@/types';

export interface SchoolweekRange {
  index: number;
  startDate: ISODate;
  endDate: ISODate;
}

export function isWeekend(iso: ISODate): boolean {
  const day = getDay(parseISO(iso));
  return day === 0 || day === 6;
}

export function isHoliday(iso: ISODate, holidays: Holiday[]): Holiday | null {
  const date = parseISO(iso);
  for (const h of holidays) {
    if (isWithinInterval(date, { start: parseISO(h.start), end: parseISO(h.end) })) {
      return h;
    }
  }
  return null;
}

function fmt(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd');
}

export function computeSchoolweeks(sy: Schoolyear): SchoolweekRange[] {
  const start = startOfWeek(parseISO(sy.firstSchoolDay), { weekStartsOn: 1 });
  const last = parseISO(sy.lastSchoolDay);
  const weeks: SchoolweekRange[] = [];
  let index = 0;
  let cursor = start;
  while (cursor <= last) {
    const monday = cursor;
    const friday = addDays(cursor, 4);
    let holidayDays = 0;
    for (let i = 0; i < 5; i++) {
      if (isHoliday(fmt(addDays(cursor, i)), sy.holidays)) holidayDays++;
    }
    if (holidayDays < 3) {
      weeks.push({ index, startDate: fmt(monday), endDate: fmt(friday) });
      index++;
    }
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function findSchoolweek(
  iso: ISODate,
  weeks: SchoolweekRange[]
): SchoolweekRange | null {
  return weeks.find((w) => iso >= w.startDate && iso <= w.endDate) ?? null;
}

export function getQuarterForDate(
  iso: ISODate,
  sy: Schoolyear
): 1 | 2 | 3 | 4 {
  const [q1End, q2End, q3End] = sy.quarterBoundaries;
  if (iso <= q1End) return 1;
  if (iso <= q2End) return 2;
  if (iso <= q3End) return 3;
  return 4;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm test:run schoolweeks
```

Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(lib): schoolweek + holiday + quarter computation"
```

---

## Task 7: Zustand Stores (planner + ui)

**Files:**
- Create: `src/stores/planner.ts`
- Create: `src/stores/ui.ts`
- Create: `src/stores/planner.test.ts`

- [ ] **Step 1: Write failing planner-store tests**

`src/stores/planner.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore, createEmptyDoc } from './planner';

describe('usePlannerStore', () => {
  beforeEach(() => {
    usePlannerStore.setState({ doc: null, savingState: 'idle' });
    localStorage.clear();
  });

  it('starts with no doc', () => {
    expect(usePlannerStore.getState().doc).toBeNull();
  });

  it('sets a doc', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    usePlannerStore.getState().setDoc(doc);
    expect(usePlannerStore.getState().doc?.meta.name).toBe('Test');
  });

  it('adds an event', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    usePlannerStore.getState().setDoc(doc);
    usePlannerStore.getState().addEvent({
      id: 'e1',
      title: 'Wandertag',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: []
    });
    expect(usePlannerStore.getState().doc?.events).toHaveLength(1);
  });

  it('updates an event', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e1',
      title: 'Wandertag',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: []
    });
    usePlannerStore.getState().setDoc(doc);
    usePlannerStore.getState().updateEvent('e1', { title: 'Sportfest' });
    expect(usePlannerStore.getState().doc?.events[0].title).toBe('Sportfest');
  });

  it('deletes an event', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e1',
      title: 'X',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: []
    });
    usePlannerStore.getState().setDoc(doc);
    usePlannerStore.getState().deleteEvent('e1');
    expect(usePlannerStore.getState().doc?.events).toHaveLength(0);
  });

  it('sets annotation for schoolweek', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    usePlannerStore.getState().setDoc(doc);
    usePlannerStore.getState().setAnnotation(2, 'FK-Woche');
    const ann = usePlannerStore.getState().doc?.annotations.find((a) => a.schoolweek === 2);
    expect(ann?.text).toBe('FK-Woche');
  });

  it('createEmptyDoc produces 7 default categories', () => {
    const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    expect(doc.categories.length).toBe(7);
    expect(doc.categories.map((c) => c.slug)).toContain('sondertag');
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
pnpm test:run planner
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/stores/planner.ts`**

```ts
import { create } from 'zustand';
import { storage } from '@/lib/storage';
import type { PlannerDocument, PlanEvent, Category, UUID } from '@/types';

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: ['konferenz', 'fk'] },
  { label: 'Elternabend', color: '#0E9F6E', slug: 'elternabend', keywords: ['elternabend', 'eltern'] },
  { label: 'Wandertag', color: '#FFC857', slug: 'wandertag', keywords: ['wandertag', 'ausflug'] },
  { label: 'Prüfung', color: '#E02424', slug: 'pruefung', keywords: ['prüfung', 'klausur', 'abitur'] },
  { label: 'Sonderveranstaltung', color: '#7C3AED', slug: 'sonder', keywords: ['fest', 'feier'] },
  { label: 'Schließtag', color: '#6B7280', slug: 'schliesstag', keywords: ['schließ', 'frei'] },
  { label: 'Sondertag', color: '#FFC857', slug: 'sondertag', keywords: [] }
];

const DEFAULT_GROUPS = ['Kollegium', 'Eltern', 'Klassen 5-7', 'Klassen 8-10', 'Sek I', 'Sek II'];

function uid(): string {
  return crypto.randomUUID();
}

export function createEmptyDoc(
  name: string,
  label: string,
  firstSchoolDay: string,
  firstTeachingDay: string,
  lastSchoolDay: string
): PlannerDocument {
  const now = new Date().toISOString();
  return {
    version: 1,
    schoolyear: {
      id: uid(),
      label,
      firstSchoolDay,
      firstTeachingDay,
      lastSchoolDay,
      holidays: [],
      quarterBoundaries: [],
      createdAt: now,
      updatedAt: now
    },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uid() })),
    events: [],
    annotations: [],
    availableGroups: [...DEFAULT_GROUPS],
    meta: { name, lastSaved: now }
  };
}

type SavingState = 'idle' | 'saving' | 'saved' | 'error';

interface PlannerState {
  doc: PlannerDocument | null;
  savingState: SavingState;

  setDoc(doc: PlannerDocument | null): void;
  loadDoc(id: UUID): Promise<void>;
  saveDoc(): Promise<void>;

  addEvent(e: PlanEvent): void;
  updateEvent(id: UUID, patch: Partial<PlanEvent>): void;
  deleteEvent(id: UUID): void;

  setAnnotation(schoolweek: number, text: string): void;
  deleteAnnotation(schoolweek: number): void;

  updateSchoolyear(patch: Partial<PlannerDocument['schoolyear']>): void;
  updateCategories(cats: Category[]): void;
  updateGroups(groups: string[]): void;
  updateMeta(patch: Partial<PlannerDocument['meta']>): void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(get: () => PlannerState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await get().saveDoc();
  }, 300);
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  doc: null,
  savingState: 'idle',

  setDoc(doc) {
    set({ doc });
  },

  async loadDoc(id) {
    const doc = await storage.loadDoc(id);
    set({ doc });
    await storage.setActiveDoc(id);
  },

  async saveDoc() {
    const doc = get().doc;
    if (!doc) return;
    set({ savingState: 'saving' });
    try {
      const stamped = { ...doc, meta: { ...doc.meta, lastSaved: new Date().toISOString() } };
      await storage.saveDoc(stamped);
      set({ doc: stamped, savingState: 'saved' });
    } catch {
      set({ savingState: 'error' });
    }
  },

  addEvent(e) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, events: [...doc.events, e] } });
    debouncedSave(get);
  },

  updateEvent(id, patch) {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        events: doc.events.map((e) => (e.id === id ? { ...e, ...patch } : e))
      }
    });
    debouncedSave(get);
  },

  deleteEvent(id) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, events: doc.events.filter((e) => e.id !== id) } });
    debouncedSave(get);
  },

  setAnnotation(schoolweek, text) {
    const doc = get().doc;
    if (!doc) return;
    const updatedAt = new Date().toISOString();
    const existing = doc.annotations.find((a) => a.schoolweek === schoolweek);
    const annotations = existing
      ? doc.annotations.map((a) => (a.schoolweek === schoolweek ? { ...a, text, updatedAt } : a))
      : [...doc.annotations, { schoolweek, text, updatedAt }];
    set({ doc: { ...doc, annotations } });
    debouncedSave(get);
  },

  deleteAnnotation(schoolweek) {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: { ...doc, annotations: doc.annotations.filter((a) => a.schoolweek !== schoolweek) }
    });
    debouncedSave(get);
  },

  updateSchoolyear(patch) {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        schoolyear: { ...doc.schoolyear, ...patch, updatedAt: new Date().toISOString() }
      }
    });
    debouncedSave(get);
  },

  updateCategories(categories) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, categories } });
    debouncedSave(get);
  },

  updateGroups(availableGroups) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, availableGroups } });
    debouncedSave(get);
  },

  updateMeta(patch) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, meta: { ...doc.meta, ...patch } } });
    debouncedSave(get);
  }
}));
```

- [ ] **Step 4: Implement `src/stores/ui.ts`**

```ts
import { create } from 'zustand';

interface UiState {
  currentQuarter: 1 | 2 | 3 | 4;
  notesSidebarOpen: boolean;
  settingsModalOpen: boolean;
  eventModalState: { open: false } | { open: true; mode: 'create' | 'edit'; eventId?: string; presetDate?: string };

  setQuarter(q: 1 | 2 | 3 | 4): void;
  toggleNotesSidebar(): void;
  openSettings(): void;
  closeSettings(): void;
  openCreateEvent(presetDate?: string): void;
  openEditEvent(eventId: string): void;
  closeEventModal(): void;
}

export const useUiStore = create<UiState>((set) => ({
  currentQuarter: 1,
  notesSidebarOpen: false,
  settingsModalOpen: false,
  eventModalState: { open: false },

  setQuarter(q) { set({ currentQuarter: q }); },
  toggleNotesSidebar() { set((s) => ({ notesSidebarOpen: !s.notesSidebarOpen })); },
  openSettings() { set({ settingsModalOpen: true }); },
  closeSettings() { set({ settingsModalOpen: false }); },
  openCreateEvent(presetDate) {
    set({ eventModalState: { open: true, mode: 'create', presetDate } });
  },
  openEditEvent(eventId) {
    set({ eventModalState: { open: true, mode: 'edit', eventId } });
  },
  closeEventModal() { set({ eventModalState: { open: false } }); }
}));
```

- [ ] **Step 5: Run tests — expect pass**

```bash
pnpm test:run planner
```

Expected: PASS — 7 tests.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(stores): Zustand planner + ui stores with debounced save"
```

---

## Task 8: Welcome Screen

**Files:**
- Create: `src/components/welcome/Welcome.tsx`
- Create: `src/components/welcome/Welcome.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing component test**

`src/components/welcome/Welcome.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Welcome } from './Welcome';

beforeEach(() => localStorage.clear());

describe('Welcome', () => {
  it('shows "Neuen Jahresplan erstellen" button', async () => {
    render(<Welcome onCreateNew={() => {}} onOpenDoc={() => {}} onImportJson={() => {}} />);
    expect(await screen.findByRole('button', { name: /Neuen Jahresplan/i })).toBeInTheDocument();
  });

  it('shows JSON-Backup-Button', async () => {
    render(<Welcome onCreateNew={() => {}} onOpenDoc={() => {}} onImportJson={() => {}} />);
    expect(await screen.findByRole('button', { name: /JSON-Backup laden/i })).toBeInTheDocument();
  });

  it('fires onCreateNew on click', async () => {
    const onCreateNew = vi.fn();
    render(<Welcome onCreateNew={onCreateNew} onOpenDoc={() => {}} onImportJson={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: /Neuen Jahresplan/i }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it('lists existing docs from storage', async () => {
    localStorage.setItem('curriculr-planner:docs', JSON.stringify(['doc1']));
    localStorage.setItem(
      'curriculr-planner:doc:doc1',
      JSON.stringify({
        version: 1,
        schoolyear: {
          id: 'doc1',
          label: '2026/27',
          firstSchoolDay: '2026-08-24',
          firstTeachingDay: '2026-08-31',
          lastSchoolDay: '2027-07-16',
          holidays: [],
          quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-09'],
          createdAt: '',
          updatedAt: ''
        },
        categories: [],
        events: [],
        annotations: [],
        availableGroups: [],
        meta: { name: 'Jahresplan 2026/27', lastSaved: '2026-05-26T10:00:00Z' }
      })
    );
    render(<Welcome onCreateNew={() => {}} onOpenDoc={() => {}} onImportJson={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/Jahresplan 2026\/27/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
pnpm test:run Welcome
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/welcome/Welcome.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { storage, type DocSummary } from '@/lib/storage';
import { toast } from 'sonner';

interface Props {
  onCreateNew(): void;
  onOpenDoc(id: string): void;
  onImportJson(doc: import('@/types').PlannerDocument): void;
}

export function Welcome({ onCreateNew, onOpenDoc, onImportJson }: Props) {
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storage.listDocs().then(setDocs);
  }, []);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const doc = await storage.importJson(text);
      onImportJson(doc);
      toast.success('Backup geladen');
    } catch (err) {
      toast.error('Backup ungültig: ' + (err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full p-10 shadow-[var(--shadow-card)]">
        <div className="text-center mb-8">
          <img src="/curriculr-logo.svg" alt="Curriculr" className="h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-[var(--color-primary-900)]">Planner</h1>
          <p className="text-[var(--color-text-muted)] mt-2">
            Jahresterminplan für die Schulleitung
          </p>
        </div>

        {docs.length > 0 && (
          <div className="mb-8">
            <div className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">
              Gespeicherte Pläne
            </div>
            <ul className="space-y-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-white"
                >
                  <div>
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">
                      {d.eventCount} Termine · Zuletzt {new Date(d.lastSaved).toLocaleString('de-DE')}
                    </div>
                  </div>
                  <Button onClick={() => onOpenDoc(d.id)}>Öffnen</Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={onCreateNew}>
            + Neuen Jahresplan erstellen
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            JSON-Backup laden
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <div className="text-xs text-[var(--color-text-muted)] mt-4 text-center">
            Phase 2: Excel-Import + ICS-Vorjahresplan
          </div>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Wire into `src/App.tsx`**

Replace `App.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { Welcome } from '@/components/welcome/Welcome';
import { storage } from '@/lib/storage';
import { usePlannerStore } from '@/stores/planner';
import type { PlannerDocument, UUID } from '@/types';

type Route = 'loading' | 'welcome' | 'wizard' | 'editor';

export default function App() {
  const [route, setRoute] = useState<Route>('loading');
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
      {route === 'wizard' && <div data-testid="wizard-placeholder">Wizard (Task 9)</div>}
      {route === 'editor' && <div data-testid="editor-placeholder">Editor (Task 12)</div>}
    </>
  );
}
```

- [ ] **Step 5: Run tests + smoke test**

```bash
pnpm test:run Welcome
pnpm dev   # manual check
```

Expected: tests PASS. Browser shows Welcome screen with empty docs list + buttons.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(welcome): Welcome screen with doc list + create/import"
```

---

## Task 9: Wizard Shell + Step 1 (Schoolyear Eckdaten)

**Files:**
- Create: `src/components/wizard/Wizard.tsx`
- Create: `src/components/wizard/Step1Schoolyear.tsx`
- Create: `src/components/wizard/wizard-state.ts`
- Create: `src/components/wizard/Step1Schoolyear.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing test for Step 1 validation**

`src/components/wizard/Step1Schoolyear.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step1Schoolyear } from './Step1Schoolyear';

describe('Step1Schoolyear', () => {
  it('rejects firstTeachingDay before firstSchoolDay', async () => {
    const onNext = vi.fn();
    render(
      <Step1Schoolyear
        initial={{
          label: '2026/27',
          name: 'Jahresplan 2026/27',
          firstSchoolDay: '2026-08-31',
          firstTeachingDay: '2026-08-24',
          lastSchoolDay: '2027-07-16',
          holidays: []
        }}
        onCancel={() => {}}
        onNext={onNext}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Weiter/i }));
    expect(onNext).not.toHaveBeenCalled();
    expect(await screen.findByText(/Erster Unterrichtstag muss ≥ Erster Schultag/i)).toBeInTheDocument();
  });

  it('rejects lastSchoolDay before firstSchoolDay', async () => {
    const onNext = vi.fn();
    render(
      <Step1Schoolyear
        initial={{
          label: '2026/27',
          name: 'X',
          firstSchoolDay: '2026-08-24',
          firstTeachingDay: '2026-08-31',
          lastSchoolDay: '2025-07-16',
          holidays: []
        }}
        onCancel={() => {}}
        onNext={onNext}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Weiter/i }));
    expect(onNext).not.toHaveBeenCalled();
  });

  it('passes valid data to onNext', async () => {
    const onNext = vi.fn();
    render(
      <Step1Schoolyear
        initial={{
          label: '2026/27',
          name: 'Jahresplan 2026/27',
          firstSchoolDay: '2026-08-24',
          firstTeachingDay: '2026-08-31',
          lastSchoolDay: '2027-07-16',
          holidays: []
        }}
        onCancel={() => {}}
        onNext={onNext}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Weiter/i }));
    await waitFor(() => expect(onNext).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
pnpm test:run Step1
```

- [ ] **Step 3: Create wizard state types**

`src/components/wizard/wizard-state.ts`:
```ts
import type { Holiday, Category } from '@/types';

export interface Step1Data {
  label: string;
  name: string;
  firstSchoolDay: string;
  firstTeachingDay: string;
  lastSchoolDay: string;
  holidays: Holiday[];
}

export interface Step2Data {
  quarterBoundaries: [string, string, string];
  categories: Category[];
  availableGroups: string[];
}

export interface WizardState {
  step: 1 | 2 | 3;
  step1?: Step1Data;
  step2?: Step2Data;
}
```

- [ ] **Step 4: Implement `src/components/wizard/Step1Schoolyear.tsx`**

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Step1Data } from './wizard-state';
import type { Holiday } from '@/types';

const DEFAULT_HOLIDAYS = (year: number): Holiday[] => [
  { id: crypto.randomUUID(), label: 'Herbstferien', start: '', end: '' },
  { id: crypto.randomUUID(), label: 'Weihnachtsferien', start: '', end: '' },
  { id: crypto.randomUUID(), label: 'Osterferien', start: '', end: '' },
  { id: crypto.randomUUID(), label: 'Pfingstferien', start: '', end: '' },
  { id: crypto.randomUUID(), label: 'Sommerferien', start: '', end: '' }
];

interface Props {
  initial: Step1Data;
  onCancel(): void;
  onNext(data: Step1Data): void;
}

export function Step1Schoolyear({ initial, onCancel, onNext }: Props) {
  const [data, setData] = useState<Step1Data>(initial);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof Step1Data>(key: K, value: Step1Data[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const updateHoliday = (id: string, patch: Partial<Holiday>) => {
    setData((d) => ({
      ...d,
      holidays: d.holidays.map((h) => (h.id === id ? { ...h, ...patch } : h))
    }));
  };

  const addHoliday = () => {
    setData((d) => ({
      ...d,
      holidays: [...d.holidays, { id: crypto.randomUUID(), label: 'Ferien', start: '', end: '' }]
    }));
  };

  const removeHoliday = (id: string) => {
    setData((d) => ({ ...d, holidays: d.holidays.filter((h) => h.id !== id) }));
  };

  const handleNext = () => {
    if (!data.label.trim()) return setError('Schuljahr-Label erforderlich');
    if (!data.name.trim()) return setError('Plan-Name erforderlich');
    if (!data.firstSchoolDay || !data.firstTeachingDay || !data.lastSchoolDay)
      return setError('Alle Datums-Felder ausfüllen');
    if (data.firstTeachingDay < data.firstSchoolDay)
      return setError('Erster Unterrichtstag muss ≥ Erster Schultag sein');
    if (data.lastSchoolDay <= data.firstSchoolDay)
      return setError('Letzter Schultag muss > Erster Schultag sein');
    // Holiday validation: filled ones must have start ≤ end
    for (const h of data.holidays) {
      if ((h.start && !h.end) || (!h.start && h.end))
        return setError(`Ferien "${h.label}": beide Daten oder keines`);
      if (h.start && h.end && h.start > h.end)
        return setError(`Ferien "${h.label}": Ende muss ≥ Start sein`);
    }
    setError(null);
    onNext({
      ...data,
      holidays: data.holidays.filter((h) => h.start && h.end)
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="label">Schuljahr</Label>
          <Input id="label" value={data.label} onChange={(e) => update('label', e.target.value)} placeholder="2026/27" />
        </div>
        <div>
          <Label htmlFor="name">Plan-Name</Label>
          <Input id="name" value={data.name} onChange={(e) => update('name', e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Eckdaten
        </h3>
        <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
          <Label>Erster Schultag (SW 00)</Label>
          <Input
            type="date"
            value={data.firstSchoolDay}
            onChange={(e) => update('firstSchoolDay', e.target.value)}
          />
          <Label>Erster Unterrichtstag (SW 01)</Label>
          <Input
            type="date"
            value={data.firstTeachingDay}
            onChange={(e) => update('firstTeachingDay', e.target.value)}
          />
          <Label>Letzter Schultag</Label>
          <Input
            type="date"
            value={data.lastSchoolDay}
            onChange={(e) => update('lastSchoolDay', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Ferien
        </h3>
        {data.holidays.map((h) => (
          <div key={h.id} className="grid grid-cols-[160px_1fr_1fr_auto] gap-2 items-center">
            <Input
              value={h.label}
              onChange={(e) => updateHoliday(h.id, { label: e.target.value })}
              placeholder="Label"
            />
            <Input type="date" value={h.start} onChange={(e) => updateHoliday(h.id, { start: e.target.value })} />
            <Input type="date" value={h.end} onChange={(e) => updateHoliday(h.id, { end: e.target.value })} />
            <Button variant="ghost" size="icon" onClick={() => removeHoliday(h.id)} title="Entfernen">
              ✕
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addHoliday}>
          + Ferien-Block
        </Button>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button onClick={handleNext}>Weiter →</Button>
      </div>
    </div>
  );
}

export { DEFAULT_HOLIDAYS };
```

- [ ] **Step 5: Implement `src/components/wizard/Wizard.tsx` (shell)**

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Step1Schoolyear } from './Step1Schoolyear';
import { DEFAULT_HOLIDAYS } from './Step1Schoolyear';
import type { Step1Data, Step2Data } from './wizard-state';
import type { PlannerDocument } from '@/types';

interface Props {
  onCancel(): void;
  onComplete(doc: PlannerDocument): void;
}

const currentSchoolyearLabel = () => {
  const y = new Date().getFullYear();
  return `${y}/${(y + 1).toString().slice(-2)}`;
};

export function Wizard({ onCancel, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [step1, setStep1] = useState<Step1Data>({
    label: currentSchoolyearLabel(),
    name: `Jahresplan ${currentSchoolyearLabel()}`,
    firstSchoolDay: '',
    firstTeachingDay: '',
    lastSchoolDay: '',
    holidays: DEFAULT_HOLIDAYS(new Date().getFullYear())
  });
  const [step2, setStep2] = useState<Step2Data | null>(null);
  void step2; void setStep2; void onComplete;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogTitle className="sr-only">Setup-Wizard</DialogTitle>
        <div className="flex items-center gap-3 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= s ? 'bg-[var(--color-primary-700)] text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
          <div className="ml-3 text-sm text-[var(--color-text-muted)]">Schritt {step} von 3</div>
        </div>

        {step === 1 && (
          <Step1Schoolyear
            initial={step1}
            onCancel={onCancel}
            onNext={(data) => {
              setStep1(data);
              setStep(2);
            }}
          />
        )}
        {step === 2 && <div>Step 2 (Task 10)</div>}
        {step === 3 && <div>Step 3 (Task 11)</div>}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Wire into `src/App.tsx`**

Replace the `route === 'wizard'` line:
```tsx
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
```

Add import: `import { Wizard } from '@/components/wizard/Wizard';`

- [ ] **Step 7: Run tests + smoke test**

```bash
pnpm test:run Step1
pnpm dev
```

Expected: tests PASS. Welcome → click "+ Neuen Jahresplan" → Wizard opens on Step 1. Form validates.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat(wizard): shell + Step 1 (schoolyear Eckdaten + Ferien)"
```

---

## Task 10: Wizard Step 2 (Quartal-Grenzen + Kategorien + Gruppen)

**Files:**
- Create: `src/components/wizard/Step2Categories.tsx`
- Create: `src/components/wizard/Step2Categories.test.tsx`
- Modify: `src/components/wizard/Wizard.tsx`

- [ ] **Step 1: Write failing test**

`src/components/wizard/Step2Categories.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step2Categories } from './Step2Categories';
import { createEmptyDoc } from '@/stores/planner';

describe('Step2Categories', () => {
  it('renders 7 default categories', () => {
    const doc = createEmptyDoc('X', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    render(
      <Step2Categories
        initial={{
          quarterBoundaries: ['', '', ''],
          categories: doc.categories,
          availableGroups: doc.availableGroups
        }}
        onBack={() => {}}
        onNext={() => {}}
      />
    );
    expect(screen.getAllByPlaceholderText(/Label/i)).toHaveLength(7);
  });

  it('rejects empty quarter boundaries', async () => {
    const onNext = vi.fn();
    const doc = createEmptyDoc('X', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    render(
      <Step2Categories
        initial={{
          quarterBoundaries: ['', '', ''],
          categories: doc.categories,
          availableGroups: doc.availableGroups
        }}
        onBack={() => {}}
        onNext={onNext}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Weiter/i }));
    expect(onNext).not.toHaveBeenCalled();
  });

  it('adds + removes a group chip', async () => {
    const doc = createEmptyDoc('X', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    render(
      <Step2Categories
        initial={{
          quarterBoundaries: ['', '', ''],
          categories: doc.categories,
          availableGroups: doc.availableGroups
        }}
        onBack={() => {}}
        onNext={() => {}}
      />
    );
    const input = screen.getByPlaceholderText(/Neue Gruppe/i);
    await userEvent.type(input, 'Sek III');
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('Sek III')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `src/components/wizard/Step2Categories.tsx`**

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Step2Data } from './wizard-state';
import type { Category } from '@/types';

interface Props {
  initial: Step2Data;
  onBack(): void;
  onNext(data: Step2Data): void;
}

export function Step2Categories({ initial, onBack, onNext }: Props) {
  const [data, setData] = useState<Step2Data>(initial);
  const [groupInput, setGroupInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateCat = (id: string, patch: Partial<Category>) => {
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c))
    }));
  };

  const addCat = () => {
    setData((d) => ({
      ...d,
      categories: [
        ...d.categories,
        { id: crypto.randomUUID(), label: 'Neue Kategorie', color: '#0058A0', slug: `neu-${Date.now()}`, keywords: [] }
      ]
    }));
  };

  const removeCat = (id: string) => {
    setData((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }));
  };

  const addGroup = () => {
    const v = groupInput.trim();
    if (!v || data.availableGroups.includes(v)) return;
    setData((d) => ({ ...d, availableGroups: [...d.availableGroups, v] }));
    setGroupInput('');
  };

  const removeGroup = (g: string) => {
    setData((d) => ({ ...d, availableGroups: d.availableGroups.filter((x) => x !== g) }));
  };

  const updateQB = (i: 0 | 1 | 2, value: string) => {
    setData((d) => {
      const qb = [...d.quarterBoundaries] as [string, string, string];
      qb[i] = value;
      return { ...d, quarterBoundaries: qb };
    });
  };

  const handleNext = () => {
    if (data.quarterBoundaries.some((q) => !q)) return setError('Alle 3 Quartal-Grenzen erforderlich');
    if (data.quarterBoundaries[0] >= data.quarterBoundaries[1]) return setError('Q1-Ende < Q2-Ende');
    if (data.quarterBoundaries[1] >= data.quarterBoundaries[2]) return setError('Q2-Ende < Q3-Ende');
    if (data.categories.some((c) => !c.label.trim())) return setError('Kategorie-Labels erforderlich');
    setError(null);
    onNext(data);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Quartal-Grenzen
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Q1-Ende</Label>
            <Input type="date" value={data.quarterBoundaries[0]} onChange={(e) => updateQB(0, e.target.value)} />
          </div>
          <div>
            <Label>Q2-Ende</Label>
            <Input type="date" value={data.quarterBoundaries[1]} onChange={(e) => updateQB(1, e.target.value)} />
          </div>
          <div>
            <Label>Q3-Ende</Label>
            <Input type="date" value={data.quarterBoundaries[2]} onChange={(e) => updateQB(2, e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Kategorien
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--color-text-muted)]">
              <th className="text-left py-2">Label</th>
              <th className="w-12">Farbe</th>
              <th className="text-left">Stichwörter (kommasepariert)</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {data.categories.map((c) => (
              <tr key={c.id}>
                <td className="py-1 pr-2">
                  <Input
                    placeholder="Label"
                    value={c.label}
                    onChange={(e) => updateCat(c.id, { label: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="color"
                    value={c.color}
                    onChange={(e) => updateCat(c.id, { color: e.target.value })}
                    className="w-10 h-9 rounded border cursor-pointer"
                  />
                </td>
                <td className="py-1 pr-2">
                  <Input
                    value={c.keywords.join(', ')}
                    onChange={(e) =>
                      updateCat(c.id, {
                        keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      })
                    }
                  />
                </td>
                <td className="py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCat(c.id)}
                    disabled={c.slug === 'sondertag'}
                    title={c.slug === 'sondertag' ? 'System-Kategorie (nicht löschbar)' : 'Löschen'}
                  >
                    ✕
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button variant="outline" size="sm" onClick={addCat}>+ Kategorie</Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Gruppen
        </h3>
        <div className="flex flex-wrap gap-2">
          {data.availableGroups.map((g) => (
            <span
              key={g}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)] text-sm"
            >
              {g}
              <button onClick={() => removeGroup(g)} className="hover:text-red-600" aria-label={`${g} entfernen`}>
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Neue Gruppe (Enter zum Hinzufügen)"
            value={groupInput}
            onChange={(e) => setGroupInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGroup())}
          />
          <Button variant="outline" onClick={addGroup}>Hinzufügen</Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onBack}>← Zurück</Button>
        <Button onClick={handleNext}>Weiter →</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update Wizard.tsx to wire Step 2**

Modify `src/components/wizard/Wizard.tsx`:

Replace the body to maintain `step2` state and wire Step 2:
```tsx
import { Step2Categories } from './Step2Categories';
import { createEmptyDoc } from '@/stores/planner';
// ...

const [step2, setStep2] = useState<Step2Data>(() => {
  const skeleton = createEmptyDoc('', '', '', '', '');
  return {
    quarterBoundaries: ['', '', ''],
    categories: skeleton.categories,
    availableGroups: skeleton.availableGroups
  };
});

// In render, replace step 2:
{step === 2 && (
  <Step2Categories
    initial={step2}
    onBack={() => setStep(1)}
    onNext={(data) => {
      setStep2(data);
      setStep(3);
    }}
  />
)}
```

- [ ] **Step 5: Run tests + smoke**

```bash
pnpm test:run Step2
pnpm dev
```

Expected: tests PASS. Wizard step 2 reachable, all 7 categories shown, groups editable.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(wizard): Step 2 — quarter boundaries + categories + groups"
```

---

## Task 11: Wizard Step 3 (Review + Plan Creation)

**Files:**
- Create: `src/components/wizard/Step3Review.tsx`
- Create: `src/components/wizard/Step3Review.test.tsx`
- Modify: `src/components/wizard/Wizard.tsx`

- [ ] **Step 1: Failing test**

`src/components/wizard/Step3Review.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step3Review } from './Step3Review';
import { createEmptyDoc } from '@/stores/planner';

describe('Step3Review', () => {
  it('shows computed schoolweek count', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.schoolyear.holidays = [
      { id: 'h1', label: 'Herbst', start: '2026-10-19', end: '2026-10-30' }
    ];
    doc.schoolyear.quarterBoundaries = ['2026-10-30', '2027-01-29', '2027-04-09'];
    render(<Step3Review doc={doc} onBack={() => {}} onCreate={() => {}} />);
    const text = screen.getByText(/Schulwochen/i);
    expect(text).toBeInTheDocument();
  });

  it('fires onCreate when button clicked', async () => {
    const onCreate = vi.fn();
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.schoolyear.quarterBoundaries = ['2026-10-30', '2027-01-29', '2027-04-09'];
    render(<Step3Review doc={doc} onBack={() => {}} onCreate={onCreate} />);
    await userEvent.click(screen.getByRole('button', { name: /Plan erstellen/i }));
    expect(onCreate).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `src/components/wizard/Step3Review.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { computeSchoolweeks } from '@/lib/schoolweeks';
import type { PlannerDocument } from '@/types';

interface Props {
  doc: PlannerDocument;
  onBack(): void;
  onCreate(): void;
}

export function Step3Review({ doc, onBack, onCreate }: Props) {
  const weeks = computeSchoolweeks(doc.schoolyear);
  const sy = doc.schoolyear;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Zusammenfassung</h3>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <dt className="text-[var(--color-text-muted)]">Schuljahr</dt>
        <dd className="font-medium">{sy.label}</dd>

        <dt className="text-[var(--color-text-muted)]">Plan-Name</dt>
        <dd className="font-medium">{doc.meta.name}</dd>

        <dt className="text-[var(--color-text-muted)]">Erster Schultag</dt>
        <dd>{sy.firstSchoolDay}</dd>

        <dt className="text-[var(--color-text-muted)]">Erster Unterrichtstag</dt>
        <dd>{sy.firstTeachingDay}</dd>

        <dt className="text-[var(--color-text-muted)]">Letzter Schultag</dt>
        <dd>{sy.lastSchoolDay}</dd>

        <dt className="text-[var(--color-text-muted)]">Ferien-Blöcke</dt>
        <dd>{sy.holidays.length}</dd>

        <dt className="text-[var(--color-text-muted)]">Quartal-Grenzen</dt>
        <dd>{sy.quarterBoundaries.join(' · ')}</dd>

        <dt className="text-[var(--color-text-muted)]">Schulwochen</dt>
        <dd className="font-semibold text-[var(--color-primary-700)]">
          {weeks.length} (SW 00 – SW {weeks.length - 1})
        </dd>

        <dt className="text-[var(--color-text-muted)]">Kategorien</dt>
        <dd>{doc.categories.length}</dd>

        <dt className="text-[var(--color-text-muted)]">Gruppen</dt>
        <dd>{doc.availableGroups.length}</dd>
      </dl>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onBack}>← Zurück</Button>
        <Button onClick={onCreate} size="lg">Plan erstellen →</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire Step 3 in Wizard**

Modify `src/components/wizard/Wizard.tsx` to compute a preview-doc for Step 3 and call `onComplete`:

```tsx
import { Step3Review } from './Step3Review';

// ... in the render:
{step === 3 && step1 && step2 && (() => {
  const previewDoc = createEmptyDoc(
    step1.name,
    step1.label,
    step1.firstSchoolDay,
    step1.firstTeachingDay,
    step1.lastSchoolDay
  );
  previewDoc.schoolyear.holidays = step1.holidays;
  previewDoc.schoolyear.quarterBoundaries = [...step2.quarterBoundaries];
  previewDoc.categories = step2.categories;
  previewDoc.availableGroups = step2.availableGroups;
  return (
    <Step3Review
      doc={previewDoc}
      onBack={() => setStep(2)}
      onCreate={() => onComplete(previewDoc)}
    />
  );
})()}
```

- [ ] **Step 5: Run tests + smoke**

```bash
pnpm test:run Step3
pnpm dev
```

Expected: full wizard flow works end-to-end. After "Plan erstellen" → editor-placeholder appears.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(wizard): Step 3 review + end-to-end plan creation"
```

---

## Task 12: Editor Shell (Header + Body Layout)

**Files:**
- Create: `src/components/editor/Editor.tsx`
- Create: `src/components/editor/EditorHeader.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement `src/components/editor/EditorHeader.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';

interface Props {
  onOpenExport(): void;
  onSwitchPlan(): void;
}

export function EditorHeader({ onOpenExport, onSwitchPlan }: Props) {
  const doc = usePlannerStore((s) => s.doc);
  const savingState = usePlannerStore((s) => s.savingState);
  const openSettings = useUiStore((s) => s.openSettings);

  if (!doc) return null;

  const stateLabel = {
    idle: '● Gespeichert',
    saving: '○ Speichert…',
    saved: '● Gespeichert',
    error: '⚠ Fehler beim Speichern'
  }[savingState];

  return (
    <header className="bg-[var(--color-primary-900)] text-white">
      <div className="px-6 py-3 flex items-center gap-4">
        <img src="/curriculr-logo.svg" alt="Curriculr" className="h-6" />
        <button onClick={onSwitchPlan} className="text-sm hover:opacity-80 flex items-center gap-1">
          {doc.meta.name} <span className="opacity-60">▼</span>
        </button>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-full bg-white/10">{stateLabel}</span>
          <div className="flex items-center bg-white/10 rounded-full overflow-hidden">
            <span className="px-3 py-1 bg-[var(--color-accent-warning)] text-black font-semibold rounded-full">
              Quartal
            </span>
            <span className="px-3 py-1 opacity-50 cursor-not-allowed" title="Phase 2">
              Schuljahr
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={openSettings} className="text-white hover:bg-white/10">
            <SettingsIcon className="w-4 h-4" />
          </Button>
          <Button onClick={onOpenExport} className="bg-[var(--color-accent-success)] hover:bg-emerald-700">
            Export ↓
          </Button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Implement `src/components/editor/Editor.tsx` (stub)**

```tsx
import { useState } from 'react';
import { EditorHeader } from './EditorHeader';

interface Props {
  onSwitchPlan(): void;
}

export function Editor({ onSwitchPlan }: Props) {
  const [exportOpen, setExportOpen] = useState(false);
  void exportOpen; void setExportOpen;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-body)]">
      <EditorHeader onOpenExport={() => setExportOpen(true)} onSwitchPlan={onSwitchPlan} />
      <div className="flex-1 p-6">
        <div className="bg-white rounded-lg p-6 text-center text-[var(--color-text-muted)]">
          Toolbar + Kalender folgen in Task 13–14
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire into `src/App.tsx`**

Replace `editor-placeholder` with `<Editor onSwitchPlan={() => setRoute('welcome')} />`. Add import.

- [ ] **Step 4: Smoke test**

```bash
pnpm dev
```

Verify: after wizard completion, editor header is visible with logo, plan name, save indicator, settings + export buttons.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(editor): shell + header with save indicator"
```

---

## Task 13: Editor Toolbar (Quartal-Tabs + Add-Termin)

**Files:**
- Create: `src/components/editor/EditorToolbar.tsx`
- Modify: `src/components/editor/Editor.tsx`

- [ ] **Step 1: Implement `src/components/editor/EditorToolbar.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export function EditorToolbar() {
  const doc = usePlannerStore((s) => s.doc);
  const currentQuarter = useUiStore((s) => s.currentQuarter);
  const setQuarter = useUiStore((s) => s.setQuarter);
  const toggleNotes = useUiStore((s) => s.toggleNotesSidebar);
  const openCreate = useUiStore((s) => s.openCreateEvent);

  if (!doc) return null;

  const sy = doc.schoolyear;
  const qStarts: string[] = [
    sy.firstSchoolDay,
    sy.quarterBoundaries[0],
    sy.quarterBoundaries[1],
    sy.quarterBoundaries[2]
  ];
  const qEnds: string[] = [
    sy.quarterBoundaries[0],
    sy.quarterBoundaries[1],
    sy.quarterBoundaries[2],
    sy.lastSchoolDay
  ];

  const fmtRange = (i: number) => {
    const s = parseISO(qStarts[i]);
    const e = parseISO(qEnds[i]);
    return `${format(s, 'MMM yyyy', { locale: de })} – ${format(e, 'MMM yyyy', { locale: de })}`;
  };

  return (
    <div className="bg-white border-b px-6 py-2 flex items-center gap-2">
      {[1, 2, 3, 4].map((q) => (
        <button
          key={q}
          onClick={() => setQuarter(q as 1 | 2 | 3 | 4)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
            currentQuarter === q
              ? 'bg-[var(--color-primary-900)] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Q{q}
        </button>
      ))}
      <span className="ml-3 text-sm text-[var(--color-text-muted)]">{fmtRange(currentQuarter - 1)}</span>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={toggleNotes}>
          📝 Notizen
        </Button>
        <Button size="sm" onClick={() => openCreate()}>
          + Termin
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add Toolbar to Editor.tsx**

Modify `src/components/editor/Editor.tsx`:
```tsx
import { EditorToolbar } from './EditorToolbar';

// In return, after EditorHeader:
<EditorToolbar />
```

- [ ] **Step 3: Smoke test**

```bash
pnpm dev
```

Verify: Toolbar with Q1-Q4 tabs visible, current month range shown, click changes selected tab.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(editor): toolbar with quarter tabs + notes-toggle + add-event"
```

---

## Task 14: Quarter Calendar (FullCalendar Integration)

**Files:**
- Create: `src/lib/colors.ts`
- Create: `src/lib/colors.test.ts`
- Create: `src/components/editor/EventChip.tsx`
- Create: `src/components/editor/QuarterCalendar.tsx`
- Modify: `src/components/editor/Editor.tsx`

- [ ] **Step 1: Failing color tests**

`src/lib/colors.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { contrastColor, pastelize } from './colors';

describe('contrastColor', () => {
  it('returns black on light background', () => {
    expect(contrastColor('#FFFFFF')).toBe('#000000');
  });
  it('returns white on dark background', () => {
    expect(contrastColor('#00345C')).toBe('#FFFFFF');
  });
});

describe('pastelize', () => {
  it('lightens a strong color', () => {
    const result = pastelize('#FF0000');
    expect(result).toMatch(/^#[0-9A-F]{6}$/i);
    expect(result).not.toBe('#FF0000');
  });
});
```

- [ ] **Step 2: Implement `src/lib/colors.ts`**

```ts
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function contrastColor(bgHex: string): '#000000' | '#FFFFFF' {
  const [r, g, b] = hexToRgb(bgHex);
  const norm = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

export function pastelize(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(c * 0.12 + 255 * 0.88);
  return rgbToHex(mix(r), mix(g), mix(b));
}
```

- [ ] **Step 3: Run + verify pass**

```bash
pnpm test:run colors
```

Expected: PASS.

- [ ] **Step 4: Implement `src/components/editor/EventChip.tsx`**

```tsx
import { pastelize } from '@/lib/colors';
import type { Category } from '@/types';

interface Props {
  title: string;
  category: Category;
}

export function EventChip({ title, category }: Props) {
  return (
    <div
      className="text-xs px-1.5 py-0.5 rounded truncate"
      style={{
        backgroundColor: pastelize(category.color),
        color: '#111827',
        borderLeft: `3px solid ${category.color}`
      }}
      title={title}
    >
      {title}
    </div>
  );
}
```

- [ ] **Step 5: Implement `src/components/editor/QuarterCalendar.tsx`**

```tsx
import { useMemo, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { isHoliday, isWeekend } from '@/lib/schoolweeks';
import { pastelize } from '@/lib/colors';
import { toast } from 'sonner';
import { parseISO, addMonths, format } from 'date-fns';

export function QuarterCalendar() {
  const doc = usePlannerStore((s) => s.doc);
  const updateEvent = usePlannerStore((s) => s.updateEvent);
  const currentQuarter = useUiStore((s) => s.currentQuarter);
  const openEdit = useUiStore((s) => s.openEditEvent);
  const openCreate = useUiStore((s) => s.openCreateEvent);
  const calRef = useRef<FullCalendar | null>(null);

  const fcEvents = useMemo(() => {
    if (!doc) return [];
    return doc.events.map((e) => {
      const cat = doc.categories.find((c) => c.id === e.categoryId);
      const color = cat?.color ?? '#0058A0';
      const bg = pastelize(color);
      return {
        id: e.id,
        title: e.title,
        start: e.allDay ? e.start : `${e.start}T${e.startTime ?? '00:00'}`,
        end: e.allDay ? e.end : `${e.end}T${e.endTime ?? '23:59'}`,
        allDay: e.allDay,
        backgroundColor: bg,
        borderColor: color,
        textColor: '#111827'
      };
    });
  }, [doc]);

  const quarterStart = useMemo(() => {
    if (!doc) return new Date();
    const sy = doc.schoolyear;
    const starts = [sy.firstSchoolDay, sy.quarterBoundaries[0], sy.quarterBoundaries[1], sy.quarterBoundaries[2]];
    return parseISO(starts[currentQuarter - 1]);
  }, [doc, currentQuarter]);

  useEffect(() => {
    if (calRef.current) {
      calRef.current.getApi().gotoDate(quarterStart);
    }
  }, [quarterStart]);

  if (!doc) return null;

  return (
    <div className="bg-white">
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={quarterStart}
        firstDay={1}
        locale="de"
        headerToolbar={{ left: 'prev,next', center: 'title', right: 'today' }}
        height="auto"
        dayMaxEvents={3}
        editable
        events={fcEvents}
        eventClick={(info) => openEdit(info.event.id)}
        dateClick={(info) => openCreate(format(info.date, 'yyyy-MM-dd'))}
        eventDrop={(info) => {
          const id = info.event.id;
          const newStart = info.event.startStr.slice(0, 10);
          const newEnd = info.event.endStr ? info.event.endStr.slice(0, 10) : newStart;
          if (isHoliday(newStart, doc.schoolyear.holidays)) {
            toast.warning('Termin in Ferien — bewusst gewollt?');
          } else if (isWeekend(newStart)) {
            toast.warning('Termin auf Wochenende — bewusst gewollt?');
          }
          updateEvent(id, { start: newStart, end: newEnd });
        }}
        dayCellClassNames={(arg) => {
          const iso = format(arg.date, 'yyyy-MM-dd');
          const cls = [];
          if (isWeekend(iso)) cls.push('bg-slate-50');
          if (isHoliday(iso, doc.schoolyear.holidays)) cls.push('gtp-holiday-cell');
          return cls;
        }}
      />
      <style>{`
        .gtp-holiday-cell {
          background-image: repeating-linear-gradient(
            45deg,
            rgba(0,0,0,0.04),
            rgba(0,0,0,0.04) 6px,
            transparent 6px,
            transparent 12px
          );
        }
        .fc-daygrid-day { min-height: 96px; }
        .fc .fc-toolbar-title { font-size: 1rem; color: var(--color-primary-900); }
        .fc-button-primary {
          background: var(--color-primary-100) !important;
          border-color: var(--color-primary-100) !important;
          color: var(--color-primary-900) !important;
        }
        .fc-button-primary:hover { background: #c7e2ff !important; }
      `}</style>
    </div>
  );
}

// Optionally suppress unused warning:
void addMonths;
```

- [ ] **Step 6: Add QuarterCalendar to Editor.tsx**

```tsx
import { QuarterCalendar } from './QuarterCalendar';

// In return body:
<div className="flex-1 p-6">
  <QuarterCalendar />
</div>
```

- [ ] **Step 7: Smoke test**

```bash
pnpm dev
```

Verify: Calendar renders for current quarter, day cells ~96px tall, weekends greyed, holiday days have hatch-pattern. Click day → modal stub fires (will be wired in Task 16).

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat(editor): FullCalendar quarter view with colors + holiday hatching + drag-drop"
```

---

## Task 15: Day Cell Customization (Note Icon per Week)

**Files:**
- Create: `src/components/editor/DayCellContent.tsx`
- Modify: `src/components/editor/QuarterCalendar.tsx`

- [ ] **Step 1: Implement `src/components/editor/DayCellContent.tsx`**

```tsx
import { format, getDay, parseISO } from 'date-fns';
import { findSchoolweek, type SchoolweekRange } from '@/lib/schoolweeks';
import type { WeekAnnotation } from '@/types';

interface Props {
  date: Date;
  weeks: SchoolweekRange[];
  annotations: WeekAnnotation[];
  onNoteClick(schoolweek: number): void;
}

export function DayCellContent({ date, weeks, annotations, onNoteClick }: Props) {
  const iso = format(date, 'yyyy-MM-dd');
  const isMonday = getDay(date) === 1;
  const dayNum = parseISO(iso).getDate();

  if (!isMonday) {
    return <span className="text-sm">{dayNum}</span>;
  }

  const sw = findSchoolweek(iso, weeks);
  if (!sw) {
    return <span className="text-sm">{dayNum}</span>;
  }

  const annotation = annotations.find((a) => a.schoolweek === sw.index);
  const hasNote = !!annotation && annotation.text.trim().length > 0;

  return (
    <span className="flex items-center gap-1.5 text-sm">
      <span>{dayNum}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNoteClick(sw.index);
        }}
        className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs cursor-pointer ${
          hasNote
            ? 'bg-[var(--color-accent-warning)] text-black'
            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
        }`}
        title={hasNote ? `SW ${sw.index}: ${annotation!.text.slice(0, 50)}` : `Anmerkung zu SW ${sw.index} hinzufügen`}
      >
        📝
      </button>
    </span>
  );
}
```

- [ ] **Step 2: Integrate `dayCellContent` callback in QuarterCalendar**

Modify `src/components/editor/QuarterCalendar.tsx`:

Add imports + memo for weeks + render callback:
```tsx
import { computeSchoolweeks } from '@/lib/schoolweeks';
import { DayCellContent } from './DayCellContent';

// inside component:
const weeks = useMemo(() => (doc ? computeSchoolweeks(doc.schoolyear) : []), [doc]);
const [notePopoverSw, setNotePopoverSw] = useState<number | null>(null);
// (Popover wiring comes in Task 19)

// In FullCalendar props add:
dayCellContent={(arg) => (
  <DayCellContent
    date={arg.date}
    weeks={weeks}
    annotations={doc.annotations}
    onNoteClick={setNotePopoverSw}
  />
)}
```

(Add `useState` import; the popover wiring closes the loop in Task 19.)

- [ ] **Step 3: Smoke test**

```bash
pnpm dev
```

Verify: Each Monday-cell shows day number + grey 📝 icon. No errors in console.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(editor): day-cell note icons on Mondays per schoolweek"
```

---

## Task 16: Event Modal (Create + Edit)

**Files:**
- Create: `src/components/event-modal/EventModal.tsx`
- Create: `src/components/event-modal/GroupChipsInput.tsx`
- Modify: `src/components/editor/Editor.tsx`

- [ ] **Step 1: Implement `src/components/event-modal/GroupChipsInput.tsx`**

```tsx
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface Props {
  available: string[];
  value: string[];
  onChange(next: string[]): void;
}

export function GroupChipsInput({ available, value, onChange }: Props) {
  const [input, setInput] = useState('');

  const toggle = (g: string) => {
    if (value.includes(g)) onChange(value.filter((x) => x !== g));
    else onChange([...value, g]);
  };

  const addCustom = () => {
    const v = input.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setInput('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {available.map((g) => (
          <button
            type="button"
            key={g}
            onClick={() => toggle(g)}
            className={`px-3 py-1 rounded-full text-sm transition ${
              value.includes(g)
                ? 'bg-[var(--color-primary-700)] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          placeholder="Eigene Gruppe (Enter)"
          className="text-sm"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/components/event-modal/EventModal.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GroupChipsInput } from './GroupChipsInput';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import type { PlanEvent } from '@/types';
import { toast } from 'sonner';

function newUuid() {
  return crypto.randomUUID();
}

function matchCategoryByKeywords(title: string, cats: { id: string; keywords: string[] }[]): string | null {
  const lower = title.toLowerCase();
  for (const c of cats) {
    for (const kw of c.keywords) {
      if (kw && lower.includes(kw.toLowerCase())) return c.id;
    }
  }
  return null;
}

export function EventModal() {
  const doc = usePlannerStore((s) => s.doc);
  const addEvent = usePlannerStore((s) => s.addEvent);
  const updateEvent = usePlannerStore((s) => s.updateEvent);
  const deleteEvent = usePlannerStore((s) => s.deleteEvent);
  const state = useUiStore((s) => s.eventModalState);
  const close = useUiStore((s) => s.closeEventModal);

  const editing = state.open && state.mode === 'edit'
    ? doc?.events.find((e) => e.id === state.eventId) ?? null
    : null;

  const [form, setForm] = useState<PlanEvent | null>(null);

  useEffect(() => {
    if (!state.open || !doc) {
      setForm(null);
      return;
    }
    if (state.mode === 'edit' && editing) {
      setForm({ ...editing });
    } else {
      const presetDate = (state.mode === 'create' && state.presetDate) || new Date().toISOString().slice(0, 10);
      setForm({
        id: newUuid(),
        title: '',
        start: presetDate,
        end: presetDate,
        startTime: '08:00',
        endTime: '09:00',
        allDay: true,
        categoryId: doc.categories[0]?.id ?? '',
        notes: '',
        location: '',
        groups: []
      });
    }
  }, [state, doc, editing]);

  if (!doc || !form || !state.open) return null;

  const update = <K extends keyof PlanEvent>(k: K, v: PlanEvent[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };

  const handleTitle = (title: string) => {
    const matched = matchCategoryByKeywords(title, doc.categories);
    setForm((f) => (f ? { ...f, title, categoryId: matched ?? f.categoryId } : f));
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error('Titel erforderlich');
      return;
    }
    if (form.end < form.start) {
      toast.error('Endedatum muss ≥ Startdatum sein');
      return;
    }
    if (!form.allDay && (!form.startTime || !form.endTime)) {
      toast.error('Zeit erforderlich wenn nicht ganztägig');
      return;
    }
    if (state.mode === 'edit' && editing) {
      updateEvent(editing.id, form);
    } else {
      addEvent(form);
    }
    close();
  };

  const handleDelete = () => {
    if (state.mode === 'edit' && editing) {
      if (confirm(`Termin "${editing.title}" wirklich löschen?`)) {
        deleteEvent(editing.id);
        close();
      }
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg" onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave();
      }}>
        <DialogTitle>{state.mode === 'edit' ? 'Termin bearbeiten' : 'Neuer Termin'}</DialogTitle>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              autoFocus
              value={form.title}
              onChange={(e) => handleTitle(e.target.value)}
              placeholder="z.B. Zeugniskonferenz Jg 10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Startdatum</Label>
              <Input type="date" value={form.start} onChange={(e) => update('start', e.target.value)} />
            </div>
            <div>
              <Label>Endedatum</Label>
              <Input type="date" value={form.end} onChange={(e) => update('end', e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={form.allDay} onCheckedChange={(v) => update('allDay', v === true)} />
            Ganztägig
          </label>

          {!form.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Startzeit</Label>
                <Input
                  type="time"
                  value={form.startTime ?? ''}
                  onChange={(e) => update('startTime', e.target.value)}
                />
              </div>
              <div>
                <Label>Endzeit</Label>
                <Input
                  type="time"
                  value={form.endTime ?? ''}
                  onChange={(e) => update('endTime', e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <Label>Kategorie</Label>
            <Select value={form.categoryId} onValueChange={(v) => update('categoryId', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {doc.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-block w-3 h-3 rounded mr-2" style={{ background: c.color }} />
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Standort</Label>
            <Input
              value={form.location ?? ''}
              onChange={(e) => update('location', e.target.value)}
              placeholder="z.B. Aula"
            />
          </div>

          <div>
            <Label>Bemerkung</Label>
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => update('notes', e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <div>
            <Label>Gruppen</Label>
            <GroupChipsInput
              available={doc.availableGroups}
              value={form.groups}
              onChange={(g) => update('groups', g)}
            />
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2">
          {state.mode === 'edit' && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto">
              Löschen
            </Button>
          )}
          <Button variant="ghost" onClick={close}>Abbrechen</Button>
          <Button onClick={handleSave}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Mount EventModal in Editor.tsx**

```tsx
import { EventModal } from '@/components/event-modal/EventModal';

// In return, after QuarterCalendar:
<EventModal />
```

- [ ] **Step 4: Smoke test**

```bash
pnpm dev
```

Verify: Click day in calendar → Modal opens with date prefilled, Title → Kategorie auto-selects via keyword (try "Wandertag"), Save → event appears in calendar. Click existing event → edit mode → Save updates.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(editor): event create + edit modal with keyword-matched category"
```

---

## Task 17: Settings Modal (5 Tabs)

**Files:**
- Create: `src/components/settings/SettingsModal.tsx`
- Create: `src/components/settings/SchoolyearTab.tsx`
- Create: `src/components/settings/CategoriesTab.tsx`
- Create: `src/components/settings/GroupsTab.tsx`
- Create: `src/components/settings/ExportTab.tsx`
- Create: `src/components/settings/AboutTab.tsx`
- Modify: `src/components/editor/Editor.tsx`

- [ ] **Step 1: Implement `src/components/settings/SchoolyearTab.tsx`**

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePlannerStore } from '@/stores/planner';
import type { Holiday } from '@/types';
import { toast } from 'sonner';

export function SchoolyearTab() {
  const doc = usePlannerStore((s) => s.doc);
  const updateSY = usePlannerStore((s) => s.updateSchoolyear);
  const [sy, setSy] = useState(() => doc?.schoolyear);

  if (!doc || !sy) return null;

  const save = () => {
    updateSY(sy);
    toast.success('Schuljahr-Daten gespeichert');
  };

  const updateHol = (id: string, patch: Partial<Holiday>) => {
    setSy({ ...sy, holidays: sy.holidays.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Schuljahr</Label>
          <Input value={sy.label} onChange={(e) => setSy({ ...sy, label: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Erster Schultag</Label>
          <Input type="date" value={sy.firstSchoolDay} onChange={(e) => setSy({ ...sy, firstSchoolDay: e.target.value })} />
        </div>
        <div>
          <Label>Erster Unterrichtstag</Label>
          <Input type="date" value={sy.firstTeachingDay} onChange={(e) => setSy({ ...sy, firstTeachingDay: e.target.value })} />
        </div>
        <div>
          <Label>Letzter Schultag</Label>
          <Input type="date" value={sy.lastSchoolDay} onChange={(e) => setSy({ ...sy, lastSchoolDay: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Ferien</Label>
        <div className="space-y-2 mt-2">
          {sy.holidays.map((h) => (
            <div key={h.id} className="grid grid-cols-[160px_1fr_1fr] gap-2">
              <Input value={h.label} onChange={(e) => updateHol(h.id, { label: e.target.value })} />
              <Input type="date" value={h.start} onChange={(e) => updateHol(h.id, { start: e.target.value })} />
              <Input type="date" value={h.end} onChange={(e) => updateHol(h.id, { end: e.target.value })} />
            </div>
          ))}
        </div>
      </div>
      <Button onClick={save}>Speichern + Schulwochen neu berechnen</Button>
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/components/settings/CategoriesTab.tsx`**

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlannerStore } from '@/stores/planner';
import type { Category } from '@/types';
import { toast } from 'sonner';

export function CategoriesTab() {
  const doc = usePlannerStore((s) => s.doc);
  const updateCategories = usePlannerStore((s) => s.updateCategories);
  const [cats, setCats] = useState<Category[]>(() => doc?.categories ?? []);

  const update = (id: string, patch: Partial<Category>) => {
    setCats(cats.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const save = () => {
    updateCategories(cats);
    toast.success('Kategorien gespeichert');
  };

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-[var(--color-text-muted)]">
            <th className="text-left py-2">Label</th>
            <th className="w-12">Farbe</th>
            <th className="text-left">Stichwörter</th>
          </tr>
        </thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.id}>
              <td className="py-1 pr-2">
                <Input value={c.label} onChange={(e) => update(c.id, { label: e.target.value })} />
              </td>
              <td className="py-1 pr-2">
                <input type="color" value={c.color} onChange={(e) => update(c.id, { color: e.target.value })} className="w-10 h-9 rounded border" />
              </td>
              <td className="py-1 pr-2">
                <Input
                  value={c.keywords.join(', ')}
                  onChange={(e) =>
                    update(c.id, {
                      keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button onClick={save}>Speichern</Button>
    </div>
  );
}
```

- [ ] **Step 3: Implement `src/components/settings/GroupsTab.tsx`**

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlannerStore } from '@/stores/planner';
import { toast } from 'sonner';

export function GroupsTab() {
  const doc = usePlannerStore((s) => s.doc);
  const updateGroups = usePlannerStore((s) => s.updateGroups);
  const [groups, setGroups] = useState<string[]>(() => doc?.availableGroups ?? []);
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (!v || groups.includes(v)) return;
    setGroups([...groups, v]);
    setInput('');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <span key={g} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)] text-sm">
            {g}
            <button onClick={() => setGroups(groups.filter((x) => x !== g))} className="hover:text-red-600">✕</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Neue Gruppe"
        />
        <Button onClick={add}>+ Hinzufügen</Button>
      </div>
      <Button onClick={() => { updateGroups(groups); toast.success('Gruppen gespeichert'); }}>
        Speichern
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Implement `src/components/settings/ExportTab.tsx`**

```tsx
export function ExportTab() {
  return (
    <div className="space-y-3 text-sm">
      <p>Export-Funktionen über das <strong>Export-Menü</strong> oben rechts im Header verfügbar.</p>
      <p className="text-[var(--color-text-muted)]">
        Phase 2: stabile ICS-URL für direkten Plugin-Import via Cloud-Sync.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Implement `src/components/settings/AboutTab.tsx`**

```tsx
export function AboutTab() {
  return (
    <div className="space-y-3 text-sm">
      <h3 className="text-lg font-semibold">Curriculr Planner</h3>
      <p>Version: 1.0.0</p>
      <p className="text-[var(--color-text-muted)]">
        Standalone-Tool zur Erstellung des Jahresterminplans.
      </p>
      <p>
        <a href="https://github.com" className="text-[var(--color-primary-700)] underline" target="_blank" rel="noreferrer">
          Quellcode auf GitHub
        </a>
      </p>
      <p className="text-xs text-[var(--color-text-muted)]">MIT-Lizenz</p>
    </div>
  );
}
```

- [ ] **Step 6: Implement `src/components/settings/SettingsModal.tsx`**

```tsx
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
```

- [ ] **Step 7: Mount in Editor.tsx**

```tsx
import { SettingsModal } from '@/components/settings/SettingsModal';

// In return, after EventModal:
<SettingsModal />
```

- [ ] **Step 8: Smoke test**

```bash
pnpm dev
```

Verify: Settings-Icon in header opens modal, all 5 tabs reachable, edits persist.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat(settings): 5-tab settings modal (schoolyear/categories/groups/export/about)"
```

---

## Task 18: Note Popover

**Files:**
- Create: `src/components/editor/NotePopover.tsx`
- Modify: `src/components/editor/QuarterCalendar.tsx`

- [ ] **Step 1: Implement `src/components/editor/NotePopover.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import type { SchoolweekRange } from '@/lib/schoolweeks';

interface Props {
  schoolweek: number | null;
  week: SchoolweekRange | null;
  onClose(): void;
}

export function NotePopover({ schoolweek, week, onClose }: Props) {
  const doc = usePlannerStore((s) => s.doc);
  const setAnnotation = usePlannerStore((s) => s.setAnnotation);
  const deleteAnnotation = usePlannerStore((s) => s.deleteAnnotation);
  const [text, setText] = useState('');

  useEffect(() => {
    if (schoolweek === null || !doc) return;
    const a = doc.annotations.find((x) => x.schoolweek === schoolweek);
    setText(a?.text ?? '');
  }, [schoolweek, doc]);

  if (schoolweek === null || !week) return null;

  const save = () => {
    if (text.trim()) setAnnotation(schoolweek, text);
    else deleteAnnotation(schoolweek);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Anmerkung SW {schoolweek.toString().padStart(2, '0')}</DialogTitle>
        <p className="text-sm text-[var(--color-text-muted)]">
          {week.startDate} – {week.endDate}
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={500}
          autoFocus
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button onClick={save}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire popover state in QuarterCalendar.tsx**

Replace the `setNotePopoverSw` stub with real popover rendering. Add at the end of the component:
```tsx
import { NotePopover } from './NotePopover';

// after </FullCalendar>:
<NotePopover
  schoolweek={notePopoverSw}
  week={notePopoverSw !== null ? weeks.find((w) => w.index === notePopoverSw) ?? null : null}
  onClose={() => setNotePopoverSw(null)}
/>
```

- [ ] **Step 3: Smoke test**

```bash
pnpm dev
```

Verify: Click 📝-icon on a Monday cell → modal opens with week label. Type → Save → icon turns yellow on calendar. Reopen → text persists.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(editor): note popover per schoolweek"
```

---

## Task 19: Notes Sidebar (List of All Annotations)

**Files:**
- Create: `src/components/editor/NotesSidebar.tsx`
- Modify: `src/components/editor/Editor.tsx`

- [ ] **Step 1: Implement `src/components/editor/NotesSidebar.tsx`**

```tsx
import { useState } from 'react';
import { useUiStore } from '@/stores/ui';
import { usePlannerStore } from '@/stores/planner';
import { computeSchoolweeks } from '@/lib/schoolweeks';
import { NotePopover } from './NotePopover';
import { X } from 'lucide-react';

export function NotesSidebar() {
  const open = useUiStore((s) => s.notesSidebarOpen);
  const toggle = useUiStore((s) => s.toggleNotesSidebar);
  const doc = usePlannerStore((s) => s.doc);
  const [editSw, setEditSw] = useState<number | null>(null);

  if (!open || !doc) return null;

  const weeks = computeSchoolweeks(doc.schoolyear);
  const sorted = [...weeks].sort((a, b) => a.index - b.index);

  return (
    <>
      <aside className="fixed top-0 right-0 h-full w-80 bg-white border-l shadow-lg z-40 flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-primary-900)]">Anmerkungen</h3>
          <button onClick={toggle} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sorted.map((w) => {
            const ann = doc.annotations.find((a) => a.schoolweek === w.index);
            const has = !!ann && ann.text.trim().length > 0;
            return (
              <button
                key={w.index}
                onClick={() => setEditSw(w.index)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  has
                    ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                }`}
              >
                <div className="text-xs font-semibold text-[var(--color-primary-900)]">
                  SW {w.index.toString().padStart(2, '0')} · {w.startDate.slice(5)} – {w.endDate.slice(5)}
                </div>
                <div className={`text-sm mt-1 ${has ? '' : 'italic text-gray-400'}`}>
                  {has ? ann!.text : 'Keine Anmerkung'}
                </div>
              </button>
            );
          })}
        </div>
      </aside>
      <NotePopover
        schoolweek={editSw}
        week={editSw !== null ? sorted.find((w) => w.index === editSw) ?? null : null}
        onClose={() => setEditSw(null)}
      />
    </>
  );
}
```

- [ ] **Step 2: Mount in Editor.tsx**

```tsx
import { NotesSidebar } from './NotesSidebar';

// In return, before closing div:
<NotesSidebar />
```

- [ ] **Step 3: Smoke test**

```bash
pnpm dev
```

Verify: Click "📝 Notizen" toggle in toolbar → sidebar slides in showing all weeks. Click any week → popover opens.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(editor): notes sidebar listing all schoolweeks with annotations"
```

---

## Task 20: ICS Export

**Files:**
- Create: `src/lib/ics-export.ts`
- Create: `src/lib/ics-export.test.ts`

- [ ] **Step 1: Failing tests**

`src/lib/ics-export.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildIcs } from './ics-export';
import { createEmptyDoc } from '@/stores/planner';

describe('buildIcs', () => {
  it('produces valid VCALENDAR header + footer', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    const ics = buildIcs(doc);
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics).toMatch(/PRODID:-\/\/Curriculr Planner\/\/DE/);
    expect(ics).toMatch(/END:VCALENDAR\s*$/);
  });

  it('outputs all-day event as DATE value', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e1',
      title: 'Wandertag',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: []
    });
    const ics = buildIcs(doc);
    expect(ics).toMatch(/DTSTART;VALUE=DATE:20260915/);
    expect(ics).toMatch(/SUMMARY:Wandertag/);
  });

  it('outputs timed event with HHMMSS', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e2',
      title: 'FK',
      start: '2026-09-15',
      end: '2026-09-15',
      startTime: '14:00',
      endTime: '16:00',
      allDay: false,
      categoryId: doc.categories[0].id,
      groups: []
    });
    const ics = buildIcs(doc);
    expect(ics).toMatch(/DTSTART:20260915T140000/);
    expect(ics).toMatch(/DTEND:20260915T160000/);
  });

  it('includes LOCATION when provided', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e3',
      title: 'X',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: [],
      location: 'Aula'
    });
    expect(buildIcs(doc)).toMatch(/LOCATION:Aula/);
  });

  it('escapes commas + newlines in DESCRIPTION', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e4',
      title: 'X',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: ['A', 'B'],
      notes: 'Line 1\nLine 2, with comma'
    });
    const ics = buildIcs(doc);
    expect(ics).toMatch(/DESCRIPTION:Line 1\\nLine 2\\, with comma\\nGruppen: A\\, B/);
  });
});
```

- [ ] **Step 2: Implement `src/lib/ics-export.ts`**

```ts
import type { PlannerDocument, PlanEvent } from '@/types';
import { addDays, format, parseISO } from 'date-fns';

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function fmtDate(iso: string): string {
  return iso.replace(/-/g, '');
}

function fmtDateTime(iso: string, time: string): string {
  return `${fmtDate(iso)}T${time.replace(':', '')}00`;
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  for (let i = 0; i < line.length; i += 73) {
    out.push((i === 0 ? '' : ' ') + line.slice(i, i + 73));
  }
  return out.join('\r\n');
}

function buildEvent(e: PlanEvent, doc: PlannerDocument): string[] {
  const lines: string[] = ['BEGIN:VEVENT'];
  lines.push(`UID:${e.id}@curriculr-planner`);
  lines.push(`DTSTAMP:${nowStamp()}`);
  lines.push(`SUMMARY:${escapeText(e.title)}`);

  if (e.allDay) {
    // ICS DTEND is exclusive for all-day; add 1 day
    const endExclusive = format(addDays(parseISO(e.end), 1), 'yyyyMMdd');
    lines.push(`DTSTART;VALUE=DATE:${fmtDate(e.start)}`);
    lines.push(`DTEND;VALUE=DATE:${endExclusive}`);
  } else {
    lines.push(`DTSTART:${fmtDateTime(e.start, e.startTime ?? '00:00')}`);
    lines.push(`DTEND:${fmtDateTime(e.end, e.endTime ?? '23:59')}`);
  }

  if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);

  const descParts: string[] = [];
  if (e.notes) descParts.push(e.notes);
  if (e.groups.length) descParts.push(`Gruppen: ${e.groups.join(', ')}`);
  if (descParts.length) lines.push(`DESCRIPTION:${escapeText(descParts.join('\n'))}`);

  const cat = doc.categories.find((c) => c.id === e.categoryId);
  if (cat) lines.push(`CATEGORIES:${escapeText(cat.label)}`);

  lines.push('END:VEVENT');
  return lines;
}

export function buildIcs(doc: PlannerDocument): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Curriculr Planner//DE',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(doc.meta.name)}`,
    'X-WR-TIMEZONE:Europe/Berlin'
  ];
  for (const e of doc.events) lines.push(...buildEvent(e, doc));
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 3: Run + verify**

```bash
pnpm test:run ics-export
```

Expected: PASS — 5 tests.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(export): ICS generator (RFC 5545) with escaping + folding"
```

---

## Task 21: Excel Export (Konverter-Compatible)

**Files:**
- Create: `src/lib/excel-export.ts`
- Create: `src/lib/excel-export.test.ts`

- [ ] **Step 1: Failing tests**

`src/lib/excel-export.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { read, utils } from 'xlsx';
import { buildExcel } from './excel-export';
import { createEmptyDoc } from '@/stores/planner';

describe('buildExcel', () => {
  it('produces workbook with Ferien + Terminplan sheets', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.schoolyear.holidays = [
      { id: 'h1', label: 'Herbstferien', start: '2026-10-19', end: '2026-10-30' }
    ];
    doc.schoolyear.quarterBoundaries = ['2026-10-30', '2027-01-29', '2027-04-09'];
    const buf = buildExcel(doc);
    const wb = read(buf, { type: 'array' });
    expect(wb.SheetNames).toContain('Ferien');
    expect(wb.SheetNames).toContain('Terminplan');
  });

  it('Ferien sheet contains holiday rows', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.schoolyear.holidays = [
      { id: 'h1', label: 'Herbstferien', start: '2026-10-19', end: '2026-10-30' }
    ];
    doc.schoolyear.quarterBoundaries = ['2026-10-30', '2027-01-29', '2027-04-09'];
    const buf = buildExcel(doc);
    const wb = read(buf, { type: 'array' });
    const rows = utils.sheet_to_json(wb.Sheets['Ferien'], { header: 1 }) as unknown[][];
    expect(rows.some((r) => r.includes('Herbstferien'))).toBe(true);
  });
});
```

- [ ] **Step 2: Implement `src/lib/excel-export.ts`**

```ts
import { utils, write } from 'xlsx';
import type { PlannerDocument } from '@/types';
import { computeSchoolweeks } from './schoolweeks';
import { findSchoolweek } from './schoolweeks';

export function buildExcel(doc: PlannerDocument): ArrayBuffer {
  const wb = utils.book_new();

  // Ferien sheet
  const ferienRows: (string | number)[][] = [
    ['Label', 'Start', 'Ende']
  ];
  for (const h of doc.schoolyear.holidays) {
    ferienRows.push([h.label, h.start, h.end]);
  }
  const ferienSheet = utils.aoa_to_sheet(ferienRows);
  utils.book_append_sheet(wb, ferienSheet, 'Ferien');

  // Terminplan sheet with SW headers interleaved
  const weeks = computeSchoolweeks(doc.schoolyear);
  const planRows: (string | number)[][] = [
    ['Datum', 'Startzeit', 'Endzeit', 'Ganztägig', 'Titel', 'Kategorie', 'Standort', 'Gruppen', 'Bemerkung', 'SW', 'Anmerkung SW']
  ];

  for (const w of weeks) {
    const swEvents = doc.events
      .filter((e) => e.start >= w.startDate && e.start <= w.endDate)
      .sort((a, b) => a.start.localeCompare(b.start));
    const annotation = doc.annotations.find((a) => a.schoolweek === w.index);
    const swLabel = `SW ${w.index.toString().padStart(2, '0')} · ${w.startDate} – ${w.endDate}`;
    planRows.push([swLabel, '', '', '', '', '', '', '', '', '', annotation?.text ?? '']);
    for (const e of swEvents) {
      const cat = doc.categories.find((c) => c.id === e.categoryId);
      planRows.push([
        e.start,
        e.allDay ? '' : e.startTime ?? '',
        e.allDay ? '' : e.endTime ?? '',
        e.allDay ? 'ja' : 'nein',
        e.title,
        cat?.label ?? '',
        e.location ?? '',
        e.groups.join(', '),
        e.notes ?? '',
        w.index,
        ''
      ]);
    }
  }
  const planSheet = utils.aoa_to_sheet(planRows);
  utils.book_append_sheet(wb, planSheet, 'Terminplan');

  return write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

void findSchoolweek;
```

- [ ] **Step 3: Run + verify**

```bash
pnpm test:run excel-export
```

Expected: PASS — 2 tests.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(export): Excel export in Konverter-compatible format"
```

---

## Task 22: Export Dropdown UI

**Files:**
- Create: `src/components/export/ExportDropdown.tsx`
- Modify: `src/components/editor/Editor.tsx`
- Modify: `src/components/editor/EditorHeader.tsx`

- [ ] **Step 1: Implement `src/components/export/ExportDropdown.tsx`**

```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import { storage } from '@/lib/storage';
import { buildIcs, slugify } from '@/lib/ics-export';
import { buildExcel } from '@/lib/excel-export';
import { toast } from 'sonner';

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportDropdown() {
  const doc = usePlannerStore((s) => s.doc);
  if (!doc) return null;

  const slug = slugify(doc.meta.name);
  const today = new Date().toISOString().slice(0, 10);

  const exportIcs = () => {
    const ics = buildIcs(doc);
    downloadBlob(`${slug}.ics`, new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    toast.success('ICS heruntergeladen');
  };

  const exportJson = () => {
    const json = storage.exportJson(doc);
    downloadBlob(`curriculr-backup-${today}.json`, new Blob([json], { type: 'application/json' }));
    toast.success('Backup heruntergeladen');
  };

  const exportExcel = () => {
    const buf = buildExcel(doc);
    downloadBlob(`${slug}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    toast.success('Excel heruntergeladen');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-[var(--color-accent-success)] hover:bg-emerald-700 text-white">
          Export ↓
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportIcs}>ICS-Datei (.ics)</DropdownMenuItem>
        <DropdownMenuItem onClick={exportJson}>JSON-Backup (.json)</DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel}>Excel-Konverter-Format (.xlsx)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Replace the export button in EditorHeader.tsx**

Modify `src/components/editor/EditorHeader.tsx` to use ExportDropdown instead of a plain Button:

```tsx
import { ExportDropdown } from '@/components/export/ExportDropdown';

// Replace the `Export ↓` button with:
<ExportDropdown />
```

Remove the now-unused `onOpenExport` prop. Also remove the prop from Editor.tsx's call.

- [ ] **Step 3: Smoke test**

```bash
pnpm dev
```

Verify: Click Export → dropdown shows 3 options → click each → file downloads. Open ICS in text-editor, verify VCALENDAR structure.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(export): export dropdown wiring (ICS/JSON/Excel)"
```

---

## Task 23: Polish + Plan-Switcher Modal

**Files:**
- Create: `src/components/welcome/PlanSwitcherDialog.tsx`
- Modify: `src/components/editor/EditorHeader.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement plan-switcher**

`src/components/welcome/PlanSwitcherDialog.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { storage, type DocSummary } from '@/lib/storage';
import { usePlannerStore } from '@/stores/planner';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose(): void;
  onCreateNew(): void;
}

export function PlanSwitcherDialog({ open, onClose, onCreateNew }: Props) {
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const setDoc = usePlannerStore((s) => s.setDoc);
  const currentDoc = usePlannerStore((s) => s.doc);

  useEffect(() => {
    if (open) storage.listDocs().then(setDocs);
  }, [open]);

  const switchTo = async (id: string) => {
    const doc = await storage.loadDoc(id);
    setDoc(doc);
    await storage.setActiveDoc(id);
    onClose();
    toast.success(`Plan "${doc.meta.name}" geöffnet`);
  };

  const removeDoc = async (id: string, name: string) => {
    if (!confirm(`Plan "${name}" wirklich löschen?`)) return;
    await storage.deleteDoc(id);
    setDocs(docs.filter((d) => d.id !== id));
    toast.success('Plan gelöscht');
  };

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Pläne verwalten</DialogTitle>
        <div className="space-y-2 mt-4">
          {docs.map((d) => (
            <div
              key={d.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                d.id === currentDoc?.schoolyear.id ? 'bg-[var(--color-primary-100)] border-[var(--color-primary-500)]' : ''
              }`}
            >
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {d.eventCount} Termine · {new Date(d.lastSaved).toLocaleString('de-DE')}
                </div>
              </div>
              <div className="flex gap-2">
                {d.id !== currentDoc?.schoolyear.id && (
                  <Button size="sm" onClick={() => switchTo(d.id)}>Öffnen</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => removeDoc(d.id, d.name)}>✕</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => { onClose(); onCreateNew(); }}>
            + Neuen Plan erstellen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire into App.tsx**

```tsx
// add state:
const [planSwitcherOpen, setPlanSwitcherOpen] = useState(false);

// add import:
import { PlanSwitcherDialog } from '@/components/welcome/PlanSwitcherDialog';

// Replace `<Editor onSwitchPlan={() => setRoute('welcome')} />` with:
<>
  <Editor onSwitchPlan={() => setPlanSwitcherOpen(true)} />
  <PlanSwitcherDialog
    open={planSwitcherOpen}
    onClose={() => setPlanSwitcherOpen(false)}
    onCreateNew={() => setRoute('wizard')}
  />
</>
```

- [ ] **Step 3: Smoke test**

```bash
pnpm dev
```

Verify: Click plan-name in header → dialog opens, can switch between multiple plans (create 2nd plan via wizard first), can delete a plan.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(app): plan-switcher dialog for multiple schoolyears"
```

---

## Task 24: GitHub Pages Deploy + Final README

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`
- Modify: `vite.config.ts`

- [ ] **Step 1: Update `vite.config.ts` for GitHub Pages base path**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

const repoName = 'curriculr-planner';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? `/${repoName}/` : '/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  server: { port: 5173 }
}));
```

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test:run
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Final README update**

Replace `README.md` with the final version:

```markdown
# Curriculr Planner

Standalone web tool for school principals to create an annual school schedule. Exports as ICS for the Curriculr WordPress plugin.

## Live demo

After enabling GitHub Pages on the repository, the app is published at
`https://<user>.github.io/curriculr-planner/`.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # watch mode
pnpm test:run     # CI mode
pnpm typecheck
pnpm build        # production bundle in dist/
pnpm preview      # serve dist/ locally
```

## Spec & Roadmap

The full design spec lives in the sibling repo:
`Wordpress Plugin Terminplaner/docs/superpowers/specs/2026-05-26-curriculr-planner-design.md`

v1.0 covers wizard, quarter editor, drag-drop, ICS export, LocalStorage. Roadmap: v1.1 conflict detection, v1.2 templates + Excel import, v1.3 cloud sync, v1.4 recurring events.

## Stack

- Vite + React 19 + TypeScript (strict)
- Tailwind v4 + shadcn/ui
- FullCalendar (drag-drop)
- Zustand (state) + react-hook-form + Zod (validation)
- Vitest + Testing-Library

## License

MIT
```

- [ ] **Step 4: Run full pre-deploy check**

```bash
pnpm typecheck
pnpm test:run
pnpm build
```

Expected: all green, `dist/` populated.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "ci: GitHub Pages deploy workflow + final README"
```

- [ ] **Step 6: Create GitHub repo + push**

```bash
gh repo create curriculr-planner --public --source . --remote origin --push
```

(If gh-cli not used, create manually on github.com and `git remote add origin … && git push -u origin main`.)

Enable GitHub Pages: GitHub repo → Settings → Pages → Source: "GitHub Actions". Re-run workflow if needed.

---

## Task 25: End-to-End Manual Acceptance

**Files:** none modified — verification only.

- [ ] **Step 1: Fresh-browser end-to-end run**

In incognito window:
1. Open dev server `pnpm dev`
2. Welcome screen appears, no docs
3. Click `+ Neuen Jahresplan erstellen`
4. Wizard Step 1: enter `2026/27`, first school day `2026-08-24`, first teaching `2026-08-31`, last school day `2027-07-16`, Herbstferien `2026-10-19 – 2026-10-30`, Sommerferien `2027-07-19 – 2027-08-31`. Click Weiter.
5. Wizard Step 2: enter quarter boundaries `2026-10-30 / 2027-01-29 / 2027-04-09`. Click Weiter.
6. Wizard Step 3: verify 40-ish schoolweeks shown. Click "Plan erstellen".
7. Editor opens on Q1, August/September visible.
8. Click on `2026-09-15` → modal opens with date prefilled. Title `Wandertag`. Verify category auto-selects "Wandertag". Save.
9. Verify event chip appears on calendar with category color.
10. Drag the event to `2026-09-22`. Verify toast = no warning. Drag to `2026-10-25` (in Herbst). Verify warning toast.
11. Click 📝 icon on a Monday cell. Add annotation "Test SW". Save. Icon turns yellow.
12. Click "📝 Notizen" in toolbar. Sidebar shows annotation. Close.
13. Click Export → ICS. Open downloaded file. Verify `BEGIN:VCALENDAR` + the event.
14. Click Settings → Schuljahr tab. Change first school day. Save. Verify recompute.
15. Reload page. Verify all changes persist (LocalStorage works).
16. Export JSON. Clear LocalStorage in DevTools. Reload → Welcome appears. Click "JSON-Backup laden" → file. Verify plan restored.

- [ ] **Step 2: Acceptance result**

If all 16 steps pass: v1.0 MVP done. Mark spec acceptance-criteria checkboxes:
- [ ] Schulleitung erstellt Plan in < 5 Min (Wizard)
- [ ] 50+ Termine über Modal eintragbar
- [ ] Drag-Drop fehlerfrei
- [ ] Anmerkungen persistieren
- [ ] ICS-Export öffnet in IServ + WP-Plugin
- [ ] Browser-Reload erhält Zustand
- [ ] JSON-Backup-Restore funktioniert
- [ ] Auto-Save zeigt Feedback

- [ ] **Step 3: Tag release**

```bash
git tag -a v1.0.0 -m "v1.0.0 — MVP release"
git push origin v1.0.0
```

- [ ] **Step 4: Final commit (release notes)**

Append to README's "Live demo" section a "## Releases" block:

```markdown
## Releases

### v1.0.0 — 2026-MM-DD (MVP)
- Setup wizard (3 steps)
- Quarter editor with FullCalendar
- Event create/edit modal with category auto-matching
- Drag-drop between days (with weekend + holiday warnings)
- Note per schoolweek (popover + sidebar)
- Settings modal (schoolyear/categories/groups/export/about)
- Export: ICS, JSON-backup, Excel (Konverter-compatible)
- Multi-plan management
- LocalStorage with auto-save
```

```bash
git add README.md
git commit -m "docs: v1.0.0 release notes"
git push origin main
```

---

## Self-Review Notes (filled by author)

**Spec coverage:**
- R1 Wizard → Tasks 9, 10, 11 ✓
- R2 Editor + Q-Tabs → Tasks 12, 13, 14 ✓
- R3 Drag-Drop → Task 14 (eventDrop) ✓
- R4 Event Modal → Task 16 ✓
- R5 Annotations → Tasks 15 (icon), 18 (popover), 19 (sidebar) ✓
- R6 LocalStorage Auto-Save → Tasks 4 (adapter), 7 (debounced store) ✓
- R7 JSON Backup → Tasks 4 (adapter), 22 (UI) ✓
- R8 ICS Export → Tasks 20, 22 ✓
- R9 Excel Export → Tasks 21, 22 ✓
- R10 Schoolweek computation → Task 6 ✓
- Settings Modal (Wizard editable later, categories, groups) → Task 17 ✓
- Brand tokens → Task 2 ✓
- Welcome + Plan-Switcher → Tasks 8, 23 ✓
- GitHub Pages deploy → Task 24 ✓
- Acceptance verification → Task 25 ✓

**Placeholders:** none — every step has full code or exact commands.

**Type consistency:** `PlannerDocument`, `PlanEvent`, `Schoolyear`, `Category`, `WeekAnnotation`, `Holiday` all match between `types/index.ts`, `schemas.ts`, `storage.ts`, `planner.ts` store, and component props.

**Known omissions documented:** RRULE, Resize, Templates, Conflicts (hard block), Schoolyear-Grid, ICS-Import, Excel-Import, Cloud-Sync — all explicitly marked "Phase 2" in spec roadmap.
