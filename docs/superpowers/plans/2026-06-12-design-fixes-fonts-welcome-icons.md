# Design Fixes: Self-Hosted Fonts, Welcome Hierarchy, Icon Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four design-quality issues identified in the taste-skill review: DSGVO-violating Google Fonts import, mobile viewport bug, flat button hierarchy on welcome screen, and Unicode-character pseudo-icons in header.

**Architecture:** Purely cosmetic/dependency changes — no runtime logic changes, no API changes, no store changes. Each task is isolated to 1–2 files. All existing tests must still pass after every task.

**Tech Stack:** React 18, Vite, Tailwind v4, `@fontsource/inter` (to be installed), `lucide-react` (already in deps), vitest + @testing-library/react for regression checks.

---

## File Map

| File | What changes |
|------|-------------|
| `src/styles/globals.css` | Remove Google Fonts `@import url(...)`, add local `@fontsource/inter` imports; fix `--radius-btn` token |
| `package.json` | Add `@fontsource/inter`, remove `@fontsource-variable/geist` |
| `src/components/welcome/Welcome.tsx` | `min-h-screen` → `min-h-[100dvh]`; button group restructure; `▶` → `<Play>` icon |
| `src/components/editor/EditorHeader.tsx` | Unicode `●/○/⚠` in `stateLabel` → Lucide icon components |

---

## Task 1: Replace Google Fonts with Self-Hosted @fontsource/inter

**Why:** Google Fonts `@import url(...)` sends every visitor's IP to Google. For a German school tool this violates DSGVO. Also render-blocking.

**Files:**
- Modify: `package.json`
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Install @fontsource/inter, remove geist**

```bash
cd /Users/julian.wagner/curriculr-planner/curriculr-planner
npm install @fontsource/inter
npm uninstall @fontsource-variable/geist
```

Expected: `package.json` now has `"@fontsource/inter": "^5.x.x"` and no `@fontsource-variable/geist`.

- [ ] **Step 2: Verify test suite still passes (baseline)**

```bash
npm run test:run
```

Expected: all 259 tests pass. If any fail here, stop — pre-existing issue.

- [ ] **Step 3: Replace the Google Fonts import in globals.css**

Open `src/styles/globals.css`. The first line currently is:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;500;600;700&display=swap');
```

Replace it with:
```css
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/inter/700.css';
```

The `display=swap` behavior is the default for fontsource packages — no extra config needed.

- [ ] **Step 4: Verify build succeeds**

```bash
npm run build
```

Expected: `dist/` produced, no errors. If Vite complains about the fontsource import path, check the exact package name with `ls node_modules | grep fontsource`.

- [ ] **Step 5: Run tests again to confirm no regressions**

```bash
npm run test:run
```

Expected: same pass count as Step 2.

- [ ] **Step 6: Fix --radius-btn token in globals.css**

In `src/styles/globals.css`, find the line:
```css
--radius-btn: 9999px;
```

Replace with:
```css
--radius-btn: var(--radius-default);
```

This aligns the token with DESIGN.md which specifies 10px (`rounded-default`) for buttons. The pill shape belongs only to Quartal-Tabs and View-Toggle, which explicitly set `rounded-[var(--radius-pill)]` inline.

- [ ] **Step 7: Run lint to confirm no CSS issues**

```bash
npm run lint
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/styles/globals.css package.json package-lock.json
git commit -m "fix(fonts): replace Google Fonts with @fontsource/inter; fix radius-btn token

- Removes DSGVO-violating Google Fonts CDN import
- Self-hosted via @fontsource/inter (400/500/600/700)
- Removes unused @fontsource-variable/geist dependency
- Fixes --radius-btn from 9999px to var(--radius-default) per DESIGN.md"
```

---

## Task 2: Fix Welcome Screen — Viewport Bug + Button Hierarchy + Tour Icon

**Why:** `min-h-screen` causes layout jump on iOS Safari. Six flat outline buttons have no visual hierarchy. The `▶` Unicode character renders inconsistently across fonts/OS.

**Files:**
- Modify: `src/components/welcome/Welcome.tsx`

- [ ] **Step 1: Confirm existing Welcome tests pass**

```bash
npx vitest run src/components/welcome/Welcome.test.tsx
```

Expected: 6 tests pass. Note the test `renders Tour starten button` matches `/Tour starten/i` — the label must still contain "Tour starten" after the rename.

- [ ] **Step 2: Fix min-h-screen → min-h-[100dvh]**

In `src/components/welcome/Welcome.tsx`, find:
```tsx
<div className="min-h-screen flex items-center justify-center p-8">
```

Replace with:
```tsx
<div className="min-h-[100dvh] flex items-center justify-center p-8">
```

- [ ] **Step 3: Add Play icon import**

`lucide-react` is already in dependencies. At the top of `Welcome.tsx`, add `Play` to the lucide import (or add a new import if there is none):

```tsx
import { Play } from 'lucide-react';
```

- [ ] **Step 4: Restructure button group with visual hierarchy**

Find the `<div className="flex flex-col gap-3">` section containing all the buttons. Replace it with this grouped structure:

```tsx
{/* Primary action */}
<Button size="lg" onClick={onCreateNew}>
  + Neuen Jahresplan erstellen
</Button>

{/* Import group */}
<div className="flex flex-col gap-2 pt-1">
  <div className="text-[11px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em] px-1">
    Aus Datei importieren
  </div>
  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
    JSON-Backup laden
  </Button>
  <Button variant="outline" onClick={() => icsInputRef.current?.click()}>
    Aus ICS-Datei erstellen
  </Button>
  <Button variant="outline" onClick={() => xlsxInputRef.current?.click()}>
    Aus Excel-Datei erstellen
  </Button>
</div>

{/* Utility group */}
<div className="flex flex-col gap-1 pt-1 border-t border-[var(--color-ink-200)]">
  <Button variant="ghost" onClick={() => onImportJson(createDemoDoc())}>
    Demo ausprobieren
  </Button>
  <Button variant="ghost" onClick={onStartTour} className="flex items-center gap-1.5">
    <Play className="w-3 h-3" />
    Geführte Tour starten
  </Button>
</div>

{/* Keep hidden file inputs */}
<input ref={fileInputRef} type="file" accept=".json" className="hidden"
  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
<input ref={icsInputRef} type="file" accept=".ics" className="hidden"
  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIcs(f); e.target.value = ''; }} />
<input ref={xlsxInputRef} type="file" accept=".xlsx" className="hidden"
  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleXlsx(f); e.target.value = ''; }} />
```

Note: The `▶` is removed from the Tour button. Text now reads "Geführte Tour starten" which still matches the test's `/Tour starten/i` regex.

- [ ] **Step 5: Run Welcome tests to confirm no regressions**

```bash
npx vitest run src/components/welcome/Welcome.test.tsx
```

Expected: all 6 tests still pass. If the "Tour starten" test fails, verify the button label still contains "Tour starten".

- [ ] **Step 6: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/welcome/Welcome.tsx
git commit -m "fix(welcome): viewport height, button hierarchy, replace unicode play icon

- min-h-screen → min-h-[100dvh] (iOS Safari address bar fix)
- Buttons grouped: primary / import group (with label) / utility (divider)
- ▶ unicode removed, replaced with Lucide Play icon on Tour button"
```

---

## Task 3: Replace Unicode State Indicators in EditorHeader with Lucide Icons

**Why:** `●`, `○`, `⚠` are Unicode characters that render inconsistently across fonts, have poor screen-reader semantics, and break the icon-library discipline.

**Files:**
- Modify: `src/components/editor/EditorHeader.tsx`

No existing unit test for EditorHeader. Regression check = full test suite.

- [ ] **Step 1: Run full test suite as baseline**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 2: Add Lucide icon imports to EditorHeader.tsx**

At the top of `src/components/editor/EditorHeader.tsx`, find the existing import:
```tsx
import { Settings as SettingsIcon, HelpCircle } from 'lucide-react';
```

Replace with:
```tsx
import { Settings as SettingsIcon, HelpCircle, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
```

- [ ] **Step 3: Replace stateLabel string map with a stateIndicator component**

Find the `stateLabel` const:
```ts
const stateLabel = {
  idle: '● Gespeichert',
  saving: '○ Speichert…',
  saved: '● Gespeichert',
  error: '⚠ Fehler beim Speichern'
}[savingState];
```

Replace with a `stateIndicator` that renders an icon + text:
```tsx
const stateIndicator = {
  idle:   <><CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Gespeichert</>,
  saving: <><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Speichert…</>,
  saved:  <><CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Gespeichert</>,
  error:  <><AlertTriangle className="w-3 h-3" aria-hidden="true" /> Fehler beim Speichern</>,
}[savingState];
```

- [ ] **Step 4: Update the JSX that renders stateLabel to use stateIndicator**

Find:
```tsx
<span className="px-3 py-1 rounded-[var(--radius-pill)] bg-white/10 tabular-nums">{stateLabel}</span>
```

Replace with:
```tsx
<span className="px-3 py-1 rounded-[var(--radius-pill)] bg-white/10 flex items-center gap-1.5 tabular-nums">
  {stateIndicator}
</span>
```

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: 0 warnings. The `stateLabel` variable is gone — make sure no other references to it remain in the file (`grep stateLabel src/components/editor/EditorHeader.tsx` should return nothing).

- [ ] **Step 6: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/editor/EditorHeader.tsx
git commit -m "fix(header): replace unicode state circles with Lucide icons

Replaces ●/○/⚠ Unicode characters with CheckCircle2/Loader2/AlertTriangle
from lucide-react. Consistent rendering across fonts/OS, correct
screen-reader semantics with aria-hidden on decorative icons."
```

---

## Self-Review

**Spec coverage:**
- [x] DSGVO Google Fonts → Task 1
- [x] `min-h-screen` → Task 2
- [x] Welcome button hierarchy → Task 2
- [x] `▶` unicode icon → Task 2
- [x] State label Unicode circles → Task 3
- [x] Remove `@fontsource-variable/geist` → Task 1
- [x] Fix `--radius-btn` token → Task 1

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:** No type changes. Only JSX/CSS edits. No cross-task interface dependencies.

**Test safety:** Welcome.test.tsx matches `/Tour starten/i` — button label "Geführte Tour starten" still matches. All other tests are unaffected by CSS/icon changes.
