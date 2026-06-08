# Schulleitung-Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vier von der Schulleitung gemeldete Probleme im Jahresterminplaner beheben: Druck-Titel zweizeilig, Quartalsgrenzen in Settings editierbar + Auto-Vorschlag + Freitag-Snap, halbe Ferienwochen einheitlich, Settings-Menü mit gruppierter Seitennavigation.

**Architecture:** Reine Logik in `src/lib/*` (TDD, co-located Tests), UI in `src/components/*`. Quartals-Zuordnung wird von „Woche überlappt Bereich" auf „Woche gehört per Montag zu genau einem Quartal" mit auf Freitag gesnappten Grenzen umgestellt — gilt für Editor und Druck identisch. Ferienwochen-Schwelle von ≥3 auf 5/5 geändert; Ferientage in Mischwochen tageweise markiert (Editor + Druck).

**Tech Stack:** React 19, TypeScript (strict), Vite, Zustand, date-fns, Tailwind v4, shadcn/ui, Vitest.

Spec: [docs/superpowers/specs/2026-06-08-schulleitung-feedback-design.md](../specs/2026-06-08-schulleitung-feedback-design.md)

**Reihenfolge:** P3 (Task 1) → P1 (Tasks 2–5) → P2 (Tasks 6–8) → P4 (Task 9).

**Befehle:** `npm run test:run`, `npx vitest run <datei>`, `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Task 1: P3 — Druck-Titel zweizeilig statt abgeschnitten

**Files:**
- Modify: `src/lib/print-window.ts` (CSS-Regel `.event`, ca. Zeile 84)
- Test: `src/lib/print-window.test.ts`

- [ ] **Step 1: Failing-Test ergänzen**

In `src/lib/print-window.test.ts` innerhalb des bestehenden `describe('generatePrintHtml', ...)` (oder am Ende der Datei einen neuen `describe`-Block) hinzufügen:

```ts
import { generatePrintHtml } from './print-window';
import type { PrintModel } from './print-model';

const emptyModel: PrintModel = {
  schoolName: 'Test', docName: 'Plan', schoolyearLabel: '2026/27',
  sections: [], printedAt: '2026-06-08'
};

describe('generatePrintHtml event title wrapping', () => {
  it('clamps event titles to two lines instead of single-line ellipsis', () => {
    const css = generatePrintHtml(emptyModel, 'landscape');
    // Die .event-Regel darf Titel nicht mehr einzeilig abschneiden …
    expect(css).not.toContain('white-space: nowrap; text-overflow: ellipsis');
    // … sondern auf zwei Zeilen klemmen.
    expect(css).toContain('-webkit-line-clamp: 2');
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag prüfen**

Run: `npx vitest run src/lib/print-window.test.ts -t "clamps event titles"`
Expected: FAIL (`-webkit-line-clamp: 2` nicht gefunden).

- [ ] **Step 3: CSS-Regel umstellen**

In `src/lib/print-window.ts` die `.event`-Regel ersetzen. Vorher:

```css
    .event { font-size: 8.5pt; padding: 1.5pt 2pt 1.5pt 5pt; margin: 0.5pt 0; line-height: 1.3; color: #1a1a2e; background: transparent; border-left: 2.5pt solid #ccc; display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
```

Nachher:

```css
    .event { font-size: 8.5pt; padding: 1.5pt 2pt 1.5pt 5pt; margin: 0.5pt 0; line-height: 1.3; color: #1a1a2e; background: transparent; border-left: 2.5pt solid #ccc; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; white-space: normal; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
```

- [ ] **Step 4: Test ausführen, Erfolg prüfen**

Run: `npx vitest run src/lib/print-window.test.ts`
Expected: PASS (alle Tests grün).

- [ ] **Step 5: Commit**

```bash
git add src/lib/print-window.ts src/lib/print-window.test.ts
git commit -m "fix(print): Termintitel zweizeilig klemmen statt abschneiden (P3)"
```

---

## Task 2: P1 — Freitag-Snap der Quartalsgrenzen

**Files:**
- Modify: `src/lib/schoolweeks.ts` (neue `snapToFriday`; `getQuarterForDate` + `getQuarterRange` nutzen gesnappte Grenzen)
- Test: `src/lib/schoolweeks.test.ts`

- [ ] **Step 1: Failing-Tests ergänzen**

In `src/lib/schoolweeks.test.ts` am Dateiende anhängen (`snapToFriday` zum Import aus `./schoolweeks` hinzufügen):

```ts
import { snapToFriday, getQuarterForDate, getQuarterRange } from './schoolweeks';

describe('snapToFriday', () => {
  it('keeps a Friday on the same date', () =>
    expect(snapToFriday('2026-11-27')).toBe('2026-11-27')); // Fr
  it('snaps a midweek date forward to that week Friday', () =>
    expect(snapToFriday('2026-11-25')).toBe('2026-11-27')); // Mi → Fr
  it('snaps Monday to Friday of same week', () =>
    expect(snapToFriday('2026-11-23')).toBe('2026-11-27')); // Mo → Fr
});

describe('getQuarterForDate with snapped boundaries', () => {
  // sy.quarterBoundaries[0] = '2026-10-30' (Fr) bleibt; teste eine midweek-Grenze
  const syMid: Schoolyear = { ...sy, quarterBoundaries: ['2026-11-25', '2027-01-29', '2027-04-09'] };
  it('treats the boundary week (Mon-Fri) as belonging to the lower quarter', () => {
    // Grenze Mi 25.11 → gesnappt auf Fr 27.11; Montag 23.11 gehört noch zu Q1
    expect(getQuarterForDate('2026-11-23', syMid)).toBe(1);
    // Montag 30.11 (nach gesnappter Grenze) gehört zu Q2
    expect(getQuarterForDate('2026-11-30', syMid)).toBe(2);
  });
});

describe('getQuarterRange uses snapped end', () => {
  const syMid: Schoolyear = { ...sy, quarterBoundaries: ['2026-11-25', '2027-01-29', '2027-04-09'] };
  it('Q1 ends on the snapped Friday', () =>
    expect(getQuarterRange(1, syMid).endDate).toBe('2026-11-27'));
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag prüfen**

Run: `npx vitest run src/lib/schoolweeks.test.ts -t "snapToFriday"`
Expected: FAIL (`snapToFriday is not a function`).

- [ ] **Step 3: Implementierung**

In `src/lib/schoolweeks.ts`: Import um `endOfWeek` erweitern (oben):

```ts
import { parseISO, format, addDays, startOfWeek, getDay, isWithinInterval } from 'date-fns';
```
bleibt — Friday via `addDays(startOfWeek(..., {weekStartsOn:1}), 4)`. Neue Funktion nach `fmt`:

```ts
/** Snap a boundary date to the Friday of its Mon-based week. */
export function snapToFriday(iso: ISODate): ISODate {
  const monday = startOfWeek(parseISO(iso), { weekStartsOn: 1 });
  return fmt(addDays(monday, 4));
}
```

`getQuarterForDate` ersetzen:

```ts
export function getQuarterForDate(iso: ISODate, sy: Schoolyear): 1 | 2 | 3 | 4 {
  const [q1End, q2End, q3End] = sy.quarterBoundaries.map(snapToFriday);
  if (iso <= q1End) return 1;
  if (iso <= q2End) return 2;
  if (iso <= q3End) return 3;
  return 4;
}
```

`getQuarterRange` ersetzen (Enden gesnappt; Start des Folgequartals = Tag nach gesnappter Grenze):

```ts
export function getQuarterRange(quarter: 1 | 2 | 3 | 4, sy: Schoolyear): QuarterRange {
  const snapped = sy.quarterBoundaries.map(snapToFriday);
  const dayAfter = (iso: ISODate) => fmt(addDays(parseISO(iso), 1));
  const starts: ISODate[] = [
    sy.firstSchoolDay,
    dayAfter(snapped[0]),
    dayAfter(snapped[1]),
    dayAfter(snapped[2])
  ];
  const ends: ISODate[] = [snapped[0], snapped[1], snapped[2], sy.lastSchoolDay];
  return {
    startDate: starts[quarter - 1] ?? sy.firstSchoolDay,
    endDate: ends[quarter - 1] ?? sy.lastSchoolDay
  };
}
```

- [ ] **Step 4: Test ausführen, Erfolg prüfen**

Run: `npx vitest run src/lib/schoolweeks.test.ts`
Expected: PASS. Falls bestehende `getQuarterRange`-Tests auf ungesnappte Enden prüfen: die Fixture-Grenzen (`2026-10-30` etc.) sind bereits Freitage → unverändert; ansonsten Erwartungswerte auf gesnappte Freitage anpassen.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schoolweeks.ts src/lib/schoolweeks.test.ts
git commit -m "feat(quarters): Quartalsgrenzen auf Freitag snappen (P1)"
```

---

## Task 3: P1 — Eindeutige Wochen→Quartal-Zuordnung (kein Overlap mehr)

**Files:**
- Modify: `src/lib/print-model.ts` (`buildSection`-Filter)
- Modify: `src/components/editor/WeekTable.tsx` (`filteredRows`)
- Modify: `src/components/editor/EditorToolbar.tsx` (Range-Label via `getQuarterRange`)
- Test: `src/lib/print-model.test.ts`

- [ ] **Step 1: Failing-Test ergänzen**

In `src/lib/print-model.test.ts` einen Test hinzufügen, der prüft, dass eine Grenzwoche nur in **einem** Quartal erscheint. Die Datei hat bereits die Fixture `DOC` (Schuljahr 2025/26). Midweek-Grenze setzen:

```ts
it('assigns a boundary week to exactly one quarter (no overlap)', () => {
  const d = structuredClone(DOC);
  d.schoolyear.quarterBoundaries = ['2025-11-26', '2025-12-31', '2026-03-31']; // Mi-Grenze 26.11.25
  const model = buildPrintModel(d, 'allQuarters', 1);
  const weekDates = model.sections.flatMap((s) =>
    s.rows.filter((r) => r.type === 'week').map((r) => (r as { dateRange: string }).dateRange)
  );
  const dupes = weekDates.filter((v, i) => weekDates.indexOf(v) !== i);
  expect(dupes).toEqual([]);
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag prüfen**

Run: `npx vitest run src/lib/print-model.test.ts -t "no overlap"`
Expected: FAIL (Grenzwoche in zwei Quartalen → Duplikat).

- [ ] **Step 3: print-model auf Montag-Zuordnung umstellen**

In `src/lib/print-model.ts`: Import erweitern und `buildSection`-Filter ersetzen.

Import oben ergänzen:

```ts
import { computeWeekRows, getQuarterRange, getQuarterForDate } from './schoolweeks';
```

`buildSection`: die Zeilen

```ts
  const quarterRows = allWeekRows.filter(
    (r) => r.startDate <= range.endDate && r.endDate >= range.startDate
  );
```

ersetzen durch (Zuordnung über Montag = `r.startDate`):

```ts
  const quarterRows = allWeekRows.filter(
    (r) => getQuarterForDate(r.startDate, doc.schoolyear) === quarter
  );
```

(`range` bleibt für `quarterLabel` erhalten.)

- [ ] **Step 4: WeekTable auf Montag-Zuordnung umstellen**

In `src/components/editor/WeekTable.tsx`: Import `getQuarterForDate` ergänzen:

```ts
import { computeWeekRows, getQuarterRange, getQuarterForDate, isHoliday, type WeekRow } from '@/lib/schoolweeks';
```

`filteredRows` ersetzen:

```ts
  const filteredRows = useMemo(() => {
    if (!doc) return [] as WeekRow[];
    return rows.filter((r) => getQuarterForDate(r.startDate, doc.schoolyear) === currentQuarter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-memo only when the schoolyear slice / quarter changes
  }, [rows, doc?.schoolyear, currentQuarter]);
```

(`qRange` darf bleiben, falls anderswo genutzt; ist sonst entfernbar.)

- [ ] **Step 5: EditorToolbar-Range gesnappt anzeigen**

In `src/components/editor/EditorToolbar.tsx`: die inline `qStarts`/`qEnds`-Berechnung durch `getQuarterRange` ersetzen, damit das Reiter-Label die gesnappten Bereiche zeigt. Import ergänzen:

```ts
import { getQuarterRange } from '@/lib/schoolweeks';
```

`qStarts`/`qEnds`/`fmtRange` ersetzen durch:

```ts
  const fmtRange = (i: number) => {
    const r = getQuarterRange((i + 1) as 1 | 2 | 3 | 4, sy);
    return `${format(parseISO(r.startDate), 'MMM yyyy', { locale: de })} – ${format(parseISO(r.endDate), 'MMM yyyy', { locale: de })}`;
  };
```

- [ ] **Step 6: Tests + Typecheck**

Run: `npx vitest run src/lib/print-model.test.ts && npm run typecheck`
Expected: PASS, keine Typfehler.

- [ ] **Step 7: Commit**

```bash
git add src/lib/print-model.ts src/components/editor/WeekTable.tsx src/components/editor/EditorToolbar.tsx src/lib/print-model.test.ts
git commit -m "feat(quarters): Wochen eindeutig per Montag einem Quartal zuordnen (P1)"
```

---

## Task 4: P1 — Auto-Vorschlag der Quartalsgrenzen aus Wochen-Anmerkungen

**Files:**
- Modify: `src/lib/schoolweeks.ts` (neue `suggestQuarterBoundaries`)
- Test: `src/lib/schoolweeks.test.ts`

- [ ] **Step 1: Failing-Test ergänzen**

In `src/lib/schoolweeks.test.ts` (Import `suggestQuarterBoundaries` ergänzen, sowie `PlannerDocument`-Typ falls nötig):

```ts
import { suggestQuarterBoundaries } from './schoolweeks';
import type { PlannerDocument } from '@/types';

describe('suggestQuarterBoundaries', () => {
  it('reads "Ende N. Quartal" week annotations and returns the Friday of that school week', () => {
    // sy: firstSchoolDay 2026-08-24 (Mo). SW 00 = 24.-28.08, SW index läuft fort.
    const weeks = computeSchoolweeks(sy);
    // Wähle zwei Schulwochen für Q1- und Q2-Ende:
    const q1Week = weeks[10]; // irgendeine spätere Woche
    const q2Week = weeks[20];
    const doc = {
      schoolyear: sy,
      annotations: [
        { schoolweek: q1Week.index, text: 'Ende 1. Quartal', updatedAt: '' },
        { schoolweek: q2Week.index, text: 'foo Ende 2. Quartal bar', updatedAt: '' }
      ]
    } as unknown as PlannerDocument;
    const out = suggestQuarterBoundaries(doc);
    expect(out[0]).toBe(q1Week.endDate);
    expect(out[1]).toBe(q2Week.endDate);
    expect(out[2]).toBeNull(); // kein Marker für Q3
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag prüfen**

Run: `npx vitest run src/lib/schoolweeks.test.ts -t "suggestQuarterBoundaries"`
Expected: FAIL (`suggestQuarterBoundaries is not a function`).

- [ ] **Step 3: Implementierung**

In `src/lib/schoolweeks.ts`: Import des Doc-Typs oben ergänzen:

```ts
import type { Schoolyear, Holiday, ISODate, PlannerDocument } from '@/types';
```

Funktion am Dateiende ergänzen:

```ts
/**
 * Liest "Ende N. Quartal"-Wochen-Anmerkungen und leitet die 3 Quartalsgrenzen
 * ab. Eine Grenze für Quartal N ist der letzte Tag (Freitag) der annotierten
 * Schulwoche. Fehlt ein Marker, ist der Eintrag null.
 */
export function suggestQuarterBoundaries(doc: PlannerDocument): (ISODate | null)[] {
  const weeks = computeSchoolweeks(doc.schoolyear);
  const byIndex = new Map(weeks.map((w) => [w.index, w.endDate]));
  const result: (ISODate | null)[] = [null, null, null];
  const re = /ende\s*([1-3])\.?\s*quartal/i;
  for (const a of doc.annotations) {
    const m = a.text.match(re);
    if (!m) continue;
    const q = Number(m[1]); // 1..3
    const end = byIndex.get(a.schoolweek);
    if (end) result[q - 1] = end;
  }
  return result;
}
```

- [ ] **Step 4: Test ausführen, Erfolg prüfen**

Run: `npx vitest run src/lib/schoolweeks.test.ts -t "suggestQuarterBoundaries"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schoolweeks.ts src/lib/schoolweeks.test.ts
git commit -m "feat(quarters): Auto-Vorschlag aus 'Ende N. Quartal'-Anmerkungen (P1)"
```

---

## Task 5: P1 — Quartale-Abschnitt in SchoolyearTab (editierbar + Vorschlag-Button)

**Files:**
- Modify: `src/components/settings/SchoolyearTab.tsx`

Hinweis: Reines UI; Verifikation über typecheck/lint/build + manuelles Smoke. Keine neue Logik (die liegt getestet in `schoolweeks.ts`).

- [ ] **Step 1: Quartale-Abschnitt + Vorschlag einbauen**

In `src/components/settings/SchoolyearTab.tsx` Imports ergänzen:

```ts
import { getQuarterRange, suggestQuarterBoundaries } from '@/lib/schoolweeks';
```

`doc` wird bereits geladen. Vor dem `return` einen Validierungs-/Helper-Block ergänzen:

```ts
  const qb = (sy.quarterBoundaries.length === 3 ? sy.quarterBoundaries : ['', '', '']) as string[];
  const setQB = (i: number, v: string) => {
    const next = [...qb];
    next[i] = v;
    setSy({ ...sy, quarterBoundaries: next });
  };
  const applySuggestion = () => {
    const sug = suggestQuarterBoundaries(doc);
    if (sug.every((s) => s === null)) {
      toast.error('Keine "Ende N. Quartal"-Anmerkungen im Plan gefunden');
      return;
    }
    const next = qb.map((cur, i) => sug[i] ?? cur);
    setSy({ ...sy, quarterBoundaries: next });
    toast.success('Quartalsgrenzen aus Plan übernommen – bitte prüfen und speichern');
  };
  const qbValid =
    qb.every(Boolean) &&
    qb[0] < qb[1] && qb[1] < qb[2] &&
    qb[0] > sy.firstSchoolDay && qb[2] < sy.lastSchoolDay;
```

Im JSX (z. B. zwischen dem Datums-Grid und `HolidayFetchControl`) einfügen:

```tsx
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Quartalsgrenzen</Label>
          <Button variant="outline" size="sm" onClick={applySuggestion}>
            Aus Plan vorschlagen
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Label className="mb-1.5 text-[12px] text-[var(--color-ink-500)]">
                Ende {i + 1}. Quartal
              </Label>
              <DateInput value={qb[i] ?? ''} onValueChange={(v) => setQB(i, v)} />
            </div>
          ))}
        </div>
        <div className="mt-2 space-y-0.5 text-[12px] text-[var(--color-ink-500)] tabular-nums">
          {qbValid
            ? ([1, 2, 3, 4] as const).map((q) => {
                const r = getQuarterRange(q, { ...sy, quarterBoundaries: qb });
                return <div key={q}>Q{q}: {r.startDate} – {r.endDate}</div>;
              })
            : <div className="text-[var(--color-danger,#b91c1c)]">Grenzen müssen aufsteigend und innerhalb des Schuljahres liegen.</div>}
        </div>
      </div>
```

- [ ] **Step 2: Speichern absichern**

Die bestehende `save`-Funktion so anpassen, dass bei ungültigen Grenzen nicht gespeichert wird:

```ts
  const save = () => {
    if (!qbValid) {
      toast.error('Quartalsgrenzen ungültig – bitte korrigieren');
      return;
    }
    updateSY(sy);
    toast.success('Schuljahr-Daten gespeichert');
  };
```

- [ ] **Step 3: Typecheck + Lint + Build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: keine Fehler, Build erfolgreich.

- [ ] **Step 4: Manuelles Smoke (Notiz)**

Dev-Server starten (`npm run dev`), Einstellungen → Schuljahr öffnen: drei Datumsfelder „Ende 1./2./3. Quartal", Bereichsanzeige Q1–Q4, Button „Aus Plan vorschlagen". Nach Speichern: Reiter-Bereiche im Editor passen sich an.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/SchoolyearTab.tsx
git commit -m "feat(settings): Quartalsgrenzen editierbar + Auto-Vorschlag (P1)"
```

---

## Task 6: P2 — Ferienwochen-Schwelle auf 5/5

**Files:**
- Modify: `src/lib/schoolweeks.ts` (`computeWeekRows`)
- Test: `src/lib/schoolweeks.test.ts`

- [ ] **Step 1: Failing-Test ergänzen**

In `src/lib/schoolweeks.test.ts` ergänzen (Fixture hat Weihnachten 23.12.26 = Mi → Woche 21.–25.12 hat 3 Ferientage):

```ts
describe('computeWeekRows holiday threshold (5/5)', () => {
  it('renders a half-holiday week (3 ferien days) as a numbered schoolweek, not a banner', () => {
    const rows = computeWeekRows(sy);
    const wk = rows.find((r) => r.startDate === '2026-12-21');
    expect(wk?.kind).toBe('schoolweek');
  });
  it('renders a full holiday week (5/5) as a banner', () => {
    const rows = computeWeekRows(sy);
    const wk = rows.find((r) => r.startDate === '2026-12-28'); // 28.12-01.01 komplett Ferien
    expect(wk?.kind).toBe('holiday');
  });
  it('keeps school week numbering continuous across half-holiday weeks', () => {
    const rows = computeWeekRows(sy);
    const indices = rows.filter((r) => r.kind === 'schoolweek').map((r) => (r as { index: number }).index);
    // fortlaufend ohne Lücke
    expect(indices).toEqual(indices.map((_v, i) => indices[0] + i));
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag prüfen**

Run: `npx vitest run src/lib/schoolweeks.test.ts -t "holiday threshold"`
Expected: FAIL (Woche 21.12 ist aktuell `holiday`).

- [ ] **Step 3: Schwelle ändern**

In `src/lib/schoolweeks.ts`, `computeWeekRows`: die Bedingung

```ts
    if (holidayDays >= 3) {
```

ersetzen durch:

```ts
    if (holidayDays === 5) {
```

- [ ] **Step 4: Tests ausführen**

Run: `npx vitest run src/lib/schoolweeks.test.ts`
Expected: PASS. Falls bestehende `computeWeekRows`/`computeSchoolweeks`-Tests die alte ≥3-Regel annahmen, Erwartungswerte angleichen (Mischwochen sind jetzt nummerierte Schulwochen). `computeSchoolweeks` enthält dieselbe `< 3`-Logik (Zeile ~42) — **ebenfalls** auf `< 5` ändern, damit Schulwochen-Nummern konsistent bleiben:

In `computeSchoolweeks` die Bedingung `if (holidayDays < 3)` ersetzen durch `if (holidayDays < 5)`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schoolweeks.ts src/lib/schoolweeks.test.ts
git commit -m "feat(ferien): nur volle Wochen (5/5) als Ferien-Banner (P2)"
```

---

## Task 7: P2 — Ferientage in Mischwochen tageweise grau (Editor)

**Files:**
- Modify: `src/components/editor/WeekTable.tsx` (Schulwochen-Zweig, DayCell-Aufruf)

Hinweis: Reines UI; Verifikation über typecheck/lint/build. Der Schulwochen-Zweig übergibt aktuell nur `feiertag`, nicht `ferien`.

- [ ] **Step 1: `ferien`-Flag im Schulwochen-Zweig ergänzen**

In `src/components/editor/WeekTable.tsx`, im Schulwochen-`return` (ca. Zeile 370–387) den DayCell-Block anpassen:

```tsx
                  {DAY_LABELS.map((_d, dayIdx) => {
                    const iso = dayIso(row.startDate, dayIdx);
                    const events = eventsByDate.get(iso) ?? [];
                    const h = isHoliday(iso, doc.schoolyear.holidays);
                    const feiertag = h && h.type === 'feiertag' ? h.label : null;
                    const ferien = h?.type === 'ferien';
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
                        ferien={ferien}
                      />
                    );
                  })}
```

- [ ] **Step 2: Typecheck + Lint + Build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: keine Fehler.

- [ ] **Step 3: Manuelles Smoke (Notiz)**

Dev-Server: eine Mischwoche (z. B. Weihnachtsbeginn Mittwoch) zeigt Mo/Di normal, Mi–Fr grau hinterlegt, SW-Nummer bleibt erhalten, Termine auf allen Tagen sichtbar.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/WeekTable.tsx
git commit -m "feat(ferien): Ferientage in Mischwochen tageweise markieren (P2)"
```

---

## Task 8: P2 — Druck-Parität: Ferientage tageweise im PDF

**Files:**
- Modify: `src/lib/print-model.ts` (`PrintCell` + `ferien`-Flag pro Zelle)
- Modify: `src/lib/print-window.ts` (`renderWeekRow` schraffiert Ferienzellen + CSS)
- Test: `src/lib/print-model.test.ts`

- [ ] **Step 1: Failing-Test ergänzen**

In `src/lib/print-model.test.ts` (Fixture `DOC`, Schuljahr 2025/26). Weihnachtsferien ab Mi 24.12.2025 setzen → Woche 22.–26.12 ist Mischwoche:

```ts
it('flags individual ferien days in a half-holiday school week', () => {
  const d = structuredClone(DOC);
  d.schoolyear.holidays = [
    { id: 'x', label: 'Weihnachten', start: '2025-12-24', end: '2026-01-06', type: 'ferien' }
  ];
  const model = buildPrintModel(d, 'allQuarters', 1);
  const allRows = model.sections.flatMap((s) => s.rows);
  const wk = allRows.find((r) => r.type === 'week' && (r as { dateRange: string }).dateRange === '22.12.–26.12.') as
    | { type: 'week'; cells: { ferien?: boolean }[] }
    | undefined;
  expect(wk).toBeDefined();
  // Mo(0)=22.,Di(1)=23. keine Ferien; Mi(2)=24. Ferien
  expect(wk!.cells[0].ferien ?? false).toBe(false);
  expect(wk!.cells[2].ferien).toBe(true);
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag prüfen**

Run: `npx vitest run src/lib/print-model.test.ts -t "flags individual ferien"`
Expected: FAIL (`ferien` existiert nicht an `PrintCell`).

- [ ] **Step 3: PrintCell um `ferien` erweitern + befüllen**

In `src/lib/print-model.ts`: Import `isHoliday` ergänzen:

```ts
import { computeWeekRows, getQuarterRange, getQuarterForDate, isHoliday } from './schoolweeks';
```

`PrintCell` erweitern:

```ts
export interface PrintCell {
  events: PrintEvent[];
  ferien?: boolean;
}
```

Im Tageszellen-Loop von `buildSection` nach dem Setzen von `cells[dayIdx].events` ergänzen:

```ts
      const hol = isHoliday(iso, doc.schoolyear.holidays);
      cells[dayIdx].ferien = hol?.type === 'ferien';
```

- [ ] **Step 4: renderWeekRow schraffiert Ferienzellen + CSS**

In `src/lib/print-window.ts`, `renderWeekRow`: die Tageszellen-Erzeugung anpassen, sodass Ferientage die Klasse `td-ferien` bekommen:

```ts
function renderWeekRow(row: PrintWeekRow): string {
  const dayCells = row.cells.map((cell) => {
    const cls = cell.ferien ? ' class="td-ferien"' : '';
    if (cell.events.length > 0) {
      const events = cell.events.map((ev) => {
        const time = ev.time ? `<span class="event-time">${escHtml(ev.time)}</span>` : '';
        return `<div class="event" style="border-left-color:${escHtml(ev.color)}">${time}${escHtml(ev.title)}</div>`;
      }).join('');
      return `<td${cls}>${events}</td>`;
    }
    return cell.ferien
      ? `<td${cls}></td>`
      : `<td><span class="writeline"></span><span class="writeline"></span></td>`;
  }).join('');

  return `<tr>
  <td class="td-num">${escHtml(row.swIndex)}</td>
  <td class="td-date"><span class="date-label">${escHtml(row.dateRange)}</span></td>
  ${dayCells}
  <td class="td-ann">${row.annotation ? escHtml(row.annotation) : ''}</td>
</tr>`;
}
```

Im CSS-Block (nach der `.holiday-row td`-Regel) ergänzen:

```css
    /* ── Ferientag in Mischwoche ── */
    td.td-ferien { background-image: repeating-linear-gradient(45deg, #f0f0f0 0 4pt, #f9f9f9 4pt 8pt); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
```

- [ ] **Step 5: Tests + Typecheck**

Run: `npx vitest run src/lib/print-model.test.ts && npm run typecheck`
Expected: PASS, keine Typfehler.

- [ ] **Step 6: Commit**

```bash
git add src/lib/print-model.ts src/lib/print-window.ts src/lib/print-model.test.ts
git commit -m "feat(print): Ferientage in Mischwochen schraffieren, keine Event-Verluste (P2)"
```

---

## Task 9: P4 — Settings: seitliche, gruppierte Navigation

**Files:**
- Modify: `src/components/settings/SettingsModal.tsx`

**REQUIRED SUB-SKILL für die Umsetzung dieses Tasks:** `frontend-design` (hochwertige, markenkonforme UI; Tokens aus `globals.css`, kein Hardcoding von Hex).

Hinweis: UI-Umbau; Verifikation über typecheck/lint/build + bestehende Settings-Tests. Tab-Inhaltskomponenten bleiben unverändert; nur die Hülle wird neu. `settingsTab`-String-Keys in `src/stores/ui.ts` bleiben.

- [ ] **Step 1: Gruppen-Struktur definieren + Sidebar-Layout bauen**

`src/components/settings/SettingsModal.tsx` neu strukturieren: links vertikale Navigation mit Gruppenüberschriften, rechts der Inhalt des aktiven Tabs. Gruppen:

```ts
const NAV_GROUPS: { group: string; items: { value: SettingsTabValue; label: string }[] }[] = [
  { group: 'Schuljahr', items: [{ value: 'schoolyear', label: 'Schuljahr & Quartale' }] },
  { group: 'Inhalte', items: [
    { value: 'categories', label: 'Kategorien' },
    { value: 'groups', label: 'Gruppen' },
    { value: 'templates', label: 'Vorlagen' },
  ] },
  { group: 'Darstellung', items: [
    { value: 'appearance', label: 'Ansicht' },
    { value: 'school', label: 'Schule & Druck' },
  ] },
  { group: 'Daten', items: [
    { value: 'export', label: 'Export' },
    { value: 'import', label: 'Import' },
    { value: 'wordpress', label: 'WordPress' },
  ] },
  { group: 'System', items: [{ value: 'about', label: 'Über' }] },
];
```

(`SettingsTabValue` = der bestehende `settingsTab`-Typ aus `ui.ts`.) Den aktiven Inhalt über eine `switch`/Map auf die Tab-Komponenten rendern (`SchoolyearTab`, `CategoriesTab`, …, wie bisher importiert). Layout: `DialogContent` mit `flex`; linke Spalte feste Breite (~200px) mit Gruppen + Buttons (aktiver Eintrag hervorgehoben via Marine-Token), rechte Spalte scrollbar.

- [ ] **Step 2: Responsiv (mobil)**

Unter `sm`: Sidebar wird zur horizontal scrollbaren Leiste oben (oder Gruppen als Disclosure). Brand-Tokens aus `globals.css` verwenden (`var(--color-marine-800)`, `var(--color-ink-*)`), keine festen Hex-Werte.

- [ ] **Step 3: Typecheck + Lint + Build + bestehende Tests**

Run: `npm run typecheck && npm run lint && npm run build && npm run test:run`
Expected: keine Fehler; bestehende Settings-Tests grün.

- [ ] **Step 4: Manuelles Smoke (Notiz)**

Dev-Server: Einstellungen öffnen → linke gruppierte Navigation, jeder Eintrag zeigt seinen Inhalt; aktiver Eintrag hervorgehoben; mobil bedienbar.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/SettingsModal.tsx
git commit -m "feat(settings): seitliche, gruppierte Navigation (P4)"
```

---

## Abschluss

- [ ] **Gesamtlauf:** `npm run test:run && npm run typecheck && npm run lint && npm run build` — alles grün.
- [ ] **Branch:** `feat/sl-feedback` — bereit für PR/Review (z. B. via `/code-review`).

## Self-Review-Notizen (Plan ↔ Spec)

- P3 → Task 1. P1 → Tasks 2 (Snap), 3 (eindeutige Zuordnung), 4 (Auto-Vorschlag), 5 (Settings-UI). P2 → Tasks 6 (Schwelle), 7 (Editor-Markierung), 8 (Druck-Parität). P4 → Task 9.
- Typkonsistenz: `snapToFriday`, `getQuarterForDate`, `getQuarterRange`, `suggestQuarterBoundaries` (alle `schoolweeks.ts`); `PrintCell.ferien` in print-model + print-window konsistent genutzt.
- Doc-Fixture in `print-model.test.ts` heißt `DOC` (Schuljahr 2025/26) — Tasks 3 & 8 darauf abgestimmt.
