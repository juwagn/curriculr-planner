# Onboarding & Hilfebereich — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in Spotlight-Tour (8 steps, driver.js) and a dedicated Help Modal (5 sections, `?` button in header) so school principals can learn the Planner without external documentation.

**Architecture:** The UI store gains two ephemeral flags (`helpOpen`, `tourPending`). A headless `TourManager` component watches `tourPending` and fires driver.js. The `HelpModal` is a two-panel dialog (nav + content) that also provides a "Start Tour" CTA. Entry points: Welcome screen button (loads demo doc → editor → auto-tour) and Editor `?` button (opens HelpModal).

**Tech Stack:** React, Zustand, driver.js v1.x, shadcn/ui Dialog, Tailwind v4, Vitest + Testing Library, Lucide icons

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `src/components/tour/tour-steps.ts` | Static array of 8 DriveStep definitions |
| **Create** | `src/components/tour/TourManager.tsx` | Headless component — starts driver.js when `tourPending` is true |
| **Create** | `src/components/tour/TourManager.test.tsx` | Tests that Tour starts/stops on flag changes |
| **Create** | `src/components/help/HelpModal.tsx` | Two-panel help dialog with 5 sections + tour CTA |
| **Create** | `src/components/help/HelpModal.test.tsx` | Tests section navigation and tour CTA |
| **Modify** | `src/stores/ui.ts` | Add `helpOpen`, `tourPending`, `openHelp`, `closeHelp`, `setTourPending` |
| **Modify** | `src/components/editor/EditorHeader.tsx` | Add `?` button + `data-tour` attrs on plan-name, view-toggle, settings-btn |
| **Modify** | `src/components/editor/EditorToolbar.tsx` | Add `data-tour` attrs on quarter-tabs, add-event-btn, templates-btn |
| **Modify** | `src/components/export/ExportDropdown.tsx` | Add `data-tour="export-btn"` on trigger Button |
| **Modify** | `src/components/editor/Editor.tsx` | Mount `<TourManager />` and `<HelpModal />` |
| **Modify** | `src/components/welcome/Welcome.tsx` | Add "Tour starten" Ghost button + `onStartTour` prop |
| **Modify** | `src/App.tsx` | Add `startTour` handler; pass to Welcome |
| **Modify** | `src/styles/globals.css` | driver.js CSS variable overrides |

---

## Task 1: Install driver.js

**Files:** `package.json`

- [ ] **Step 1: Install**

```bash
npm install driver.js
```

Expected: `driver.js` appears in `package.json` dependencies, no peer-dep errors.

- [ ] **Step 2: Verify import resolves**

```bash
node -e "require('driver.js')" 2>&1 | head -5
```

Expected: no error (or ESM-related output — that's fine, Vite handles it).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add driver.js for spotlight tour"
```

---

## Task 2: Extend UI Store + Tests

**Files:**
- Modify: `src/stores/ui.ts`
- Create: `src/stores/ui.help-tour.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/stores/ui.help-tour.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './ui';

describe('ui store — help & tour flags', () => {
  beforeEach(() => {
    useUiStore.setState({
      helpOpen: false,
      tourPending: false,
    });
  });

  it('openHelp sets helpOpen true', () => {
    useUiStore.getState().openHelp();
    expect(useUiStore.getState().helpOpen).toBe(true);
  });

  it('closeHelp sets helpOpen false', () => {
    useUiStore.setState({ helpOpen: true });
    useUiStore.getState().closeHelp();
    expect(useUiStore.getState().helpOpen).toBe(false);
  });

  it('setTourPending(true) sets flag', () => {
    useUiStore.getState().setTourPending(true);
    expect(useUiStore.getState().tourPending).toBe(true);
  });

  it('setTourPending(false) clears flag', () => {
    useUiStore.setState({ tourPending: true });
    useUiStore.getState().setTourPending(false);
    expect(useUiStore.getState().tourPending).toBe(false);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx vitest run src/stores/ui.help-tour.test.ts
```

Expected: FAIL — `openHelp is not a function` or similar.

- [ ] **Step 3: Add state and actions to `src/stores/ui.ts`**

Add to `UiState` interface (after `density: Density;`):

```ts
  helpOpen: boolean;
  tourPending: boolean;

  openHelp(): void;
  closeHelp(): void;
  setTourPending(v: boolean): void;
```

Add to the `create<UiState>(...)` initial state (after `density: initial.density ?? 'auto',`):

```ts
  helpOpen: false,
  tourPending: false,
```

Add actions (after `setDensity` action):

```ts
  openHelp() { set({ helpOpen: true }); },
  closeHelp() { set({ helpOpen: false }); },
  setTourPending(v) { set({ tourPending: v }); },
```

- [ ] **Step 4: Run — verify PASS**

```bash
npx vitest run src/stores/ui.help-tour.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/stores/ui.ts src/stores/ui.help-tour.test.ts
git commit -m "feat(store): add helpOpen and tourPending flags to ui store"
```

---

## Task 3: Create tour-steps.ts

**Files:**
- Create: `src/components/tour/tour-steps.ts`

No unit test needed — static data, verified by TourManager tests and manual smoke.

- [ ] **Step 1: Create file**

```ts
import type { DriveStep } from 'driver.js';

export const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Willkommen im Curriculr Planner',
      description: 'Wir zeigen dir die wichtigsten Funktionen in ca. 2 Minuten.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="plan-name"]',
    popover: {
      title: 'Dein Jahresplan',
      description: 'Klick öffnet die Planübersicht — du kannst mehrere Pläne gleichzeitig verwalten.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="view-toggle"]',
    popover: {
      title: 'Ansicht wechseln',
      description: 'Wechsle zwischen Wochen-Tabelle (Quartalsansicht) und Jahresübersicht.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="quarter-tabs"]',
    popover: {
      title: 'Quartals-Navigation',
      description: 'Wechsle zwischen Q1–Q4. Jedes Quartal zeigt die zugehörigen Schulwochen.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-event-btn"]',
    popover: {
      title: 'Termin anlegen',
      description: 'Öffnet das Formular: Titel, Kategorie, Datum und betroffene Gruppen eingeben.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="templates-btn"]',
    popover: {
      title: 'Termin-Vorlagen',
      description: 'Vorlagen für wiederkehrende Termine — per Drag & Drop in den Plan ziehen.',
      side: 'bottom',
      align: 'end',
    },
  },
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
];
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tour/tour-steps.ts
git commit -m "feat(tour): add tour step definitions"
```

---

## Task 4: Add data-tour Attributes

**Files:**
- Modify: `src/components/editor/EditorHeader.tsx`
- Modify: `src/components/editor/EditorToolbar.tsx`
- Modify: `src/components/export/ExportDropdown.tsx`

No separate test — attributes verified by TourManager smoke test.

- [ ] **Step 1: EditorHeader — plan-name, view-toggle, settings-btn**

In `src/components/editor/EditorHeader.tsx`, add `data-tour` to three elements:

*Plan-name button* (line ~37, the `<button onClick={onSwitchPlan} ...>`):
```tsx
<button
  data-tour="plan-name"
  onClick={onSwitchPlan}
  className="text-[15px] font-semibold hover:opacity-80 flex items-center gap-1 transition-opacity"
  style={{ transitionDuration: 'var(--dur-state)' }}
>
```

*View-toggle container* (the `<div className="flex items-center bg-white/10 ...">` wrapping Tabelle/Schuljahr):
```tsx
<div
  data-tour="view-toggle"
  className="flex items-center bg-white/10 rounded-[var(--radius-pill)] overflow-hidden"
>
```

*Settings button* (the `<Button variant="ghost" size="icon" onClick={openSettings} ...>`):
```tsx
<Button
  data-tour="settings-btn"
  variant="ghost"
  size="icon"
  onClick={openSettings}
  className="text-[var(--color-paper-card)] hover:bg-white/10 hover:text-[var(--color-paper-card)]"
>
```

- [ ] **Step 2: EditorToolbar — quarter-tabs, add-event-btn, templates-btn**

In `src/components/editor/EditorToolbar.tsx`:

*Quarter tabs container* (the outer `<>` fragment, wrap the Q1–Q4 buttons + span in a `<div data-tour="quarter-tabs">`):
```tsx
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
```

*Templates button* — add `data-tour="templates-btn"`:
```tsx
<Button data-tour="templates-btn" variant="outline" size="sm" onClick={toggleTemplates} aria-label="Vorlagen anzeigen" title="Vorlagen">
  <LayoutTemplate />
  Vorlagen
</Button>
```

*Add event button* — add `data-tour="add-event-btn"`:
```tsx
<Button data-tour="add-event-btn" size="sm" onClick={() => openCreate()}>
  + Termin
</Button>
```

- [ ] **Step 3: ExportDropdown — export-btn**

In `src/components/export/ExportDropdown.tsx`, add `data-tour` to the trigger Button:
```tsx
<DropdownMenuTrigger asChild>
  <Button data-tour="export-btn">
    Export ↓
  </Button>
</DropdownMenuTrigger>
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/EditorHeader.tsx src/components/editor/EditorToolbar.tsx src/components/export/ExportDropdown.tsx
git commit -m "feat(tour): add data-tour anchor attributes to editor elements"
```

---

## Task 5: Create TourManager.tsx + Test

**Files:**
- Create: `src/components/tour/TourManager.tsx`
- Create: `src/components/tour/TourManager.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/tour/TourManager.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useUiStore } from '@/stores/ui';

// vi.hoisted ensures mockDrive is available inside the vi.mock factory
// (vi.mock calls are hoisted before variable declarations by Vitest)
const { mockDrive, mockDriver } = vi.hoisted(() => ({
  mockDrive: vi.fn(),
  mockDriver: vi.fn(() => ({ drive: vi.fn() })),
}));

vi.mock('driver.js', () => ({ driver: mockDriver }));
vi.mock('driver.js/dist/driver.css', () => ({}));

import { TourManager } from './TourManager';

describe('TourManager', () => {
  beforeEach(() => {
    useUiStore.setState({ tourPending: false });
    mockDriver.mockClear();
    mockDrive.mockClear();
    // Reset mockDriver to return a fresh drive spy each call
    mockDriver.mockImplementation(() => ({ drive: mockDrive }));
  });

  it('does not start tour when tourPending is false', () => {
    render(<TourManager />);
    expect(mockDriver).not.toHaveBeenCalled();
  });

  it('starts tour when tourPending is true', () => {
    useUiStore.setState({ tourPending: true });
    render(<TourManager />);
    expect(mockDriver).toHaveBeenCalledOnce();
    expect(mockDrive).toHaveBeenCalledOnce();
  });

  it('clears tourPending immediately after starting', () => {
    useUiStore.setState({ tourPending: true });
    render(<TourManager />);
    expect(useUiStore.getState().tourPending).toBe(false);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx vitest run src/components/tour/TourManager.test.tsx
```

Expected: FAIL — `TourManager` not found.

- [ ] **Step 3: Create TourManager.tsx**

```tsx
import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { TOUR_STEPS } from './tour-steps';
import { useUiStore } from '@/stores/ui';

export function TourManager() {
  const tourPending = useUiStore((s) => s.tourPending);
  const setTourPending = useUiStore((s) => s.setTourPending);

  useEffect(() => {
    if (!tourPending) return;
    setTourPending(false);
    const driverObj = driver({
      showProgress: true,
      steps: TOUR_STEPS,
      nextBtnText: 'Weiter →',
      prevBtnText: '← Zurück',
      doneBtnText: 'Fertig',
      progressText: '{{current}} / {{total}}',
    });
    driverObj.drive();
  }, [tourPending, setTourPending]);

  return null;
}
```

- [ ] **Step 4: Run — verify PASS**

```bash
npx vitest run src/components/tour/TourManager.test.tsx
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/tour/TourManager.tsx src/components/tour/TourManager.test.tsx
git commit -m "feat(tour): add TourManager component (driver.js spotlight tour)"
```

---

## Task 6: Create HelpModal — Shell + Navigation

**Files:**
- Create: `src/components/help/HelpModal.tsx`
- Create: `src/components/help/HelpModal.test.tsx`

- [ ] **Step 1: Write failing tests for shell + nav**

Create `src/components/help/HelpModal.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useUiStore } from '@/stores/ui';
import { HelpModal } from './HelpModal';

describe('HelpModal', () => {
  beforeEach(() => {
    useUiStore.setState({ helpOpen: true, tourPending: false });
  });

  it('renders when helpOpen is true', () => {
    render(<HelpModal />);
    expect(screen.getByText('Hilfe')).toBeInTheDocument();
  });

  it('does not render when helpOpen is false', () => {
    useUiStore.setState({ helpOpen: false });
    render(<HelpModal />);
    expect(screen.queryByText('Hilfe')).not.toBeInTheDocument();
  });

  it('shows Erste Schritte section by default', () => {
    render(<HelpModal />);
    expect(screen.getByTestId('section-start')).toBeInTheDocument();
  });

  it('switches to Termine section on nav click', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: /Termine & Kategorien/i }));
    expect(screen.getByTestId('section-events')).toBeInTheDocument();
  });

  it('switches to Ansichten section on nav click', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: /Ansichten/i }));
    expect(screen.getByTestId('section-views')).toBeInTheDocument();
  });

  it('switches to Vorlagen section on nav click', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: /Vorlagen/i }));
    expect(screen.getByTestId('section-templates')).toBeInTheDocument();
  });

  it('switches to Export section on nav click', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: /Export & Backup/i }));
    expect(screen.getByTestId('section-export')).toBeInTheDocument();
  });

  it('tour CTA closes help and sets tourPending', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: /Geführte Tour starten/i }));
    expect(useUiStore.getState().helpOpen).toBe(false);
    expect(useUiStore.getState().tourPending).toBe(true);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx vitest run src/components/help/HelpModal.test.tsx
```

Expected: FAIL — `HelpModal` not found.

- [ ] **Step 3: Create HelpModal.tsx with shell, navigation, and stub sections**

```tsx
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useUiStore } from '@/stores/ui';

type Section = 'start' | 'events' | 'views' | 'templates' | 'export';

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'start', label: '🚀 Erste Schritte' },
  { id: 'events', label: '📅 Termine & Kategorien' },
  { id: 'views', label: '👁 Ansichten' },
  { id: 'templates', label: '📋 Vorlagen' },
  { id: 'export', label: '📤 Export & Backup' },
];

export function HelpModal() {
  const helpOpen = useUiStore((s) => s.helpOpen);
  const closeHelp = useUiStore((s) => s.closeHelp);
  const setTourPending = useUiStore((s) => s.setTourPending);
  const [activeSection, setActiveSection] = useState<Section>('start');

  // Reset to first section each time the modal opens.
  // HelpModal stays mounted (returns null when closed), so useState persists —
  // useEffect is the correct reset mechanism here.
  useEffect(() => {
    if (helpOpen) setActiveSection('start');
  }, [helpOpen]);

  if (!helpOpen) return null;

  const handleStartTour = () => {
    closeHelp();
    setTourPending(true);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && closeHelp()}>
      <DialogContent className="!max-w-[min(960px,calc(100vw-2rem))] !w-[min(960px,calc(100vw-2rem))] max-h-[80vh] overflow-hidden p-0">
        <div className="flex h-full" style={{ minHeight: 480 }}>
          {/* Left navigation */}
          <div
            className="flex flex-col border-r border-[var(--color-ink-200)] bg-[var(--color-paper-bg)] flex-shrink-0"
            style={{ width: 200 }}
          >
            <DialogTitle className="px-4 pt-5 pb-3 text-[13px] font-bold text-[var(--color-marine-800)]">
              Hilfe
            </DialogTitle>
            <nav className="flex-1 px-2 space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full text-left px-3 py-2 rounded-[var(--radius-default)] text-[12px] font-medium transition-colors"
                  style={{
                    background: activeSection === item.id ? 'var(--color-marine-800)' : 'transparent',
                    color: activeSection === item.id ? 'var(--color-paper-card)' : 'var(--color-ink-500)',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            {/* Tour CTA */}
            <div className="p-3 border-t border-[var(--color-ink-200)]">
              <button
                onClick={handleStartTour}
                className="w-full rounded-[var(--radius-default)] py-2 text-[12px] font-bold text-center"
                style={{ background: 'var(--color-gelb-400)', color: 'var(--color-ink-900)' }}
              >
                ▶ Geführte Tour starten
              </button>
              <p className="text-center text-[10px] text-[var(--color-ink-400)] mt-1">~2 Minuten</p>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeSection === 'start' && <SectionStart />}
            {activeSection === 'events' && <SectionEvents />}
            {activeSection === 'views' && <SectionViews />}
            {activeSection === 'templates' && <SectionTemplates />}
            {activeSection === 'export' && <SectionExport />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionStart() {
  return <div data-testid="section-start"><p>Erste Schritte</p></div>;
}
function SectionEvents() {
  return <div data-testid="section-events"><p>Termine & Kategorien</p></div>;
}
function SectionViews() {
  return <div data-testid="section-views"><p>Ansichten</p></div>;
}
function SectionTemplates() {
  return <div data-testid="section-templates"><p>Vorlagen</p></div>;
}
function SectionExport() {
  return <div data-testid="section-export"><p>Export & Backup</p></div>;
}
```

- [ ] **Step 4: Run — verify PASS**

```bash
npx vitest run src/components/help/HelpModal.test.tsx
```

Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/help/HelpModal.tsx src/components/help/HelpModal.test.tsx
git commit -m "feat(help): add HelpModal shell with section navigation and tour CTA"
```

---

## Task 7: Fill HelpModal Section Content

**Files:**
- Modify: `src/components/help/HelpModal.tsx` — replace stub section functions with full content

No new tests needed — sections already covered by navigation tests. Content is static markup.

- [ ] **Step 1: Replace SectionStart**

```tsx
function SectionStart() {
  return (
    <div data-testid="section-start">
      <h2 className="text-[16px] font-bold text-[var(--color-marine-800)] mb-1">🚀 Erste Schritte</h2>
      <p className="text-[12px] text-[var(--color-ink-400)] mb-5">Wie du deinen ersten Jahresplan anlegst und loslegst.</p>

      <HelpSection title="1. Schuljahr einrichten">
        Beim ersten Start führt dich der Einrichtungs-Assistent durch Schuljahrbeginn, Ferienzeiten und Kategorien.
        Du kannst diese Angaben jederzeit unter <HelpTag>Einstellungen → Schuljahr</HelpTag> ändern.
      </HelpSection>

      <HelpSection title="2. Ersten Termin anlegen">
        Klicke auf <HelpTag>+ Termin</HelpTag> in der Werkzeugleiste.
        Vergib einen Titel, wähle Kategorie und Datum. Mehrtägige Termine: Enddatum setzen.
        Klick auf einen bestehenden Termin öffnet ihn zum Bearbeiten.
      </HelpSection>

      <HelpSection title="3. Termin verschieben">
        Termine lassen sich per <strong>Drag & Drop</strong> in der Wochentabelle verschieben.
        Ziehe am rechten Rand eines Termins, um die Dauer zu verlängern oder zu kürzen.
      </HelpSection>

      <HelpSection title="4. Plan exportieren">
        Über <HelpTag>Export ↓</HelpTag> oben rechts:
        <strong> ICS</strong> für Outlook/Google Kalender,
        <strong> Excel</strong> für das Schulwebsite-Plugin,
        <strong> JSON</strong> als Backup.
      </HelpSection>

      <div className="mt-5 bg-[var(--color-paper-bg)] border border-[var(--color-ink-200)] rounded-[var(--radius-default)] p-3">
        <p className="text-[11px] font-semibold text-[var(--color-ink-500)] mb-2">⌨ Tastaturkürzel</p>
        <div className="flex flex-wrap gap-4">
          <span className="text-[11px] text-[var(--color-ink-400)]">
            <kbd className="bg-white border border-[var(--color-ink-200)] rounded px-1 font-mono text-[10px]">Strg+Z</kbd> Rückgängig
          </span>
          <span className="text-[11px] text-[var(--color-ink-400)]">
            <kbd className="bg-white border border-[var(--color-ink-200)] rounded px-1 font-mono text-[10px]">Strg+⇧+Z</kbd> Wiederholen
          </span>
          <span className="text-[11px] text-[var(--color-ink-400)]">
            <kbd className="bg-white border border-[var(--color-ink-200)] rounded px-1 font-mono text-[10px]">Esc</kbd> Dialog schließen
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace SectionEvents**

```tsx
function SectionEvents() {
  return (
    <div data-testid="section-events">
      <h2 className="text-[16px] font-bold text-[var(--color-marine-800)] mb-1">📅 Termine & Kategorien</h2>
      <p className="text-[12px] text-[var(--color-ink-400)] mb-5">Termine anlegen, bearbeiten und strukturieren.</p>

      <HelpSection title="Termin-Formular">
        <strong>Titel:</strong> Kurzbezeichnung des Termins.<br />
        <strong>Kategorie:</strong> Farbkodierung (z. B. Schulveranstaltung, Sondertag). Kategorien anpassbar unter <HelpTag>Einstellungen → Kategorien</HelpTag>.<br />
        <strong>Datum:</strong> Einzeltermin oder mehrtägiger Zeitraum (Enddatum setzen).<br />
        <strong>Gruppen:</strong> Betroffene Klassen oder Gruppen (optional). Gruppen verwalten unter <HelpTag>Einstellungen → Gruppen</HelpTag>.<br />
        <strong>Notiz:</strong> Freitext, erscheint in der Notizen-Sidebar.
      </HelpSection>

      <HelpSection title="Kategorien">
        Kategorien bestimmen Farbe und Typ eines Termins. Standard-Kategorien (Schulveranstaltung, Sondertag, Prüfung, Ferien) sind vorkonfiguriert.
        Eigene Kategorien: <HelpTag>Einstellungen → Kategorien → + Kategorie</HelpTag>.
      </HelpSection>

      <HelpSection title="Gruppen">
        Gruppen (z. B. „Klasse 5a", „Lehrerkollegium") weisen Termine bestimmten Adressaten zu.
        Im Export werden Gruppenfilter unterstützt.
        Gruppen anlegen unter <HelpTag>Einstellungen → Gruppen</HelpTag>.
      </HelpSection>

      <HelpSection title="Konflikte">
        Das orangefarbene Badge im Header zeigt Terminüberschneidungen. Klick öffnet das Konflikt-Panel mit Details.
        Fehler (rot) = Überschneidung innerhalb derselben Gruppe. Warnungen (gelb) = Überlappung über Gruppen hinweg.
      </HelpSection>
    </div>
  );
}
```

- [ ] **Step 3: Replace SectionViews**

```tsx
function SectionViews() {
  return (
    <div data-testid="section-views">
      <h2 className="text-[16px] font-bold text-[var(--color-marine-800)] mb-1">👁 Ansichten</h2>
      <p className="text-[12px] text-[var(--color-ink-400)] mb-5">Zwei Wege, deinen Plan zu sehen.</p>

      <HelpSection title="Wochen-Tabelle (Standard)">
        Zeigt ein Quartal als Tabelle: Zeilen = Schulwochen, Spalten = Montag bis Freitag.
        Ferienwochen erscheinen als eigene Zeile ohne Schulwochennummer.
        Wechsel zwischen Q1–Q4 über die Quartals-Tabs in der Werkzeugleiste.
      </HelpSection>

      <HelpSection title="Jahresübersicht">
        Zeigt das gesamte Schuljahr als Monats-Raster.
        Termine erscheinen als farbige Balken — gut für einen schnellen Gesamtüberblick.
        Wechsel über den Toggle <HelpTag>Schuljahr</HelpTag> im Header.
      </HelpSection>

      <HelpSection title="Quartale anpassen">
        Die Quartals-Grenzen (Q1–Q4) sind im Schuljahr hinterlegt.
        Ändern unter <HelpTag>Einstellungen → Schuljahr → Quartale</HelpTag>.
      </HelpSection>
    </div>
  );
}
```

- [ ] **Step 4: Replace SectionTemplates**

```tsx
function SectionTemplates() {
  return (
    <div data-testid="section-templates">
      <h2 className="text-[16px] font-bold text-[var(--color-marine-800)] mb-1">📋 Vorlagen</h2>
      <p className="text-[12px] text-[var(--color-ink-400)] mb-5">Wiederkehrende Termine als Vorlage speichern und schnell platzieren.</p>

      <HelpSection title="Vorlage erstellen">
        Unter <HelpTag>Einstellungen → Vorlagen → + Vorlage</HelpTag> eine neue Vorlage anlegen.
        Vorlage enthält Titel, Kategorie, Dauer und optional Gruppen — aber kein festes Datum.
      </HelpSection>

      <HelpSection title="Vorlage per Drag & Drop platzieren">
        Öffne die Vorlagen-Sidebar über <HelpTag>Vorlagen</HelpTag> in der Werkzeugleiste.
        Ziehe eine Vorlage auf die gewünschte Zelle in der Wochentabelle — Termin wird mit dem Datum der Zelle angelegt.
      </HelpSection>

      <HelpSection title="Vorlage per Klick platzieren">
        Klick auf eine Vorlage in der Sidebar wählt sie aus (Rahmen erscheint).
        Danach Klick auf eine Zelle in der Tabelle — Termin wird dort angelegt.
        Erneuter Klick auf die Vorlage oder ESC hebt die Auswahl auf.
      </HelpSection>

      <HelpSection title="Vorlage bearbeiten oder löschen">
        Unter <HelpTag>Einstellungen → Vorlagen</HelpTag>: Vorlage anklicken zum Bearbeiten,
        Papierkorb-Symbol zum Löschen.
      </HelpSection>
    </div>
  );
}
```

- [ ] **Step 5: Replace SectionExport**

```tsx
function SectionExport() {
  return (
    <div data-testid="section-export">
      <h2 className="text-[16px] font-bold text-[var(--color-marine-800)] mb-1">📤 Export & Backup</h2>
      <p className="text-[12px] text-[var(--color-ink-400)] mb-5">Plan in verschiedene Formate exportieren und sichern.</p>

      <HelpSection title="ICS — Kalender-Export">
        Öffnet die ICS-Datei in Outlook, Google Kalender oder Apple Kalender.
        <strong> Einzelne Kategorie</strong> oder <strong>Gesamtplan</strong> wählbar beim Export.
        Klick: <HelpTag>Export ↓ → ICS-Datei (.ics)</HelpTag>.
      </HelpSection>

      <HelpSection title="Excel — Schulwebsite-Plugin">
        Erzeugt eine XLSX-Datei im Format des Terminplaner WordPress-Plugins.
        Diese Datei wird direkt in das Plugin auf der Schulwebsite hochgeladen.
        Klick: <HelpTag>Export ↓ → Excel-Konverter-Format (.xlsx)</HelpTag>.
      </HelpSection>

      <HelpSection title="JSON-Backup">
        Sichert den gesamten Plan als Datei. Wiederherstellen über <HelpTag>JSON-Backup laden</HelpTag> auf dem Startbildschirm.
        Nützlich für Übertragung auf einen anderen Rechner.
        Klick: <HelpTag>Export ↓ → JSON-Backup (.json)</HelpTag>.
      </HelpSection>

      <HelpSection title="Import">
        Auf dem Startbildschirm stehen vier Import-Optionen zur Verfügung:
        <strong> JSON-Backup laden</strong>, <strong>Aus ICS-Datei erstellen</strong>,
        <strong>Aus Excel-Datei erstellen</strong> (Konverter-Format), sowie <strong>Demo ausprobieren</strong>.
      </HelpSection>
    </div>
  );
}
```

- [ ] **Step 6: Add shared helper components before section functions**

Add these two helpers directly above `SectionStart` in `HelpModal.tsx`:

```tsx
function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-[12px] font-semibold text-[var(--color-ink-900)] mb-1">{title}</h3>
      <p className="text-[12px] text-[var(--color-ink-500)] leading-relaxed">{children}</p>
    </div>
  );
}

function HelpTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-[var(--color-paper-bg)] border border-[var(--color-ink-200)] rounded px-1 font-mono text-[10px] text-[var(--color-ink-700)]">
      {children}
    </span>
  );
}
```

- [ ] **Step 7: Run full test suite**

```bash
npx vitest run src/components/help/HelpModal.test.tsx
```

Expected: 8 passed.

- [ ] **Step 8: Commit**

```bash
git add src/components/help/HelpModal.tsx
git commit -m "feat(help): fill HelpModal with all 5 section content areas"
```

---

## Task 8: Wire Welcome → Tour (App.tsx + Welcome.tsx)

**Files:**
- Modify: `src/components/welcome/Welcome.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/welcome/Welcome.test.tsx` (add test)

- [ ] **Step 1: Add failing test to Welcome.test.tsx**

Open `src/components/welcome/Welcome.test.tsx` and add:

```tsx
it('renders Tour starten button', () => {
  render(
    <Welcome
      onCreateNew={() => {}}
      onOpenDoc={() => {}}
      onImportJson={() => {}}
      onStartTour={() => {}}
    />
  );
  expect(screen.getByRole('button', { name: /Tour starten/i })).toBeInTheDocument();
});

it('calls onStartTour when Tour starten is clicked', () => {
  const onStartTour = vi.fn();
  render(
    <Welcome
      onCreateNew={() => {}}
      onOpenDoc={() => {}}
      onImportJson={() => {}}
      onStartTour={onStartTour}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /Tour starten/i }));
  expect(onStartTour).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx vitest run src/components/welcome/Welcome.test.tsx
```

Expected: FAIL — `onStartTour` prop unknown, button not found.

- [ ] **Step 3: Update Welcome.tsx — add prop + button**

In `src/components/welcome/Welcome.tsx`, update the `Props` interface:

```tsx
interface Props {
  onCreateNew(): void;
  onOpenDoc(id: string): void;
  onImportJson(doc: PlannerDocument): void;
  onStartTour(): void;
}
```

Update the function signature:
```tsx
export function Welcome({ onCreateNew, onOpenDoc, onImportJson, onStartTour }: Props) {
```

Add the Tour button as the last button in the `<div className="flex flex-col gap-3">` block (after the existing Ghost "Demo ausprobieren" button):

```tsx
<Button variant="ghost" onClick={onStartTour}>
  ▶ Geführte Tour starten
</Button>
```

- [ ] **Step 4: Update App.tsx — add startTour handler**

Add these imports to `src/App.tsx`:

```tsx
import { useUiStore } from '@/stores/ui';
import { createDemoDoc } from '@/lib/demo';
```

Inside the `App` component, add after the `setDoc` line:

```tsx
const setTourPending = useUiStore((s) => s.setTourPending);
```

Add the handler before the `return`:

```tsx
const startTour = async () => {
  const doc = createDemoDoc();
  await storage.saveDoc(doc);
  await storage.setActiveDoc(doc.schoolyear.id);
  setDoc(doc);
  setTourPending(true);
  setRoute('editor');
};
```

Pass `onStartTour` to the `<Welcome>` component:

```tsx
{route === 'welcome' && (
  <Welcome
    onCreateNew={() => setRoute('wizard')}
    onOpenDoc={openDoc}
    onImportJson={importDoc}
    onStartTour={startTour}
  />
)}
```

- [ ] **Step 5: Run — verify PASS**

```bash
npx vitest run src/components/welcome/Welcome.test.tsx
```

Expected: all tests pass (including existing ones).

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/welcome/Welcome.tsx src/App.tsx src/components/welcome/Welcome.test.tsx
git commit -m "feat(tour): add Tour-starten entry point on Welcome screen"
```

---

## Task 9: Wire Editor — ? Button + Mount Components

**Files:**
- Modify: `src/components/editor/EditorHeader.tsx`
- Modify: `src/components/editor/Editor.tsx`

- [ ] **Step 1: Add ? button to EditorHeader**

Add `HelpCircle` to the lucide-react import:

```tsx
import { Settings as SettingsIcon, HelpCircle } from 'lucide-react';
```

Add `openHelp` from the ui store (after the existing `openSettings` line):

```tsx
const openHelp = useUiStore((s) => s.openHelp);
```

Add the `?` button immediately before the settings button:

```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={openHelp}
  aria-label="Hilfe"
  title="Hilfe"
  className="text-[var(--color-paper-card)] hover:bg-white/10 hover:text-[var(--color-paper-card)]"
>
  <HelpCircle className="w-4 h-4" />
</Button>
<Button variant="ghost" size="icon" onClick={openSettings} ...>
```

- [ ] **Step 2: Mount TourManager and HelpModal in Editor.tsx**

Open `src/components/editor/Editor.tsx`. Add imports:

```tsx
import { TourManager } from '@/components/tour/TourManager';
import { HelpModal } from '@/components/help/HelpModal';
```

Inside the Editor component's return, add both components. Place them as the last children before the closing tag of the outermost container:

```tsx
<TourManager />
<HelpModal />
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
npm run test:run
```

Expected: all existing tests pass plus new tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/EditorHeader.tsx src/components/editor/Editor.tsx
git commit -m "feat(help): add ? button to EditorHeader, mount TourManager and HelpModal in Editor"
```

---

## Task 10: driver.js CSS Overrides

**Files:**
- Modify: `src/styles/globals.css`

No test — visual, verified by manual smoke.

- [ ] **Step 1: Add overrides to globals.css**

Append to the end of `src/styles/globals.css`:

```css
/* driver.js spotlight tour — brand overrides */
.driver-popover {
  background: var(--color-paper-card) !important;
  border: 1px solid var(--color-ink-200) !important;
  border-radius: var(--radius-block) !important;
  box-shadow: var(--shadow-modal) !important;
  font-family: inherit !important;
}

.driver-popover-title {
  color: var(--color-marine-800) !important;
  font-size: 14px !important;
  font-weight: 700 !important;
}

.driver-popover-description {
  color: var(--color-ink-500) !important;
  font-size: 12px !important;
  line-height: 1.6 !important;
}

.driver-popover-progress-text {
  color: var(--color-ink-400) !important;
  font-size: 11px !important;
}

.driver-popover-next-btn,
.driver-popover-done-btn {
  background: var(--color-marine-800) !important;
  color: var(--color-paper-card) !important;
  border: none !important;
  border-radius: var(--radius-pill) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  padding: 4px 12px !important;
}

.driver-popover-prev-btn {
  background: transparent !important;
  color: var(--color-ink-500) !important;
  border: 1px solid var(--color-ink-200) !important;
  border-radius: var(--radius-pill) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  padding: 4px 12px !important;
}

.driver-popover-close-btn {
  color: var(--color-ink-400) !important;
}

.driver-active-element {
  outline: 3px solid var(--color-gelb-400) !important;
  outline-offset: 2px !important;
}
```

- [ ] **Step 2: Start dev server and smoke test manually**

```bash
npm run dev
```

Open http://localhost:5173. Click "▶ Geführte Tour starten" on the Welcome screen. Verify:
- Demo doc loads → editor opens
- Tour starts automatically (Schritt 1 of 8: Intro-Popup)
- Spotlight highlight uses Gelb border, not default blue
- Popover uses marine header, Inter font
- Navigation buttons work (Weiter / Zurück / Fertig)
- After tour ends, editor is fully usable

Then click `?` in the header:
- HelpModal opens
- Left nav switches sections
- "Geführte Tour starten" closes modal and starts tour

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(tour): apply Curriculr brand styles to driver.js popover"
```

---

## Task 11: Final Checks + Lint

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass, 0 failures.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: 0 warnings, 0 errors. If lint flags unused imports or missing `React` imports, fix them.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: build succeeds, no TypeScript errors in output.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(onboarding): add guided tour (driver.js) and help modal — complete"
```

---

## Quick Reference: What Was Built

| Feature | Entry Point | Behavior |
|---|---|---|
| Geführte Tour | Welcome → "▶ Tour starten" | Loads demo doc, opens editor, starts 8-step spotlight tour |
| Geführte Tour | HelpModal → "▶ Tour starten" | Closes modal, starts 8-step tour on current doc |
| Hilfe-Modal | Editor header `?` button | Opens two-panel modal with 5 reference sections |
| Tour abbrechen | ESC während Tour | driver.js built-in — tour stops cleanly |
