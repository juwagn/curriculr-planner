# PDF / Druck-Export — Design Spec
**Datum:** 2026-06-02  
**Projekt:** curriculr-planner  
**Status:** Approved

---

## Kontext & Ziel

Schulleiter wollen den Terminplan als druckfähige PDF exportieren — für Aushang im Lehrerzimmer, als Quartals-Auszug zur Arbeitsvorlage und als Jahresübersicht. Aktuell gibt es nur ICS / JSON / Excel. Die PDF soll professionell und übersichtlich wirken, Schulname + Schuldaten tragen und direkt aus der App erzeugt werden können.

---

## Entscheidungen (Brainstorming-Ergebnisse)

| Frage | Entscheidung |
|---|---|
| Zweck | Aushang + Quartals-Auszug + Arbeitsvorlage |
| Inhalt | Quartals-Tabelle (SW-Zeilen × Mo–Fr × Bemerkung) + Kategorie-Legende |
| Technik | Browser-Druck-CSS (`@media print` + `@page`), kein neuer Dep |
| Orientierung | Wählbar im Export-Dialog (Hoch- oder Querformat) |
| Umfang | Wählbar: nur aktuelles Quartal vs. ganzes Schuljahr (Q1–4) |
| Kopfdaten | Schulname + Schulinfos in Einstellungen eintragbar, im Dokument gespeichert |

---

## Architektur

### Ablauf

```
EditorHeader → ExportDropdown → neuer Eintrag "PDF / Druck"
  → öffnet PrintDialog (Scope-Wahl + Orientierungs-Wahl)
  → Nutzer bestätigt
  → inject @page <style> (Größe + Orientierung)
  → window.print()
  → Browser-Dialog "Als PDF speichern"
```

Print-CSS blendet gesamtes App-UI aus (`display:none`), nur `PrintDocument` ist sichtbar. Die Druckansicht lebt dauerhaft im DOM, verborgen am Screen.

### Scope-Optionen
- **Aktuelles Quartal** — rendert eine Sektion (das im Toolbar gewählte Quartal).
- **Ganzes Schuljahr** — rendert Q1–4 hintereinander, jedes mit `break-before: page` (außer Q1).

---

## Neue Dateien

### `src/lib/print-model.ts`
Pure Funktion, keine React-Abhängigkeit. TDD-getestet (co-located `.test.ts`).

```ts
type PrintScope = 'currentQuarter' | 'allQuarters';

interface PrintEvent { title: string; time?: string; color: string; }
interface PrintCell { events: PrintEvent[]; }
interface PrintWeekRow {
  type: 'week';
  label: string;      // "SW 03 · 15.–19.09"
  dateRange: string;
  cells: [PrintCell, PrintCell, PrintCell, PrintCell, PrintCell]; // Mo–Fr
  annotation?: string;
}
interface PrintHolidayRow {
  type: 'holiday';
  label: string;      // "Herbstferien · 22.09 – 03.10"
}
interface PrintSection {
  quarterLabel: string;  // "1. Quartal · Sep – Nov 2025"
  rows: (PrintWeekRow | PrintHolidayRow)[];
}
interface PrintLegendItem { label: string; color: string; }
interface PrintModel {
  schoolName: string;
  schoolInfo?: string;
  docName: string;
  schoolyearLabel: string;
  sections: PrintSection[];
  legend: PrintLegendItem[];   // nur benutzte Kategorien
  printedAt: string;           // ISO date string
}

export function buildPrintModel(doc: PlannerDocument, scope: PrintScope, currentQuarter: 1|2|3|4): PrintModel
```

Wiederverwendet `computeSchoolweeks()` und `getQuarterRange()`. Ferien aus `schoolyear.holidays` werden als `PrintHolidayRow` zwischen den betroffenen Schulwochen eingefügt. Legende = Kategorien, die mindestens einem Event zugeordnet sind.

### `src/components/print/PrintDocument.tsx`
Stateless Render-Komponente. Nimmt `PrintModel`, rendert vollständige Druckansicht.

Aufbau pro Sektion (jede Sektion = eine neue Druckseite via `break-before: page`):
1. **Sektionskopf** — Schulname + Schuljahr + Quartal-Label. Steht innerhalb der Sektion → wiederholt sich automatisch pro Seite ohne `position: running()`.
2. **Tabelle** — `<table>` mit `<thead>` (SW / Mo / Di / Mi / Do / Fr / Bemerkung) + `<tbody>` (WeekRows + HolidayRows)
3. **Legende** — am Ende jeder Sektion (immer, unabhängig von Orientierung)

Farbgebung ausschließlich über CSS-Custom-Properties (`var(--color-*)`) und `print-color-adjust: exact`.

### `src/components/print/PrintDialog.tsx`
Kleines shadcn/ui Dialog-Modal.

Felder:
- **Umfang** — Radio: „Aktuelles Quartal" / „Ganzes Schuljahr"
- **Orientierung** — Radio: „Hochformat (A4)" / „Querformat (A4)"
- **Drucken**-Button → inject + `window.print()`

Kein eigener State nach Bestätigung — alles ephemer.

### `src/styles/print.css`
Importiert in `src/styles/globals.css`.

```css
@media print {
  /* App-Shell ausblenden */
  body > #root > *:not(.print-document) { display: none !important; }
  
  .print-document { display: block !important; }
  
  /* Seitenumbrüche */
  .print-section + .print-section { break-before: page; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }
  
  /* Farben erzwingen */
  * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
```

`@page`-Größe wird **dynamisch** per injiziertem `<style>`-Tag gesetzt (CSS allein kann Orientierung nicht zur Laufzeit umschalten):

```ts
// src/lib/print-orientation.ts
export function applyPrintOrientation(orientation: 'portrait' | 'landscape') {
  const id = 'curriculr-print-page';
  document.getElementById(id)?.remove();
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `@page { size: A4 ${orientation}; margin: 14mm; }`;
  document.head.appendChild(s);
}
```

---

## Schema-Erweiterung (`meta`)

Optionale Felder — **kein Versions-Bump** (Zod `.optional()`, alte Docs parsen weiter):

```ts
meta: {
  name: string;
  lastSaved: string;
  schoolName?: string;   // NEU — z.B. "Grundschule Musterstadt"
  schoolInfo?: string;   // NEU — Freitext, z.B. "Schulleitung: M. Müller · Dorfstr. 1"
}
```

Zod in `schemas.ts`:
```ts
meta: z.object({
  name: z.string().min(1),
  lastSaved: z.string(),
  schoolName: z.string().optional(),
  schoolInfo: z.string().optional(),
})
```

Neuer Mutator `updateMeta(patch: Partial<PlannerDocument['meta']>)` in `stores/planner.ts`. Settings-Ebene → **kein History-Snapshot** (analog zu Kategorien/Gruppen-Mutatoren).

---

## Einstellungen (UI)

Neuer Tab **„Schule & Druck"** in `SettingsModal`:

| Feld | Binding |
|---|---|
| Schulname | `meta.schoolName` |
| Schulinfos (Adresse, Leitung …) | `meta.schoolInfo` (Textarea, optional) |

React-hook-form + Zod-Resolver, speichert via `updateMeta`.

---

## Druckdokument-Kopfzeile & Fußzeile

**Kopf** (Teil jeder Sektion, nicht via running header — kein CSS Paged Media nötig):
```
[Logo Curriculr klein]  Schulname · Schuljahr-Label
                        Plan-Name (meta.name) als Subzeile · Quartal-Label
```

**Fußzeile** (Teil jeder Sektion, unten):
```
Curriculr · Schulplaner          Stand: 02.06.2026 · Seite {n}
schoolInfo (optional, linksbündig)
```

Seitenzahl via CSS `counter(page)` — zuverlässig in Chrome/Edge/Firefox Druckdialogen. Gesamtseitenanzahl (`counter(pages)`) nur in Chrome/Edge verlässlich, daher weggelassen.

---

## Tabellenstruktur im Druck

| Spalte | Breite (Querformat) | Breite (Hochformat) |
|---|---|---|
| SW + Datum | ~80px | ~70px |
| Mo | flex | flex |
| Di | flex | flex |
| Mi | flex | flex |
| Do | flex | flex |
| Fr | flex | flex |
| Bemerkung | ~120px | ~80px |

Event-Chips: farbiger Hintergrund-Tint (wie `EventBlock` am Screen), Titel + optionale Uhrzeit. Bei Platzmangel: `overflow: hidden; max-height`.

Ferienzeilen: volle Breite, diagonales Streifen-Muster, Ferienname zentriert.

---

## Tests

### `src/lib/print-model.test.ts`
- Quartals-Gruppierung: Events korrekt den Sektionen zugeordnet
- Ferien erscheinen als `PrintHolidayRow` an richtiger Stelle
- Events landen in korrekter Tageszelle (Mo=0 … Fr=4)
- Legende: nur Kategorien mit mind. einem Event
- `allQuarters`-Scope: alle 4 Sektionen vorhanden
- `currentQuarter`-Scope: genau 1 Sektion

### `src/lib/print-orientation.test.ts`
- `applyPrintOrientation('landscape')` → `@page { size: A4 landscape }` in DOM

### `src/components/print/PrintDocument.test.tsx` (RTL)
- Fixture-Doc: Kopfzeile zeigt `schoolName`
- Schulwochen-Zeilen gerendert
- Ferienzeilen gerendert
- Legende vorhanden

---

## ExportDropdown — Erweiterung

Neuer Eintrag in `ExportDropdown.tsx`:
```tsx
<DropdownMenuItem onClick={() => openPrintDialog()}>
  PDF / Druck
</DropdownMenuItem>
```

`openPrintDialog` setzt ephemeren UI-State `printDialogOpen: true` in `stores/ui.ts`.

---

## Nicht in Scope

- Schul-Logo-Upload
- Jahresübersicht-Matrix (YearGrid) als PDF
- Termin-Liste als PDF
- Automatischer Dateiname (Browser-Dialog bestimmt Namen)
- Custom Paper-Sizes außer A4
