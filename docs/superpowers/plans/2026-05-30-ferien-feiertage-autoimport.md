# Ferien-/Feiertage-Auto-Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nach Bundesland-Wahl Ferien und gesetzliche Feiertage per OpenHolidays-Live-API vorbefüllen; manuelle Eingabe bleibt vollwertig.

**Architecture:** Reines Lib-Modul `holidays-api.ts` (fetch + Mapping + Merge, TDD, fetch gemockt). `Holiday` erhält `type` + `source`, `Schoolyear` ein optionales `stateCode`; Schema-Bump v3→v4 mit Migration. Gemeinsame UI-Komponente `HolidayFetchControl` in Wizard Step 1 und Einstellungen → Schuljahr. Einzel-Feiertage werden in `WeekTable` und `YearGrid` markiert (Tönung + Label).

**Tech Stack:** React + TypeScript (strict), Zustand, Zod, date-fns, Vitest, shadcn/ui (`Select`), Tailwind v4 Tokens.

**Referenz-Spec:** [docs/superpowers/specs/2026-05-30-ferien-feiertage-autoimport-design.md](../specs/2026-05-30-ferien-feiertage-autoimport-design.md)

---

## File Structure

- **Neu:**
  - `src/lib/holidays-api.ts` — `GERMAN_STATES`, `fetchHolidays`, `mapHoliday`, `mergeFetchedHolidays`, OpenHolidays-Response-Typen.
  - `src/lib/holidays-api.test.ts` — Mapping, fetch (gemockt), Fehlerpfad, Merge.
  - `src/components/settings/HolidayFetchControl.tsx` — geteiltes Bundesland-Select + Abruf + Bestätigung.
  - `src/components/settings/HolidayFetchControl.test.tsx` — Erfolg, Fehler, Merge schützt Manuelles.
- **Geändert:**
  - `src/types/index.ts` — `Holiday.type`, `Holiday.source`, `Schoolyear.stateCode`.
  - `src/lib/schemas.ts` — `HolidaySchema`, `SchoolyearSchema`, `version` literal `4`, `migrate` v3→v4.
  - `src/lib/schemas.test.ts` (falls vorhanden, sonst neu) — Migration v3→v4.
  - `src/lib/schoolweeks.test.ts` — Einzel-Feiertag erzeugt keine Ferien-Zeile.
  - `src/stores/planner.ts` — `createEmptyDoc` `version: 4`.
  - `src/components/wizard/Step1Schoolyear.tsx` — `DEFAULT_HOLIDAYS` mit `type`, Control eingebunden.
  - `src/components/wizard/wizard-state.ts` — (keine Signaturänderung; Holiday-Typ trägt neue Felder automatisch).
  - `src/components/wizard/Wizard.tsx` — `stateCode` an previewDoc durchreichen.
  - `src/components/settings/SchoolyearTab.tsx` — Control eingebunden, `stateCode` speichern.
  - `src/components/editor/WeekTable.tsx` — Feiertag-Markierung in `DayCell`.
  - `src/components/editor/YearGrid.tsx` — Feiertag von Ferien unterscheiden.
  - `src/styles/globals.css` — Token `--color-feiertag-bg`.
- **Doku:** `CHANGELOG.md`, `CLAUDE.md`.

---

## Task 1: Datenmodell erweitern (`Holiday`, `Schoolyear`)

**Files:**
- Modify: `src/types/index.ts:5-22`

- [ ] **Step 1: `Holiday` und `Schoolyear` erweitern**

In `src/types/index.ts` die beiden Interfaces ersetzen:

```ts
export interface Holiday {
  id: UUID;
  label: string;
  start: ISODate;
  end: ISODate;
  type: 'ferien' | 'feiertag';
  /** 'api' = aus OpenHolidays gezogen (wird bei Re-Fetch ersetzt); fehlt = manuell. */
  source?: 'api' | 'manual';
}

export interface Schoolyear {
  id: UUID;
  label: string;
  firstSchoolDay: ISODate;
  firstTeachingDay: ISODate;
  lastSchoolDay: ISODate;
  holidays: Holiday[];
  quarterBoundaries: ISODate[];
  /** Bundesland-Code (z. B. 'DE-NW') für Re-Fetch der Ferien/Feiertage. */
  stateCode?: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Typecheck — erwartete Fehler sehen**

Run: `npm run typecheck`
Expected: FAIL — mehrere Stellen erzeugen `Holiday`-Objekte ohne `type` (z. B. `Step1Schoolyear.tsx`, evtl. `excel-import.ts`). Diese werden in Folgetasks behoben. (Notiere die Fehlerliste; sie ist die To-do-Spur.)

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): Holiday gains type + source, Schoolyear gains stateCode"
```

---

## Task 2: Schema + Migration v3→v4

**Files:**
- Modify: `src/lib/schemas.ts:6-11` (HolidaySchema), `:13-23` (SchoolyearSchema), `:79` (version), `:94-106` (migrate)
- Test: `src/lib/schemas.test.ts`

- [ ] **Step 1: Failing test für Migration schreiben**

Falls `src/lib/schemas.test.ts` noch nicht existiert, neu anlegen; sonst diese Tests ergänzen:

```ts
import { describe, it, expect } from 'vitest';
import { migrate, PlannerDocumentSchema } from './schemas';

describe('migrate v3 → v4', () => {
  const v3Doc = {
    version: 3,
    schoolyear: {
      id: 'sy1',
      label: '2026/27',
      firstSchoolDay: '2026-08-10',
      firstTeachingDay: '2026-08-12',
      lastSchoolDay: '2027-07-15',
      holidays: [
        { id: 'h1', label: 'Herbstferien', start: '2026-10-12', end: '2026-10-24' }
      ],
      quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-16'],
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z'
    },
    categories: [],
    events: [],
    annotations: [],
    availableGroups: [],
    ignoredConflicts: [],
    templates: [],
    meta: { name: 'Plan', lastSaved: '2026-05-01T00:00:00.000Z' }
  };

  it('bumps version to 4 and defaults holiday.type to ferien', () => {
    const out = migrate(v3Doc) as typeof v3Doc & { version: number };
    expect(out.version).toBe(4);
    expect((out.schoolyear.holidays[0] as { type: string }).type).toBe('ferien');
  });

  it('migrated doc passes the current schema', () => {
    const out = migrate(v3Doc);
    expect(() => PlannerDocumentSchema.parse(out)).not.toThrow();
  });
});
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

Run: `npx vitest run src/lib/schemas.test.ts`
Expected: FAIL — `version` ist noch `3`, `type` fehlt, Schema kennt `version: 4` nicht.

- [ ] **Step 3: Schema + Migration implementieren**

In `src/lib/schemas.ts` `HolidaySchema` ersetzen:

```ts
export const HolidaySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  start: isoDate,
  end: isoDate,
  type: z.enum(['ferien', 'feiertag']),
  source: z.enum(['api', 'manual']).optional()
});
```

In `SchoolyearSchema` nach `quarterBoundaries`-Zeile ergänzen:

```ts
  stateCode: z.string().optional(),
```

`version`-Literal ändern:

```ts
  version: z.literal(4),
```

`migrate` um den v3→v4-Schritt erweitern (nach dem v2→v3-Block, vor `return doc;`):

```ts
  if (doc.version === 3) {
    doc.version = 4;
    const sy = doc.schoolyear as { holidays?: Array<Record<string, unknown>> } | undefined;
    if (sy && Array.isArray(sy.holidays)) {
      for (const h of sy.holidays) {
        if (typeof h.type !== 'string') h.type = 'ferien';
      }
    }
  }
```

- [ ] **Step 4: Test ausführen — muss bestehen**

Run: `npx vitest run src/lib/schemas.test.ts`
Expected: PASS (beide Tests grün).

- [ ] **Step 5: Commit**

```bash
git add src/lib/schemas.ts src/lib/schemas.test.ts
git commit -m "feat(schema): bump to v4, migrate holidays to typed shape"
```

---

## Task 3: `createEmptyDoc` auf v4 heben

**Files:**
- Modify: `src/stores/planner.ts:31`

- [ ] **Step 1: Version anheben**

In `src/stores/planner.ts` im Rückgabeobjekt von `createEmptyDoc`:

```ts
    version: 4,
```

(ersetzt `version: 3`).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: Der vorherige `version`-Mismatch (3 vs. literal 4) ist weg. Übrige `Holiday`-`type`-Fehler bleiben bis Task 4/6.

- [ ] **Step 3: Commit**

```bash
git add src/stores/planner.ts
git commit -m "feat(planner): createEmptyDoc emits version 4"
```

---

## Task 4: API-Client `holidays-api.ts` — Mapping + Merge

**Files:**
- Create: `src/lib/holidays-api.ts`
- Test: `src/lib/holidays-api.test.ts`

- [ ] **Step 1: Failing tests für Mapping + Merge schreiben**

`src/lib/holidays-api.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mapHoliday, mergeFetchedHolidays, fetchHolidays, GERMAN_STATES } from './holidays-api';
import type { Holiday } from '@/types';

const schoolRaw = {
  id: 'x',
  startDate: '2026-10-12',
  endDate: '2026-10-24',
  type: 'School',
  name: [{ language: 'DE', text: 'Herbstferien' }]
};
const publicRaw = {
  id: 'y',
  startDate: '2026-10-03',
  endDate: '2026-10-03',
  type: 'Public',
  name: [{ language: 'EN', text: 'German Unity Day' }, { language: 'DE', text: 'Tag der Deutschen Einheit' }]
};

describe('mapHoliday', () => {
  it('maps a school-holiday range to a typed ferien Holiday', () => {
    const h = mapHoliday(schoolRaw, 'ferien');
    expect(h.label).toBe('Herbstferien');
    expect(h.start).toBe('2026-10-12');
    expect(h.end).toBe('2026-10-24');
    expect(h.type).toBe('ferien');
    expect(h.source).toBe('api');
    expect(h.id.length).toBeGreaterThan(0);
  });

  it('prefers the German name for feiertage', () => {
    const h = mapHoliday(publicRaw, 'feiertag');
    expect(h.label).toBe('Tag der Deutschen Einheit');
    expect(h.type).toBe('feiertag');
  });
});

describe('mergeFetchedHolidays', () => {
  it('keeps manual entries and replaces previous api entries', () => {
    const existing: Holiday[] = [
      { id: 'm1', label: 'Bewegliche Ferien', start: '2027-02-15', end: '2027-02-16', type: 'ferien' },
      { id: 'a1', label: 'Alt-API', start: '2026-10-12', end: '2026-10-24', type: 'ferien', source: 'api' }
    ];
    const fetched: Holiday[] = [
      { id: 'n1', label: 'Herbstferien', start: '2026-10-12', end: '2026-10-24', type: 'ferien', source: 'api' }
    ];
    const merged = mergeFetchedHolidays(existing, fetched);
    expect(merged).toHaveLength(2);
    expect(merged.find((h) => h.id === 'm1')).toBeTruthy();
    expect(merged.find((h) => h.id === 'a1')).toBeUndefined();
    expect(merged.find((h) => h.id === 'n1')).toBeTruthy();
  });
});

describe('GERMAN_STATES', () => {
  it('lists all 16 Bundesländer with DE- codes', () => {
    expect(GERMAN_STATES).toHaveLength(16);
    expect(GERMAN_STATES.every((s) => s.code.startsWith('DE-'))).toBe(true);
  });
});

describe('fetchHolidays', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('queries both endpoints and combines ferien + feiertage', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('/SchoolHolidays') ? [schoolRaw] : [publicRaw])
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchHolidays('DE-NW', '2026-08-10', '2027-07-15');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.filter((h) => h.type === 'ferien')).toHaveLength(1);
    expect(result.filter((h) => h.type === 'feiertag')).toHaveLength(1);
    const calledUrls = fetchMock.mock.calls.map((c) => c[0] as string).join(' ');
    expect(calledUrls).toContain('subdivisionCode=DE-NW');
    expect(calledUrls).toContain('validFrom=2026-08-10');
    expect(calledUrls).toContain('validTo=2027-07-15');
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => [] })));
    await expect(fetchHolidays('DE-NW', '2026-08-10', '2027-07-15')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Tests ausführen — müssen fehlschlagen**

Run: `npx vitest run src/lib/holidays-api.test.ts`
Expected: FAIL — Modul `holidays-api` existiert nicht.

- [ ] **Step 3: `holidays-api.ts` implementieren**

`src/lib/holidays-api.ts`:

```ts
import type { Holiday, ISODate } from '@/types';

const BASE_URL = 'https://openholidaysapi.org';

export interface OpenHolidayName {
  language: string;
  text: string;
}

export interface OpenHolidayItem {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  name: OpenHolidayName[];
}

export interface GermanState {
  code: string;
  name: string;
}

export const GERMAN_STATES: GermanState[] = [
  { code: 'DE-BW', name: 'Baden-Württemberg' },
  { code: 'DE-BY', name: 'Bayern' },
  { code: 'DE-BE', name: 'Berlin' },
  { code: 'DE-BB', name: 'Brandenburg' },
  { code: 'DE-HB', name: 'Bremen' },
  { code: 'DE-HH', name: 'Hamburg' },
  { code: 'DE-HE', name: 'Hessen' },
  { code: 'DE-MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'DE-NI', name: 'Niedersachsen' },
  { code: 'DE-NW', name: 'Nordrhein-Westfalen' },
  { code: 'DE-RP', name: 'Rheinland-Pfalz' },
  { code: 'DE-SL', name: 'Saarland' },
  { code: 'DE-SN', name: 'Sachsen' },
  { code: 'DE-ST', name: 'Sachsen-Anhalt' },
  { code: 'DE-SH', name: 'Schleswig-Holstein' },
  { code: 'DE-TH', name: 'Thüringen' }
];

function germanLabel(name: OpenHolidayName[]): string {
  const de = name.find((n) => n.language === 'DE');
  return (de ?? name[0])?.text ?? 'Termin';
}

export function mapHoliday(item: OpenHolidayItem, type: Holiday['type']): Holiday {
  return {
    id: crypto.randomUUID(),
    label: germanLabel(item.name),
    start: item.startDate,
    end: item.endDate,
    type,
    source: 'api'
  };
}

/** Manuelle Einträge bleiben, alte API-Einträge werden durch die neuen ersetzt. */
export function mergeFetchedHolidays(existing: Holiday[], fetched: Holiday[]): Holiday[] {
  const manual = existing.filter((h) => h.source !== 'api');
  return [...manual, ...fetched];
}

async function fetchJson(url: string): Promise<OpenHolidayItem[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenHolidays-Abruf fehlgeschlagen (${res.status})`);
  return (await res.json()) as OpenHolidayItem[];
}

export async function fetchHolidays(
  stateCode: string,
  from: ISODate,
  to: ISODate
): Promise<Holiday[]> {
  const query =
    `countryIsoCode=DE&subdivisionCode=${encodeURIComponent(stateCode)}` +
    `&languageIsoCode=DE&validFrom=${from}&validTo=${to}`;
  const [school, pub] = await Promise.all([
    fetchJson(`${BASE_URL}/SchoolHolidays?${query}`),
    fetchJson(`${BASE_URL}/PublicHolidays?${query}`)
  ]);
  return [
    ...school.map((item) => mapHoliday(item, 'ferien')),
    ...pub.map((item) => mapHoliday(item, 'feiertag'))
  ];
}
```

- [ ] **Step 4: Tests ausführen — müssen bestehen**

Run: `npx vitest run src/lib/holidays-api.test.ts`
Expected: PASS (alle Tests grün).

- [ ] **Step 5: Commit**

```bash
git add src/lib/holidays-api.ts src/lib/holidays-api.test.ts
git commit -m "feat(lib): OpenHolidays client (fetch + map + merge) with tests"
```

---

## Task 5: `schoolweeks` — Einzel-Feiertag-Verhalten absichern

**Files:**
- Test: `src/lib/schoolweeks.test.ts`

Kein Produktionscode nötig: `isHoliday` gibt bereits das `Holiday`-Objekt zurück (inkl. `type`), und `computeWeekRows` erzeugt nur bei ≥3 Ferientagen eine Ferien-Zeile. Dieser Task dokumentiert das per Test.

- [ ] **Step 1: Test schreiben**

In `src/lib/schoolweeks.test.ts` ergänzen (Imports an vorhandene Datei anpassen):

```ts
import { computeWeekRows, isHoliday } from './schoolweeks';
import type { Schoolyear } from '@/types';

describe('single feiertag does not collapse a school week', () => {
  const sy: Schoolyear = {
    id: 's', label: '2026/27',
    firstSchoolDay: '2026-08-10',
    firstTeachingDay: '2026-08-10',
    lastSchoolDay: '2026-08-14',
    quarterBoundaries: ['2026-08-14', '2026-08-14', '2026-08-14'],
    createdAt: '', updatedAt: '',
    holidays: [
      { id: 'f', label: 'Tag der Deutschen Einheit', start: '2026-08-12', end: '2026-08-12', type: 'feiertag', source: 'api' }
    ]
  };

  it('keeps the week as a schoolweek row', () => {
    const rows = computeWeekRows(sy);
    expect(rows.some((r) => r.kind === 'holiday')).toBe(false);
    expect(rows.some((r) => r.kind === 'schoolweek')).toBe(true);
  });

  it('isHoliday surfaces the feiertag type on that day', () => {
    const h = isHoliday('2026-08-12', sy.holidays);
    expect(h?.type).toBe('feiertag');
  });
});
```

- [ ] **Step 2: Test ausführen — muss bestehen**

Run: `npx vitest run src/lib/schoolweeks.test.ts`
Expected: PASS (Verhalten ist bereits korrekt; Test fixiert es).

- [ ] **Step 3: Commit**

```bash
git add src/lib/schoolweeks.test.ts
git commit -m "test(schoolweeks): single feiertag stays in school week"
```

---

## Task 6: `HolidayFetchControl`-Komponente

**Files:**
- Create: `src/components/settings/HolidayFetchControl.tsx`
- Test: `src/components/settings/HolidayFetchControl.test.tsx`

- [ ] **Step 1: Failing tests schreiben**

`src/components/settings/HolidayFetchControl.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HolidayFetchControl } from './HolidayFetchControl';
import type { Holiday } from '@/types';

vi.mock('@/lib/holidays-api', async (orig) => {
  const actual = await orig<typeof import('@/lib/holidays-api')>();
  return { ...actual, fetchHolidays: vi.fn() };
});
import { fetchHolidays } from '@/lib/holidays-api';

const fetchMock = vi.mocked(fetchHolidays);

beforeEach(() => fetchMock.mockReset());

const manual: Holiday[] = [
  { id: 'm1', label: 'Beweglicher Ferientag', start: '2027-02-15', end: '2027-02-15', type: 'ferien' }
];

function setup(onApply = vi.fn()) {
  render(
    <HolidayFetchControl
      stateCode="DE-NW"
      from="2026-08-10"
      to="2027-07-15"
      holidays={manual}
      onApply={onApply}
    />
  );
  return onApply;
}

describe('HolidayFetchControl', () => {
  it('fetches, confirms, and applies merged holidays preserving manual entries', async () => {
    fetchMock.mockResolvedValue([
      { id: 'a1', label: 'Herbstferien', start: '2026-10-12', end: '2026-10-24', type: 'ferien', source: 'api' }
    ]);
    const onApply = setup();

    await userEvent.click(screen.getByRole('button', { name: /abrufen/i }));
    await waitFor(() => expect(screen.getByText(/gefunden/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /übernehmen/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const [holidays, stateCode] = onApply.mock.calls[0];
    expect(stateCode).toBe('DE-NW');
    expect(holidays.find((h: Holiday) => h.id === 'm1')).toBeTruthy();
    expect(holidays.find((h: Holiday) => h.label === 'Herbstferien')).toBeTruthy();
  });

  it('shows an error and does not call onApply when the fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('netzwerk'));
    const onApply = setup();

    await userEvent.click(screen.getByRole('button', { name: /abrufen/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onApply).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Tests ausführen — müssen fehlschlagen**

Run: `npx vitest run src/components/settings/HolidayFetchControl.test.tsx`
Expected: FAIL — Komponente existiert nicht.

- [ ] **Step 3: Komponente implementieren**

`src/components/settings/HolidayFetchControl.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { fetchHolidays, mergeFetchedHolidays, GERMAN_STATES } from '@/lib/holidays-api';
import type { Holiday, ISODate } from '@/types';

interface Props {
  stateCode?: string;
  from: ISODate;
  to: ISODate;
  holidays: Holiday[];
  onApply(holidays: Holiday[], stateCode: string): void;
}

interface Pending {
  merged: Holiday[];
  ferien: number;
  feiertage: number;
}

export function HolidayFetchControl({ stateCode, from, to, holidays, onApply }: Props) {
  const [selected, setSelected] = useState(stateCode ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const canFetch = !!selected && !!from && !!to && !loading;

  const handleFetch = async () => {
    setError(null);
    setPending(null);
    if (!from || !to) {
      setError('Bitte zuerst Erster Schultag und Letzter Schultag ausfüllen.');
      return;
    }
    setLoading(true);
    try {
      const fetched = await fetchHolidays(selected, from, to);
      const merged = mergeFetchedHolidays(holidays, fetched);
      setPending({
        merged,
        ferien: fetched.filter((h) => h.type === 'ferien').length,
        feiertage: fetched.filter((h) => h.type === 'feiertag').length
      });
    } catch {
      setError('Abruf fehlgeschlagen — bitte manuell eintragen.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!pending) return;
    onApply(pending.merged, selected);
    setPending(null);
  };

  return (
    <div className="space-y-3 rounded-[var(--radius-default)] border border-[var(--color-ink-200)] bg-[var(--color-paper-bg)]/40 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="mb-1.5">Bundesland</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Bundesland wählen" />
            </SelectTrigger>
            <SelectContent>
              {GERMAN_STATES.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" disabled={!canFetch} onClick={handleFetch}>
          {loading ? 'Wird abgerufen …' : 'Ferien & Feiertage abrufen'}
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-[var(--radius-default)] p-2 text-[13px]"
          style={{ background: '#FEE2E2', color: 'var(--color-status-red)' }}
        >
          {error}
        </div>
      )}

      {pending && (
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--color-ink-900)]">
          <span>
            {pending.ferien} Ferien und {pending.feiertage} Feiertage gefunden — vorhandene
            API-Einträge ersetzen?
          </span>
          <Button size="sm" onClick={handleConfirm}>
            Übernehmen
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
            Abbrechen
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Tests ausführen — müssen bestehen**

Run: `npx vitest run src/components/settings/HolidayFetchControl.test.tsx`
Expected: PASS (beide Tests grün).

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/HolidayFetchControl.tsx src/components/settings/HolidayFetchControl.test.tsx
git commit -m "feat(settings): HolidayFetchControl (Bundesland fetch + confirm + merge)"
```

---

## Task 7: Wizard Step 1 einbinden

**Files:**
- Modify: `src/components/wizard/Step1Schoolyear.tsx:8-14` (DEFAULT_HOLIDAYS), `:37-42` (addHoliday), Render-Bereich `:112-133`
- Modify: `src/components/wizard/wizard-state.ts:3-10` (Step1Data: stateCode)
- Modify: `src/components/wizard/Wizard.tsx:82-101` (stateCode an previewDoc)

- [ ] **Step 1: `Step1Data` um `stateCode` erweitern**

In `src/components/wizard/wizard-state.ts` `Step1Data` ergänzen:

```ts
export interface Step1Data {
  label: string;
  name: string;
  firstSchoolDay: string;
  firstTeachingDay: string;
  lastSchoolDay: string;
  holidays: Holiday[];
  stateCode?: string;
}
```

- [ ] **Step 2: `DEFAULT_HOLIDAYS` + `addHoliday` mit `type`**

In `src/components/wizard/Step1Schoolyear.tsx` `DEFAULT_HOLIDAYS` ersetzen:

```ts
const DEFAULT_HOLIDAYS = (): Holiday[] => [
  { id: crypto.randomUUID(), label: 'Herbstferien', start: '', end: '', type: 'ferien' },
  { id: crypto.randomUUID(), label: 'Weihnachtsferien', start: '', end: '', type: 'ferien' },
  { id: crypto.randomUUID(), label: 'Osterferien', start: '', end: '', type: 'ferien' },
  { id: crypto.randomUUID(), label: 'Pfingstferien', start: '', end: '', type: 'ferien' },
  { id: crypto.randomUUID(), label: 'Sommerferien', start: '', end: '', type: 'ferien' }
];
```

`addHoliday` (Zeilen ~37-42) — neues Objekt mit `type`:

```ts
  const addHoliday = () => {
    setData((d) => ({
      ...d,
      holidays: [
        ...d.holidays,
        { id: crypto.randomUUID(), label: 'Ferien', start: '', end: '', type: 'ferien' }
      ]
    }));
  };
```

- [ ] **Step 3: `HolidayFetchControl` im Render einbinden**

In `src/components/wizard/Step1Schoolyear.tsx` Import ergänzen:

```ts
import { HolidayFetchControl } from '@/components/settings/HolidayFetchControl';
```

Direkt vor dem `Ferien`-`<h3>`-Block (vor Zeile ~112 `<div className="space-y-3">` der Ferien-Sektion) einsetzen:

```tsx
      <HolidayFetchControl
        stateCode={data.stateCode}
        from={data.firstSchoolDay}
        to={data.lastSchoolDay}
        holidays={data.holidays}
        onApply={(holidays, stateCode) => setData((d) => ({ ...d, holidays, stateCode }))}
      />
```

- [ ] **Step 4: `stateCode` in den previewDoc durchreichen**

In `src/components/wizard/Wizard.tsx` im Step-3-Block nach `previewDoc.schoolyear.holidays = step1.holidays;`:

```ts
          previewDoc.schoolyear.stateCode = step1.stateCode;
```

- [ ] **Step 5: Typecheck + bestehende Wizard-Tests**

Run: `npm run typecheck`
Expected: PASS — keine `Holiday`-`type`-Fehler mehr in Wizard-Dateien.

Run: `npx vitest run src/components/wizard/Step1Schoolyear.test.tsx`
Expected: PASS (bestehende Tests bleiben grün; `type` ist additiv).

- [ ] **Step 6: Commit**

```bash
git add src/components/wizard/Step1Schoolyear.tsx src/components/wizard/wizard-state.ts src/components/wizard/Wizard.tsx
git commit -m "feat(wizard): Bundesland fetch in step 1, carry stateCode to doc"
```

---

## Task 8: Einstellungen → Schuljahr einbinden

**Files:**
- Modify: `src/components/settings/SchoolyearTab.tsx`

- [ ] **Step 1: Control einbinden + stateCode speichern**

In `src/components/settings/SchoolyearTab.tsx` Import ergänzen:

```ts
import { HolidayFetchControl } from './HolidayFetchControl';
```

Im JSX direkt über dem `Ferien`-Block (`<div>` mit `<Label className="mb-2">Ferien</Label>`) einsetzen:

```tsx
      <HolidayFetchControl
        stateCode={sy.stateCode}
        from={sy.firstSchoolDay}
        to={sy.lastSchoolDay}
        holidays={sy.holidays}
        onApply={(holidays, stateCode) => setSy({ ...sy, holidays, stateCode })}
      />
```

(`setSy` aktualisiert nur den lokalen Entwurf; der bestehende „Speichern + Schulwochen neu berechnen"-Button persistiert via `updateSY(sy)`.)

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Manueller Smoke (optional, falls Dev-Server läuft)**

Run: `npm run dev`, dann in einem Plan Einstellungen → Schuljahr öffnen, Bundesland wählen, „abrufen", „Übernehmen", „Speichern". Ferien/Feiertage erscheinen als Zeilen.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/SchoolyearTab.tsx
git commit -m "feat(settings): Bundesland fetch in Schuljahr tab"
```

---

## Task 9: Feiertag-Farb-Token

**Files:**
- Modify: `src/styles/globals.css:42-43` (nach den Ferien-Tokens)

- [ ] **Step 1: Token ergänzen**

In `src/styles/globals.css` nach `--color-ferien-b: #EDF2F8;`:

```css
  --color-feiertag-bg: #FFF1D6;
```

(weiche Gelb-Tönung, deutlich von der grauen Ferien-Schraffur unterscheidbar; harmoniert mit Marken-Gelb `#FFC857`).

- [ ] **Step 2: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(styles): add feiertag background token"
```

---

## Task 10: `WeekTable` — Einzel-Feiertage markieren

**Files:**
- Modify: `src/components/editor/WeekTable.tsx` (Import, `DayCellProps`, `DayCell`, Aufruf in `WeekTable`)

- [ ] **Step 1: `isHoliday` importieren**

In `src/components/editor/WeekTable.tsx` den bestehenden Import erweitern:

```ts
import { computeWeekRows, getQuarterRange, isHoliday, type WeekRow } from '@/lib/schoolweeks';
```

- [ ] **Step 2: `DayCellProps` + `DayCell` um `feiertag` erweitern**

`DayCellProps` (ab Zeile ~31) ergänzen:

```ts
interface DayCellProps {
  mondayIso: string;
  dayIdx: number;
  events: PlanEvent[];
  categoryById: Map<string, Category>;
  conflictMap: Map<string, Conflict[]>;
  rowHeight: number;
  feiertag?: string | null;
}
```

In `DayCell` die Signatur und das `<td>`-Styling anpassen. Funktionskopf:

```ts
function DayCell({ mondayIso, dayIdx, events, categoryById, conflictMap, rowHeight, feiertag }: DayCellProps) {
```

Das `<td>` bekommt bei Feiertag eine Tönung — `style` erweitern:

```tsx
      style={{
        minHeight: rowHeight,
        height: rowHeight,
        transitionDuration: 'var(--dur-state)',
        transitionTimingFunction: 'var(--ease-state)',
        ...(feiertag ? { backgroundColor: 'var(--color-feiertag-bg)' } : {})
      }}
```

Direkt nach dem öffnenden `<div className="flex flex-col gap-1">`-Block (vor `events.map`) das Feiertag-Label einsetzen:

```tsx
        {feiertag && (
          <span className="block truncate text-[11px] font-semibold text-[var(--color-ink-900)]" title={feiertag}>
            {feiertag}
          </span>
        )}
```

- [ ] **Step 3: Aufrufstelle in `WeekTable` mit `feiertag` versorgen**

Im `DAY_LABELS.map`-Block (Zeile ~287) vor dem `return (<DayCell .../>)` ergänzen und Prop durchreichen:

```tsx
                  {DAY_LABELS.map((_d, dayIdx) => {
                    const iso = dayIso(row.startDate, dayIdx);
                    const events = eventsByDate.get(iso) ?? [];
                    const h = isHoliday(iso, doc.schoolyear.holidays);
                    const feiertag = h && h.type === 'feiertag' ? h.label : null;
                    return (
                      <DayCell
                        key={dayIdx}
                        mondayIso={row.startDate}
                        dayIdx={dayIdx}
                        events={events}
                        categoryById={categoryById}
                        conflictMap={conflictMap}
                        rowHeight={rowHeight}
                        feiertag={feiertag}
                      />
                    );
                  })}
```

- [ ] **Step 4: Typecheck + Lint**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run lint`
Expected: PASS (max-warnings 0).

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/WeekTable.tsx
git commit -m "feat(editor): mark single feiertage in WeekTable cells"
```

---

## Task 11: `YearGrid` — Feiertag von Ferien unterscheiden

**Files:**
- Modify: `src/components/editor/YearGrid.tsx` (`GridCellProps`, `GridCell`, Aufrufstelle ~189-203)

- [ ] **Step 1: `GridCellProps` + `GridCell` um `feiertag` erweitern**

In `src/components/editor/YearGrid.tsx` `GridCellProps` ergänzen (nach `holiday: boolean;`):

```ts
  feiertag?: boolean;
```

`GridCell`-Signatur:

```ts
function GridCell({ iso, events, holiday, feiertag, color, title }: GridCellProps) {
```

Die `cellStyle`-Berechnung (Zeilen ~91-97) ersetzen, sodass Feiertag eine Tönung statt Schraffur erhält:

```ts
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
```

- [ ] **Step 2: Aufrufstelle anpassen**

In der Render-Schleife (Zeilen ~189-203) `holiday` auf reine Ferien einschränken und `feiertag` ergänzen:

```tsx
                  const iso = `${row.year}-${pad(row.month + 1)}-${pad(d)}`;
                  const evs = eventsByDate.get(iso) ?? [];
                  const h = isHoliday(iso, doc.schoolyear.holidays);
                  const first = evs[0];
                  const color = first ? doc.categories.find((c) => c.id === first.categoryId)?.color : undefined;
                  return (
                    <GridCell
                      key={d}
                      iso={iso}
                      events={evs}
                      holiday={!!h && h.type === 'ferien'}
                      feiertag={!!h && h.type === 'feiertag'}
                      color={color}
                      title={evs.map((e) => e.title).join(', ') || h?.label || iso}
                    />
                  );
```

- [ ] **Step 3: Typecheck + bestehende YearGrid-Tests**

Run: `npm run typecheck`
Expected: PASS.

Run: `npx vitest run src/components/editor/YearGrid.test.tsx`
Expected: PASS (Feiertag-Pfad additiv; vorhandene Ferien-/Event-Tests bleiben grün).

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/YearGrid.tsx
git commit -m "feat(editor): distinct feiertag tint in YearGrid"
```

---

## Task 12: Volllauf + Doku

**Files:**
- Modify: `CHANGELOG.md`, `CLAUDE.md`

- [ ] **Step 1: Gesamte Suite + Build grün**

Run: `npm run test:run`
Expected: PASS (alle Tests).

Run: `npm run lint`
Expected: PASS (0 Warnungen).

Run: `npm run build`
Expected: erfolgreicher `tsc -b && vite build`.

- [ ] **Step 2: CHANGELOG-Eintrag (v1.3)**

In `CHANGELOG.md` neuen Abschnitt über `## [1.2.0]` einfügen:

```markdown
## [1.3.0] – 2026-05-30 — „Ferien-Import"

### Hinzugefügt
- **Ferien-/Feiertags-Abruf:** Bundesland wählen und Ferien sowie gesetzliche
  Feiertage per OpenHolidays-API vorbefüllen — im Assistenten (Schritt 1) und in
  Einstellungen → Schuljahr. Manuelle Einträge bleiben beim erneuten Abruf
  erhalten.
- Einzelne gesetzliche Feiertage werden in der Wochentabelle und im Schuljahr-Grid
  markiert (Tönung + Bezeichnung).

### Geändert
- Dokumentformat auf Schema **v4** angehoben (Ferien tragen jetzt einen Typ
  `ferien`/`feiertag` sowie eine Quelle), inklusive Migration v3 → v4.

[1.3.0]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.3.0
```

(Die Link-Referenzliste am Dateiende ebenfalls um die `[1.3.0]`-Zeile ergänzen, falls dort gepflegt.)

- [ ] **Step 3: CLAUDE.md aktualisieren**

In `CLAUDE.md` unter „Domain logic" einen Eintrag ergänzen:

```markdown
- `holidays-api.ts` — `fetchHolidays(stateCode, from, to)` zieht Ferien
  (`/SchoolHolidays`) + gesetzliche Feiertage (`/PublicHolidays`) von
  OpenHolidays, mappt auf `Holiday[]` mit `type`/`source`. `mergeFetchedHolidays`
  schützt manuelle Einträge bei Re-Fetch. Bundesländer als statische
  `GERMAN_STATES`-Liste.
```

Und die Schema-Zeile auf `version literal 4` aktualisieren (`migrate` chains v1→v2→v3→v4); ergänzen, dass `Holiday` ein `type: 'ferien' | 'feiertag'` und optionales `source` trägt und `Schoolyear` ein optionales `stateCode`.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md CLAUDE.md
git commit -m "docs: changelog v1.3 + CLAUDE.md notes for holidays-api"
```

---

## Self-Review (durch den Planautor bereits geprüft)

- **Spec-Abdeckung:** Datenquelle/API (Task 4), Modell+Migration (Task 1-3), UI Wizard+Einstellungen (Task 6-8), Grid-Markierung (Task 9-11), Fehlerbehandlung (Task 6, Error-Pfad-Test), Tests (Task 2,4,5,6,11). Export bewusst out of scope.
- **Typkonsistenz:** `Holiday.type`/`source`, `Schoolyear.stateCode`, `fetchHolidays`/`mergeFetchedHolidays`/`mapHoliday`/`GERMAN_STATES`, `HolidayFetchControl`-Props (`onApply(holidays, stateCode)`) sind über alle Tasks identisch benannt.
- **Keine Platzhalter:** Jeder Code-Schritt enthält vollständigen Code + Befehl + erwartetes Ergebnis.
