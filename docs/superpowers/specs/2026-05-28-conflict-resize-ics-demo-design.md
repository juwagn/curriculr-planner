# Design: Konflikt-Erkennung + Resize + ICS-Import + Demo

**Date:** 2026-05-28
**Status:** Approved (brainstorming)
**Scope:** Next PR for curriculr-planner. Four subsystems bundled. Ship as one PR
with separate commits per build step; ICS step is splittable into a follow-up PR
if the diff grows too large.

## Summary

Adds four capabilities to the annual-plan editor:

1. **Konflikt-Erkennung** — derive plan problems (holidays, out-of-range,
   weekends, overload, duplicates) and surface them non-blockingly.
2. **Resize / Mehrtages-Termine** — render events as continuous bars across
   Mo–Fr, drag the right edge to change the end date, preserve duration on move.
3. **ICS-Import** — seed a new plan or append into the current plan from an ICS
   file, with optional week-aligned date shifting onto the target school year.
4. **Demo** — one-click realistic, editable sample plan for testing/demoing.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Conflict checks | 6: `ferien`, `category-in-ferien`, `outside-schoolyear`, `weekend`, `duplicate-allday`, `overload-day` |
| Conflict UX | Warn-only, never block. Inline badge + header counter + panel. Ignorierbar |
| Resize | Per-cell continuous segments Mo–Fr; right-edge drag = end date; move preserves duration; cross-week wraps per row |
| ICS targets | Both Welcome (new plan) and Settings (append into current) |
| ICS dates | Optional week-aligned shift; weekday preserved |
| ICS category map | CATEGORIES label → keyword scan → fallback (`sondertag`) |
| Demo | Editable, normally savable/deletable plan; generated, anchored to next school year (2026/27); seeded with 2–3 intentional conflicts |
| Ignored-conflicts persistence | Doc field `ignoredConflicts: string[]`; schema bump v1→v2 + migration |
| Resize rendering approach | Per-cell segments (not absolute overlay) — reuses existing `<td>` droppables |

## Architecture

### Module layout

```
src/lib/
  conflicts.ts          NEW  detectConflicts(doc) → Conflict[]   (pure, TDD)
  conflicts.test.ts     NEW
  ics-import.ts         NEW  parseIcs(text), mapToEvents(), shiftToSchoolyear()  (pure, TDD)
  ics-import.test.ts    NEW
  demo.ts               NEW  createDemoDoc(): PlannerDocument
  schoolweeks.ts        EDIT add isHoliday(date,sy), isWeekend(date), isWithinSchoolyear(date,sy)
  schemas.ts            EDIT version 1→2, +ignoredConflicts; migrate()
  storage.ts            EDIT run migrate() on load/import before Zod parse

src/stores/planner.ts   EDIT +ignoreConflict(key)/unignoreConflict(key)
src/hooks/
  useConflicts.ts       NEW  memo over doc → Conflict[] (minus ignored)

src/components/editor/
  WeekTable.tsx         EDIT multi-day segments + resize handle + move-duration bugfix
  EventBlock.tsx        EDIT conflict glyph + continuation styling (start/mid/end)
  EditorHeader.tsx      EDIT conflict counter button
  ConflictPanel.tsx     NEW  list, jump-to-event, ignore toggle
src/components/import/
  IcsImportDialog.tsx   NEW  shared: target-year + shift toggle + fallback-category + summary
src/components/welcome/
  Welcome.tsx           EDIT "Demo ausprobieren" + "Aus ICS erstellen"
src/components/settings/
  ImportTab.tsx         NEW (or extend ExportTab)  "ICS einfügen"
```

### conflicts.ts contract

```ts
type ConflictType =
  | 'ferien'              // event overlaps a holiday range / Schließtag      (warning)
  | 'category-in-ferien' // Prüfung/Elternabend overlaps holiday             (error)
  | 'outside-schoolyear' // start < firstSchoolDay or end > lastSchoolDay    (error)
  | 'weekend'            // event covers a Sa/So                              (warning)
  | 'duplicate-allday'   // >1 all-day special event same date               (warning)
  | 'overload-day';      // > N events overlap same date (N=3)               (warning)

interface Conflict {
  key: string;        // stable: type + sorted eventIds + date → survives re-compute, used for ignore
  type: ConflictType;
  severity: 'error' | 'warning';
  eventIds: UUID[];
  message: string;    // German, user-facing
}

detectConflicts(doc: PlannerDocument): Conflict[]
```

- `category-in-ferien` triggered by category slug ∈ `['pruefung','elternabend']`
  (constant in module). Higher severity than plain `ferien`; the two can both
  fire — panel de-dupes by showing the sharper one.
- `outside-schoolyear` boundary: event ending exactly on `lastSchoolDay` is OK;
  only strictly outside counts.
- `overload-day` threshold N = 3 (module constant).
- `key` is stable across recomputes so the ignore set keeps matching.

### Conflict data flow

`doc` → `useConflicts` (memo) → filters out keys in `doc.ignoredConflicts` →
`Conflict[]`. `EventBlock` learns its conflicts via a Map `eventId → Conflict[]`
(passed down from `WeekTable`, computed once). Header counter = `conflicts.length`.
Panel "jump" = `setCurrentQuarter(getQuarterForDate(eventStart, schoolyear))` +
scroll to the event.

### Resize mechanics (dnd-kit)

- **Move (bugfix):** `handleDragEnd` for `type:'event'` →
  `newEnd = addDays(newStart, durationDays)` where
  `durationDays = differenceInDays(oldEnd, oldStart)`. Today it incorrectly sets
  `start = end = newIso`, collapsing multi-day events.
- **Resize:** a second `useDraggable` on the final segment, `data:{type:'resize-end', eventId}`.
  Drag over a cell droppable → `over.data.iso` → `updateEvent(id, { end: max(iso, start) })`.
  Live preview via dnd `over`. Right edge (end date) only in v1; left edge (start)
  is a possible later addition.
- **Multi-day render:** per school-week row, segment = event clipped to
  `[rowMonday, rowFriday]`. Styling: left-rounded only when segment start equals
  real `event.start`; right-rounded only when segment end equals real `event.end`;
  otherwise flat with no side border → reads as one continuous bar. Cross-week
  events produce one segment per row automatically.

### ICS import flow

`parseIcs(text)`:
- Line unfolding (RFC5545 continuation).
- `DTSTART;VALUE=DATE` → all-day; `DTEND` is exclusive → convert to inclusive
  (`end = DTEND - 1 day`).
- `DTSTART`/`DTEND` with time → `start`/`end` + `startTime`/`endTime`.
- Reads SUMMARY, LOCATION, DESCRIPTION, CATEGORIES.
- → `ParsedEvent[]`.

`IcsImportDialog` (shared):
- **Target school year:** Welcome = editable fields prefilled from file min/max
  (+1 year); Settings = the current doc's schoolyear.
- **Shift toggle:** `shiftToSchoolyear(events, targetSchoolyear)` — whole-week
  delta so the weekday is preserved and events land in the target year.
- **Category mapping** (`mapToEvents`): CATEGORIES label match → keyword scan of
  title/notes → fallback category (`sondertag`). Groups parsed from
  `"Gruppen: …"` line in DESCRIPTION (mirror of `ics-export`).
- **Summary toast:** `X importiert · Y zugeordnet · Z Fallback`.

Targets:
- Welcome → builds a new doc (inferred/edited year + default categories) → editor.
- Settings → batch `addEvent` into the current doc.

### demo.ts

`createDemoDoc(): PlannerDocument`:
- Full document, school year 2026/27 computed relative to today.
- NRW-style holidays, ~30 events across all categories, several week annotations.
- **Intentional** conflicts: 1 weekend event + 1 Prüfung-in-Ferien → demonstrates
  the badges live.
- `meta.name = "Demo: Schuljahr 2026/27"`, `version: 2`, `ignoredConflicts: []`.
- Welcome "Demo ausprobieren" → `saveDoc` + `setActiveDoc` → editor. Deletable
  like any plan via the plan switcher.

### Schema migration (v1 → v2)

- `PlannerDocumentSchema`: `version: z.literal(2)`, add
  `ignoredConflicts: z.array(z.string())`.
- `migrate(raw)`: if `raw.version === 1` → `{ ...raw, version: 2, ignoredConflicts: [] }`.
- Runs in `storage.loadDoc` and `storage.importJson` **before** Zod parse, so old
  saved docs and old JSON backups upgrade transparently.
- `createEmptyDoc`, wizard completion, and demo all emit `version: 2,
  ignoredConflicts: []`.

## Testing (TDD for lib)

- `conflicts.test.ts`: each check type positive + negative; ignore-key stability
  across recompute; boundary (event ending on `lastSchoolDay` = OK).
- `ics-import.test.ts`: unfolding; all-day exclusive-end conversion; DATETIME
  parse; category match chain (label → keyword → fallback); shift preserves
  weekday; export→import roundtrip.
- `schemas.test.ts`: v1→v2 migration adds `ignoredConflicts` and bumps version.
- UI: WeekTable renders multi-day segments + move preserves duration; Welcome
  shows Demo + ICS buttons.

## Build order

1. **Schema v2 + migration** — foundation; everything else assumes the field.
2. **conflicts.ts + tests** → `useConflicts` → EventBlock glyph + header counter +
   ConflictPanel.
3. **WeekTable** multi-day segments + move bugfix → resize handle.
4. **ics-import.ts + tests** → `IcsImportDialog` → Welcome + Settings wiring.
5. **demo.ts** → Welcome button.

## Out of scope (YAGNI)

- Left-edge (start-date) resize — right edge only in v1.
- Group-double-booking / general time-overlap conflicts — annual plan is mostly
  all-day; not requested.
- ICS recurrence rules (RRULE) — school events are one-off; flatten/skip RRULE.
- Excel import — separate future phase.
```