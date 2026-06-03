# Print Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the PDF/print output to work correctly in black-and-white: events shown as plain bordered boxes (title + time only), empty cells with dashed writelines, no legend, hardcoded colors, and fixed page-counter/overflow bugs.

**Architecture:** `print-model.ts` owns all data preparation and is simplified to remove color/legend concerns. `PrintDocument.tsx` is purely presentational and is fully rewritten. No schema changes.

**Tech Stack:** React (portal), TypeScript, inline styles (print context), Vitest

---

## File Map

| File | Change |
|------|--------|
| `src/lib/print-model.ts` | Simplify `PrintEvent` (remove `color`, `bgColor`); remove `PrintLegendItem` + `legend` |
| `src/lib/print-model.test.ts` | Remove legend assertions; verify `time` field still works |
| `src/components/print/PrintDocument.tsx` | Full rewrite: bordered event boxes, dashed writelines, hardcoded colors, fixed footer |
| `src/components/print/PrintDocument.test.tsx` | Update `MODEL` fixture; remove legend test |
| `src/styles/print.css` | Remove broken `@page counter-increment` and `.print-page-number::after` rules |

---

## Task 1: Update test fixtures + remove legend tests

**Files:**
- Modify: `src/lib/print-model.test.ts`
- Modify: `src/components/print/PrintDocument.test.tsx`

- [ ] **Step 1: Update `print-model.test.ts` — remove the two legend tests**

Replace the two legend tests at the bottom of the file (lines 98–113) with nothing. Keep all other tests. The file should end after the `'timed event carries time in the event chip'` test.

```ts
// DELETE these two tests entirely:
//
//   it('legend contains only categories with events', () => { ... });
//   it('legend excludes unused categories', () => { ... });
```

Final end of the file after removal:

```ts
  it('timed event carries time in the event chip', () => {
    const model = buildPrintModel(DOC, 'currentQuarter', 1);
    const sw0 = model.sections[0].rows.find(
      (r) => r.type === 'week' && r.swIndex === '00'
    ) as import('./print-model').PrintWeekRow;
    const elternabend = sw0.cells[3].events.find((e) => e.title === 'Elternabend');
    expect(elternabend?.time).toBe('19:00');
  });
});
```

- [ ] **Step 2: Update `PrintDocument.test.tsx` — fix MODEL fixture and remove legend test**

Replace the entire file content:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PrintDocument } from './PrintDocument';
import type { PrintModel } from '@/lib/print-model';

const MODEL: PrintModel = {
  schoolName: 'Grundschule Muster',
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
            { events: [{ title: 'Einschulung', time: undefined }] },
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
  printedAt: '2026-06-02'
};

describe('PrintDocument', () => {
  it('renders school name in header', () => {
    render(<PrintDocument model={MODEL} />);
    expect(screen.getByText('Grundschule Muster')).toBeInTheDocument();
  });

  it('renders quarter label', () => {
    render(<PrintDocument model={MODEL} />);
    expect(screen.getByText(/1\. Quartal/)).toBeInTheDocument();
  });

  it('renders school week row with SW index', () => {
    render(<PrintDocument model={MODEL} />);
    expect(screen.getByText('00')).toBeInTheDocument();
  });

  it('renders event title', () => {
    render(<PrintDocument model={MODEL} />);
    expect(screen.getByText('Einschulung')).toBeInTheDocument();
  });

  it('renders holiday row label', () => {
    render(<PrintDocument model={MODEL} />);
    expect(screen.getByText(/Herbstferien/)).toBeInTheDocument();
  });

  it('renders annotation text', () => {
    render(<PrintDocument model={MODEL} />);
    expect(screen.getByText('Begrüßungswoche')).toBeInTheDocument();
  });

  it('renders nothing when model is null', () => {
    const { container } = render(<PrintDocument model={null} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests — expect TypeScript/type errors (fixtures now mismatch old PrintEvent shape)**

```bash
cd curriculr-planner && npx vitest run src/lib/print-model.test.ts src/components/print/PrintDocument.test.tsx
```

Expected: failures due to `legend` / `color` / `bgColor` not matching old types. That's correct — tests are ahead of the implementation.

---

## Task 2: Simplify `print-model.ts`

**Files:**
- Modify: `src/lib/print-model.ts`

- [ ] **Step 1: Replace the full file content**

```ts
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { computeWeekRows, getQuarterRange } from './schoolweeks';
import type { PlannerDocument } from '@/types';
import type { WeekRow } from './schoolweeks';

export type PrintScope = 'currentQuarter' | 'allQuarters';

export interface PrintEvent {
  title: string;
  time?: string;
}

export interface PrintCell {
  events: PrintEvent[];
}

export interface PrintWeekRow {
  type: 'week';
  swIndex: string;
  dateRange: string;
  cells: [PrintCell, PrintCell, PrintCell, PrintCell, PrintCell];
  annotation?: string;
}

export interface PrintHolidayRow {
  type: 'holiday';
  label: string;
  dateRange: string;
}

export interface PrintSection {
  quarterIndex: 1 | 2 | 3 | 4;
  quarterLabel: string;
  rows: (PrintWeekRow | PrintHolidayRow)[];
}

export interface PrintModel {
  schoolName: string;
  schoolInfo?: string;
  docName: string;
  schoolyearLabel: string;
  sections: PrintSection[];
  printedAt: string;
}

function fmtDot(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

function buildSection(
  doc: PlannerDocument,
  quarter: 1 | 2 | 3 | 4,
  allWeekRows: WeekRow[]
): PrintSection {
  const range = getQuarterRange(quarter, doc.schoolyear);

  const quarterRows = allWeekRows.filter(
    (r) => r.startDate <= range.endDate && r.endDate >= range.startDate
  );

  const eventsByDate = new Map<string, PlannerDocument['events']>();
  for (const ev of doc.events) {
    const spanDays = Math.max(0, differenceInCalendarDays(parseISO(ev.end), parseISO(ev.start)));
    for (let i = 0; i <= spanDays; i++) {
      const iso = format(addDays(parseISO(ev.start), i), 'yyyy-MM-dd');
      const arr = eventsByDate.get(iso) ?? [];
      arr.push(ev);
      eventsByDate.set(iso, arr);
    }
  }

  const rows: (PrintWeekRow | PrintHolidayRow)[] = quarterRows.map((row) => {
    if (row.kind === 'holiday') {
      return {
        type: 'holiday',
        label: row.label,
        dateRange: `${fmtDot(row.startDate)}–${fmtDot(row.endDate)}`
      } satisfies PrintHolidayRow;
    }

    const cells: [PrintCell, PrintCell, PrintCell, PrintCell, PrintCell] = [
      { events: [] }, { events: [] }, { events: [] }, { events: [] }, { events: [] }
    ];

    for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
      const iso = format(addDays(parseISO(row.startDate), dayIdx), 'yyyy-MM-dd');
      const dayEvents = eventsByDate.get(iso) ?? [];
      cells[dayIdx].events = dayEvents.map((ev) => ({
        title: ev.title,
        time: ev.allDay ? undefined : ev.startTime
      }));
    }

    const annotation = doc.annotations.find((a) => a.schoolweek === row.index);

    return {
      type: 'week',
      swIndex: row.index.toString().padStart(2, '0'),
      dateRange: `${fmtDot(row.startDate)}–${fmtDot(row.endDate)}`,
      cells,
      annotation: annotation?.text
    } satisfies PrintWeekRow;
  });

  const startFmt = format(parseISO(range.startDate), 'MMM yyyy', { locale: de });
  const endFmt = format(parseISO(range.endDate), 'MMM yyyy', { locale: de });
  const quarterLabel = `${quarter}. Quartal · ${startFmt} – ${endFmt}`;

  return { quarterIndex: quarter, quarterLabel, rows };
}

export function buildPrintModel(
  doc: PlannerDocument,
  scope: PrintScope,
  currentQuarter: 1 | 2 | 3 | 4
): PrintModel {
  const allWeekRows = computeWeekRows(doc.schoolyear);
  const quarters: (1 | 2 | 3 | 4)[] =
    scope === 'allQuarters' ? [1, 2, 3, 4] : [currentQuarter];

  const sections = quarters.map((q) => buildSection(doc, q, allWeekRows));

  return {
    schoolName: doc.meta.schoolName ?? doc.meta.name,
    schoolInfo: doc.meta.schoolInfo,
    docName: doc.meta.name,
    schoolyearLabel: doc.schoolyear.label,
    sections,
    printedAt: new Date().toISOString().slice(0, 10)
  };
}
```

- [ ] **Step 2: Run tests — all print-model tests should pass, PrintDocument tests should now also pass**

```bash
npx vitest run src/lib/print-model.test.ts src/components/print/PrintDocument.test.tsx
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/print-model.ts src/lib/print-model.test.ts src/components/print/PrintDocument.test.tsx
git commit -m "refactor(print): simplify PrintEvent — remove color/bgColor/legend"
```

---

## Task 3: Rewrite `PrintDocument.tsx`

**Files:**
- Modify: `src/components/print/PrintDocument.tsx`

- [ ] **Step 1: Replace the full file content**

```tsx
import { createPortal } from 'react-dom';
import type { PrintModel, PrintWeekRow, PrintHolidayRow } from '@/lib/print-model';

const DAY_COLS = 5;
const TABLE_COLS = 2 + DAY_COLS + 1; // #, Datum, 5 days, Anmerkungen

interface Props {
  model: PrintModel | null;
}

export function PrintDocument({ model }: Props) {
  if (!model) return null;

  return createPortal(
    <div className="print-root">
      <div className="print-document">
        {model.sections.map((section) => (
          <div key={section.quarterIndex} className="print-section">
            <div
              style={{
                background: '#00345C',
                color: '#fff',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6
              }}
            >
              <div>
                <span style={{ fontWeight: 700, fontSize: '11pt' }}>{model.schoolName}</span>
                <span style={{ opacity: 0.7 }}> · </span>
                <span style={{ fontSize: '9pt', opacity: 0.85 }}>{model.schoolyearLabel}</span>
                <div style={{ fontSize: '8pt', opacity: 0.75, marginTop: 1 }}>{model.docName}</div>
              </div>
              <span
                style={{
                  background: '#FFC857',
                  color: '#00345C',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: '8pt'
                }}
              >
                {section.quarterLabel}
              </span>
            </div>

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
                fontSize: '8pt'
              }}
            >
              <colgroup>
                <col style={{ width: 24 }} />
                <col style={{ width: 58 }} />
                <col /><col /><col /><col /><col />
                <col style={{ width: 100 }} />
              </colgroup>
              <thead>
                <tr
                  style={{
                    background: '#00345C',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '7pt',
                    letterSpacing: '0.05em'
                  }}
                >
                  <th style={{ padding: '4px 3px', border: '0.5px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '4px 4px', border: '0.5px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>Datum</th>
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr'].map((d) => (
                    <th key={d} style={{ padding: '4px 4px', border: '0.5px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>{d}</th>
                  ))}
                  <th style={{ padding: '4px 4px', border: '0.5px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>Anmerkungen</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, i) => {
                  if (row.type === 'holiday') {
                    return <HolidayTableRow key={i} row={row} />;
                  }
                  return <WeekTableRow key={i} row={row} />;
                })}
              </tbody>
            </table>

            <div
              style={{
                marginTop: 4,
                borderTop: '0.5px solid #dce1e6',
                paddingTop: 3,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '7pt',
                color: '#9aa6b1'
              }}
            >
              <span>Curriculr · Schulplaner{model.schoolInfo ? ` · ${model.schoolInfo}` : ''}</span>
              <span>Stand: {model.printedAt} · {section.quarterLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

function WeekTableRow({ row }: { row: PrintWeekRow }) {
  const cellStyle: React.CSSProperties = {
    border: '0.5px solid #e3e7eb',
    padding: '3px 4px',
    verticalAlign: 'top'
  };
  return (
    <tr style={{ borderBottom: '0.5px solid #e3e7eb' }}>
      <td style={{ ...cellStyle, background: '#f7f9fb', fontWeight: 700, color: '#00345C', textAlign: 'center' }}>
        {row.swIndex}
      </td>
      <td style={{ ...cellStyle, background: '#f7f9fb', color: '#647488', whiteSpace: 'nowrap', fontSize: '7.5pt' }}>
        {row.dateRange}
      </td>
      {row.cells.map((cell, ci) => (
        <td key={ci} style={cellStyle}>
          {cell.events.length > 0
            ? cell.events.map((ev, ei) => (
                <span
                  key={ei}
                  style={{
                    display: 'block',
                    border: '0.5px solid #555',
                    borderRadius: 2,
                    padding: '2px 5px',
                    marginBottom: 2,
                    fontSize: '7.5pt',
                    lineHeight: 1.3
                  }}
                >
                  {ev.time && (
                    <span style={{ fontSize: '6.5pt', opacity: 0.75, marginRight: 3 }}>{ev.time}</span>
                  )}
                  {ev.title}
                </span>
              ))
            : [0, 1].map((i) => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    borderBottom: '0.5px dashed #ccc',
                    height: 12,
                    marginBottom: 2
                  }}
                />
              ))}
        </td>
      ))}
      <td
        style={{
          ...cellStyle,
          fontSize: '7.5pt',
          color: '#647488',
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          width: 100
        }}
      >
        {row.annotation}
      </td>
    </tr>
  );
}

function HolidayTableRow({ row }: { row: PrintHolidayRow }) {
  return (
    <tr>
      <td
        colSpan={TABLE_COLS}
        style={{
          border: '0.5px solid #e3e7eb',
          padding: '5px 8px',
          textAlign: 'center',
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: '8pt',
          color: '#647488',
          backgroundImage: 'repeating-linear-gradient(45deg, #f3f5f7 0 6px, #e9edf0 6px 12px)'
        }}
      >
        {row.label} · {row.dateRange}
      </td>
    </tr>
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

Expected: all 197 tests pass (count may change if prior tasks added/removed tests).

- [ ] **Step 4: Commit**

```bash
git add src/components/print/PrintDocument.tsx
git commit -m "feat(print): redesign PrintDocument — bordered event boxes, dashed writelines, fixed footer"
```

---

## Task 4: Clean up `print.css`

**Files:**
- Modify: `src/styles/print.css`

- [ ] **Step 1: Replace the full file content — remove broken counter rules**

```css
/* ============================================================
   Print styles — @media print only
   App shell hidden; .print-document shown via portal to body.
   ============================================================ */

.print-root {
  display: none;
}

@media print {
  /* Hide entire app shell — .print-root is portaled to body, not inside #root */
  body > #root {
    display: none !important;
  }

  body > .print-root {
    display: block !important;
  }

  .print-document {
    display: block;
    font-family: Inter, sans-serif;
    font-size: 9pt;
    color: #1c2733;
    line-height: 1.35;
  }

  /* Each section = one page (except the first) */
  .print-section + .print-section {
    break-before: page;
  }

  /* Prevent rows from splitting across pages */
  tr {
    break-inside: avoid;
  }

  /* Repeat thead on every page */
  thead {
    display: table-header-group;
  }

  /* Force background colors and images to print */
  * {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
```

- [ ] **Step 2: Run full test suite one final time**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 3: Manual verification**

Open the app (`npm run dev`), load a plan with events, click the print icon → "Als PDF drucken" → confirm Querformat → "Drucken / Als PDF speichern".

Check in browser print preview:
- [ ] Events appear as thin-bordered boxes with title (and time prefix if set)
- [ ] Empty day cells show two dashed horizontal lines
- [ ] Footer shows e.g. `Stand: 2026-06-03 · 1. Quartal · Aug. 2026 – Okt. 2026` (not "Seite 0")
- [ ] `Anmerkungen` column wraps long text without overflow
- [ ] No legend section visible
- [ ] Dark header prints correctly (navy background + yellow badge)

- [ ] **Step 4: Commit**

```bash
git add src/styles/print.css
git commit -m "fix(print): remove broken CSS page counter rules"
```

- [ ] **Step 5: Push**

```bash
git push
```
