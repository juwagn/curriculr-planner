# Ferien-/Feiertags-Auto-Import — Design (v1.3)

**Datum:** 2026-05-30
**Status:** Approved (Brainstorming abgeschlossen)

## Problem & Ziel

Heute werden Ferien im Wizard (Schritt 1) und in Einstellungen → Schuljahr
**manuell** eingetragen: Labels sind vorbefüllt, Datumsfelder leer. Gesetzliche
Einzel-Feiertage (z. B. Reformationstag, Tag der Deutschen Einheit) existieren
gar nicht als Konzept.

Ziel: Nach Auswahl des Bundeslands werden Ferien **und** gesetzliche Feiertage
per Live-API automatisch vorbefüllt. Manuelle Eingabe bleibt vollwertig erhalten.
Damit rückt das PRODUCT-Erfolgskriterium „leerer Jahresplan inkl. Ferien in unter
30 Minuten" näher.

## Nicht im Scope

- Export von Feiertagen als ICS/Excel-Events (Feiertage sind Plan-Marker, keine
  exportierten Termine — kann später folgen).
- Gebündelte/Offline-Ferien-Daten (Datenquelle ist die Live-API; Offline-Fall
  fällt auf manuelle Eingabe zurück).
- Screen-Reader-Tuning über bestehende Defaults hinaus.

## 1. Datenquelle & API-Client

Neues, framework-agnostisches Lib-Modul `src/lib/holidays-api.ts` (TDD,
co-located `holidays-api.test.ts`, `fetch` gemockt).

- **API:** OpenHolidays (`https://openholidaysapi.org`) — kostenlos, kein
  API-Key, deutschsprachige Bezeichnungen.
- Zwei Endpunkte:
  - `GET /SchoolHolidays` → Ferien
  - `GET /PublicHolidays` → gesetzliche Feiertage
  - Query je: `countryIsoCode=DE&subdivisionCode=DE-XX&languageIsoCode=DE&validFrom=<firstSchoolDay>&validTo=<lastSchoolDay>`
- **Bundesland-Liste gebündelt** als statische Konstante (16 Einträge
  `{ code: 'DE-NW', name: 'Nordrhein-Westfalen' }`, …) — stabil, kein zusätzlicher
  `/Subdivisions`-Fetch.
- Öffentliche Funktion:
  ```ts
  fetchHolidays(stateCode: string, from: ISODate, to: ISODate): Promise<Holiday[]>
  ```
  Ruft beide Endpunkte (parallel), mappt jede Response auf `Holiday`:
  - `/SchoolHolidays` → `type: 'ferien'`
  - `/PublicHolidays` → `type: 'feiertag'`
  - alle mit `source: 'api'`, neue `id` (`crypto.randomUUID()`), `label` aus dem
    deutschen `name`-Eintrag, `start`/`end` aus `startDate`/`endDate`.
  - Mehrtägige Feiertags-Bereiche bleiben jeweils ein Einzeleintrag.
- Mapping-Helfer (Response-Objekt → `Holiday`) separat und rein, für Unit-Tests.

## 2. Datenmodell + Migration (Schema v4)

`Holiday` (in `src/types/index.ts` und `HolidaySchema` in `src/lib/schemas.ts`)
erweitern:

```ts
type: 'ferien' | 'feiertag';
source?: 'api' | 'manual';
```

`Schoolyear` / `SchoolyearSchema`: neues optionales Feld
`stateCode?: string` — gewähltes Bundesland, wird für Re-Fetch gemerkt.

**Migration v3 → v4** in `migrate()`:
- `version` literal von `3` auf `4`.
- Für jedes bestehende `holiday`: `type: 'ferien'` setzen, `source` leer lassen
  (gilt als manuell, wird daher bei Re-Fetch nicht überschrieben).
- `stateCode` bleibt optional/undefiniert für Altdokumente.

Migrations-Kette ergänzt; `migrate`-Test deckt v3→v4 ab.

## 3. UI-Integration (Wizard + Einstellungen)

Gemeinsame Komponente `HolidayFetchControl`:
- Bundesland-`Select` (aus der gebündelten Liste; vorbelegt aus `stateCode` falls
  vorhanden).
- Button „Ferien & Feiertage abrufen".
- Lade-/Fehlerzustand sichtbar.

Eingebunden in:
- **Wizard Step 1** (`Step1Schoolyear.tsx`) — über dem Ferien-Block.
- **Einstellungen → Schuljahr** (`SchoolyearTab.tsx`) — Nachpflege / Re-Fetch.

**Merge-Strategie beim Abruf:**
1. API liefert neue Ferien + Feiertage.
2. Bestätigungsdialog: „X Ferien und Y Feiertage gefunden — vorhandene
   API-Einträge ersetzen?" (passt zur Marke: Kontrolle + explizite Bestätigung
   vor ersetzender Aktion).
3. Bei Bestätigung: alle bestehenden Einträge mit `source: 'api'` entfernen,
   neue API-Einträge anhängen. **Manuelle Einträge (`source` ≠ `'api'`) bleiben
   unangetastet.**
4. `stateCode` am Schuljahr speichern.

Feiertage erscheinen als eigene, editierbare Zeilen (Label + Von/Bis), genau wie
Ferien — manuelles Ergänzen/Ändern bleibt möglich. (Eine Bearbeitung eines
API-Eintrags lässt seinen `source` auf `'api'`; das ist akzeptiert — der nächste
Re-Fetch ersetzt ihn wieder. Wer einen Eintrag dauerhaft schützen will, legt ihn
manuell an.)

## 4. Raster-Darstellung der Einzel-Feiertage

- `schoolweeks.ts`: Ferien-Logik (≥ 3 Ferientage in einem Mo–Fr-Block → Ferien-Zeile)
  **unverändert**. `isHoliday` gibt bereits das `Holiday`-Objekt zurück, womit
  `type` an der Aufrufstelle verfügbar ist.
- **WeekTable** (`WeekTable.tsx`): Eine Zelle, deren Tag ein `type: 'feiertag'`
  ist, wird markiert — gedämpfter Hintergrund **plus** kurzes Label —, bleibt
  aber in der Schulwochen-Zeile (kein Ferienblock).
- **YearGrid** (`YearGrid.tsx`): entsprechender Tag getönt, Feiertags-Label als
  Titel/Marker.
- A11y (PRODUCT): keine reine Farb-Information — Feiertag immer mit Label.

## 5. Fehlerbehandlung & Tests

- **Offline / API-Fehler:** Toast „Abruf fehlgeschlagen — bitte manuell eintragen".
  Manuelle Eingabe bleibt voll funktionsfähig (Graceful Degradation, kein
  Blocker). Kein Datenverlust an bereits eingetragenen Einträgen.
- **Tests:**
  - `holidays-api.test.ts`: Mapping beider Endpunkte, gemockter `fetch`,
    Fehlerpfad (Netzwerk/Non-200).
  - `schemas` / `migrate`: v3 → v4 Migration (type-Defaulting, optionaler
    stateCode).
  - `schoolweeks`: Einzel-Feiertag erzeugt keine Ferien-Zeile, `type` korrekt
    durchgereicht.
  - Komponententest `HolidayFetchControl` (Bundesland-Wahl, Erfolg/Fehler,
    Merge schützt manuelle Einträge).

## Betroffene Dateien (Überblick)

- **Neu:** `src/lib/holidays-api.ts` (+ `.test.ts`),
  `src/components/.../HolidayFetchControl.tsx` (+ Test),
  Bundesland-Konstante (in `holidays-api.ts` oder eigener Datei).
- **Geändert:** `src/types/index.ts`, `src/lib/schemas.ts` (HolidaySchema,
  SchoolyearSchema, version, migrate), `src/lib/schoolweeks.ts` (Typ-Durchreichung
  falls nötig), `Step1Schoolyear.tsx`, `SchoolyearTab.tsx`, `WeekTable.tsx`,
  `YearGrid.tsx`.
- **Doku:** `CHANGELOG.md` (v1.3-Eintrag), `CLAUDE.md` (Schema-v4-Notiz,
  holidays-api).
