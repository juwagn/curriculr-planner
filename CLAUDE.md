# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Standalone web tool for school principals to author an annual school schedule.
Sibling to `../Wordpress Plugin Terminplaner/`, which **displays** the schedule
this tool **creates** (exported as ICS / JSON / Excel).

## Commands

```bash
npm install
npm run dev               # vite dev server → http://localhost:5173
npm run build             # tsc -b && vite build → dist/
npm run preview           # serve dist/ locally
npm run typecheck         # tsc --noEmit
npm run lint              # eslint . (max-warnings 0)
npm run test              # vitest watch
npm run test:run          # vitest run (CI)
npm run test:ui           # vitest UI
npx vitest run src/lib/schoolweeks.test.ts   # single test file
npx vitest run -t "computeSchoolweeks"       # single test by name
```

**Package manager: npm only.** pnpm fails on Y:\ network share (symlink layout
incompatible with Windows network drive). Do not switch.

## Architecture

### Top-level route state
`src/App.tsx` is a 4-state machine — `'loading' | 'welcome' | 'wizard' | 'editor'` —
driven by `useState`, not React Router. App boot reads `storage.getActiveDoc()`;
if present and Zod-valid → editor, otherwise → welcome. Wizard completion writes
doc + sets active → editor.

### State (Zustand)
- `stores/planner.ts` — single source of truth for the **persisted document**
  (`PlannerDocument`). All mutators (`addEvent`, `updateEvent`, `setAnnotation`,
  `updateSchoolyear`, ...) update the store **and** schedule `debouncedSave` at
  300ms. The store owns one doc at a time; switching plans calls `setDoc`.
- `stores/ui.ts` — ephemeral view state (`currentQuarter`, modal open/close,
  `viewMode: 'table' | 'year'`, `density`, `templatesSidebarOpen`,
  `armedTemplateId`). Persists only `viewMode` + `density` to `localStorage`
  under key `curriculr-planner:ui-prefs`.
- `stores/history.ts` — ephemeral undo/redo snapshot stack (cap 50). Planner
  **content** mutators push a snapshot before mutating; Settings-level mutators
  (categories, groups, templates, schoolyear) do not. `setDoc` resets it.

Keep these split: doc-state ↔ saved JSON; UI-state ↔ session/local prefs. Do not
move modal/viewMode flags into the planner store, do not put domain data into UI.

### Storage layer (`src/lib/storage.ts`)
`StorageAdapter` interface with `LocalStorageAdapter` impl. Every `loadDoc` /
`saveDoc` / `importJson` runs through `PlannerDocumentSchema` (Zod) — **invalid
JSON throws**. This is the trust boundary; downstream code assumes well-formed
docs. Keys: `curriculr-planner:docs` (id list), `curriculr-planner:doc:<id>`,
`curriculr-planner:active`.

### Domain logic (`src/lib/`)
Pure, framework-agnostic, TDD'd:
- `schoolweeks.ts` — derives `SchoolweekRange[]` and `WeekRow[]` (school weeks
  vs ferien rows) from `Schoolyear`. Rule: all 5 days holiday → ferien row; SW 00
  (the week containing `firstSchoolDay`) is always a school week row even if it
  falls entirely within Sommerferien (teacher preparation week). `getQuarterRange`
  / `getQuarterForDate` use `quarterBoundaries` (always length-3).
- `ics-export.ts`, `excel-export.ts` — output formats. Excel matches the legacy
  Konverter schema (sibling WordPress plugin consumes it).
- `colors.ts` — category color helpers.
- `excel-import.ts` — `parseKonverterXlsx` reads a Konverter `.xlsx` back into
  `ParsedEvent[]` (+ optional holidays), reusing the ICS `mapToEvents` chain.
- `holidays-api.ts` — `fetchHolidays(stateCode, from, to)` pulls Ferien
  (`/SchoolHolidays`) + gesetzliche Feiertage (`/PublicHolidays`) from
  OpenHolidays, maps to `Holiday[]` with `type`/`source`. `mergeFetchedHolidays`
  protects manual entries on re-fetch. Bundesländer as a static `GERMAN_STATES`
  list. UI entry: `HolidayFetchControl` (wizard step 1 + Settings → Schuljahr).
- `schemas.ts` — Zod for `PlannerDocument` (version literal `6` — bump on
  breaking shape changes and migrate; `migrate` chains v1→…→v6). `Holiday`
  carries `type: 'ferien' | 'feiertag'` + optional `source`; `Schoolyear` has an
  optional `stateCode`.

### Editor views
`Editor.tsx` switches between two `viewMode`s: `WeekTable` (rows = school
weeks, cols = Mo-Fr, notes column right — Konverter-style, default) and
`YearGrid` (months × days matrix, `viewMode === 'year'`). All write through the
same `planner` mutators. Drag-end is shared via `useEditorDragEnd.ts`
(`handleEditorDragEnd`) across `WeekTable` + `YearGrid` — handles event move,
resize-end, and template drop.

**v1.2.1 note:** the `QuarterCalendar` (FullCalendar) view was removed; its
deps (`@fullcalendar/*`) are uninstalled. `WeekTable` is the quarter-level
surface, `YearGrid` the year overview. A stale persisted `viewMode: 'calendar'`
is coerced to `'table'` on load (`stores/ui.ts`).

**v1.2 (Komfort):** Termin-Vorlagen (`TemplatesSidebar` drag/click-to-place +
`TemplatesTab` management in Settings), Excel-Import, `YearGrid` year view, and
Undo/Redo (`useUndoRedo` hook + toolbar; Ctrl+Z / Ctrl+Shift+Z).

### Auth + Sync (M1–M6)
- `stores/auth.ts` — Zustand store for IServ SSO session. Holds app-token in RAM + sessionStorage (Tab-gebunden, bei Tab-Schluss gelöscht; nie localStorage). `AppTokenClaims` type in `src/lib/wp-auth.ts`.
- `stores/wpSync.ts` — push/pull/stage state. `pull()` returns `'error'` on non-404 failures (401/403). Conflict on push surfaces `ConflictInfo` (who saved, when).
- `src/lib/wp-auth.ts` — `exchangeCodeForToken()` (code→app-token via WP `/auth/token`) + `isAppTokenClaims` type guard.
- `src/lib/wp-sync.ts` — all WP REST calls send `Authorization: Bearer <app-token>`. `fetchLatestRevision()` polls for presence (60s interval via `usePresence` hook).
- `vite.config.ts` — CSP meta tag injected at build time. Update if new external origins are added.
- `src/components/settings/InfoTab.tsx` — Datenschutz-Abschnitt in InfoTab — legally required, do not remove.

### Path alias
`@/*` → `src/*` (configured in `vite.config.ts`, `vitest.config.ts`,
`tsconfig.app.json`). Always use `@/...` imports, not deep relative paths.

## Brand + Design

- Primary marine `#00345C`, accent gelb `#FFC857`, font Inter.
- Tokens live in `src/styles/globals.css` under `@theme { --color-* }` (Tailwind
  v4 inline theme). **Never hardcode brand hex in components** — use
  `var(--color-marine-800)`, `text-[var(--color-ink-500)]`, etc.
- Authoritative design refs: [DESIGN.md](DESIGN.md), [DESIGN.json](DESIGN.json),
  [PRODUCT.md](PRODUCT.md).
- Design-Spec: [docs/superpowers/specs/2026-05-26-curriculr-planner-design.md](docs/superpowers/specs/2026-05-26-curriculr-planner-design.md)
- v1.0 Plan: [docs/superpowers/plans/2026-05-26-curriculr-planner-v1.0.md](docs/superpowers/plans/2026-05-26-curriculr-planner-v1.0.md)

## Deployment

Vite `base` flips on build: `/curriculr-planner/` for prod (GitHub Pages),
`/` for dev. If repo is renamed, update `repoName` in `vite.config.ts`.

## Conventions

- TypeScript strict. No `any` shortcuts.
- TDD for `src/lib/*` (every lib file has a co-located `.test.ts`). UI tests
  co-located too (`Welcome.test.tsx`, `Step1Schoolyear.test.tsx`, ...).
- shadcn/ui primitives in `src/components/ui/` — keep them dumb, no business
  logic; domain components live in `editor/`, `wizard/`, `welcome/`, etc.
- Mutating the doc → go through `usePlannerStore` actions so debounced save
  fires. Do not call `storage.saveDoc` directly from components.
- Validation: react-hook-form + Zod resolvers; schema is the source of truth.
- Language: UI copy is German (Schulleitung audience); identifiers/comments
  English.
