# Editor-Header/Toolbar-Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `EditorHeader.tsx` from 9 crowded elements to 5 (4 always + 1 conditional), moving secondary actions into a new `⋯` overflow menu and the view-toggle into `EditorToolbar.tsx`, without losing any existing functionality (including the "PDF / Druck" export currently in `ExportDropdown`, which the design spec omitted).

**Architecture:** Pure UI relocation — no new stores, no schema changes. A new `EditorOverflowMenu.tsx` component (shadcn `DropdownMenu`, same primitive already used by the component it replaces) consolidates Export + Hilfe + Einstellungen. `ExportDropdown.tsx` is deleted (single consumer). The view-toggle moves from `EditorHeader.tsx` to `EditorToolbar.tsx`, restyled for the light toolbar background. Presence info becomes a `title` tooltip instead of its own pill. Guided-tour anchors (`data-tour="export-btn"`/`"settings-btn"`) are merged into one `data-tour="overflow-menu"` step; `data-tour="view-toggle"` moves with its element.

**Tech Stack:** React 19 + TypeScript (strict), Vite, Zustand, Tailwind v4 (`@theme` CSS vars), shadcn/ui + Radix primitives, lucide-react icons, Vitest + Testing Library + user-event, driver.js (guided tour).

## Global Constraints

- TypeScript strict, no `any` (per `curriculr-planner/CLAUDE.md`).
- Always import via `@/*` alias, never deep relative paths.
- UI copy in German; identifiers/comments in English.
- No emoji as icons — lucide-react only, consistent stroke (`w-4 h-4` for header/toolbar icon buttons).
- Never hardcode brand hex in components — use `var(--color-*)` tokens from `src/styles/globals.css`.
- `npm run lint` must pass with `--max-warnings 0`; `npm run typecheck` must pass.
- Tests co-located next to the component they cover (e.g. `Foo.tsx` + `Foo.test.tsx`).
- Package manager: npm only.

---

### Task 1: Relocate view-toggle to toolbar + fix emoji icon

**Files:**
- Modify: `src/components/editor/EditorHeader.tsx`
- Modify: `src/components/editor/EditorToolbar.tsx`
- Test: `src/components/editor/EditorToolbar.test.tsx` (new)

**Interfaces:**
- Consumes: `useUiStore` selectors `viewMode: 'table' | 'year'`, `setViewMode(v: 'table' | 'year'): void` (both already exist in `src/stores/ui.ts`, currently only `viewMode` is read in `EditorToolbar.tsx`).
- Produces: `EditorToolbar` now owns the `data-tour="view-toggle"` DOM anchor (previously on `EditorHeader`) — Task 3's tour-step update and the guided tour both rely on this anchor existing somewhere in the editor, not on which component renders it.

- [ ] **Step 1: Write the failing test for the toolbar**

Create `src/components/editor/EditorToolbar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorToolbar } from './EditorToolbar';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';

beforeEach(() => {
  const doc = createEmptyDoc('Testplan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  usePlannerStore.setState({ doc });
  useUiStore.setState({ viewMode: 'table', currentQuarter: 1 });
});

describe('EditorToolbar', () => {
  it('renders the view toggle with the view-toggle tour anchor', () => {
    render(<EditorToolbar />);
    const toggle = document.querySelector('[data-tour="view-toggle"]');
    expect(toggle).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Tabelle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schuljahr' })).toBeInTheDocument();
  });

  it('switches to year view on click', async () => {
    render(<EditorToolbar />);
    await userEvent.click(screen.getByRole('button', { name: 'Schuljahr' }));
    expect(useUiStore.getState().viewMode).toBe('year');
  });

  it('renders Notizen with an svg icon, not an emoji', () => {
    render(<EditorToolbar />);
    const notizenBtn = screen.getByRole('button', { name: /Notizen/i });
    expect(notizenBtn.textContent).not.toMatch(/📝/);
    expect(notizenBtn.querySelector('svg')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npm run test:run -- src/components/editor/EditorToolbar.test.tsx`
Expected: FAIL — no `[data-tour="view-toggle"]` in `EditorToolbar` yet, "Notizen" still renders `📝` text not an `<svg>`.

- [ ] **Step 3: Move the view-toggle into `EditorToolbar.tsx`, fix the Notizen icon**

Replace the full contents of `src/components/editor/EditorToolbar.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Undo2, Redo2, LayoutTemplate, StickyNote } from 'lucide-react';
import { getQuarterRange } from '@/lib/schoolweeks';

export function EditorToolbar() {
  const doc = usePlannerStore((s) => s.doc);
  const currentQuarter = useUiStore((s) => s.currentQuarter);
  const setQuarter = useUiStore((s) => s.setQuarter);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const toggleNotes = useUiStore((s) => s.toggleNotesSidebar);
  const toggleTemplates = useUiStore((s) => s.toggleTemplatesSidebar);
  const openCreate = useUiStore((s) => s.openCreateEvent);
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  if (!doc) return null;

  const sy = doc.schoolyear;

  const fmtRange = (i: number) => {
    const r = getQuarterRange((i + 1) as 1 | 2 | 3 | 4, sy);
    return `${format(parseISO(r.startDate), 'MMM yyyy', { locale: de })} – ${format(parseISO(r.endDate), 'MMM yyyy', { locale: de })}`;
  };

  return (
    <div className="bg-[var(--color-paper-card)] border-b border-[var(--color-ink-200)] px-6 py-2 flex items-center gap-2">
      <div
        data-tour="view-toggle"
        className="flex items-center rounded-[var(--radius-pill)] overflow-hidden mr-3"
        style={{ background: 'var(--color-paper-bg)' }}
      >
        <button
          onClick={() => setViewMode('table')}
          aria-pressed={viewMode === 'table'}
          className="px-3 py-1 text-sm font-semibold transition-colors"
          style={{
            background: viewMode === 'table' ? 'var(--color-marine-800)' : 'transparent',
            color: viewMode === 'table' ? 'var(--color-paper-card)' : 'var(--color-ink-500)',
            transitionDuration: 'var(--dur-state)',
          }}
        >
          Tabelle
        </button>
        <button
          onClick={() => setViewMode('year')}
          aria-pressed={viewMode === 'year'}
          className="px-3 py-1 text-sm font-semibold transition-colors"
          style={{
            background: viewMode === 'year' ? 'var(--color-marine-800)' : 'transparent',
            color: viewMode === 'year' ? 'var(--color-paper-card)' : 'var(--color-ink-500)',
            transitionDuration: 'var(--dur-state)',
          }}
        >
          Schuljahr
        </button>
      </div>
      {viewMode === 'table' ? (
        <div data-tour="quarter-tabs" className="flex items-center gap-2">
          {[1, 2, 3, 4].map((q) => (
            <button
              key={q}
              onClick={() => setQuarter(q as 1 | 2 | 3 | 4)}
              className="px-4 py-1.5 rounded-[var(--radius-pill)] text-sm font-semibold transition-colors"
              style={{
                background: currentQuarter === q ? 'var(--color-marine-800)' : 'var(--color-paper-bg)',
                color: currentQuarter === q ? 'var(--color-paper-card)' : 'var(--color-ink-500)',
                transitionDuration: 'var(--dur-state)',
                transitionTimingFunction: 'var(--ease-state)'
              }}
            >
              Q{q}
            </button>
          ))}
          <span className="ml-3 text-sm text-[var(--color-ink-500)] tabular-nums">{fmtRange(currentQuarter - 1)}</span>
        </div>
      ) : (
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">Jahresübersicht</span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" disabled={!canUndo} onClick={undo} aria-label="Rückgängig" title="Rückgängig (Strg+Z)">
          <Undo2 />
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={!canRedo} onClick={redo} aria-label="Wiederholen" title="Wiederholen (Strg+Umschalt+Z)">
          <Redo2 />
        </Button>
        <Button data-tour="templates-btn" variant="outline" size="sm" onClick={toggleTemplates} aria-label="Vorlagen anzeigen" title="Vorlagen">
          <LayoutTemplate />
          Vorlagen
        </Button>
        <Button variant="outline" size="sm" onClick={toggleNotes}>
          <StickyNote />
          Notizen
        </Button>
        <Button data-tour="add-event-btn" size="sm" onClick={() => openCreate()}>
          + Termin
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Remove the view-toggle block from `EditorHeader.tsx`**

In `src/components/editor/EditorHeader.tsx`, delete this block (currently right after the `StatusBar` / auth-pill JSX, before the conflicts badge):

```tsx
          <div
            data-tour="view-toggle"
            className="flex items-center bg-white/10 rounded-[var(--radius-pill)] overflow-hidden"
          >
            <button
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className="px-3 py-1 font-semibold transition-colors"
              style={{
                background: viewMode === 'table' ? 'var(--color-paper-card)' : 'transparent',
                color: viewMode === 'table' ? 'var(--color-marine-800)' : 'rgba(255,255,255,0.7)',
                transitionDuration: 'var(--dur-state)'
              }}
            >
              Tabelle
            </button>
            <button
              onClick={() => setViewMode('year')}
              aria-pressed={viewMode === 'year'}
              className="px-3 py-1 font-semibold transition-colors"
              style={{
                background: viewMode === 'year' ? 'var(--color-paper-card)' : 'transparent',
                color: viewMode === 'year' ? 'var(--color-marine-800)' : 'rgba(255,255,255,0.7)',
                transitionDuration: 'var(--dur-state)'
              }}
            >
              Schuljahr
            </button>
          </div>
```

And remove the now-unused selectors near the top of the component:

```tsx
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
```

(Leave every other `useUiStore`/`useAuthStore`/`useWpSyncStore` selector untouched — they're still used by other parts of the header.)

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `npm run test:run -- src/components/editor/EditorToolbar.test.tsx`
Expected: PASS (3 tests). (`EditorHeader.test.tsx` doesn't exist yet — it's created in Task 3 — so don't include it in this run.)

- [ ] **Step 6: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both clean. If lint flags unused `viewMode`/`setViewMode` still referenced somewhere in `EditorHeader.tsx`, you missed a reference — search `grep -n "viewMode" src/components/editor/EditorHeader.tsx` and remove it.

- [ ] **Step 7: Commit**

```bash
git add src/components/editor/EditorToolbar.tsx src/components/editor/EditorHeader.tsx src/components/editor/EditorToolbar.test.tsx
git commit -m "refactor: move view-toggle into EditorToolbar, fix Notizen emoji icon"
```

---

### Task 2: New `EditorOverflowMenu` component (Export + Hilfe + Einstellungen)

**Files:**
- Create: `src/components/editor/EditorOverflowMenu.tsx`
- Test: `src/components/editor/EditorOverflowMenu.test.tsx` (new)
- Modify: `src/test-setup.ts` (jsdom polyfills — see Step 1 rationale)

**Interfaces:**
- Consumes: `usePlannerStore((s) => s.doc)`; `useUiStore` selectors `openHelp(): void`, `openSettings(tab?: SettingsTab): void`, `openPrintDialog(): void` (all already exist in `src/stores/ui.ts`); `storage.exportJson(doc): string` (`src/lib/storage.ts`); `buildIcs(doc): string` + `slugify(name): string` (`src/lib/ics-export.ts`); `buildExcel(doc): ArrayBuffer` (`src/lib/excel-export.ts`); `toast` from `sonner`.
- Produces: `export function EditorOverflowMenu(): JSX.Element | null` — a single self-contained trigger + dropdown, no props. Task 3 imports this by name and drops it in where `ExportDropdown` + the Hilfe/Einstellungen buttons used to be.

- [ ] **Step 1: Add jsdom polyfills needed by Radix `DropdownMenu` in tests**

No component in this codebase currently opens a Radix popover/dropdown in a Vitest test — `jsdom` (v29, per `package.json`) doesn't implement `Element.prototype.hasPointerCapture` or `scrollIntoView`, which Radix's positioning code calls when the menu opens. Without this, the test in Step 3 throws `TypeError: ... is not a function`.

Append to `src/test-setup.ts`:

```ts
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
```

- [ ] **Step 2: Write the failing test**

Create `src/components/editor/EditorOverflowMenu.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorOverflowMenu } from './EditorOverflowMenu';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';

beforeEach(() => {
  const doc = createEmptyDoc('Testplan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  usePlannerStore.setState({ doc });
  useUiStore.setState({ helpOpen: false, settingsModalOpen: false });
});

async function openMenu() {
  render(<EditorOverflowMenu />);
  await userEvent.click(screen.getByRole('button', { name: 'Weitere Optionen' }));
}

describe('EditorOverflowMenu', () => {
  it('lists export options, Hilfe and Einstellungen', async () => {
    await openMenu();
    expect(screen.getByText('ICS-Datei (.ics)')).toBeInTheDocument();
    expect(screen.getByText('JSON-Backup (.json)')).toBeInTheDocument();
    expect(screen.getByText('Excel-Konverter-Format (.xlsx)')).toBeInTheDocument();
    expect(screen.getByText('PDF / Druck')).toBeInTheDocument();
    expect(screen.getByText('Hilfe')).toBeInTheDocument();
    expect(screen.getByText('Einstellungen')).toBeInTheDocument();
  });

  it('opens help on click', async () => {
    await openMenu();
    await userEvent.click(screen.getByText('Hilfe'));
    expect(useUiStore.getState().helpOpen).toBe(true);
  });

  it('opens settings on click', async () => {
    await openMenu();
    await userEvent.click(screen.getByText('Einstellungen'));
    expect(useUiStore.getState().settingsModalOpen).toBe(true);
  });

  it('opens the print dialog on "PDF / Druck"', async () => {
    await openMenu();
    await userEvent.click(screen.getByText('PDF / Druck'));
    expect(useUiStore.getState().printDialogOpen).toBe(true);
  });
});
```

- [ ] **Step 3: Run it, confirm it fails**

Run: `npm run test:run -- src/components/editor/EditorOverflowMenu.test.tsx`
Expected: FAIL — `EditorOverflowMenu` module doesn't exist yet.

- [ ] **Step 4: Implement `EditorOverflowMenu.tsx`**

Create `src/components/editor/EditorOverflowMenu.tsx`:

```tsx
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
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

export function EditorOverflowMenu() {
  const doc = usePlannerStore((s) => s.doc);
  const openHelp = useUiStore((s) => s.openHelp);
  const openSettings = useUiStore((s) => s.openSettings);
  const openPrintDialog = useUiStore((s) => s.openPrintDialog);
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
        <Button
          data-tour="overflow-menu"
          variant="ghost"
          size="icon"
          aria-label="Weitere Optionen"
          title="Weitere Optionen"
          className="text-[var(--color-paper-card)] hover:bg-white/10 hover:text-[var(--color-paper-card)]"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportIcs}>ICS-Datei (.ics)</DropdownMenuItem>
        <DropdownMenuItem onClick={exportJson}>JSON-Backup (.json)</DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel}>Excel-Konverter-Format (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={openPrintDialog}>PDF / Druck</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openHelp}>Hilfe</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openSettings()}>Einstellungen</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `npm run test:run -- src/components/editor/EditorOverflowMenu.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/editor/EditorOverflowMenu.tsx src/components/editor/EditorOverflowMenu.test.tsx src/test-setup.ts
git commit -m "feat: add EditorOverflowMenu (export + help + settings consolidated)"
```

---

### Task 3: Wire the overflow menu into `EditorHeader`, drop `ExportDropdown`, tooltip-ify presence, update the guided tour

**Files:**
- Modify: `src/components/editor/EditorHeader.tsx`
- Delete: `src/components/export/ExportDropdown.tsx` (only consumer was `EditorHeader.tsx`, confirmed via repo-wide grep — no other references)
- Modify: `src/components/tour/tour-steps.ts`
- Test: `src/components/editor/EditorHeader.test.tsx` (new)

**Interfaces:**
- Consumes: `EditorOverflowMenu` from Task 2 (no props). All other hooks (`usePlannerStore`, `useUiStore`, `useConflicts`, `useAuthStore`, `useWpSyncStore`, `usePresence`, `relativeTime`) are unchanged, already imported in `EditorHeader.tsx`.
- Produces: `EditorHeader` renders exactly 4 always-visible zones + 1 conditional (conflicts) in row 1: plan-identity, save-status (with presence as `title` tooltip, no separate pill), `StatusBar` (sync/publish), auth-user pill, `EditorOverflowMenu`. This is the shape the plan's final manual QA (Task 4) checks against.

- [ ] **Step 1: Write the failing test**

Create `src/components/editor/EditorHeader.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorHeader } from './EditorHeader';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useWpSyncStore } from '@/stores/wpSync';

const noop = () => {};

beforeEach(() => {
  const doc = createEmptyDoc('Testplan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  usePlannerStore.setState({ doc, savingState: 'idle' });
  useUiStore.setState({ viewMode: 'table' });
  useAuthStore.setState({ status: 'unauthenticated', claims: null, token: null });
  useWpSyncStore.setState({ config: { enabled: false, baseUrl: '', links: {} } });
});

describe('EditorHeader', () => {
  it('has no standalone Hilfe/Einstellungen/Export buttons, only the overflow trigger', () => {
    render(<EditorHeader onSwitchPlan={noop} />);
    expect(screen.queryByRole('button', { name: 'Hilfe' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Einstellungen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Export/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Weitere Optionen' })).toBeInTheDocument();
  });

  it('does not render the view-toggle in the header (moved to toolbar)', () => {
    render(<EditorHeader onSwitchPlan={noop} />);
    expect(document.querySelector('header [data-tour="view-toggle"]')).toBeNull();
  });

  it('shows save status without a separate presence pill', () => {
    render(<EditorHeader onSwitchPlan={noop} />);
    expect(screen.getByText('Gespeichert')).toBeInTheDocument();
    expect(screen.queryByText(/hat.*gespeichert$/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npm run test:run -- src/components/editor/EditorHeader.test.tsx`
Expected: FAIL — `Hilfe`/`Einstellungen`/`Export` buttons still exist, `Weitere Optionen` doesn't exist yet.

- [ ] **Step 3: Rewrite `EditorHeader.tsx`**

Replace the full contents of `src/components/editor/EditorHeader.tsx`:

```tsx
import { useState } from 'react';
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useConflicts } from '@/hooks/useConflicts';
import { EditorOverflowMenu } from './EditorOverflowMenu';
import { ConflictPanel } from './ConflictPanel';
import { StatusBar } from './StatusBar';
import { useAuthStore } from '@/stores/auth';
import { useWpSyncStore } from '@/stores/wpSync';
import { usePresence, relativeTime } from '@/hooks/usePresence';

interface Props {
  onSwitchPlan(): void;
}

export function EditorHeader({ onSwitchPlan }: Props) {
  const doc = usePlannerStore((s) => s.doc);
  const presence = usePresence(doc?.schoolyear.id);
  const savingState = usePlannerStore((s) => s.savingState);
  const conflicts = useConflicts();
  const [panelOpen, setPanelOpen] = useState(false);
  const hasError = conflicts.some((c) => c.severity === 'error');
  const authStatus = useAuthStore((s) => s.status);
  const authClaims = useAuthStore((s) => s.claims);
  const authToken = useAuthStore((s) => s.token);
  const authLogout = useAuthStore((s) => s.logout);
  const wpBaseUrl = useWpSyncStore((s) => s.config.baseUrl);

  function handleLogout() {
    const currentToken = authToken;
    authLogout();
    if (wpBaseUrl && currentToken) {
      fetch(`${wpBaseUrl.replace(/\/+$/, '')}/wp-json/curriculr/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
      }).catch(() => {});
    }
  }

  if (!doc) return null;

  const stateIndicator = {
    idle:   <><CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Gespeichert</>,
    saving: <><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Speichert…</>,
    saved:  <><CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Gespeichert</>,
    error:  <><AlertTriangle className="w-3 h-3" aria-hidden="true" /> Fehler beim Speichern</>,
  }[savingState];

  const presenceRel = presence?.authorName ? relativeTime(presence.savedAt) : '';
  const saveStatusTitle = presenceRel ? `${presence!.authorName} hat ${presenceRel} gespeichert` : undefined;

  return (
    <header className="relative bg-[var(--color-marine-800)] text-[var(--color-paper-card)]">
      <div className="px-6 py-3 flex items-center gap-4" style={{ minHeight: 48 }}>
        <img src={`${import.meta.env.BASE_URL}curriculr-logo.svg`} alt="Curriculr" className="h-6" />
        <button
          data-tour="plan-name"
          onClick={onSwitchPlan}
          className="text-[15px] font-semibold hover:opacity-80 flex items-center gap-1 transition-opacity"
          style={{ transitionDuration: 'var(--dur-state)' }}
        >
          {doc.meta.name} <span className="opacity-60">▼</span>
        </button>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5" title={saveStatusTitle}>
            {stateIndicator}
          </span>
          {conflicts.length > 0 && (
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="flex items-center gap-1 rounded-[var(--radius-block)] px-2.5 py-1.5 text-[12.5px] font-semibold"
              style={{
                background: hasError ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)' : 'var(--color-gelb-100)',
                color: hasError ? 'var(--color-danger)' : 'var(--color-warning)'
              }}
            >
              ⚠ {conflicts.length} {conflicts.length === 1 ? 'Konflikt' : 'Konflikte'}
            </button>
          )}
          <StatusBar />
          {authStatus === 'authenticated' && authClaims && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-white/10 text-[13px]">
              <span>{authClaims.name}</span>
              <button
                onClick={handleLogout}
                aria-label="Abmelden"
                title="Abmelden"
                className="opacity-60 hover:opacity-100 transition-opacity"
                style={{ transitionDuration: 'var(--dur-state)' }}
              >
                ✕
              </button>
            </div>
          )}
          <EditorOverflowMenu />
        </div>
      </div>
      <ConflictPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </header>
  );
}
```

Note what changed vs. the old file: removed imports (`Button`, `Settings as SettingsIcon`, `HelpCircle`, `ExportDropdown`, `useUiStore` entirely — its only remaining use was `viewMode`/`setViewMode`, already removed in Task 1, and `openSettings`/`openHelp`, now inside `EditorOverflowMenu`), removed the standalone presence `<span>` pill (folded into `title` on the save-status span), removed the Hilfe/Einstellungen `Button`s and `<ExportDropdown />`, added `<EditorOverflowMenu />`. The conflicts badge, `StatusBar`, and auth pill are untouched.

- [ ] **Step 4: Delete `ExportDropdown.tsx`**

```bash
rm src/components/export/ExportDropdown.tsx
```

(Directory `src/components/export/` may now be empty — leave it; other export-related files may land there later. If it's the only file and you want it gone, `rmdir src/components/export` after confirming it's empty.)

- [ ] **Step 5: Update the guided tour**

In `src/components/tour/tour-steps.ts`, replace these two step objects:

```ts
  {
    element: '[data-tour="export-btn"]',
    popover: {
      title: 'Exportieren',
      description: 'Plan als ICS für Kalender-Apps, Excel für das Schulwebsite-Plugin oder JSON-Backup.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="settings-btn"]',
    popover: {
      title: 'Einstellungen',
      description: 'Kategorien, Gruppen, Schuljahr und Darstellung anpassen.',
      side: 'bottom',
      align: 'end',
    },
  },
```

with one merged step:

```ts
  {
    element: '[data-tour="overflow-menu"]',
    popover: {
      title: 'Weitere Optionen',
      description: 'Export (ICS, Excel, JSON-Backup, PDF), Hilfe und Einstellungen findest du hier gebündelt.',
      side: 'bottom',
      align: 'end',
    },
  },
```

- [ ] **Step 6: Run the tests, confirm they pass**

Run: `npm run test:run -- src/components/editor/EditorHeader.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both clean. If lint complains about an unused import in `EditorHeader.tsx`, remove it — the replacement above should already be minimal, but double-check nothing dangling remains.

- [ ] **Step 8: Commit**

```bash
git add src/components/editor/EditorHeader.tsx src/components/tour/tour-steps.ts
git rm src/components/export/ExportDropdown.tsx
git commit -m "refactor: wire EditorOverflowMenu into EditorHeader, drop ExportDropdown, tooltip-ify presence"
```

---

### Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm run test:run`
Expected: all test files pass, including the 3 new ones from Tasks 1–3 (10 new tests total) and the full pre-existing suite (263 tests as of this plan's writing — should now read 273).

- [ ] **Step 2: Typecheck + lint one more time on the whole repo**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

- [ ] **Step 3: Manual check in the dev server**

Run: `npm run dev`, open the printed `localhost` URL, open or create a plan to reach the editor.

Verify:
- Header row 1 shows: logo+plan-name, save-status (hover it if a colleague has recently saved via WordPress sync to see the tooltip), sync/publish status, `⋯` button on the far right (auth pill only shows once logged in via IServ).
- Clicking `⋯` opens a menu with ICS/JSON/Excel/PDF export items, a separator, then Hilfe and Einstellungen — each item actually works (export downloads a file, Hilfe opens the help panel, Einstellungen opens settings).
- Toolbar row 2 (below the header) now starts with the Tabelle/Schuljahr toggle before the quarter tabs; switching to "Schuljahr" replaces the tabs with the "Jahresübersicht" label as before.
- "Notizen" button shows a sticky-note icon, no 📝 emoji.
- Start the guided tour (Hilfe → geführte Tour, or however it's triggered in this build) and confirm the "Weitere Optionen" step highlights the `⋯` button instead of two separate steps for export/settings.

- [ ] **Step 4: Final commit if manual check needed fixups**

Only if Step 3 surfaced an issue you fixed:

```bash
git add -A
git commit -m "fix: address manual QA findings from header/toolbar redesign"
```

If Step 3 passed clean, there is nothing to commit here — the three task commits already cover the full change.
