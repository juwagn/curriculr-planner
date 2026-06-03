# Print Window Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragile `@media print` + React portal approach with a dedicated `window.open()` print window that generates a complete, self-contained HTML document — eliminating cell overflow, unit inconsistencies, and CSS cascade issues.

**Architecture:** `print-window.ts` is a pure HTML-generation module. `openPrintWindow()` builds the model, generates the HTML string, opens a new browser window, triggers print, and auto-closes. `PrintDialog` calls `openPrintWindow()` directly. `Editor` no longer pre-computes a print model.

**Tech Stack:** TypeScript, Vitest (pure string tests), no new dependencies

---

## File Map

| File | Action |
|------|--------|
| `src/lib/print-window.ts` | Create — `generatePrintHtml()` + `openPrintWindow()` |
| `src/lib/print-window.test.ts` | Create — unit tests for `generatePrintHtml()` |
| `src/components/print/PrintDialog.tsx` | Modify — wire to `openPrintWindow()` |
| `src/components/editor/Editor.tsx` | Modify — remove `printModel` useMemo + `<PrintDocument>` |
| `src/styles/globals.css` | Modify — remove `@import './print.css'` |
| `src/lib/print-orientation.ts` | Delete |
| `src/lib/print-orientation.test.ts` | Delete |
| `src/styles/print.css` | Delete |
| `src/components/print/PrintDocument.tsx` | Delete |
| `src/components/print/PrintDocument.test.tsx` | Delete |

---

## Task 1: Create `print-window.ts` + tests (TDD)

**Files:**
- Create: `src/lib/print-window.test.ts`
- Create: `src/lib/print-window.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/lib/print-window.test.ts` with this exact content:

```ts
import { describe, it, expect } from 'vitest';
import { generatePrintHtml } from './print-window';
import type { PrintModel } from './print-model';

const MODEL: PrintModel = {
  schoolName: 'Testschule',
  schoolInfo: 'Musterstr. 1',
  docName: 'Testplan 2025/26',
  schoolyearLabel: '2025/26',
  sections: [
    {
      quarterIndex: 1,
      quarterLabel: '1. Quartal · Sep 2025 – Okt 2025',
      rows: [
        {
          type: 'week',
          swIndex: '00',
          dateRange: '01.09.–05.09.',
          cells: [
            { events: [{ title: 'Einschulung', time: '09:00' }] },
            { events: [] },
            { events: [] },
            { events: [] },
            { events: [] }
          ],
          annotation: 'Begrüßungswoche'
        },
        {
          type: 'holiday',
          label: 'Herbstferien',
          dateRange: '06.10.–17.10.'
        }
      ]
    }
  ],
  printedAt: '2026-06-03'
};

describe('generatePrintHtml', () => {
  it('contains school name', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('Testschule');
  });

  it('contains event title', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('Einschulung');
  });

  it('contains timed event time prefix', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('09:00');
  });

  it('sets A4 landscape in @page when orientation is landscape', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('size: A4 landscape');
  });

  it('sets A4 portrait in @page when orientation is portrait', () => {
    const html = generatePrintHtml(MODEL, 'portrait');
    expect(html).toContain('size: A4 portrait');
  });

  it('holiday row has colspan="8"', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('colspan="8"');
  });

  it('empty cell contains writeline spans', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('class="writeline"');
  });

  it('annotation text appears in output', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('Begrüßungswoche');
  });

  it('event div has no inline color or background style', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    const match = html.match(/<div class="event"[^>]*>/);
    expect(match).not.toBeNull();
    expect(match![0]).not.toContain('color:');
    expect(match![0]).not.toContain('background');
  });

  it('escapes HTML special characters in school name', () => {
    const model = { ...MODEL, schoolName: '<b>Bad &amp; School</b>' };
    const html = generatePrintHtml(model, 'landscape');
    expect(html).not.toContain('<b>Bad &amp; School</b>');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
cd /Users/julian.wagner/curriculr-planner/curriculr-planner && npx vitest run src/lib/print-window.test.ts
```

Expected: `Error: Failed to resolve import "./print-window"`

- [ ] **Step 3: Create `src/lib/print-window.ts`**

```ts
import { buildPrintModel } from './print-model';
import type { PrintModel, PrintWeekRow, PrintHolidayRow, PrintScope } from './print-model';
import type { PlannerDocument } from '@/types';

export function openPrintWindow(
  doc: PlannerDocument,
  scope: PrintScope,
  currentQuarter: 1 | 2 | 3 | 4,
  orientation: 'portrait' | 'landscape'
): void {
  const model = buildPrintModel(doc, scope, currentQuarter);
  const html = generatePrintHtml(model, orientation);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.addEventListener('afterprint', () => win.close());
}

export function generatePrintHtml(
  model: PrintModel,
  orientation: 'portrait' | 'landscape'
): string {
  const css = `
    @page { size: A4 ${orientation}; margin: 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    body { font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; font-size: 9pt; color: #1a1a1a; line-height: 1.3; }
    .print-section + .print-section { break-before: page; }
    .page-header { background: #00345C; color: #fff; padding: 6pt 10pt; display: flex; justify-content: space-between; align-items: center; margin-bottom: 5pt; }
    .school-name { font-weight: 700; font-size: 11pt; }
    .school-year { font-size: 9pt; opacity: 0.85; }
    .doc-name { font-size: 7.5pt; opacity: 0.7; margin-top: 1pt; }
    .quarter-badge { background: #FFC857; color: #00345C; font-weight: 700; padding: 2pt 8pt; border-radius: 10pt; font-size: 8pt; white-space: nowrap; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8pt; }
    col.col-num { width: 9mm; }
    col.col-date { width: 22mm; }
    col.col-ann { width: 40mm; }
    th { background: #00345C; color: #fff; font-weight: 600; font-size: 7pt; letter-spacing: 0.04em; padding: 3pt 4pt; border: 0.5pt solid rgba(255,255,255,0.2); text-align: left; }
    th.th-num { text-align: center; }
    td { border: 0.5pt solid #ccc; padding: 3pt 4pt; vertical-align: top; overflow: hidden; }
    td.td-num { background: #f5f5f5; font-weight: 700; font-size: 10pt; text-align: center; vertical-align: middle; color: #00345C; }
    td.td-date { background: #f5f5f5; white-space: nowrap; font-size: 7.5pt; color: #555; vertical-align: middle; }
    td.td-ann { word-break: break-word; white-space: normal; font-size: 7.5pt; color: #444; }
    .event { border: 0.75pt solid #333; border-radius: 1.5pt; padding: 1.5pt 3pt; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 1.5pt; font-size: 7.5pt; line-height: 1.3; }
    .event-time { font-size: 6.5pt; opacity: 0.7; margin-right: 2pt; }
    .writeline { border-bottom: 0.5pt dashed #ccc; height: 10pt; margin-bottom: 2pt; display: block; }
    .holiday-row td { background-image: repeating-linear-gradient(45deg, #e8e8e8 0 4pt, #f0f0f0 4pt 8pt); text-align: center; font-style: italic; font-weight: 600; font-size: 8pt; color: #555; padding: 5pt; }
    .page-footer { margin-top: 4pt; border-top: 0.5pt solid #ccc; padding-top: 3pt; display: flex; justify-content: space-between; font-size: 7pt; color: #999; }
    tr { break-inside: avoid; }
    thead { display: table-header-group; }
  `;

  const sections = model.sections.map((section) => {
    const rows = section.rows.map((row) =>
      row.type === 'holiday' ? renderHolidayRow(row) : renderWeekRow(row)
    ).join('');

    const schoolInfoPart = model.schoolInfo ? ` · ${escHtml(model.schoolInfo)}` : '';

    return `
<div class="print-section">
  <div class="page-header">
    <div>
      <span class="school-name">${escHtml(model.schoolName)}</span>
      <span> · </span>
      <span class="school-year">${escHtml(model.schoolyearLabel)}</span>
      <div class="doc-name">${escHtml(model.docName)}</div>
    </div>
    <span class="quarter-badge">${escHtml(section.quarterLabel)}</span>
  </div>
  <table>
    <colgroup>
      <col class="col-num" /><col class="col-date" />
      <col class="col-day" /><col class="col-day" /><col class="col-day" /><col class="col-day" /><col class="col-day" />
      <col class="col-ann" />
    </colgroup>
    <thead>
      <tr>
        <th class="th-num">#</th><th>Datum</th>
        <th>Mo</th><th>Di</th><th>Mi</th><th>Do</th><th>Fr</th>
        <th>Anmerkungen</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="page-footer">
    <span>Curriculr · Schulplaner${schoolInfoPart}</span>
    <span>Stand: ${escHtml(model.printedAt)} · ${escHtml(section.quarterLabel)}</span>
  </div>
</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(model.schoolName)} · ${escHtml(model.schoolyearLabel)}</title>
  <style>${css}</style>
</head>
<body>${sections}</body>
</html>`;
}

function renderWeekRow(row: PrintWeekRow): string {
  const dayCells = row.cells.map((cell) => {
    if (cell.events.length > 0) {
      const events = cell.events.map((ev) => {
        const time = ev.time ? `<span class="event-time">${escHtml(ev.time)}</span>` : '';
        return `<div class="event">${time}${escHtml(ev.title)}</div>`;
      }).join('');
      return `<td>${events}</td>`;
    }
    return `<td><span class="writeline"></span><span class="writeline"></span></td>`;
  }).join('');

  return `<tr>
  <td class="td-num">${escHtml(row.swIndex)}</td>
  <td class="td-date">${escHtml(row.dateRange)}</td>
  ${dayCells}
  <td class="td-ann">${row.annotation ? escHtml(row.annotation) : ''}</td>
</tr>`;
}

function renderHolidayRow(row: PrintHolidayRow): string {
  return `<tr class="holiday-row"><td colspan="8">${escHtml(row.label)} · ${escHtml(row.dateRange)}</td></tr>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

- [ ] **Step 4: Run tests — expect all 10 pass**

```bash
npx vitest run src/lib/print-window.test.ts
```

Expected: `Tests 10 passed (10)`

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/print-window.ts src/lib/print-window.test.ts
git commit -m "feat(print): add print-window — generatePrintHtml + openPrintWindow"
```

---

## Task 2: Wire `PrintDialog.tsx` to `openPrintWindow`

**Files:**
- Modify: `src/components/print/PrintDialog.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui';
import { usePlannerStore } from '@/stores/planner';
import { openPrintWindow } from '@/lib/print-window';

export function PrintDialog() {
  const open = useUiStore((s) => s.printDialogOpen);
  const close = useUiStore((s) => s.closePrintDialog);
  const scope = useUiStore((s) => s.printScope);
  const setScope = useUiStore((s) => s.setPrintScope);
  const orientation = useUiStore((s) => s.printOrientation);
  const setOrientation = useUiStore((s) => s.setPrintOrientation);
  const currentQuarter = useUiStore((s) => s.currentQuarter);

  const handlePrint = () => {
    const doc = usePlannerStore.getState().doc;
    if (!doc) return;
    openPrintWindow(doc, scope, currentQuarter, orientation);
    close();
  };

  if (!open) return null;

  const radioRow = (label: string, checked: boolean, onChange: () => void) => (
    <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[var(--color-ink-900)]">
      <input type="radio" checked={checked} onChange={onChange} className="accent-[var(--color-marine-800)]" />
      {label}
    </label>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Als PDF drucken</DialogTitle>
        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Umfang</p>
            {radioRow('Aktuelles Quartal', scope === 'currentQuarter', () => setScope('currentQuarter'))}
            {radioRow('Ganzes Schuljahr (Q1–4)', scope === 'allQuarters', () => setScope('allQuarters'))}
          </div>
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Format</p>
            {radioRow('Hochformat (A4)', orientation === 'portrait', () => setOrientation('portrait'))}
            {radioRow('Querformat (A4)', orientation === 'landscape', () => setOrientation('landscape'))}
          </div>
          <Button className="w-full" onClick={handlePrint}>
            Drucken / Als PDF speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/print/PrintDialog.tsx
git commit -m "feat(print): wire PrintDialog to openPrintWindow"
```

---

## Task 3: Clean up `Editor.tsx`

**Files:**
- Modify: `src/components/editor/Editor.tsx`

- [ ] **Step 1: Remove print-related lines**

Make these exact removals in `src/components/editor/Editor.tsx`:

**Line 1** — change `import { useState, useMemo } from 'react';` to:
```tsx
import { useState } from 'react';
```

**Lines 17–18** — remove both lines entirely:
```tsx
import { buildPrintModel } from '@/lib/print-model';
import { PrintDocument } from '@/components/print/PrintDocument';
```

**Lines 28–29** — remove both lines entirely:
```tsx
  const printScope = useUiStore((s) => s.printScope);
  const currentQuarter = useUiStore((s) => s.currentQuarter);
```

**Lines 51–54** — remove the entire useMemo block:
```tsx
  const printModel = useMemo(
    () => (doc ? buildPrintModel(doc, printScope, currentQuarter) : null),
    [doc, printScope, currentQuarter]
  );
```

**Line 122** — remove this line entirely:
```tsx
      <PrintDocument model={printModel} />
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/Editor.tsx
git commit -m "refactor(editor): remove printModel pre-computation and PrintDocument render"
```

---

## Task 4: Delete dead files + remove print.css

**Files:**
- Delete: `src/lib/print-orientation.ts`
- Delete: `src/lib/print-orientation.test.ts`
- Delete: `src/components/print/PrintDocument.tsx`
- Delete: `src/components/print/PrintDocument.test.tsx`
- Delete: `src/styles/print.css`
- Modify: `src/styles/globals.css` — remove `@import './print.css';`

- [ ] **Step 1: Delete the five dead files**

```bash
rm src/lib/print-orientation.ts \
   src/lib/print-orientation.test.ts \
   src/components/print/PrintDocument.tsx \
   src/components/print/PrintDocument.test.tsx \
   src/styles/print.css
```

- [ ] **Step 2: Remove the print.css import from `src/styles/globals.css`**

In `src/styles/globals.css`, find and remove line 9:
```css
@import './print.css';
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

Expected: all tests pass. Test count will be lower than before (deleted test files).

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "chore(print): delete PrintDocument, print-orientation, print.css — replaced by print-window"
git push
```
