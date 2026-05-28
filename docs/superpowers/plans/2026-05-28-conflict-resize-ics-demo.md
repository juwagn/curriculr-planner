# Konflikt-Erkennung + Resize + ICS-Import + Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add non-blocking conflict detection, multi-day event rendering + edge-resize in the week table, ICS import (new plan + append), and a one-click editable demo plan.

**Architecture:** Pure TDD'd lib modules (`conflicts.ts`, `ics-import.ts`, `demo.ts`) feed thin React layers. A schema bump (v1→v2) adds `ignoredConflicts` with a transparent migration in the storage layer. Conflicts are derived via a memoized hook and surfaced as inline badges + a header panel. The week table renders events as per-cell continuous segments with a right-edge resize handle.

**Tech Stack:** TypeScript (strict), React, Zustand, Zod, date-fns, @dnd-kit/core, Vitest, Tailwind v4.

**Spec:** [docs/superpowers/specs/2026-05-28-conflict-resize-ics-demo-design.md](../specs/2026-05-28-conflict-resize-ics-demo-design.md)

---

## Phase 1 — Schema v2 + Migration (foundation)

### Task 1: Add `ignoredConflicts` to schema with migration

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/types/index.ts`
- Test: `src/lib/schemas.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/schemas.test.ts`:

```ts
import { migrate, PlannerDocumentSchema } from './schemas';

describe('migrate v1 -> v2', () => {
  const v1Doc = {
    version: 1,
    schoolyear: {
      id: 'sy1', label: '2025/26',
      firstSchoolDay: '2025-08-11', firstTeachingDay: '2025-08-11', lastSchoolDay: '2026-06-26',
      holidays: [], quarterBoundaries: ['2025-10-31', '2026-01-31', '2026-04-15'],
      createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z'
    },
    categories: [{ id: 'c1', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: [] }],
    events: [],
    annotations: [],
    availableGroups: [],
    meta: { name: 'Test', lastSaved: '2025-01-01T00:00:00.000Z' }
  };

  it('adds ignoredConflicts and bumps version', () => {
    const migrated = migrate(v1Doc);
    expect(migrated.version).toBe(2);
    expect(migrated.ignoredConflicts).toEqual([]);
    expect(PlannerDocumentSchema.safeParse(migrated).success).toBe(true);
  });

  it('leaves an already-v2 doc untouched', () => {
    const v2 = { ...v1Doc, version: 2, ignoredConflicts: ['x'] };
    const migrated = migrate(v2);
    expect(migrated.version).toBe(2);
    expect(migrated.ignoredConflicts).toEqual(['x']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/schemas.test.ts`
Expected: FAIL — `migrate` is not exported / `version` literal mismatch.

- [ ] **Step 3: Update the schema and add `migrate`**

In `src/lib/schemas.ts`, change the document schema and append the migration helper:

```ts
export const PlannerDocumentSchema = z.object({
  version: z.literal(2),
  schoolyear: SchoolyearSchema,
  categories: z.array(CategorySchema),
  events: z.array(PlanEventSchema),
  annotations: z.array(WeekAnnotationSchema),
  availableGroups: z.array(z.string()),
  ignoredConflicts: z.array(z.string()),
  meta: z.object({
    name: z.string().min(1),
    lastSaved: z.string()
  })
});

/** Upgrade older persisted docs in-place to the current shape before Zod parse. */
export function migrate(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) return raw as Record<string, unknown>;
  const doc = { ...(raw as Record<string, unknown>) };
  if (doc.version === 1) {
    doc.version = 2;
    if (!Array.isArray(doc.ignoredConflicts)) doc.ignoredConflicts = [];
  }
  return doc;
}
```

- [ ] **Step 4: Update the TypeScript type**

In `src/types/index.ts`, change `PlannerDocument`:

```ts
export interface PlannerDocument {
  version: 2;
  schoolyear: Schoolyear;
  categories: Category[];
  events: PlanEvent[];
  annotations: WeekAnnotation[];
  availableGroups: string[];
  ignoredConflicts: string[];
  meta: {
    name: string;
    lastSaved: string;
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/schemas.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas.ts src/lib/schemas.test.ts src/types/index.ts
git commit -m "feat(schema): bump PlannerDocument to v2 with ignoredConflicts + migrate"
```

### Task 2: Apply migration in the storage layer

**Files:**
- Modify: `src/lib/storage.ts:51-65` (`loadDoc`), `src/lib/storage.ts:101-106` (`importJson`)
- Test: `src/lib/storage.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/storage.test.ts` (uses the existing localStorage-backed adapter; mirror how other tests in this file build docs):

```ts
import { LocalStorageAdapter } from './storage';

it('migrates a v1 doc on load', async () => {
  const adapter = new LocalStorageAdapter();
  const v1 = {
    version: 1,
    schoolyear: {
      id: 'sy-mig', label: '2025/26',
      firstSchoolDay: '2025-08-11', firstTeachingDay: '2025-08-11', lastSchoolDay: '2026-06-26',
      holidays: [], quarterBoundaries: ['2025-10-31', '2026-01-31', '2026-04-15'],
      createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z'
    },
    categories: [{ id: 'c1', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: [] }],
    events: [], annotations: [], availableGroups: [],
    meta: { name: 'Alt', lastSaved: '2025-01-01T00:00:00.000Z' }
  };
  localStorage.setItem('curriculr-planner:doc:sy-mig', JSON.stringify(v1));
  localStorage.setItem('curriculr-planner:docs', JSON.stringify(['sy-mig']));

  const loaded = await adapter.loadDoc('sy-mig');
  expect(loaded.version).toBe(2);
  expect(loaded.ignoredConflicts).toEqual([]);
});

it('migrates a v1 doc on importJson', async () => {
  const adapter = new LocalStorageAdapter();
  const v1Json = JSON.stringify({
    version: 1,
    schoolyear: {
      id: 'sy-imp', label: '2025/26',
      firstSchoolDay: '2025-08-11', firstTeachingDay: '2025-08-11', lastSchoolDay: '2026-06-26',
      holidays: [], quarterBoundaries: ['2025-10-31', '2026-01-31', '2026-04-15'],
      createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z'
    },
    categories: [{ id: 'c1', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: [] }],
    events: [], annotations: [], availableGroups: [],
    meta: { name: 'Alt', lastSaved: '2025-01-01T00:00:00.000Z' }
  });
  const doc = await adapter.importJson(v1Json);
  expect(doc.version).toBe(2);
  expect(doc.ignoredConflicts).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — loaded doc fails `version: z.literal(2)` parse (no migration yet).

- [ ] **Step 3: Wire migrate() into loadDoc and importJson**

In `src/lib/storage.ts`, import `migrate` and apply it before `safeParse` in both methods:

```ts
import { PlannerDocumentSchema, migrate } from './schemas';
```

In `loadDoc`, replace the `parsed`→`safeParse` block so it migrates first:

```ts
    let parsed: unknown;
    try {
      parsed = migrate(JSON.parse(raw));
    } catch {
      throw new Error(`Doc ${id}: invalid JSON`);
    }
    const result = PlannerDocumentSchema.safeParse(parsed);
```

In `importJson`, migrate the parsed JSON:

```ts
  async importJson(json: string): Promise<PlannerDocument> {
    const parsed = migrate(JSON.parse(json));
    const result = PlannerDocumentSchema.safeParse(parsed);
    if (!result.success) throw new Error(`Invalid backup: ${result.error.message}`);
    return result.data as PlannerDocument;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Update createEmptyDoc to emit v2**

In `src/stores/planner.ts`, in `createEmptyDoc`, change the returned object to include the new fields:

```ts
  return {
    version: 2,
    schoolyear: { /* unchanged */ },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uid() })),
    events: [],
    annotations: [],
    availableGroups: [...DEFAULT_GROUPS],
    ignoredConflicts: [],
    meta: { name, lastSaved: now }
  };
```

(Keep the existing `schoolyear` object literal as-is; only `version`, `ignoredConflicts` are added.)

- [ ] **Step 6: Typecheck + full test run**

Run: `npm run typecheck && npm run test:run`
Expected: PASS. Fix any other literal-`1` doc builders the compiler flags (e.g. wizard test fixtures) by adding `version: 2` + `ignoredConflicts: []`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts src/stores/planner.ts
git commit -m "feat(storage): migrate v1 docs to v2 on load/import"
```

---

## Phase 2 — Conflict detection

### Task 3: `isWithinSchoolyear` helper

**Files:**
- Modify: `src/lib/schoolweeks.ts`
- Test: `src/lib/schoolweeks.test.ts`

> Note: `isWeekend(iso)` and `isHoliday(iso, holidays)` already exist in this file — reuse them, do not re-add.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/schoolweeks.test.ts`:

```ts
import { isWithinSchoolyear } from './schoolweeks';

const sy = {
  id: 's', label: '25/26',
  firstSchoolDay: '2025-08-11', firstTeachingDay: '2025-08-11', lastSchoolDay: '2026-06-26',
  holidays: [], quarterBoundaries: ['2025-10-31', '2026-01-31', '2026-04-15'],
  createdAt: '', updatedAt: ''
};

describe('isWithinSchoolyear', () => {
  it('true on boundaries', () => {
    expect(isWithinSchoolyear('2025-08-11', sy)).toBe(true);
    expect(isWithinSchoolyear('2026-06-26', sy)).toBe(true);
  });
  it('false outside', () => {
    expect(isWithinSchoolyear('2025-08-10', sy)).toBe(false);
    expect(isWithinSchoolyear('2026-06-27', sy)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/schoolweeks.test.ts`
Expected: FAIL — `isWithinSchoolyear` not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/schoolweeks.ts`:

```ts
export function isWithinSchoolyear(iso: ISODate, sy: Schoolyear): boolean {
  return iso >= sy.firstSchoolDay && iso <= sy.lastSchoolDay;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/schoolweeks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schoolweeks.ts src/lib/schoolweeks.test.ts
git commit -m "feat(schoolweeks): add isWithinSchoolyear"
```

### Task 4: `conflicts.ts` — detection engine

**Files:**
- Create: `src/lib/conflicts.ts`
- Test: `src/lib/conflicts.test.ts`

The engine iterates each event's covered days (`start`..`end`) and the full event set. It returns one `Conflict` per detected problem with a stable `key`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/conflicts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { detectConflicts } from './conflicts';
import type { PlannerDocument, PlanEvent } from '@/types';

function baseDoc(events: PlanEvent[]): PlannerDocument {
  return {
    version: 2,
    schoolyear: {
      id: 's', label: '25/26',
      firstSchoolDay: '2025-08-11', firstTeachingDay: '2025-08-11', lastSchoolDay: '2026-06-26',
      holidays: [{ id: 'h1', label: 'Herbstferien', start: '2025-10-13', end: '2025-10-24' }],
      quarterBoundaries: ['2025-10-31', '2026-01-31', '2026-04-15'],
      createdAt: '', updatedAt: ''
    },
    categories: [
      { id: 'cP', label: 'Prüfung', color: '#E02424', slug: 'pruefung', keywords: [] },
      { id: 'cK', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: [] },
      { id: 'cS', label: 'Sonderveranstaltung', color: '#7C3AED', slug: 'sonder', keywords: [] }
    ],
    events,
    annotations: [], availableGroups: [], ignoredConflicts: [],
    meta: { name: 'T', lastSaved: '' }
  };
}

function ev(over: Partial<PlanEvent>): PlanEvent {
  return {
    id: over.id ?? 'e1', title: 'X', start: '2025-09-01', end: '2025-09-01',
    allDay: true, categoryId: 'cK', groups: [], ...over
  };
}

describe('detectConflicts', () => {
  it('flags an event inside the holidays as ferien', () => {
    const c = detectConflicts(baseDoc([ev({ id: 'e1', start: '2025-10-15', end: '2025-10-15' })]));
    expect(c.some((x) => x.type === 'ferien' && x.eventIds.includes('e1'))).toBe(true);
  });

  it('escalates a Prüfung in the holidays to category-in-ferien (error)', () => {
    const c = detectConflicts(baseDoc([ev({ id: 'e1', categoryId: 'cP', start: '2025-10-15', end: '2025-10-15' })]));
    const hit = c.find((x) => x.type === 'category-in-ferien');
    expect(hit?.severity).toBe('error');
  });

  it('flags out-of-range events as error', () => {
    const c = detectConflicts(baseDoc([ev({ id: 'e1', start: '2026-07-01', end: '2026-07-01' })]));
    const hit = c.find((x) => x.type === 'outside-schoolyear');
    expect(hit?.severity).toBe('error');
  });

  it('does NOT flag an event ending exactly on lastSchoolDay', () => {
    const c = detectConflicts(baseDoc([ev({ id: 'e1', start: '2026-06-26', end: '2026-06-26' })]));
    expect(c.some((x) => x.type === 'outside-schoolyear')).toBe(false);
  });

  it('flags weekend events', () => {
    const c = detectConflicts(baseDoc([ev({ id: 'e1', start: '2025-09-06', end: '2025-09-06' })])); // Sat
    expect(c.some((x) => x.type === 'weekend')).toBe(true);
  });

  it('flags duplicate all-day events on the same date', () => {
    const c = detectConflicts(baseDoc([
      ev({ id: 'e1', start: '2025-09-01', end: '2025-09-01' }),
      ev({ id: 'e2', start: '2025-09-01', end: '2025-09-01' })
    ]));
    const hit = c.find((x) => x.type === 'duplicate-allday');
    expect(hit?.eventIds.sort()).toEqual(['e1', 'e2']);
  });

  it('flags overload day when more than 3 events overlap', () => {
    const evs = ['e1', 'e2', 'e3', 'e4'].map((id) => ev({ id, start: '2025-09-01', end: '2025-09-01' }));
    const c = detectConflicts(baseDoc(evs));
    expect(c.some((x) => x.type === 'overload-day')).toBe(true);
  });

  it('produces stable keys across recompute', () => {
    const d = baseDoc([ev({ id: 'e1', start: '2025-09-06', end: '2025-09-06' })]);
    const a = detectConflicts(d).map((x) => x.key).sort();
    const b = detectConflicts(d).map((x) => x.key).sort();
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/conflicts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `conflicts.ts`**

Create `src/lib/conflicts.ts`:

```ts
import { addDays, format, parseISO, differenceInCalendarDays } from 'date-fns';
import type { ISODate, PlannerDocument, PlanEvent, UUID } from '@/types';
import { isHoliday, isWeekend, isWithinSchoolyear } from './schoolweeks';

export type ConflictType =
  | 'ferien'
  | 'category-in-ferien'
  | 'outside-schoolyear'
  | 'weekend'
  | 'duplicate-allday'
  | 'overload-day';

export interface Conflict {
  key: string;
  type: ConflictType;
  severity: 'error' | 'warning';
  eventIds: UUID[];
  message: string;
}

/** Category slugs that must never fall into the holidays. */
const STRICT_HOLIDAY_SLUGS = ['pruefung', 'elternabend'];
const OVERLOAD_THRESHOLD = 3;

function coveredDays(e: PlanEvent): ISODate[] {
  const days: ISODate[] = [];
  const span = Math.max(0, differenceInCalendarDays(parseISO(e.end), parseISO(e.start)));
  for (let i = 0; i <= span; i++) days.push(format(addDays(parseISO(e.start), i), 'yyyy-MM-dd'));
  return days;
}

function makeKey(type: ConflictType, eventIds: UUID[], date: string): string {
  return `${type}|${[...eventIds].sort().join(',')}|${date}`;
}

export function detectConflicts(doc: PlannerDocument): Conflict[] {
  const { schoolyear: sy, categories } = doc;
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));
  const out: Conflict[] = [];

  // Per-event checks
  for (const e of doc.events) {
    const days = coveredDays(e);
    const slug = slugById.get(e.categoryId);

    // ferien / category-in-ferien
    const holidayHit = days.map((d) => isHoliday(d, sy.holidays)).find((h) => h !== null) ?? null;
    if (holidayHit) {
      if (slug && STRICT_HOLIDAY_SLUGS.includes(slug)) {
        out.push({
          key: makeKey('category-in-ferien', [e.id], e.start),
          type: 'category-in-ferien', severity: 'error', eventIds: [e.id],
          message: `„${e.title}“ liegt in den Ferien (${holidayHit.label}) – diese Kategorie sollte nicht in Ferien fallen.`
        });
      } else {
        out.push({
          key: makeKey('ferien', [e.id], e.start),
          type: 'ferien', severity: 'warning', eventIds: [e.id],
          message: `„${e.title}“ liegt in den Ferien (${holidayHit.label}).`
        });
      }
    }

    // outside schoolyear
    if (!isWithinSchoolyear(e.start, sy) || !isWithinSchoolyear(e.end, sy)) {
      out.push({
        key: makeKey('outside-schoolyear', [e.id], e.start),
        type: 'outside-schoolyear', severity: 'error', eventIds: [e.id],
        message: `„${e.title}“ liegt außerhalb des Schuljahres.`
      });
    }

    // weekend
    if (days.some((d) => isWeekend(d))) {
      out.push({
        key: makeKey('weekend', [e.id], e.start),
        type: 'weekend', severity: 'warning', eventIds: [e.id],
        message: `„${e.title}“ liegt (teilweise) am Wochenende.`
      });
    }
  }

  // Per-day aggregate checks (only single-day all-day events count toward duplicates;
  // overload counts every event that covers the day)
  const byDay = new Map<ISODate, PlanEvent[]>();
  for (const e of doc.events) {
    for (const d of coveredDays(e)) {
      const arr = byDay.get(d) ?? [];
      arr.push(e);
      byDay.set(d, arr);
    }
  }
  for (const [date, evs] of byDay) {
    const allDay = evs.filter((e) => e.allDay);
    if (allDay.length > 1) {
      const ids = allDay.map((e) => e.id);
      out.push({
        key: makeKey('duplicate-allday', ids, date),
        type: 'duplicate-allday', severity: 'warning', eventIds: ids,
        message: `${allDay.length} ganztägige Termine am ${date}.`
      });
    }
    if (evs.length > OVERLOAD_THRESHOLD) {
      const ids = evs.map((e) => e.id);
      out.push({
        key: makeKey('overload-day', ids, date),
        type: 'overload-day', severity: 'warning', eventIds: ids,
        message: `${evs.length} Termine am ${date} – mögliche Überlast.`
      });
    }
  }

  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/conflicts.test.ts`
Expected: PASS (all 8 cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/conflicts.ts src/lib/conflicts.test.ts
git commit -m "feat(conflicts): add detectConflicts engine with 6 checks"
```

### Task 5: `ignoreConflict` / `unignoreConflict` store actions

**Files:**
- Modify: `src/stores/planner.ts`
- Test: `src/stores/planner.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/stores/planner.test.ts` (follow the file's existing pattern for seeding a doc via `setDoc`):

```ts
it('ignores and un-ignores a conflict key', () => {
  const store = usePlannerStore.getState();
  const doc = createEmptyDoc('T', '25/26', '2025-08-11', '2025-08-11', '2026-06-26');
  store.setDoc(doc);
  usePlannerStore.getState().ignoreConflict('weekend|e1|2025-09-06');
  expect(usePlannerStore.getState().doc?.ignoredConflicts).toContain('weekend|e1|2025-09-06');
  usePlannerStore.getState().unignoreConflict('weekend|e1|2025-09-06');
  expect(usePlannerStore.getState().doc?.ignoredConflicts).not.toContain('weekend|e1|2025-09-06');
});
```

(Import `createEmptyDoc` and `usePlannerStore` at the top if not already imported.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/planner.test.ts`
Expected: FAIL — `ignoreConflict` is not a function.

- [ ] **Step 3: Implement the actions**

In `src/stores/planner.ts`, add to the `PlannerState` interface:

```ts
  ignoreConflict(key: string): void;
  unignoreConflict(key: string): void;
```

And in the store body (near the other mutators):

```ts
  ignoreConflict(key) {
    const doc = get().doc;
    if (!doc || doc.ignoredConflicts.includes(key)) return;
    set({ doc: { ...doc, ignoredConflicts: [...doc.ignoredConflicts, key] } });
    debouncedSave(get);
  },

  unignoreConflict(key) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, ignoredConflicts: doc.ignoredConflicts.filter((k) => k !== key) } });
    debouncedSave(get);
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/planner.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/planner.ts src/stores/planner.test.ts
git commit -m "feat(planner): add ignore/unignore conflict actions"
```

### Task 6: `useConflicts` hook

**Files:**
- Create: `src/hooks/useConflicts.ts`
- Test: `src/hooks/useConflicts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useConflicts.test.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useConflicts } from './useConflicts';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';

beforeEach(() => {
  const doc = createEmptyDoc('T', '25/26', '2025-08-11', '2025-08-11', '2026-06-26');
  doc.events = [{
    id: 'e1', title: 'Sa-Termin', start: '2025-09-06', end: '2025-09-06',
    allDay: true, categoryId: doc.categories[0].id, groups: []
  }];
  usePlannerStore.getState().setDoc(doc);
});

describe('useConflicts', () => {
  it('returns the weekend conflict', () => {
    const { result } = renderHook(() => useConflicts());
    expect(result.current.some((c) => c.type === 'weekend')).toBe(true);
  });

  it('filters out ignored keys', () => {
    const { result, rerender } = renderHook(() => useConflicts());
    const key = result.current.find((c) => c.type === 'weekend')!.key;
    usePlannerStore.getState().ignoreConflict(key);
    rerender();
    expect(result.current.some((c) => c.key === key)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useConflicts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useConflicts.ts`:

```ts
import { useMemo } from 'react';
import { usePlannerStore } from '@/stores/planner';
import { detectConflicts, type Conflict } from '@/lib/conflicts';

export function useConflicts(): Conflict[] {
  const doc = usePlannerStore((s) => s.doc);
  return useMemo(() => {
    if (!doc) return [];
    const ignored = new Set(doc.ignoredConflicts);
    return detectConflicts(doc).filter((c) => !ignored.has(c.key));
  }, [doc]);
}

/** Map eventId -> conflicts touching it, for inline badges. */
export function conflictsByEvent(conflicts: Conflict[]): Map<string, Conflict[]> {
  const m = new Map<string, Conflict[]>();
  for (const c of conflicts) {
    for (const id of c.eventIds) {
      const arr = m.get(id) ?? [];
      arr.push(c);
      m.set(id, arr);
    }
  }
  return m;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useConflicts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useConflicts.ts src/hooks/useConflicts.test.ts
git commit -m "feat(hooks): add useConflicts + conflictsByEvent"
```

### Task 7: Conflict badge on EventBlock

**Files:**
- Modify: `src/components/editor/EventBlock.tsx`
- Modify: `src/components/editor/WeekTable.tsx` (pass conflicts down)

- [ ] **Step 1: Add a conflict prop to EventBlock**

In `src/components/editor/EventBlock.tsx`, extend `Props` and render a glyph. Add to the interface:

```ts
interface Props {
  event: PlanEvent;
  category: Category;
  onClick(e: React.MouseEvent): void;
  conflictSeverity?: 'error' | 'warning';
}
```

Destructure `conflictSeverity` and render a badge before the title, inside the `<button>`:

```tsx
      {conflictSeverity && (
        <span
          aria-label={conflictSeverity === 'error' ? 'Konflikt' : 'Warnung'}
          className="mr-1 align-middle"
          style={{ color: conflictSeverity === 'error' ? 'var(--color-rot-600, #E02424)' : 'var(--color-gelb-600, #B45309)' }}
        >
          ⚠
        </span>
      )}
```

(Place it immediately before the `{timeLabel && (...)}` block.)

- [ ] **Step 2: Compute and pass severity in WeekTable**

In `src/components/editor/WeekTable.tsx`, import the hook and build the map:

```ts
import { useConflicts, conflictsByEvent } from '@/hooks/useConflicts';
```

Inside `WeekTable`, after `eventsByDate`:

```ts
  const conflicts = useConflicts();
  const conflictMap = useMemo(() => conflictsByEvent(conflicts), [conflicts]);
```

Where `DayCell` renders `<EventBlock>`, pass the highest severity. Update `DayCell`'s props to accept `conflictMap` and compute per-event:

```tsx
              const evConflicts = conflictMap.get(ev.id) ?? [];
              const severity = evConflicts.some((c) => c.severity === 'error')
                ? 'error'
                : evConflicts.length > 0 ? 'warning' : undefined;
              return (
                <EventBlock key={ev.id} event={ev} category={cat} onClick={() => openEdit(ev.id)} conflictSeverity={severity} />
              );
```

Thread `conflictMap` through `DayCellProps` (add `conflictMap: Map<string, Conflict[]>`) and pass it from the row render. Import `Conflict` type:

```ts
import type { Conflict } from '@/lib/conflicts';
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`, open a plan, create a Saturday event → a ⚠ appears on the block. Typecheck:

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/EventBlock.tsx src/components/editor/WeekTable.tsx
git commit -m "feat(editor): inline conflict badge on event blocks"
```

### Task 8: ConflictPanel + header counter

**Files:**
- Create: `src/components/editor/ConflictPanel.tsx`
- Modify: `src/components/editor/EditorHeader.tsx`
- Modify: `src/stores/ui.ts` (add `setCurrentQuarter` if missing — verify first)

- [ ] **Step 1: Verify ui store has quarter setter**

Read `src/stores/ui.ts`. Confirm there is a `currentQuarter` and a setter (e.g. `setCurrentQuarter`). If the setter is missing, add:

```ts
  setCurrentQuarter(q: 1 | 2 | 3 | 4): void;
```
```ts
  setCurrentQuarter(currentQuarter) { set({ currentQuarter }); },
```

- [ ] **Step 2: Create ConflictPanel**

Create `src/components/editor/ConflictPanel.tsx`:

```tsx
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { useConflicts } from '@/hooks/useConflicts';
import { getQuarterForDate } from '@/lib/schoolweeks';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose(): void;
}

export function ConflictPanel({ open, onClose }: Props) {
  const conflicts = useConflicts();
  const doc = usePlannerStore((s) => s.doc);
  const ignoreConflict = usePlannerStore((s) => s.ignoreConflict);
  const setCurrentQuarter = useUiStore((s) => s.setCurrentQuarter);
  const openEdit = useUiStore((s) => s.openEditEvent);

  if (!open || !doc) return null;

  const jump = (eventId: string) => {
    const ev = doc.events.find((e) => e.id === eventId);
    if (!ev) return;
    setCurrentQuarter(getQuarterForDate(ev.start, doc.schoolyear));
    openEdit(eventId);
    onClose();
  };

  return (
    <div className="absolute right-4 top-14 z-30 w-96 max-h-[70vh] overflow-auto rounded-[var(--radius-default)] border border-[var(--color-ink-200)] bg-[var(--color-paper-card)] p-3 shadow-[var(--shadow-modal)]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-semibold text-[var(--color-marine-800)]">
          Konflikte ({conflicts.length})
        </div>
        <button onClick={onClose} className="text-[var(--color-ink-500)] text-[13px]">✕</button>
      </div>
      {conflicts.length === 0 && (
        <div className="text-[12px] text-[var(--color-ink-500)] py-4 text-center">Keine Konflikte 🎉</div>
      )}
      <ul className="space-y-2">
        {conflicts.map((c) => (
          <li key={c.key} className="rounded-[var(--radius-block)] border border-[var(--color-ink-200)] p-2">
            <div className="flex items-start gap-1.5">
              <span style={{ color: c.severity === 'error' ? '#E02424' : '#B45309' }}>⚠</span>
              <span className="text-[12.5px] text-[var(--color-ink-900)] leading-snug flex-1">{c.message}</span>
            </div>
            <div className="flex gap-2 mt-1.5">
              <Button size="sm" variant="outline" onClick={() => jump(c.eventIds[0])}>Anzeigen</Button>
              <Button size="sm" variant="ghost" onClick={() => ignoreConflict(c.key)}>Ignorieren</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Add the counter button to EditorHeader**

In `src/components/editor/EditorHeader.tsx`, add local state + the panel. Near the top of the component:

```tsx
import { useState } from 'react';
import { useConflicts } from '@/hooks/useConflicts';
import { ConflictPanel } from './ConflictPanel';
```

```tsx
  const conflicts = useConflicts();
  const [panelOpen, setPanelOpen] = useState(false);
  const hasError = conflicts.some((c) => c.severity === 'error');
```

In the header's action row, add a button (match existing header button styling):

```tsx
  {conflicts.length > 0 && (
    <button
      onClick={() => setPanelOpen((v) => !v)}
      className="flex items-center gap-1 rounded-[var(--radius-block)] px-2.5 py-1.5 text-[12.5px] font-semibold"
      style={{
        background: hasError ? 'rgba(224,36,36,0.1)' : 'var(--color-gelb-100)',
        color: hasError ? '#E02424' : '#B45309'
      }}
    >
      ⚠ {conflicts.length} {conflicts.length === 1 ? 'Konflikt' : 'Konflikte'}
    </button>
  )}
  <ConflictPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
```

(Ensure the header's container is `relative` so the absolute panel anchors correctly; add `relative` to its className if absent.)

- [ ] **Step 4: Verify + typecheck**

Run: `npm run dev` — create a weekend event and an out-of-range event; the header shows the counter, the panel lists both, "Ignorieren" removes one, "Anzeigen" jumps to the quarter + opens the edit modal.

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/ConflictPanel.tsx src/components/editor/EditorHeader.tsx src/stores/ui.ts
git commit -m "feat(editor): conflict panel + header counter"
```

---

## Phase 3 — Multi-day rendering + resize

### Task 9: Render events on every covered day + move preserves duration

**Files:**
- Modify: `src/components/editor/WeekTable.tsx`
- Modify: `src/components/editor/EventBlock.tsx`

This replaces the start-only `eventsByDate` indexing with per-day coverage and fixes the move bug.

- [ ] **Step 1: Index events by every covered day**

In `src/components/editor/WeekTable.tsx`, import date helpers:

```ts
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
```

Replace the `eventsByDate` memo body so each event is pushed onto every day it covers:

```ts
  const eventsByDate = useMemo(() => {
    const m = new Map<string, PlanEvent[]>();
    if (!doc) return m;
    for (const ev of doc.events) {
      const span = Math.max(0, differenceInCalendarDays(parseISO(ev.end), parseISO(ev.start)));
      for (let i = 0; i <= span; i++) {
        const iso = format(addDays(parseISO(ev.start), i), 'yyyy-MM-dd');
        const arr = m.get(iso) ?? [];
        arr.push(ev);
        m.set(iso, arr);
      }
    }
    return m;
  }, [doc?.events]);
```

- [ ] **Step 2: Fix move to preserve duration**

In `handleDragEnd`, replace the final lines so the event keeps its length:

```ts
    const ev = doc.events.find((x) => x.id === id);
    if (!ev || ev.start === newIso) return;
    const span = differenceInCalendarDays(parseISO(ev.end), parseISO(ev.start));
    const newEnd = format(addDays(parseISO(newIso), span), 'yyyy-MM-dd');
    updateEvent(id, { start: newIso, end: newEnd });
```

- [ ] **Step 3: Continuation styling on EventBlock**

Add segment-position props to `EventBlock` so middle/continuation days read as one bar. Extend `Props`:

```ts
  segmentPosition?: 'start' | 'middle' | 'end' | 'single';
```

Compute rounding/border in the style. Replace the `borderLeft` line and add radius control:

```tsx
        borderTopLeftRadius: pos === 'start' || pos === 'single' ? undefined : 0,
        borderBottomLeftRadius: pos === 'start' || pos === 'single' ? undefined : 0,
        borderTopRightRadius: pos === 'end' || pos === 'single' ? undefined : 0,
        borderBottomRightRadius: pos === 'end' || pos === 'single' ? undefined : 0,
        borderLeft: pos === 'start' || pos === 'single' ? `3px solid ${category.color}` : 'none',
```

where `const pos = segmentPosition ?? 'single';` near the top of the component. Only render `timeLabel` + title when `pos === 'start' || pos === 'single'`; for `middle`/`end` render a non-breaking spacer so the bar keeps height:

```tsx
      {(pos === 'start' || pos === 'single') ? (
        <>
          {/* existing timeLabel + title */}
        </>
      ) : (
        <span className="opacity-0">·</span>
      )}
```

- [ ] **Step 4: Pass segmentPosition from DayCell**

In `WeekTable.tsx`, when rendering each `EventBlock`, compute the position from the cell's `iso` vs the event span:

```tsx
              const isStart = ev.start === iso;
              const isEnd = ev.end === iso;
              const pos = isStart && isEnd ? 'single' : isStart ? 'start' : isEnd ? 'end' : 'middle';
```

Pass `segmentPosition={pos}` to `<EventBlock>`. `DayCell` already receives `iso` via `dayIso(mondayIso, dayIdx)`.

- [ ] **Step 5: Verify**

Run: `npm run dev` — create an event, edit its end date to +3 days via the modal → a continuous bar spans the days; dragging it to another day keeps the 4-day length; a bar crossing into the next week wraps onto the next row.

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/WeekTable.tsx src/components/editor/EventBlock.tsx
git commit -m "feat(editor): render multi-day event segments + preserve duration on move"
```

### Task 10: Right-edge resize handle

**Files:**
- Modify: `src/components/editor/EventBlock.tsx`
- Modify: `src/components/editor/WeekTable.tsx`

dnd-kit: add a small draggable handle (only on the end segment); on drop over a cell, set the event's `end` to that cell's date (clamped ≥ start).

- [ ] **Step 1: Add a resize handle to EventBlock**

In `EventBlock.tsx`, add a second `useDraggable` for the handle and render it only on `end`/`single` segments:

```tsx
import { useDraggable } from '@dnd-kit/core';
```

Inside the component:

```tsx
  const resize = useDraggable({
    id: `resize:${event.id}`,
    data: { type: 'resize-end', eventId: event.id }
  });
```

At the end of the `<button>` children, render the grip when this is the trailing segment:

```tsx
      {(pos === 'end' || pos === 'single') && (
        <span
          ref={resize.setNodeRef}
          {...resize.listeners}
          {...resize.attributes}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
          aria-label="Dauer ändern"
        />
      )}
```

Add `position: 'relative'` to the button style (so the absolute grip anchors) and `paddingRight` a touch for grab room.

- [ ] **Step 2: Handle resize in WeekTable drag-end**

In `handleDragEnd`, before the existing move logic, branch on `type:'resize-end'`:

```ts
    if (activeData?.type === 'resize-end' && overData?.type === 'cell') {
      const id = activeData.eventId;
      const newIso = overData.iso;
      if (!id || !newIso) return;
      const ev = doc.events.find((x) => x.id === id);
      if (!ev) return;
      const clamped = newIso < ev.start ? ev.start : newIso;
      if (clamped !== ev.end) updateEvent(id, { end: clamped });
      return;
    }
```

(The `activeData` type union must include `'resize-end'`; widen the cast: `{ type?: string; eventId?: string }` already covers it.)

- [ ] **Step 3: Verify**

Run: `npm run dev` — grab the right edge of an event and drag across cells; the end date extends and the bar grows; dragging left of the start clamps to a single day.

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/EventBlock.tsx src/components/editor/WeekTable.tsx
git commit -m "feat(editor): right-edge drag-resize to change event end date"
```

---

## Phase 4 — ICS import

### Task 11: `ics-import.ts` — parser

**Files:**
- Create: `src/lib/ics-import.ts`
- Test: `src/lib/ics-import.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ics-import.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseIcs, type ParsedEvent } from './ics-import';

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:1@x',
  'SUMMARY:Gesamtkonferenz',
  'DTSTART;VALUE=DATE:20250901',
  'DTEND;VALUE=DATE:20250902',
  'DESCRIPTION:Wichtig\\nGruppen: Kollegium',
  'CATEGORIES:Konferenz',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:2@x',
  'SUMMARY:Elternabend lange Zeile die ge',
  ' faltet wurde',
  'DTSTART:20250905T180000',
  'DTEND:20250905T200000',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');

describe('parseIcs', () => {
  it('parses an all-day event with exclusive DTEND -> inclusive', () => {
    const evs = parseIcs(ICS);
    const e = evs.find((x) => x.uid === '1@x') as ParsedEvent;
    expect(e.allDay).toBe(true);
    expect(e.start).toBe('2025-09-01');
    expect(e.end).toBe('2025-09-01'); // DTEND 0902 exclusive -> 0901 inclusive
    expect(e.categories).toContain('Konferenz');
    expect(e.description).toContain('Gruppen: Kollegium');
  });

  it('parses a timed event and unfolds folded lines', () => {
    const evs = parseIcs(ICS);
    const e = evs.find((x) => x.uid === '2@x') as ParsedEvent;
    expect(e.allDay).toBe(false);
    expect(e.start).toBe('2025-09-05');
    expect(e.startTime).toBe('18:00');
    expect(e.endTime).toBe('20:00');
    expect(e.summary).toBe('Elternabend lange Zeile die gefaltet wurde');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ics-import.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the parser**

Create `src/lib/ics-import.ts`:

```ts
import { addDays, format, parseISO } from 'date-fns';

export interface ParsedEvent {
  uid: string;
  summary: string;
  start: string;        // YYYY-MM-DD
  end: string;          // YYYY-MM-DD (inclusive)
  allDay: boolean;
  startTime?: string;   // HH:mm
  endTime?: string;
  location?: string;
  description?: string;
  categories: string[];
}

function unfold(text: string): string[] {
  const rawLines = text.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function unescape(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

/** Split "NAME;PARAM=x" -> { name, params }, value is the part after the first ':'. */
function parseLine(line: string): { name: string; params: string; value: string } | null {
  const colon = line.indexOf(':');
  if (colon === -1) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const semi = left.indexOf(';');
  return semi === -1
    ? { name: left, params: '', value }
    : { name: left.slice(0, semi), params: left.slice(semi + 1), value };
}

function toIsoDate(raw: string): string {
  // 20250901 or 20250901T180000(Z)
  const d = raw.slice(0, 8);
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function toTime(raw: string): string | undefined {
  const t = raw.indexOf('T');
  if (t === -1) return undefined;
  const hh = raw.slice(t + 1, t + 3);
  const mm = raw.slice(t + 3, t + 5);
  return `${hh}:${mm}`;
}

export function parseIcs(text: string): ParsedEvent[] {
  const lines = unfold(text);
  const events: ParsedEvent[] = [];
  let cur: Partial<ParsedEvent> & { _dtendRaw?: string; _allDay?: boolean } = {};
  let inEvent = false;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; cur = { categories: [] }; continue; }
    if (line === 'END:VEVENT') {
      inEvent = false;
      if (cur.start) {
        let end = cur.end ?? cur.start;
        if (cur._allDay && cur._dtendRaw) {
          // DTEND is exclusive for all-day -> subtract one day
          end = format(addDays(parseISO(toIsoDate(cur._dtendRaw)), -1), 'yyyy-MM-dd');
        }
        events.push({
          uid: cur.uid ?? crypto.randomUUID(),
          summary: cur.summary ?? '(ohne Titel)',
          start: cur.start,
          end,
          allDay: !!cur._allDay,
          startTime: cur.startTime,
          endTime: cur.endTime,
          location: cur.location,
          description: cur.description,
          categories: cur.categories ?? []
        });
      }
      continue;
    }
    if (!inEvent) continue;
    const p = parseLine(line);
    if (!p) continue;
    switch (p.name) {
      case 'UID': cur.uid = p.value; break;
      case 'SUMMARY': cur.summary = unescape(p.value); break;
      case 'LOCATION': cur.location = unescape(p.value); break;
      case 'DESCRIPTION': cur.description = unescape(p.value); break;
      case 'CATEGORIES': cur.categories = unescape(p.value).split(',').map((s) => s.trim()).filter(Boolean); break;
      case 'DTSTART':
        cur.start = toIsoDate(p.value);
        cur._allDay = p.params.includes('VALUE=DATE') && !p.value.includes('T');
        if (!cur._allDay) cur.startTime = toTime(p.value);
        break;
      case 'DTEND':
        cur.end = toIsoDate(p.value);
        cur._dtendRaw = p.value;
        if (!p.value.includes('T')) { /* date end stays */ } else cur.endTime = toTime(p.value);
        break;
    }
  }
  return events;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ics-import.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ics-import.ts src/lib/ics-import.test.ts
git commit -m "feat(ics): parseIcs with unfolding + all-day exclusive-end handling"
```

### Task 12: `mapToEvents` + `shiftToSchoolyear`

**Files:**
- Modify: `src/lib/ics-import.ts`
- Modify: `src/lib/ics-import.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/ics-import.test.ts`:

```ts
import { mapToEvents, shiftToSchoolyear } from './ics-import';
import type { Category, Schoolyear } from '@/types';

const cats: Category[] = [
  { id: 'cK', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: ['konferenz', 'fk'] },
  { id: 'cE', label: 'Elternabend', color: '#0E9F6E', slug: 'elternabend', keywords: ['eltern'] },
  { id: 'cS', label: 'Sondertag', color: '#FFC857', slug: 'sondertag', keywords: [] }
];

describe('mapToEvents', () => {
  it('matches category by CATEGORIES label, then keyword, then fallback', () => {
    const parsed = [
      { uid: '1', summary: 'X', start: '2025-09-01', end: '2025-09-01', allDay: true, categories: ['Konferenz'] },
      { uid: '2', summary: 'Großer Elternabend', start: '2025-09-02', end: '2025-09-02', allDay: true, categories: [] },
      { uid: '3', summary: 'Irgendwas', start: '2025-09-03', end: '2025-09-03', allDay: true, categories: [] }
    ];
    const evs = mapToEvents(parsed, cats, 'cS');
    expect(evs[0].categoryId).toBe('cK'); // label
    expect(evs[1].categoryId).toBe('cE'); // keyword "eltern"
    expect(evs[2].categoryId).toBe('cS'); // fallback
  });

  it('extracts groups from a "Gruppen:" line in the description', () => {
    const parsed = [{ uid: '1', summary: 'X', start: '2025-09-01', end: '2025-09-01', allDay: true, categories: [], description: 'Info\nGruppen: Kollegium, Eltern' }];
    const evs = mapToEvents(parsed, cats, 'cS');
    expect(evs[0].groups).toEqual(['Kollegium', 'Eltern']);
  });
});

describe('shiftToSchoolyear', () => {
  const target: Schoolyear = {
    id: 's', label: '26/27', firstSchoolDay: '2026-08-10', firstTeachingDay: '2026-08-10',
    lastSchoolDay: '2027-06-25', holidays: [], quarterBoundaries: ['2026-10-31', '2027-01-31', '2027-04-15'],
    createdAt: '', updatedAt: ''
  };
  it('shifts by whole weeks and preserves weekday', () => {
    // 2025-09-01 is a Monday; expect result also a Monday inside the target year
    const evs = mapToEvents([{ uid: '1', summary: 'X', start: '2025-09-01', end: '2025-09-01', allDay: true, categories: [] }], cats, 'cS');
    const shifted = shiftToSchoolyear(evs, target);
    const day = new Date(shifted[0].start + 'T00:00:00').getDay();
    expect(day).toBe(1); // Monday
    expect(shifted[0].start >= target.firstSchoolDay).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ics-import.test.ts`
Expected: FAIL — `mapToEvents`/`shiftToSchoolyear` not exported.

- [ ] **Step 3: Implement both**

Append to `src/lib/ics-import.ts`:

```ts
import type { Category, PlanEvent, Schoolyear, UUID } from '@/types';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

function groupsFromDescription(desc?: string): string[] {
  if (!desc) return [];
  const line = desc.split('\n').find((l) => l.toLowerCase().startsWith('gruppen:'));
  if (!line) return [];
  return line.slice(line.indexOf(':') + 1).split(',').map((s) => s.trim()).filter(Boolean);
}

function matchCategory(p: ParsedEvent, categories: Category[], fallbackId: UUID): UUID {
  // 1) CATEGORIES label match (case-insensitive)
  for (const label of p.categories) {
    const hit = categories.find((c) => c.label.toLowerCase() === label.toLowerCase());
    if (hit) return hit.id;
  }
  // 2) keyword scan of summary + description
  const hay = `${p.summary} ${p.description ?? ''}`.toLowerCase();
  for (const c of categories) {
    if (c.keywords.some((k) => k && hay.includes(k.toLowerCase()))) return c.id;
  }
  // 3) fallback
  return fallbackId;
}

export function mapToEvents(parsed: ParsedEvent[], categories: Category[], fallbackCategoryId: UUID): PlanEvent[] {
  return parsed.map((p) => ({
    id: crypto.randomUUID(),
    title: p.summary,
    start: p.start,
    end: p.end,
    allDay: p.allDay,
    startTime: p.allDay ? undefined : p.startTime,
    endTime: p.allDay ? undefined : p.endTime,
    categoryId: matchCategory(p, categories, fallbackCategoryId),
    location: p.location,
    notes: p.description,
    groups: groupsFromDescription(p.description)
  }));
}

/**
 * Shift every event by a whole number of weeks so the earliest event lands on or
 * after the target's firstSchoolDay while keeping its weekday. Relative spacing is
 * preserved (all events move by the same delta).
 */
export function shiftToSchoolyear(events: PlanEvent[], target: Schoolyear): PlanEvent[] {
  if (events.length === 0) return events;
  const minStart = events.reduce((m, e) => (e.start < m ? e.start : m), events[0].start);
  const rawDelta = differenceInCalendarDays(parseISO(target.firstSchoolDay), parseISO(minStart));
  const weekDelta = Math.round(rawDelta / 7) * 7; // whole weeks -> weekday preserved
  const shift = (iso: string) => format(addDays(parseISO(iso), weekDelta), 'yyyy-MM-dd');
  return events.map((e) => ({ ...e, start: shift(e.start), end: shift(e.end) }));
}
```

> Merge the new `date-fns` import with the one already at the top of the file (do not duplicate the import statement) — keep a single `import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ics-import.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ics-import.ts src/lib/ics-import.test.ts
git commit -m "feat(ics): mapToEvents (category match chain) + shiftToSchoolyear"
```

### Task 13: `IcsImportDialog` component

**Files:**
- Create: `src/components/import/IcsImportDialog.tsx`

Shared dialog used by both Welcome (build new doc) and Settings (append). It takes the parsed events + categories and emits the mapped (optionally shifted) `PlanEvent[]`.

- [ ] **Step 1: Create the dialog**

Create `src/components/import/IcsImportDialog.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { mapToEvents, shiftToSchoolyear, type ParsedEvent } from '@/lib/ics-import';
import type { Category, PlanEvent, Schoolyear } from '@/types';

interface Props {
  open: boolean;
  parsed: ParsedEvent[];
  categories: Category[];
  /** Present when appending into an existing plan; enables the shift option. */
  targetSchoolyear: Schoolyear | null;
  onCancel(): void;
  onConfirm(events: PlanEvent[]): void;
}

export function IcsImportDialog({ open, parsed, categories, targetSchoolyear, onCancel, onConfirm }: Props) {
  const [shift, setShift] = useState(false);
  const fallbackId = useMemo(
    () => categories.find((c) => c.slug === 'sondertag')?.id ?? categories[0]?.id ?? '',
    [categories]
  );

  const mapped = useMemo(() => mapToEvents(parsed, categories, fallbackId), [parsed, categories, fallbackId]);
  const fallbackCount = mapped.filter((e) => e.categoryId === fallbackId).length;

  const confirm = () => {
    const out = shift && targetSchoolyear ? shiftToSchoolyear(mapped, targetSchoolyear) : mapped;
    onConfirm(out);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ICS importieren</DialogTitle>
        </DialogHeader>
        <div className="text-[13px] text-[var(--color-ink-900)] space-y-3">
          <p>{parsed.length} Termine gefunden · {mapped.length - fallbackCount} zugeordnet · {fallbackCount} Fallback (Sondertag).</p>
          {targetSchoolyear && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={shift} onCheckedChange={(v) => setShift(!!v)} />
              <span>Auf aktuelles Schuljahr verschieben (Wochentag bleibt erhalten)</span>
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
          <Button onClick={confirm}>{parsed.length} Termine übernehmen</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors. (If `Checkbox`'s `onCheckedChange` signature differs, match the existing usage in `src/components/settings/*`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/import/IcsImportDialog.tsx
git commit -m "feat(ics): shared IcsImportDialog with shift + summary"
```

### Task 14: Wire ICS import into Settings (append)

**Files:**
- Create: `src/components/settings/ImportTab.tsx`
- Modify: `src/components/settings/SettingsModal.tsx` (register the new tab)

- [ ] **Step 1: Inspect the existing tab wiring**

Read `src/components/settings/SettingsModal.tsx` and `src/components/settings/ExportTab.tsx` to copy the tab registration pattern (how tabs are listed and rendered).

- [ ] **Step 2: Create ImportTab**

Create `src/components/settings/ImportTab.tsx`:

```tsx
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import { parseIcs, type ParsedEvent } from '@/lib/ics-import';
import { IcsImportDialog } from '@/components/import/IcsImportDialog';
import { toast } from 'sonner';

export function ImportTab() {
  const doc = usePlannerStore((s) => s.doc);
  const addEvent = usePlannerStore((s) => s.addEvent);
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedEvent[] | null>(null);

  const onFile = async (file: File) => {
    try {
      const events = parseIcs(await file.text());
      if (events.length === 0) { toast.error('Keine Termine in der ICS gefunden'); return; }
      setParsed(events);
    } catch (e) {
      toast.error('ICS ungültig: ' + (e as Error).message);
    }
  };

  if (!doc) return null;

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[var(--color-ink-500)]">
        ICS-Datei (z.B. Vorjahresplan) in den aktuellen Plan einfügen.
      </p>
      <Button variant="outline" onClick={() => fileRef.current?.click()}>ICS-Datei wählen</Button>
      <input
        ref={fileRef} type="file" accept=".ics" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
      <IcsImportDialog
        open={parsed !== null}
        parsed={parsed ?? []}
        categories={doc.categories}
        targetSchoolyear={doc.schoolyear}
        onCancel={() => setParsed(null)}
        onConfirm={(events) => {
          events.forEach((ev) => addEvent(ev));
          setParsed(null);
          toast.success(`${events.length} Termine importiert`);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Register the tab in SettingsModal**

Add `ImportTab` to `SettingsModal.tsx` following the pattern observed in Step 1 (a new tab labeled "Import", value `import`, rendering `<ImportTab />`).

- [ ] **Step 4: Verify**

Run: `npm run dev` — Settings → Import → choose an ICS file → dialog shows counts + shift toggle → confirm appends events into the open plan.

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/ImportTab.tsx src/components/settings/SettingsModal.tsx
git commit -m "feat(settings): ICS import tab appends into current plan"
```

### Task 15: Wire ICS import into Welcome (new plan)

**Files:**
- Modify: `src/components/welcome/Welcome.tsx`
- Modify: `src/App.tsx` (route the new-from-ICS doc into the editor)

The Welcome flow infers the target school year from the ICS date range, builds a fresh doc via `createEmptyDoc` + default categories, maps the events, and hands the doc to `App` (same path as `onImportJson`).

- [ ] **Step 1: Add an "Aus ICS erstellen" button + flow to Welcome**

In `src/components/welcome/Welcome.tsx`, add a file input + dialog state mirroring the JSON loader. Imports:

```tsx
import { parseIcs, mapToEvents, type ParsedEvent } from '@/lib/ics-import';
import { createEmptyDoc } from '@/stores/planner';
import { IcsImportDialog } from '@/components/import/IcsImportDialog';
import type { PlannerDocument } from '@/types';
```

Add state + handlers:

```tsx
  const icsInputRef = useRef<HTMLInputElement>(null);
  const [icsParsed, setIcsParsed] = useState<ParsedEvent[] | null>(null);

  const handleIcs = async (file: File) => {
    try {
      const events = parseIcs(await file.text());
      if (events.length === 0) { toast.error('Keine Termine in der ICS gefunden'); return; }
      setIcsParsed(events);
    } catch (e) {
      toast.error('ICS ungültig: ' + (e as Error).message);
    }
  };

  const buildDocFromIcs = (parsed: ParsedEvent[]): PlannerDocument => {
    const minStart = parsed.reduce((m, e) => (e.start < m ? e.start : m), parsed[0].start);
    const maxEnd = parsed.reduce((m, e) => (e.end > m ? e.end : m), parsed[0].end);
    const startYear = Number(minStart.slice(0, 4));
    const label = `${startYear}/${(startYear + 1) % 100}`;
    const doc = createEmptyDoc(`Import ${label}`, label, minStart, minStart, maxEnd);
    const fallbackId = doc.categories.find((c) => c.slug === 'sondertag')?.id ?? doc.categories[0].id;
    doc.events = mapToEvents(parsed, doc.categories, fallbackId);
    return doc;
  };
```

Add the button (next to the JSON-Backup button) and the dialog (note: Welcome has no target year yet → `targetSchoolyear={null}` so the shift option is hidden; the inferred range already matches the file):

```tsx
          <Button variant="outline" onClick={() => icsInputRef.current?.click()}>
            Aus ICS-Datei erstellen
          </Button>
          <input
            ref={icsInputRef} type="file" accept=".ics" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIcs(f); e.target.value = ''; }}
          />
```

```tsx
      <IcsImportDialog
        open={icsParsed !== null}
        parsed={icsParsed ?? []}
        categories={createEmptyDoc('_', '_', '2000-01-01', '2000-01-01', '2000-01-02').categories}
        targetSchoolyear={null}
        onCancel={() => setIcsParsed(null)}
        onConfirm={() => {
          if (icsParsed) onImportJson(buildDocFromIcs(icsParsed));
          setIcsParsed(null);
        }}
      />
```

> The `categories` passed to the dialog are only used for the summary count; building the real doc uses its own fresh categories in `buildDocFromIcs`. This keeps the dialog generic.

- [ ] **Step 2: Update the teaser copy**

Remove the now-shipped teaser line `Phase 2: Excel-Import + ICS-Vorjahresplan` (ICS is now real). Replace with `Phase 2: Excel-Import` or delete it.

- [ ] **Step 3: Verify**

Run: `npm run dev` — Welcome → "Aus ICS-Datei erstellen" → choose a file → confirm → editor opens with a new plan whose school-year range covers the imported dates and events mapped to categories.

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/welcome/Welcome.tsx src/App.tsx
git commit -m "feat(welcome): create a new plan from an ICS file"
```

---

## Phase 5 — Demo plan

### Task 16: `demo.ts` — sample document

**Files:**
- Create: `src/lib/demo.ts`
- Test: `src/lib/demo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/demo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createDemoDoc } from './demo';
import { PlannerDocumentSchema } from './schemas';
import { detectConflicts } from './conflicts';

describe('createDemoDoc', () => {
  it('produces a schema-valid v2 document', () => {
    const doc = createDemoDoc();
    expect(PlannerDocumentSchema.safeParse(doc).success).toBe(true);
    expect(doc.version).toBe(2);
  });

  it('is populated and contains demonstrable conflicts', () => {
    const doc = createDemoDoc();
    expect(doc.events.length).toBeGreaterThanOrEqual(10);
    expect(detectConflicts(doc).length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/demo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `demo.ts`**

Create `src/lib/demo.ts`. Uses fixed 2026/27 dates (current "next" school year as of this plan) and seeds two intentional conflicts (a Saturday event, a Prüfung inside the autumn holidays):

```ts
import type { PlannerDocument, PlanEvent } from '@/types';

function uid(): string {
  return crypto.randomUUID();
}

const CATEGORIES = [
  { id: 'demo-konferenz', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: ['konferenz', 'fk'] },
  { id: 'demo-elternabend', label: 'Elternabend', color: '#0E9F6E', slug: 'elternabend', keywords: ['eltern'] },
  { id: 'demo-wandertag', label: 'Wandertag', color: '#FFC857', slug: 'wandertag', keywords: ['wandertag', 'ausflug'] },
  { id: 'demo-pruefung', label: 'Prüfung', color: '#E02424', slug: 'pruefung', keywords: ['prüfung', 'klausur', 'abitur'] },
  { id: 'demo-sonder', label: 'Sonderveranstaltung', color: '#7C3AED', slug: 'sonder', keywords: ['fest', 'feier'] },
  { id: 'demo-schliesstag', label: 'Schließtag', color: '#6B7280', slug: 'schliesstag', keywords: ['schließ', 'frei'] },
  { id: 'demo-sondertag', label: 'Sondertag', color: '#FFC857', slug: 'sondertag', keywords: [] }
];

function allDay(title: string, start: string, end: string, categoryId: string, groups: string[] = [], notes?: string): PlanEvent {
  return { id: uid(), title, start, end, allDay: true, categoryId, groups, notes };
}

function timed(title: string, date: string, startTime: string, endTime: string, categoryId: string, groups: string[] = []): PlanEvent {
  return { id: uid(), title, start: date, end: date, allDay: false, startTime, endTime, categoryId, groups };
}

export function createDemoDoc(): PlannerDocument {
  const now = new Date().toISOString();
  const events: PlanEvent[] = [
    timed('Erste Gesamtkonferenz', '2026-08-13', '14:00', '16:00', 'demo-konferenz', ['Kollegium']),
    allDay('Wandertag Klassen 5-7', '2026-09-17', '2026-09-17', 'demo-wandertag', ['Klassen 5-7']),
    timed('Elternabend Jg. 5', '2026-09-22', '18:00', '20:00', 'demo-elternabend', ['Eltern']),
    allDay('Schulfest', '2026-09-26', '2026-09-26', 'demo-sonder', ['Kollegium', 'Eltern'], 'Großes Sommerfest auf dem Schulhof'),
    allDay('Tag der offenen Tür', '2026-11-21', '2026-11-21', 'demo-sonder', ['Eltern']),
    timed('Zeugniskonferenz', '2027-01-21', '15:00', '18:00', 'demo-konferenz', ['Kollegium']),
    allDay('Halbjahreszeugnisse', '2027-01-29', '2027-01-29', 'demo-sondertag', ['Klassen 5-7', 'Klassen 8-10']),
    allDay('Beweglicher Ferientag', '2027-02-12', '2027-02-12', 'demo-schliesstag'),
    allDay('Projektwoche', '2027-03-15', '2027-03-19', 'demo-sonder', ['Sek I'], 'Mehrtägige Veranstaltung'),
    timed('Elternsprechtag', '2027-04-21', '15:00', '19:00', 'demo-elternabend', ['Eltern']),
    allDay('Abiturprüfungen Beginn', '2027-05-03', '2027-05-03', 'demo-pruefung', ['Sek II']),
    allDay('Sportfest', '2027-06-18', '2027-06-18', 'demo-sonder', ['Klassen 5-7', 'Klassen 8-10']),
    // --- Intentional conflicts to showcase detection ---
    allDay('Notfall-Begehung (Samstag)', '2026-09-19', '2026-09-19', 'demo-sondertag'), // weekend
    allDay('Nachschreibklausur', '2026-10-15', '2026-10-15', 'demo-pruefung', ['Sek II']) // Prüfung in Herbstferien
  ];

  return {
    version: 2,
    schoolyear: {
      id: 'demo-2026-27',
      label: '2026/27',
      firstSchoolDay: '2026-08-12',
      firstTeachingDay: '2026-08-12',
      lastSchoolDay: '2027-07-02',
      holidays: [
        { id: uid(), label: 'Herbstferien', start: '2026-10-12', end: '2026-10-24' },
        { id: uid(), label: 'Weihnachtsferien', start: '2026-12-23', end: '2027-01-06' },
        { id: uid(), label: 'Osterferien', start: '2027-03-29', end: '2027-04-10' },
        { id: uid(), label: 'Pfingstferien', start: '2027-05-18', end: '2027-05-21' }
      ],
      quarterBoundaries: ['2026-10-31', '2027-01-31', '2027-04-15'],
      createdAt: now,
      updatedAt: now
    },
    categories: CATEGORIES,
    events,
    annotations: [
      { schoolweek: 0, text: 'Schuljahresbeginn – Klassenleitungen organisieren', updatedAt: now },
      { schoolweek: 5, text: 'Elternabende laufen', updatedAt: now }
    ],
    availableGroups: ['Kollegium', 'Eltern', 'Klassen 5-7', 'Klassen 8-10', 'Sek I', 'Sek II'],
    ignoredConflicts: [],
    meta: { name: 'Demo: Schuljahr 2026/27', lastSaved: now }
  };
}
```

> If the test asserts `detectConflicts(doc).length >= 2` fails because the chosen dates aren't actually a weekend / inside the holiday range, adjust those two event dates so `2026-09-19` is a Saturday and `2026-10-15` is inside Herbstferien. (Verify: `2026-09-19` is a Saturday; `2026-10-15` falls in 2026-10-12..10-24.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/demo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/demo.ts src/lib/demo.test.ts
git commit -m "feat(demo): createDemoDoc sample plan with seeded conflicts"
```

### Task 17: "Demo ausprobieren" button on Welcome

**Files:**
- Modify: `src/components/welcome/Welcome.tsx`

- [ ] **Step 1: Add the button + handler**

In `src/components/welcome/Welcome.tsx`, import the demo factory:

```tsx
import { createDemoDoc } from '@/lib/demo';
```

Add a button that routes the demo doc through the same path as a JSON import (which already saves + sets active + opens the editor in `App`):

```tsx
          <Button variant="ghost" onClick={() => onImportJson(createDemoDoc())}>
            Demo ausprobieren
          </Button>
```

Place it as the last action in the button column.

- [ ] **Step 2: Verify**

Run: `npm run dev` — Welcome → "Demo ausprobieren" → editor opens with the populated 2026/27 plan; the header shows a conflict counter (≥2); the demo appears in the plan switcher and is deletable.

Run: `npm run typecheck && npm run lint`
Expected: no errors, no warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/welcome/Welcome.tsx
git commit -m "feat(welcome): one-click demo plan"
```

---

## Final verification

- [ ] **Full suite + build**

Run: `npm run test:run && npm run typecheck && npm run lint && npm run build`
Expected: all green, build emits `dist/`.

- [ ] **Manual smoke (npm run dev)**
  - Demo loads, conflict counter shows, panel lists + jumps + ignores (persists after reload).
  - Multi-day event renders as one bar; move keeps length; right-edge resize changes end date.
  - Settings → Import appends an ICS; Welcome → "Aus ICS-Datei erstellen" builds a new plan.
  - Reload an old (pre-existing) plan → still opens (v1→v2 migration).

---

## Self-review notes (author)

- **Spec coverage:** all 6 conflict checks (Task 4), warn-only badge + panel + ignore (Tasks 7–8), multi-day + move-fix + resize (Tasks 9–10), ICS parse/map/shift (Tasks 11–12), both import targets (Tasks 14–15), demo (Tasks 16–17), schema v2 migration (Tasks 1–2). Covered.
- **Type consistency:** `Conflict` shape and `detectConflicts`/`useConflicts`/`conflictsByEvent` names are reused verbatim across tasks. `ParsedEvent`, `mapToEvents(parsed, categories, fallbackId)`, `shiftToSchoolyear(events, target)` consistent between Tasks 11–15.
- **Known soft spots flagged inline:** demo conflict dates (verify weekday/holiday), Checkbox `onCheckedChange` signature, ui-store `setCurrentQuarter` existence, SettingsModal tab pattern — each task says to verify against the actual file before relying on it.
```