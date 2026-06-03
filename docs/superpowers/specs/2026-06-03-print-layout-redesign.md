# Print Layout Redesign

**Date:** 2026-06-03  
**Status:** Approved

## Context

The existing PDF/print output (introduced in v1.5) has several problems:
- Event blocks use color backgrounds that are illegible in black-and-white printing
- CSS custom properties (`var(--color-marine-800)`) may not resolve when the app shell is hidden
- The CSS page counter (`counter(page)`) renders as "0" — broken in all browsers tested
- The `Anmerkungen` column overflows without wrapping
- Row heights are inconsistent and do not leave space for handwritten annotations
- The legend is unnecessary if no category information is shown

The audience (school principals) prints this document once per quarter, predominantly in black-and-white, and annotates it by hand throughout the term.

## Decisions

| Topic | Decision |
|-------|----------|
| Event display | Plain title + time only — no category color, no abbreviation code |
| Category info | Not shown in print — no legend, no kürzel |
| Event visual | Thin border box: `border: 0.5px solid #555`, `border-radius: 2px` |
| Orientation default | Landscape (A4) — more space per day column |
| Row height | Standard + dashed writelines: empty day cells show 2 × `border-bottom: 0.5px dashed #ccc` |
| Implementation approach | Print-model owns all data prep; PrintDocument is purely presentational |
| Schema changes | None — Category and PlannerDocument unchanged |

## Scope

### In scope
- `src/lib/print-model.ts` — simplify PrintEvent, remove legend
- `src/components/print/PrintDocument.tsx` — full rendering redesign
- `src/styles/print.css` — minor cleanup
- Bug fixes: page counter, CSS vars, Anmerkungen overflow, column widths

### Out of scope
- Category abbreviation field (decided against)
- Legend or category distinction in print
- Any changes to CategoriesTab, schema, or storage

## Design

### 1. `print-model.ts` — Data model changes

**`PrintEvent`** simplified:
```ts
export interface PrintEvent {
  title: string;
  time?: string;   // "HH:MM" if not allDay, undefined if allDay
}
```
Remove: `color`, `bgColor`.

**`PrintModel`** — remove `legend: PrintLegendItem[]` and `PrintLegendItem` type entirely.

**`buildSection`** — stop computing `pastelize()`/color fields. Just map:
```ts
{ title: ev.title, time: (!ev.allDay && ev.startTime) ? ev.startTime : undefined }
```

### 2. `PrintDocument.tsx` — Rendering redesign

#### Header
Keep dark bar. Hardcode colors instead of CSS vars:
- Background: `#00345C` (was `var(--color-marine-800)`)
- Badge background: `#FFC857` (was `var(--color-gelb-500)`)
- Badge text: `#00345C`

#### Event block (per event in a day cell)
```
border: '0.5px solid #555'
borderRadius: 2
padding: '2px 5px'
marginBottom: 2
fontSize: '7.5pt'
display: 'block'
```
Time rendered as small prefix if present: `<span style="fontSize:'6.5pt', opacity:0.75, marginRight:3">{ev.time}</span>`

#### Empty day cells (writelines)
When `cell.events.length === 0`, render two write-lines:
```ts
[0, 1].map(i => (
  <span key={i} style={{
    display: 'block',
    borderBottom: '0.5px dashed #ccc',
    height: 12,
    marginBottom: 2
  }} />
))
```

#### Footer — page counter fix
Replace `<span className="print-page-number" />` with static section label:
```tsx
<span>Quartal {section.quarterIndex} · {section.quarterLabel}</span>
```
Remove `className="print-page-number"` entirely.

#### Anmerkungen column
Add to `<td>` style:
```ts
wordBreak: 'break-word',
whiteSpace: 'normal',
width: 100   // px, fixed
```

#### Legend block
Remove entirely from render output.

#### Column widths (landscape A4 at 14mm margins → usable width ~268mm)
| Column | Width |
|--------|-------|
| # | 24px |
| Datum | 58px |
| Mo–Fr (each) | auto (flex) |
| Anmerkungen | 100px |

Use `<colgroup>` with explicit widths; day columns get no fixed width (auto-distribute).

### 3. `print.css` — Cleanup only

Remove `.print-page-number::after` rule and the `@page { counter-increment: page; }` block.
No other changes.

## Bug fixes bundled

| Bug | Fix |
|-----|-----|
| "Seite 0" in footer | Remove CSS counter; show `section.quarterLabel` instead |
| CSS vars unresolved in print | Hardcode `#00345C` / `#FFC857` in PrintDocument inline styles |
| Anmerkungen text overflow | `wordBreak: 'break-word'`, fixed 100px width |
| Color event blocks in B&W | Replace colored backgrounds with thin border box |
| Legend visible in print | Remove legend render block |

## Files changed

| File | Change type |
|------|-------------|
| `src/lib/print-model.ts` | Simplify `PrintEvent`, remove `legend`, remove color logic |
| `src/components/print/PrintDocument.tsx` | Full rendering redesign |
| `src/styles/print.css` | Remove broken counter rules |

## Non-changes (explicitly out of scope)

- `src/types/index.ts` — no `abbreviation` field
- `src/lib/schemas.ts` — no version bump
- `src/components/settings/CategoriesTab.tsx` — untouched
- `src/lib/print-model.test.ts` — update existing tests to match new PrintEvent shape

## Testing

- `src/lib/print-model.test.ts`: update snapshots / assertions to reflect removed `color`/`bgColor`/`legend` fields
- Manual: open print dialog → Querformat → Drucken → verify in browser print preview:
  - Events show as bordered boxes with title (+ time if set)
  - Empty cells show 2 dashed lines
  - Footer shows "Quartal 1 · Aug. 2026 – Okt. 2026" (no "Seite 0")
  - Anmerkungen wraps correctly
  - No color artifacts in B&W preview
