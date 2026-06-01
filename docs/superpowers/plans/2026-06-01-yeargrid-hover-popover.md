# YearGrid Hover-Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a hover popover in YearGrid cells listing all events of that day (title + category badge) so users can scan the year view without clicking.

**Architecture:** Radix `Tooltip` primitive (already available via `radix-ui`) wraps each `GridCell` trigger. `Tooltip.Provider` wraps the whole grid with a 400ms delay. The tooltip content renders inside a Portal so table `overflow` never clips it. Only `YearGrid.tsx` changes — no new files, no store changes.

**Tech Stack:** React, Radix UI (`Tooltip` from `radix-ui`), Tailwind v4, existing `pastelize` color helper.

---

### Task 1: Add hover popover to GridCell

**Files:**
- Modify: `src/components/editor/YearGrid.tsx`

No new test needed — this is pure visual interaction with no logic change. Manual verification in the running app covers it (see verify step).

- [ ] **Step 1: Add Tooltip import and Category type import**

In `src/components/editor/YearGrid.tsx`, add to the existing imports:

```tsx
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { Category } from '@/types';
```

The file already imports `import type { PlanEvent } from '@/types'` — extend that line instead of duplicating:

```tsx
import type { PlanEvent, Category } from '@/types';
```

- [ ] **Step 2: Add `formatIsoDate` helper after `pad()`**

Insert this function after the existing `pad` function (around line 23):

```tsx
function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${MONTHS_DE[m - 1]} ${y}`;
}
```

- [ ] **Step 3: Add `categories` to `GridCellProps`**

Extend the existing `GridCellProps` interface:

```tsx
interface GridCellProps {
  iso: string;
  events: PlanEvent[];
  holiday: boolean;
  feiertag?: boolean;
  /** Category color of the first event on this day, if any. */
  color?: string;
  title: string;
  categories: Category[];
}
```

- [ ] **Step 4: Update `GridCell` signature and add tooltip**

Replace the full `GridCell` function with this version (tooltip wraps the `<td>` via `asChild`; existing click/drag/badge logic is untouched):

```tsx
function GridCell({ iso, events, holiday, feiertag, color, title, categories }: GridCellProps) {
  const openCreateEvent = useUiStore((s) => s.openCreateEvent);
  const openEditEvent = useUiStore((s) => s.openEditEvent);
  const { isOver, setNodeRef } = useDroppable({ id: `cell:${iso}`, data: { type: 'cell', iso } });

  const handleClick = () => {
    const armed = useUiStore.getState().armedTemplateId;
    if (armed) {
      const newId = usePlannerStore.getState().createEventFromTemplate(armed, iso);
      if (newId) {
        openEditEvent(newId);
        useUiStore.getState().armTemplate(null);
      }
      return;
    }
    const first = events[0];
    if (first) openEditEvent(first.id);
    else openCreateEvent(iso);
  };

  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation();
    const armed = useUiStore.getState().armedTemplateId;
    if (armed) {
      const newId = usePlannerStore.getState().createEventFromTemplate(armed, iso);
      if (newId) {
        openEditEvent(newId);
        useUiStore.getState().armTemplate(null);
      }
      return;
    }
    openCreateEvent(iso);
  };

  const hasEvent = events.length > 0;
  const showHatch = holiday && !hasEvent;
  const showFeiertag = feiertag && !hasEvent;
  const cellStyle: React.CSSProperties = hasEvent && color
    ? { backgroundColor: pastelize(color) }
    : showHatch
      ? { backgroundImage: FERIEN_HATCH }
      : showFeiertag
        ? { backgroundColor: 'var(--color-feiertag-bg)' }
        : {};

  const cell = (
    <td
      ref={setNodeRef}
      aria-label={iso}
      data-has-event={hasEvent ? 'true' : 'false'}
      data-event-count={events.length}
      title={title}
      onClick={handleClick}
      className={
        'group relative min-w-6 cursor-pointer border border-[var(--color-ink-200)] text-center ' +
        (isOver ? 'ring-2 ring-inset ring-[var(--color-marine-500)] ' : '')
      }
      style={cellStyle}
    >
      {hasEvent && (
        <span
          className="pointer-events-none mx-auto block h-2 w-2 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
      {events.length > 1 && (
        <span className="pointer-events-none absolute left-0 top-0 rounded-br bg-[var(--color-marine-800)] px-[3px] text-[10px] font-semibold leading-tight text-[var(--color-paper-card)]">
          {events.length}
        </span>
      )}
      {hasEvent && (
        <button
          type="button"
          onClick={handleAdd}
          aria-label={`Weiteren Termin am ${iso} hinzufügen`}
          title="Weiteren Termin hinzufügen"
          className="absolute bottom-0.5 right-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-[var(--color-marine-800)] text-[var(--color-paper-card)] shadow-sm hover:opacity-90 group-hover:flex"
        >
          <Plus className="h-3 w-3" strokeWidth={3} />
        </button>
      )}
    </td>
  );

  if (!hasEvent) return cell;

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{cell}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          sideOffset={4}
          className="z-50 rounded-lg px-3 py-2 text-xs text-white shadow-lg"
          style={{ background: 'var(--color-marine-900)', maxWidth: 240 }}
        >
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-gelb-500)]">
            {formatIsoDate(iso)}
          </p>
          {events.map((ev, i) => {
            const cat = categories.find((c) => c.id === ev.categoryId);
            return (
              <div key={ev.id} className={i > 0 ? 'mt-1.5 border-t border-white/10 pt-1.5' : ''}>
                <div className="flex items-center gap-1.5">
                  {cat && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: cat.color }}
                    />
                  )}
                  <span className="font-semibold leading-tight">{ev.title}</span>
                </div>
                {cat && (
                  <span
                    className="ml-3.5 mt-0.5 inline-block rounded px-1 py-px text-[9px] font-semibold"
                    style={{ background: pastelize(cat.color), color: cat.color }}
                  >
                    {cat.label}
                  </span>
                )}
              </div>
            );
          })}
          <TooltipPrimitive.Arrow className="fill-[var(--color-marine-900)]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
```

- [ ] **Step 5: Wrap YearGrid table in Tooltip.Provider and pass `categories` to GridCell**

In the `YearGrid` component's return, wrap the outer `<div>` with `<TooltipPrimitive.Provider>`:

```tsx
return (
  <TooltipPrimitive.Provider delayDuration={400}>
    <div className="flex h-full w-full flex-col gap-3 overflow-hidden">
      {/* ... legend ... */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="h-full w-full table-fixed border-collapse text-sm">
          {/* ... thead ... */}
          <tbody>
            {rows.map((row) => {
              const dim = daysInMonth(row.year, row.month);
              return (
                <tr key={`${row.year}-${row.month}`}>
                  {/* ... month header th ... */}
                  {cols.map((d) => {
                    if (d > dim) return <td key={d} className="bg-[var(--color-paper-bg)]" aria-hidden="true" />;
                    const iso = `${row.year}-${pad(row.month + 1)}-${pad(d)}`;
                    const evs = eventsByDate.get(iso) ?? [];
                    const holiday = isHoliday(iso, doc.schoolyear.holidays);
                    const first = evs[0];
                    const color = first ? doc.categories.find((c) => c.id === first.categoryId)?.color : undefined;
                    return (
                      <GridCell
                        key={d}
                        iso={iso}
                        events={evs}
                        holiday={!!holiday && holiday.type === 'ferien'}
                        feiertag={!!holiday && holiday.type === 'feiertag'}
                        color={color}
                        title={evs.map((e) => e.title).join(', ') || holiday?.label || iso}
                        categories={doc.categories}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </TooltipPrimitive.Provider>
);
```

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Manual verification**

```bash
npm run dev
```

Open http://localhost:5173, switch to YearGrid view:
1. Hover over a day with 1 event → popover appears after ~400ms with date, dot, title, category badge
2. Hover over a day with 2+ events → all listed, separated by divider
3. Hover over a Ferien cell (no event) → no popover
4. Popover near top of table → flips to bottom automatically
5. Click a day cell → edit modal still opens as before

- [ ] **Step 8: Commit**

```bash
git add src/components/editor/YearGrid.tsx
git commit -m "feat(yeargrid): hover popover shows event titles and category badges"
```
