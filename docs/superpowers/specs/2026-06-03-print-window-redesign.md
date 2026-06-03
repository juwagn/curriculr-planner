# Print Window Redesign

**Date:** 2026-06-03  
**Status:** Approved

## Context

The current `@media print` + React portal approach produces inconsistent output:
- Event boxes overflow their cells (no `overflow: hidden` on portal spans)
- `colgroup` widths in `px` are unreliable across print renderers
- CSS custom properties and app-shell hiding create fragile cascading
- No way to guarantee layout quality across browsers

The solution is a **dedicated print window**: `window.open()` with a self-contained HTML document, all styles inlined, no dependency on app shell or CSS variables.

## Decisions

| Topic | Decision |
|-------|----------|
| Rendering approach | Dedicated `window.open()` with full HTML string |
| CSS approach | All styles inline in `<style>` tag — no external deps |
| Units | `mm` and `pt` throughout — no `px` in print layout |
| Orientation | Passed as `@page { size: A4 landscape; }` in generated HTML |
| Color | Keep `#00345C`/`#FFC857` brand colors (print as dark/light grey in B&W) |
| Event overflow | `overflow: hidden; white-space: nowrap; text-overflow: ellipsis` on event spans |
| Window lifecycle | Auto-close after print via `afterprint` event |

## Architecture

```
PrintDialog.handlePrint()
  → openPrintWindow(doc, scope, currentQuarter, orientation)
      → buildPrintModel(doc, scope, currentQuarter)   [existing]
      → generatePrintHtml(model, orientation)          [new]
      → window.open('', '_blank')
      → newWin.document.write(html)
      → newWin.document.close()
      → newWin.focus()
      → newWin.print()
      → newWin.addEventListener('afterprint', () => newWin.close())
```

## Scope

### New files
- `src/lib/print-window.ts` — `openPrintWindow()` + `generatePrintHtml()`
- `src/lib/print-window.test.ts` — unit tests for `generatePrintHtml()`

### Modified files
- `src/components/print/PrintDialog.tsx` — call `openPrintWindow()` instead of `applyPrintOrientation()` + `window.print()`
- `src/components/editor/Editor.tsx` — remove `printModel` useMemo, remove `<PrintDocument>` render, remove related imports
- `src/styles/print.css` — remove entire `@media print` block; keep only `.print-root { display: none }` (portal remnant cleanup handled separately)

### Deleted files
- `src/lib/print-orientation.ts` — replaced by inline `@page` in generated HTML
- `src/lib/print-orientation.test.ts` — deleted with implementation
- `src/components/print/PrintDocument.tsx` — replaced by `print-window.ts`
- `src/components/print/PrintDocument.test.tsx` — deleted with component

## Design: `print-window.ts`

### `openPrintWindow(doc, scope, currentQuarter, orientation)`

```ts
export function openPrintWindow(
  doc: PlannerDocument,
  scope: PrintScope,
  currentQuarter: 1 | 2 | 3 | 4,
  orientation: 'portrait' | 'landscape'
): void {
  const model = buildPrintModel(doc, scope, currentQuarter);
  const html = generatePrintHtml(model, orientation);
  const win = window.open('', '_blank');
  if (!win) return; // popup blocked
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.addEventListener('afterprint', () => win.close());
}
```

### `generatePrintHtml(model, orientation)`

Returns a complete `<!DOCTYPE html>` string. All styles inlined.

#### `@page` rule

```css
@page { size: A4 ${orientation}; margin: 14mm; }
```

#### Column widths (landscape A4: 269mm usable; portrait: 183mm usable)

Landscape:
| Col | Width |
|-----|-------|
| # | 9mm |
| Datum | 22mm |
| Mo–Fr (×5) | auto (equal share of remaining) |
| Anmerkungen | 40mm |

Portrait: same fixed cols; day columns auto-distribute narrower space.

Implementation: use `table-layout: fixed` with `<colgroup>` in `mm` units. Day columns have no explicit width (auto).

#### Header

```html
<div class="page-header">
  <div class="header-left">
    <span class="school-name">{schoolName}</span>
    <span class="separator"> · </span>
    <span class="school-year">{schoolyearLabel}</span>
    <div class="doc-name">{docName}</div>
  </div>
  <span class="quarter-badge">{quarterLabel}</span>
</div>
```

CSS: `background: #00345C; color: #fff`. Badge: `background: #FFC857; color: #00345C`.

#### Table thead

Dark header row (`background: #00345C; color: #fff`), columns: `# | Datum | Mo | Di | Mi | Do | Fr | Anmerkungen`.

#### Table rows

**School week row:**
- Index cell: `background: #f5f5f5; font-weight: bold; text-align: center`
- Date cell: `white-space: nowrap; color: #555`
- Day cells: `overflow: hidden; vertical-align: top`
  - With events: one `<div class="event">` per event — `border: 0.75pt solid #333; border-radius: 1.5pt; padding: 1.5pt 3pt; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 1.5pt`
  - Without events: two `<div class="writeline">` — `border-bottom: 0.5pt dashed #ccc; height: 10pt; margin-bottom: 2pt`
- Annotation cell: `word-break: break-word; white-space: normal; overflow: hidden`

**Holiday row:**
- Full `colspan=8`, centered italic text, diagonal stripe background

#### Footer (per section)

```html
<div class="page-footer">
  <span>Curriculr · Schulplaner{schoolInfo}</span>
  <span>Stand: {printedAt} · {quarterLabel}</span>
</div>
```

`border-top: 0.5pt solid #ccc; font-size: 7pt; color: #888`

#### Page breaks

Each `.print-section` except the first gets `break-before: page`.

### `generatePrintHtml` testability

The function is pure (string in → string out). Tests verify:
- HTML contains school name
- HTML contains event title
- HTML contains `size: A4 landscape` when orientation is landscape
- HTML does NOT contain `color:` or `background` on event divs (no color-dependent rendering)
- Holiday row contains `colspan="8"`

## Changes to `PrintDialog.tsx`

```tsx
import { openPrintWindow } from '@/lib/print-window';
import { usePlannerStore } from '@/stores/planner';

// In handlePrint:
const doc = usePlannerStore.getState().doc;
if (!doc) return;
openPrintWindow(doc, scope, currentQuarter, orientation);
close();
```

Remove: `applyPrintOrientation` import, `import { applyPrintOrientation }`, `setTimeout(() => window.print(), 50)`.

`currentQuarter` must be read from `useUiStore` (already available via `useUiStore((s) => s.currentQuarter)`).

## Changes to `Editor.tsx`

Remove:
- `import { buildPrintModel } from '@/lib/print-model'`
- `import { PrintDocument } from '@/components/print/PrintDocument'`
- `const printModel = useMemo(...)`
- `const printScope = useUiStore((s) => s.printScope)`
- `const currentQuarter = useUiStore((s) => s.currentQuarter)` (if only used for printModel)
- `<PrintDocument model={printModel} />`

Note: `currentQuarter` may also be used by `WeekTable` indirectly. Check before removing.

## `print.css` after changes

The `@media print` block is entirely removed. The file becomes:

```css
/* Portal artifact — .print-root is no longer rendered after this refactor.
   This class can be removed once PrintDocument.tsx is deleted. */
.print-root {
  display: none;
}
```

Or deleted entirely if `.print-root` is confirmed unused.

## Deleted files

- `src/lib/print-orientation.ts` — inline `@page` in generated HTML replaces this
- `src/lib/print-orientation.test.ts` — deleted with implementation
- `src/components/print/PrintDocument.tsx` — portal approach replaced
- `src/components/print/PrintDocument.test.tsx` — deleted with component

## Testing

### Unit tests (`print-window.test.ts`)

```ts
describe('generatePrintHtml', () => {
  it('contains school name')
  it('contains event title')
  it('contains timed event time prefix')
  it('sets A4 landscape in @page when orientation is landscape')
  it('sets A4 portrait in @page when orientation is portrait')
  it('holiday row has colspan="8"')
  it('empty cell contains writeline divs')
  it('event div has no color/background style')
  it('annotation text appears in output')
})
```

### Manual verification

Open app → print dialog → Querformat → Drucken:
- [ ] New browser window opens
- [ ] Print dialog appears
- [ ] Event boxes are clipped within their columns (no overflow)
- [ ] Writelines visible in empty cells
- [ ] Footer shows correct quarter label (not "Seite 0")
- [ ] Window closes after printing/cancelling
- [ ] B&W print preview shows readable output

## Non-changes (explicitly out of scope)

- `src/lib/print-model.ts` — untouched
- `src/lib/schemas.ts` — untouched
- `src/stores/ui.ts` — untouched (printScope, printOrientation, printDialogOpen remain)
- `PrintDialog` UI — only wiring changes, no visual changes to the dialog itself
