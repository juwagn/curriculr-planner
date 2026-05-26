# Curriculr Planner — Design-Spec

**Datum:** 2026-05-26
**Status:** Genehmigt
**Repo (neu):** `curriculr-planner` (Geschwister-Ordner zum bestehenden Plugin-Repo)
**v1.0-Scope:** MVP-First (~3 Wochen Build-Zeit)

---

## Überblick

Neues Standalone-Web-Tool für Schulleitung zur Erstellung des Jahresterminplans. Ergänzt den bestehenden Workflow:

```
[Curriculr Planner]  →  ICS-Export  →  [WP-Plugin „Terminplan"]  →  Kollegium liest
                       Excel-Export  →  [bestehender Konverter]   (Rundtrip-Kompatibilität)
```

**Zielgruppe:** Schulleitung (eine Person plant pro Schuljahr).
**Speicher:** Browser-LocalStorage + JSON-Backup-Export (Cloud-Sync = Phase 2).
**Architektur:** Eigenes GitHub-Repo, eigener Build, eigener Release-Zyklus — sauber getrennt vom WP-Plugin.

---

## Anforderungen

| # | Bereich | Anforderung |
|---|---------|-------------|
| R1 | Setup | Manueller Wizard (3 Schritte) für Schuljahres-Eckdaten + Ferien + Kategorien + Gruppen |
| R2 | Editor | Quartal-Monatsgrid (FullCalendar dayGridMonth) mit 4 Quartal-Tabs |
| R3 | Drag-Drop | Termin von Tag auf Tag verschieben (v1.0) |
| R4 | Termin | Modal mit Feldern: Titel, Datum, Zeit, Allday, Kategorie, Bemerkung, Standort, Gruppen |
| R5 | Anmerkungen | Pro Schulwoche editierbares Notizfeld (Icon in Mo-Zelle + Popover) |
| R6 | Speicher | LocalStorage mit Auto-Save, mehrere Pläne parallel verwaltbar |
| R7 | Backup | JSON-Export/Import für Geräte­wechsel + Cache-Sicherheit |
| R8 | ICS-Export | RFC 5545 VCALENDAR-Output für WP-Plugin/IServ |
| R9 | Excel-Export | Konverter-kompatibles Format (Rundtrip-fähig) |
| R10 | Schulwochen | Automatische SW-Berechnung aus Eckdaten + Ferien (SW 00–N) |

### Phase 2 (v1.x, später):
- Drag-Resize für Mehrtages-Events (R11)
- Termin-Vorlagen aus Sidebar droppen (R12)
- Konflikt-Erkennung: Ferien-Block hart, Wochenende soft, Wochen-Überlastung soft (R13)
- Wiederholung / RRULE (R14)
- Excel-Import (Konverter-Format) (R15)
- ICS-Import (Vorjahresplan, SW-basierte Umdatierung) (R16)
- Schuljahr-Grid-Ansicht (Plugin-Stil) als zweite View (R17)
- Cloud-Sync (Dropbox/Google Drive, Provider-Wahl in Phase 2) (R18)

---

## Architektur

### Tech-Stack
- **Build:** Vite 5+
- **Framework:** React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS v4 + shadcn/ui-Komponenten
- **State:** Zustand (eine Store pro Domain: `schoolyear`, `ui`)
- **Kalender:** FullCalendar React (`@fullcalendar/react` + `@fullcalendar/daygrid` + `@fullcalendar/interaction`)
- **Forms:** react-hook-form + Zod-Schemas (gemeinsame Validierung für Wizard + Modal + Import)
- **Excel:** `xlsx` (SheetJS) — Phase 2 für Import, v1.0 für Export
- **ICS:** Eigener Generator (Pure-TS), kein NPM-Paket nötig
- **Date:** `date-fns` (lokales, baumschüttel­bares Format)
- **Drag-Drop:** FullCalendar built-in (DnDKit nur falls Phase-2-Templates komplexe Drops brauchen)

### Repo-Struktur

```
curriculr-planner/
├─ src/
│  ├─ main.tsx                    Entry-Point
│  ├─ App.tsx                     Router + Shell (Welcome vs Editor)
│  ├─ components/
│  │  ├─ ui/                      shadcn-Komponenten (Button, Dialog, Input, etc.)
│  │  ├─ welcome/                 Welcome-Screen + Plan-Switcher
│  │  ├─ wizard/                  Setup-Wizard (3 Steps)
│  │  ├─ editor/
│  │  │  ├─ Editor.tsx            Haupt-Editor-Layout
│  │  │  ├─ Header.tsx            Top-Bar
│  │  │  ├─ Toolbar.tsx           Quartal-Tabs + + Termin
│  │  │  ├─ QuarterCalendar.tsx   FullCalendar-Wrapper
│  │  │  ├─ DayCell.tsx           Custom-Render einer Tag-Zelle (Ferien-Schraffur, Note-Icon)
│  │  │  ├─ EventChip.tsx         Termin-Darstellung
│  │  │  ├─ NotePopover.tsx       Anmerkung pro SW editieren
│  │  │  └─ NotesSidebar.tsx      Slide-in mit allen Anmerkungen
│  │  ├─ event-modal/
│  │  │  ├─ EventModal.tsx        Create/Edit
│  │  │  └─ GroupChipsInput.tsx   Gruppen-Multi-Select
│  │  ├─ settings/                Settings-Modal mit 5 Tabs
│  │  ├─ export/                  Export-Dropdown + Download-Logik
│  │  └─ shared/                  Header-Logo, SaveIndicator, etc.
│  ├─ stores/
│  │  ├─ planner.ts               Aktives PlannerDocument + Auto-Save
│  │  └─ ui.ts                    View-State (aktuelles Quartal, NotesSidebar offen, etc.)
│  ├─ lib/
│  │  ├─ schoolweeks.ts           SW-Berechnung aus Eckdaten + Ferien
│  │  ├─ ics-export.ts            ICS-Generator
│  │  ├─ ics-import.ts            ICS-Parser (Phase 2)
│  │  ├─ excel-export.ts          Konverter-Excel-Generator
│  │  ├─ excel-import.ts          Konverter-Excel-Parser (Phase 2)
│  │  ├─ storage.ts               LocalStorage-Adapter + JSON-Backup
│  │  ├─ colors.ts                Kontrast + Pastel-Derive (Port aus Plugin)
│  │  └─ schemas.ts               Zod-Schemas
│  ├─ types/
│  │  └─ index.ts                 Domain-Types
│  └─ styles/
│     └─ globals.css              Tailwind + Custom-Design-Tokens
├─ public/
│  └─ curriculr-logo.svg          Brand-Asset
├─ index.html
├─ package.json
├─ pnpm-lock.yaml
├─ vite.config.ts
├─ tailwind.config.ts
├─ tsconfig.json
├─ .gitignore
├─ README.md
└─ LICENSE
```

### Standort

```
Y:\Schule\Projekte Schul-IT\
├─ Wordpress Plugin Terminplaner\   (bestehend)
└─ curriculr-planner\               (neu, eigenes Git-Repo)
```

### Build + Deploy

- `pnpm install` — Setup
- `pnpm dev` — Dev-Server auf `localhost:5173`
- `pnpm build` — Static-Bundle in `dist/`
- `pnpm preview` — Production-Bundle lokal testen
- Deploy: GitHub Pages via GitHub Actions (kostenlos, automatisch bei Push auf `main`)
- Alternativ: `dist/` auf eigenen Webserver hochladen, oder einfach `dist/index.html` als `file://` öffnen (kein Server nötig)

---

## Datenmodell

### TypeScript-Domain-Types (`src/types/index.ts`)

```ts
export type ISODate = string;        // 'YYYY-MM-DD'
export type ISOTime = string;        // 'HH:mm'
export type UUID = string;

export interface Schoolyear {
  id: UUID;
  label: string;                     // '2026/27'
  firstSchoolDay: ISODate;           // SW 00
  firstTeachingDay: ISODate;         // SW 01
  lastSchoolDay: ISODate;
  holidays: Holiday[];
  quarterBoundaries: ISODate[];      // 3 Daten = 4 Quartale (Q1-Ende, Q2-Ende, Q3-Ende)
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  id: UUID;
  label: string;                     // 'Herbstferien'
  start: ISODate;
  end: ISODate;
}

export interface Category {
  id: UUID;
  label: string;
  color: string;                     // Hex
  slug: string;
  keywords: string[];
}

export interface PlanEvent {
  id: UUID;
  title: string;
  start: ISODate;
  end: ISODate;
  startTime?: ISOTime;
  endTime?: ISOTime;
  allDay: boolean;
  categoryId: UUID;
  notes?: string;
  location?: string;
  groups: string[];
  // Phase 2: rrule?: string
}

export interface WeekAnnotation {
  schoolweek: number;                // 0..N
  text: string;
  updatedAt: string;
}

export interface PlannerDocument {
  version: 1;                        // Schema-Version für Migrationen
  schoolyear: Schoolyear;
  categories: Category[];
  events: PlanEvent[];
  annotations: WeekAnnotation[];
  availableGroups: string[];         // konfigurierbare Gruppen-Liste
  meta: {
    name: string;                    // 'Jahresplan 2026/27'
    lastSaved: string;
  };
}
```

### Speicher-Schema

```
LocalStorage-Keys:
  curriculr-planner:docs            → UUID[] (alle gespeicherten Dokumente)
  curriculr-planner:doc:{uuid}      → PlannerDocument (JSON)
  curriculr-planner:active          → UUID des aktiven Docs
  curriculr-planner:settings        → App-Settings (Theme, Default-View, etc.)
```

- **Mehrere Pläne parallel:** Schuljahr 2026/27 + 2027/28 nebeneinander, Switcher im Header.
- **Auto-Save:** Debounced 300ms, Status-Indikator im Header (`● Gespeichert` / `Speichert…`).
- **JSON-Backup:** `JSON.stringify(plannerDocument, null, 2)` → Download `curriculr-backup-{date}.json`. Restore über Welcome-Screen-Button.
- **Schema-Migration:** Bei künftigen Schema-Versionen `version`-Feld prüfen, ältere automatisch migrieren.

### Schulwochen-Berechnung (`lib/schoolweeks.ts`)

```ts
export interface SchoolweekRange {
  index: number;                     // SW 00, SW 01, …
  startDate: ISODate;                // Mo
  endDate: ISODate;                  // Fr
}

export function computeSchoolweeks(sy: Schoolyear): SchoolweekRange[];
```

**Algorithmus:**
1. Start = `firstSchoolDay` (SW 00, typisch Montag)
2. Pro Woche: prüfe ob >50% Tage in Ferien → Woche überspringen
3. Sonst: Index++ und SW-Range emittieren
4. Schleife läuft bis `lastSchoolDay` erreicht

### Storage-Adapter-Interface (Phase-2-vorbereitend)

```ts
export interface StorageAdapter {
  listDocs(): Promise<DocSummary[]>;
  loadDoc(uuid: UUID): Promise<PlannerDocument>;
  saveDoc(doc: PlannerDocument): Promise<void>;
  deleteDoc(uuid: UUID): Promise<void>;
}
```

- v1.0: `LocalStorageAdapter`
- Phase 2: `DropboxAdapter` / `GoogleDriveAdapter` mit gleichem Interface

---

## Setup-Wizard

### Welcome-Screen

Zeigt sich, wenn kein aktiver Plan gesetzt ist.

```
┌─────────────────────────────────────────────────┐
│  [Curriculr-Logo]  Planner                      │
│                                                 │
│  Gespeicherte Pläne:                            │
│  ┌─────────────────────────────────────────┐    │
│  │ Jahresplan 2026/27 · 142 Termine        │    │
│  │ Zuletzt: 25.05.2026 14:32      [Öffnen] │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [ + Neuen Jahresplan erstellen ]               │
│  [ JSON-Backup laden ]                          │
│                                                 │
│  v1.x: [Excel-Konverter-Datei laden]            │
│  v1.x: [ICS-Vorjahresplan laden]                │
└─────────────────────────────────────────────────┘
```

### Wizard — 3 Schritte (shadcn `Dialog` als Vollbild-Wizard mit Stepper-Header)

**Step 1 / 3: Schuljahres-Eckdaten**
- Schuljahr-Label (z.B. `2026/27`)
- Plan-Name (Default: `Jahresplan {label}`, editierbar)
- Erster Schultag (SW 00) — Date-Picker
- Erster Unterrichtstag (SW 01) — Date-Picker
- Letzter Schultag — Date-Picker
- Ferien — 5 vordefinierte Slots + Add-Button (Herbst, Weihnacht, Ostern, Pfingst, Sommer)
- Validierung: SW 01 ≥ SW 00, lastSchoolDay > SW 00, Ferien innerhalb Schuljahr, keine Ferien-Überlappung
- Default-Werte: aktuelles Schuljahr ableiten
- Buttons: `[Abbrechen]` `[Weiter →]`

**Step 2 / 3: Quartal-Grenzen + Kategorien + Gruppen**
- Quartal-Grenzen — 3 Date-Picker (Q1-Ende, Q2-Ende, Q3-Ende). Auto-Vorschlag basierend auf Ferien.
- Kategorien — Tabelle mit 7 Default-Kategorien aus Plugin: Konferenz, Elternabend, Wandertag, Prüfung, Sonderveranstaltung, Schließtag, **Sondertag** (Sondertag = system-reserviert für SW-00/01/Letzter-Schultag-Chips, Label-Edit erlaubt, Löschen blockiert). Editierbar (Label, Farbe, Stichwörter). Buttons: `[+ Kategorie]` `[Auf Standard zurücksetzen]`
- Gruppen — Multi-Input Chips (Defaults: `Kollegium`, `Eltern`, `Klassen 5-7`, `Klassen 8-10`, `Sek I`, `Sek II`). Chips entfernbar, neue via Input + Enter
- Buttons: `[← Zurück]` `[Weiter →]`

**Step 3 / 3: Review + Plan-Erstellung**
- Read-Only-Zusammenfassung:
  - Schuljahr-Label, Plan-Name
  - Ferien-Anzahl, Quartale mit Datums-Ranges
  - **N Schulwochen automatisch berechnet** (Ergebnis aus `computeSchoolweeks`)
  - Kategorien-Anzahl, Gruppen-Anzahl
- Warnungen bei Inkonsistenzen (gelb, informativ): z.B. `Pfingstferien fehlen — manchmal nicht in allen Bundesländern`
- Buttons: `[← Zurück]` `[Plan erstellen →]` → Editor öffnet sich mit leerem Q1

**Späterer Edit:** Wizard-Daten via Settings-Modal Tab „Schuljahr" nachträglich änderbar. Schulwochen werden bei jeder Änderung neu berechnet.

---

## Editor-Layout

### Komponenten-Hierarchie

```
<Editor>
  <Header>
    [Curriculr-Logo] [Plan-Name + Switcher ▼]
    ─────────────────────────────────────────────
    [● Gespeichert]  [Quartal | Schuljahr*]  [⚙ Settings]  [Export ↓]
  </Header>

  <Toolbar>
    [Q1] [Q2] [Q3] [Q4]    Sep – Okt 2026    [📝 Notizen]  [+ Termin]
  </Toolbar>

  <QuarterCalendar>
    <FullCalendar
      view="dayGridMonth"
      editable={true}
      droppable={false}
      eventResizableFromStart={false}
      events={planEvents}
      eventClick={openEditModal}
      dateClick={openCreateModal}
      eventDrop={handleMove}
      eventAllow={blockFerien}        // v1.0: nur Warnung, Phase 2: hart blocken
      dayCellContent={renderDayWithWeekNote}
    />
  </QuarterCalendar>

  <NotePopover />            ← per Klick auf 📝-Icon einer Mo-Zelle
  <NotesSidebar />           ← Slide-in von rechts, getriggert via Toolbar-Button
  <EventModal />             ← Create + Edit (gleiches Modal)
  <SettingsModal />          ← 5 Tabs (Schuljahr, Kategorien, Gruppen, Export, Über)
</Editor>
```

### Wichtige UX-Details

- Quartal-View zeigt die Monate des aktiven Quartals als FullCalendar-`dayGridMonth`-Views nacheinander (oder als ein scrollbarer Stream — Implementierungsdetail).
- Tag-Zellen min-height **96px** für lesbare Termin-Chips. Max 3 sichtbare Chips, danach `+N mehr`-Pill.
- Wochenend-Spalten optisch ausgegraut (`bg-slate-50`).
- Ferien-Tage mit gestrichelter Diagonal-Schraffur + Tooltip „Herbstferien".
- Erster Schultag, Erster Unterrichtstag, Letzter Schultag als persistente System-Events sichtbar. Erzeugt aus `Schoolyear`-Eckdaten (kein eigener `PlanEvent`-Eintrag), via Wizard-Daten editierbar in Settings, im Kalender als read-only Chip mit Kategorie „Sondertag" (= 7. Default-Kategorie, Farbe Curriculr-Gelb #FFC857). Im ICS-Export als reguläre VEVENTs.
- Notiz-Icon (📝) in der Mo-Zelle jeder Schulwoche: grau wenn leer, gelb wenn Anmerkung gespeichert. Klick öffnet `NotePopover`.
- `Notes`-Toggle-Button in Toolbar öffnet `NotesSidebar` (Slide-in rechts, ~300px), zeigt Liste aller SW-Anmerkungen, Klick auf Eintrag scrollt Kalender + öffnet Popover.

### Termin-Chip-Styling (`EventChip.tsx`)

- Hintergrund: Pastel-Variante der Kategorie-Farbe (Port von `gsh_tp_color_derive` aus Plugin)
- Border-Left: 3px solid in Original-Kategorie-Farbe
- Text-Farbe: WCAG-Kontrast (Port von `gsh_tp_contrast_color`)
- Schrift: Inter 12px medium
- Padding: 2px 6px, border-radius: 3px

### Drag-Drop-Verhalten

- FullCalendar `eventDrop`-Callback aktualisiert `event.start` + `event.end` im Zustand-Store
- `eventAllow`-Callback:
  - v1.0: gibt immer `true` zurück, zeigt aber Toast bei Ferien-Drop (weiche Warnung)
  - Phase 2: gibt `false` zurück bei Ferien-Drop (harte Blockierung), Wochenende → Warn-Toast

### Settings-Modal Tabs

| Tab | Inhalt |
|-----|--------|
| Schuljahr | Eckdaten + Ferien wie Wizard Step 1 (editierbar). Plus „Schulwochen neu berechnen"-Button. |
| Kategorien | Wie Konverter-Kategorie-Editor (Label, Farbe, Stichwörter, Add, Reset) |
| Gruppen | Chip-Editor |
| Export | Spiegelt Header-Dropdown + Phase-2: „ICS-URL für WP-Plugin" (Cloud-Sync nötig) |
| Über | Version, Changelog-Link, GitHub-Link, Lizenz |

---

## Termin-Modal

### Felder

| Feld | Typ | Pflicht | Hinweis |
|------|-----|---------|---------|
| Titel | text | ja | autofocus on open |
| Startdatum | date | ja | Default = geklicktes Datum |
| Endedatum | date | ja | Default = Startdatum |
| Ganztägig | checkbox | — | wenn an: Zeit-Felder versteckt |
| Startzeit | time | nur wenn nicht-allDay | |
| Endzeit | time | nur wenn nicht-allDay | |
| Kategorie | select | ja | Pre-select via Keyword-Match aus `title` (wie Plugin) |
| Bemerkung | textarea | nein | max 500 Zeichen |
| Standort | text | nein | → `LOCATION` im ICS |
| Gruppen | chips multi-select | nein | aus `availableGroups`, neue via Add |
| Wiederholung | — | — | Phase 2: RRULE-Builder |

### Validierung (Zod)

- `title.trim().length > 0`
- `end >= start` (Datum)
- Wenn nicht-allDay: `startTime` + `endTime` Pflicht, `endTime > startTime` falls gleicher Tag

### Buttons
`[Löschen]` (nur im Edit-Modus, rote Variante) — `[Abbrechen]` — `[Speichern]`

### Keyboard
- `Esc` schließt
- `Cmd/Ctrl+Enter` speichert
- `Tab`-Order: Titel → Start-Datum → … → Speichern

---

## Export

### Export-Dropdown im Header

```
Export ↓
├─ ICS-Datei (.ics)
├─ JSON-Backup (.json)
└─ Excel (Konverter-Format) (.xlsx)
```

### ICS-Generator (`lib/ics-export.ts`)

- Pure-TS, kein NPM-Paket
- RFC 5545 VCALENDAR-Output
- Header:
  ```
  BEGIN:VCALENDAR
  VERSION:2.0
  PRODID:-//Curriculr Planner//DE
  X-WR-CALNAME:Jahresplan 2026/27
  X-WR-TIMEZONE:Europe/Berlin
  ```
- Pro `PlanEvent` ein `VEVENT` mit:
  - `UID:{event.id}@curriculr-planner`
  - `DTSTAMP:{iso-now-utc}`
  - `SUMMARY:{title}`
  - `DTSTART;VALUE=DATE:{yyyymmdd}` (allDay) oder `DTSTART:{yyyymmddThhmmss}` (timed)
  - `DTEND` analog
  - `LOCATION:{location}` (wenn gesetzt)
  - `DESCRIPTION:{notes}\\n\\nGruppen: {groups.join(", ")}` (Newlines escapen)
  - `CATEGORIES:{category.slug}`
- Dateiname: `jahresplan-{slug(meta.name)}.ics`

### JSON-Backup

- `JSON.stringify(plannerDocument, null, 2)` → Download
- Dateiname: `curriculr-backup-{date}.json`
- Restore: Welcome-Screen-Button → Datei-Picker → Zod-Validierung → in LocalStorage schreiben + Active-Doc setzen

### Excel-Export (Konverter-kompatibel)

- Lib: `xlsx` (SheetJS)
- Zwei Sheets: `Ferien` + `Terminplan`
- Format exakt wie Konverter (Spalten A–K), damit Rundtrip mit bestehendem Konverter funktioniert
- Schulwochen-Header-Zeilen (`SW 01 · 31.08–04.09`) eingestreut
- Anmerkungen pro SW als Header-Zeilen-Suffix

### Phase 2 — Import-Pfade

| Quelle | Logik |
|--------|-------|
| Excel-Konverter | Parser liest beide Sheets → baut `Schoolyear` + `PlanEvent[]` → öffnet Editor |
| ICS-Vorjahr | Parser liest VEVENTs → Modal „Auf welches Schuljahr umdatieren?" → SW-basierte Umrechnung |

---

## Konflikt-Erkennung (Phase 2)

| Konflikt | Schweregrad | UX |
|----------|-------------|----|
| Termin in Ferien | Hart | Block via `eventAllow`, Error-Toast „Termin in Herbstferien nicht erlaubt", Override via Confirm-Dialog möglich |
| Termin auf Wochenende | Weich | Gelber Warn-Toast „Termin auf Samstag — gewollt?", erlaubt |
| Wochen-Überlastung | Weich | Sidebar-Sektion in NotesSidebar: „⚠ SW 02: 3 große Events". Schwellwert konfigurierbar in Settings. „Groß" = Kategorie-Flag `isMajor` |

---

## Brand + Design-Tokens

Aus Plugin/Konverter übernehmen für Konsistenz:

```css
:root {
  --primary-900: #00345C;   /* Curriculr-Header-Blau */
  --primary-700: #00467D;
  --primary-500: #0058A0;
  --primary-100: #E6F4FF;
  --accent-warning: #FFC857; /* Curriculr-Gelb (Doppelpunkt-Akzent im Logo) */
  --accent-success: #0E9F6E;
  --accent-error: #E02424;
  --bg-body: #F3F5F9;
  --text-main: #111827;
  --text-muted: #4B5563;
  /* Tailwind v4 Custom-Properties */
}

font-family: 'Inter', system-ui, -apple-system, …
```

Logo: `Curricu` (weiß) + `:` (gelbe Doppelpunkt-Kreise) + `lr` (weiß). SVG bereits in Konverter HTML vorhanden — kopieren nach `public/curriculr-logo.svg`.

---

## Nicht im v1.0-Scope

- Mobile-Layout (Desktop-first; responsive Tablet-Variante in Phase 2)
- i18n (Deutsch fix-codiert)
- Mehrbenutzer-Editing
- Print-CSS (kommt ggf. via Excel-Export)
- Undo/Redo (Phase 2 falls Nachfrage)

---

## Erfolgskriterien v1.0

- [ ] Schulleitung kann in < 5 Min neuen leeren Jahresplan anlegen (Wizard)
- [ ] 50+ Termine eintragbar via Klick + Modal
- [ ] Drag-Drop verschiebt Termine fehlerfrei
- [ ] Anmerkungen pro SW speichern + wieder anzeigen
- [ ] ICS-Export öffnet sich fehlerfrei in IServ + bestehendem WP-Plugin
- [ ] Browser-Reload erhält gesamten Plan-Zustand
- [ ] JSON-Backup-Restore stellt Plan 1:1 wieder her
- [ ] Auto-Save zeigt klares Feedback

---

## Anhang A — Claude-Design-Prompt

Folgenden Prompt in [Claude.ai](https://claude.ai) (Sonnet/Opus mit Artifacts) einfügen, um pixelgenaue Mockups/HTML-Designs für jede Komponente zu erzeugen. Antworten kannst du dann zurück an Claude Code geben.

```
Du bist Senior UI/UX-Designer für ein Schul-Planungs-Tool namens **Curriculr Planner**.

## Projekt
Standalone-Web-App für Schulleitungen zur Erstellung des Jahresterminplans.
Stack: React 19 + TypeScript + Tailwind v4 + shadcn/ui + FullCalendar.
Sprache: Deutsch. Zielgruppe: Schulleitung (50+, nicht extrem tech-savvy).
Brand: Curriculr (Hauptfarbe #00345C dunkelblau, Akzent #FFC857 gelb,
Font Inter, Logo: "Curricu" + gelber Doppelpunkt + "lr").

## Design-Prinzipien
- Klarheit > Spielerei. Dichte Information ohne Überladung.
- Großzügiger Whitespace, große Klickflächen.
- Konsistenz zum bestehenden WP-Plugin "Terminplan" (gleiche Farben + Font).
- Tag-Zellen im Kalender müssen Termin-Titel LESBAR anzeigen (min 96px Höhe).
- Pastel-Termin-Chips mit farbigem 3px-Border-Left in Kategorie-Farbe.
- Wochenenden ausgegraut, Ferien als Schraffur-Pattern.

## Komponenten (eine pro Anfrage liefern)
1. **Welcome-Screen** — Logo, Liste gespeicherter Pläne, "+ Neuer Plan", "JSON-Backup laden"
2. **Wizard Step 1** — Schuljahr-Eckdaten + Ferien-Slots
3. **Wizard Step 2** — Quartal-Grenzen + Kategorien-Tabelle + Gruppen-Chips
4. **Wizard Step 3** — Review-Zusammenfassung mit Schulwochen-Count
5. **Editor Header + Toolbar** — Plan-Switcher, Save-Indicator, View-Toggle, Quartal-Tabs
6. **Quartal-Kalender** — FullCalendar-Monatsgrid mit allen UX-Details (Notiz-Icons, Ferien-Schraffur, Wochenend-Grau, lesbare Termin-Chips)
7. **NotePopover** — Anmerkung pro Schulwoche editieren
8. **NotesSidebar** — Slide-in mit allen SW-Anmerkungen
9. **EventModal** — Termin erstellen/bearbeiten (alle Felder)
10. **SettingsModal** — 5-Tab-Modal (Schuljahr, Kategorien, Gruppen, Export, Über)
11. **Export-Dropdown** — Header-Dropdown mit 3 Optionen
12. **Konflikt-Anzeige** (Phase 2) — Toast + Sidebar-Sektion

## Output-Format
- HTML + Tailwind (kein React-Code, nur Markup)
- Voll-funktionierender Artifact (kann ich im Browser ansehen)
- Plus: kurzer Designer-Kommentar (warum diese Entscheidung, welche shadcn-Komponenten zu verwenden)

## Konkrete Anfrage
Liefere mir Mockup für [KOMPONENTE EINSETZEN] mit realistischen
deutschen Inhalten (Schuljahr 2026/27, echte Termin-Namen wie
"Zeugniskonferenz Jg 10", "Wandertag", "Fachkonferenz Mathe", etc.).

## Constraints
- KEINE neuen Farben einführen
- KEINE Emojis (außer 📝 für Notizen-Icon wie spezifiziert)
- Inter-Font durchgehend
- Alle Dialoge zentriert mit Backdrop-Blur
- Min-Klickfläche 36px
- Fokus-Ringe sichtbar (--shadow-focus = 0 0 0 3px rgba(0,70,125,.25))
```

---

## Roadmap nach v1.0

Strukturierte Release-Planung. Jede Version = abgeschlossener Release mit klarem Scope, eigenem Brainstorming + Plan + Implementierung. Reihenfolge so gewählt, dass jede Version v1.x ohne Cloud-Backend lauffähig bleibt und User echten Mehrwert erhält — Cloud-Sync (das größte Bauwerk) kommt nicht zuerst.

---

### v1.1 — Konflikt-Erkennung + Resize + ICS-Import (~2 Wochen)

**Ziel:** Editor wird „intelligent" und vor Doppelbuchung warnt. Plan-Übernahme aus Vorjahr.

**Features:**

| ID | Feature | Beschreibung |
|----|---------|--------------|
| F1.1.1 | Konflikt: Ferien-Block (hart) | `eventAllow`-Callback gibt `false` bei Drop in Ferien-Tag. Fehler-Toast „Termin in Herbstferien nicht erlaubt". Override via Confirm-Dialog mit Hinweis „Aktion bewusst gewünscht?" |
| F1.1.2 | Konflikt: Wochenend-Warnung (weich) | Drop auf Sa/So → Gelber Warn-Toast „Termin auf Samstag — gewollt?", Termin trotzdem angelegt. Toast hat „Rückgängig"-Button (5 Sek). |
| F1.1.3 | Konflikt: Wochen-Überlastung | Schwellwert `majorEventsPerWeek` in Settings (Default 3). „Großer" Event = Kategorie mit Flag `isMajor: boolean`. Anzeige: gelbe Sektion in `NotesSidebar` „⚠ Überlastete Wochen", scrollt zu betroffener Woche bei Klick. |
| F1.1.4 | Drag-Resize | `eventResizableFromStart={true}` + `eventResize`-Handler. UX: Resize-Handle rechts am Chip-Rand. Auch für All-Day-Events (zieht `end` einen Tag weiter). |
| F1.1.5 | ICS-Import (Vorjahresplan) | Welcome-Screen-Button → File-Picker (.ics) → Parser liest VEVENTs → Modal „Auf welches Schuljahr umdatieren?" mit Schuljahr-Auswahl + SW-basierter Umrechnung (z.B. `Wandertag SW 04 letztes Jahr` → `Wandertag SW 04 neues Jahr` mit neuem Datum). |

**Tech-Aufwand:**
- Neue Files: `lib/conflicts.ts`, `lib/ics-import.ts`, `components/editor/ConflictBadge.tsx`, `components/welcome/ImportIcsModal.tsx`
- Schema-Erweiterung: `Category.isMajor: boolean` (Default false, im Kategorien-Tab editierbar)
- Migration: `version: 1 → 2`
- Tests: Konflikt-Detektor (Unit), ICS-Roundtrip (Unit), Resize-Drag (Integration)

**Erfolgskriterien:**
- [ ] Ferien-Drop bricht ohne Konsole-Fehler ab, zeigt klaren Toast
- [ ] Wochenend-Drop zeigt Warnung, ist aber sofort gespeichert
- [ ] „Überlastete Wochen"-Liste aktualisiert sich live bei Event-Add/Remove
- [ ] Resize an Termin-Rand setzt korrektes `end`-Datum
- [ ] ICS-Import einer 50-Event-Datei dauert < 2 Sek, alle Events korrekt umdatiert

---

### v1.2 — Komfort: Templates + Excel-Import + Schuljahr-View + Undo/Redo (~2-3 Wochen)

**Ziel:** Schnelle Eingabe wiederkehrender Termine, Excel-Migrations-Pfad fertig, Jahres-Übersicht.

**Features:**

| ID | Feature | Beschreibung |
|----|---------|--------------|
| F1.2.1 | Termin-Vorlagen Sidebar | Linke Sidebar (toggle via Button), Liste konfigurierbarer Templates (Name, Kategorie, Default-Zeit, Default-Gruppen). Drag aus Sidebar auf Tag → erstellt Termin mit Template-Daten + ggf. Edit-Modal-Open. Settings-Tab „Vorlagen" zum Verwalten. |
| F1.2.2 | Excel-Import (Konverter) | Welcome-Screen-Button → File-Picker (.xlsx) → Parser liest Ferien + Terminplan-Sheets → baut `PlannerDocument` → öffnet Editor. Wenn `Schoolyear`-Eckdaten fehlen: Wizard mit vorausgefüllten Werten öffnen. |
| F1.2.3 | Schuljahr-Grid-Ansicht | Zweite View neben Quartal. Tabelle Monate × Tage 1–31 wie WP-Plugin-Jahresansicht. Klick auf Zelle = Edit-Modal. Drag-Drop zwischen Zellen funktioniert. View-Toggle im Header (vorher disabled) wird aktiv. |
| F1.2.4 | Undo/Redo | History-Stack (max 50 Steps). Tastatur: `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z`. Toolbar-Buttons. Tracking: Event-Create/Edit/Delete, Move, Resize, Annotation-Edit. Settings-Edits NICHT in Stack. |

**Tech-Aufwand:**
- Neue Files: `lib/excel-import.ts`, `components/editor/TemplatesSidebar.tsx`, `components/editor/YearGrid.tsx`, `stores/history.ts`
- Schema-Erweiterung: `PlannerDocument.templates: EventTemplate[]`
- Migration: `version: 2 → 3`
- Drag-Drop-Lib evtl. erweitern (DnDKit für externe Drops, FullCalendar reicht nicht mehr)
- Tests: Excel-Roundtrip, Schuljahr-Grid-Rendering, Undo/Redo-Konsistenz

**Erfolgskriterien:**
- [ ] Template-Drag zeigt visuelles Feedback (Drop-Zonen highlightet)
- [ ] Excel-Import einer Konverter-50-Event-Datei dauert < 3 Sek
- [ ] Schuljahr-Grid scrollt fluent bei 200+ Events, kein Layout-Shift
- [ ] Undo nach Drag-Move stellt exakte Original-Position wieder her
- [ ] Settings-Edit (z.B. Kategorie-Rename) erscheint NICHT im Undo-Stack

---

### v1.3 — Cloud-Sync (~2-3 Wochen)

**Ziel:** Gerätewechsel ohne manuelle Backup-Datei. Voraussetzung für WP-Plugin-Brücke.

**Vor-Entscheidung nötig (eigenes Mini-Brainstorming):**

Provider-Optionen:

| Option | Pro | Contra |
|--------|-----|--------|
| **Dropbox** | Stabile API, gratis 2GB, OAuth einfach | App-Registration pro Nutzer nötig |
| **Google Drive** | Schon vorhanden bei Schulen mit Google Workspace, OAuth einfach | App-Verification ggf. nötig |
| **Eigenes Backend (Cloudflare Workers + KV)** | Volle Kontrolle, kein 3rd-party-Account | Hosting-Kosten + Eigenbau-Auth |
| **WebDAV (Nextcloud/eigener Server)** | Self-hostable, viele Schulen haben Nextcloud | Komplexere Setup-UX |

**Empfehlung beim Brainstorming für v1.3:** Eigenes Cloudflare-Workers-Backend mit Magic-Link-Auth (E-Mail-Login ohne Passwort). Skaliert bis ~tausende Schulen kostenlos.

**Features (Provider-agnostisch):**

| ID | Feature | Beschreibung |
|----|---------|--------------|
| F1.3.1 | Storage-Adapter `CloudAdapter` | Implementiert `StorageAdapter`-Interface aus v1.0 (war bereits vorbereitet). Speichert `PlannerDocument` als JSON in Cloud. Conflict-Detection: optimistic locking via `updatedAt`-Timestamp. |
| F1.3.2 | Login / Logout UI | Welcome-Screen oben rechts: „Anmelden" → Magic-Link-Eingabe per Mail. Nach Login: Avatar + Logout. Settings-Tab „Konto". |
| F1.3.3 | Sync-Indikator | Header-Status erweitert: `● Gespeichert lokal · ☁ Synchronisiert` / `● Lokal · ⚠ Sync ausstehend` / `● Lokal · ✕ Offline`. Klick zeigt Sync-Log-Popover. |
| F1.3.4 | Konflikt-Auflösung | Wenn Cloud-Version neuer als Lokal: Modal „Cloud hat neuere Version vom 25.05. 14:32 — was tun?" mit Optionen [Cloud nehmen] [Lokal nehmen] [Beide behalten als Kopie]. |
| F1.3.5 | Auto-Sync-Intervall | Default: alle 60 Sek + bei Tab-Fokus. Konfigurierbar in Settings. Bei Offline: Queue-up, beim Reconnect automatisch syncen. |
| F1.3.6 | ICS-URL für WP-Plugin | Settings-Tab „Export": stabile öffentliche ICS-URL (`https://api.curriculr-planner.de/ical/{token}`), die WP-Plugin als externe iCal-Quelle verwenden kann. Token regenerierbar. |

**Tech-Aufwand:**
- Backend-Repo separat: `curriculr-planner-api` (Cloudflare Workers + Hono + KV-Storage)
- Frontend neue Files: `lib/cloud-adapter.ts`, `components/auth/*`, `components/sync/*`
- Schema: `PlannerDocument.cloudId?: string` (Mapping)
- Migration: `version: 3 → 4`

**Erfolgskriterien:**
- [ ] Login per Magic-Link funktioniert in < 30 Sek
- [ ] Editor-Edit erscheint nach max 60 Sek auf zweitem Gerät
- [ ] Offline-Edit wird beim Reconnect ohne Datenverlust gemerged
- [ ] WP-Plugin kann ICS-URL erfolgreich pollen
- [ ] Token-Regeneration invalidiert alten Token sofort

---

### v1.4 — Wiederholung (RRULE) (~2 Wochen)

**Ziel:** Wiederkehrende Termine ohne Manual-Copy (z.B. „Jeden 1. Mittwoch im Monat: FK-Treffen").

**Features:**

| ID | Feature | Beschreibung |
|----|---------|--------------|
| F1.4.1 | RRULE-Builder im EventModal | UI für: `Täglich` / `Wöchentlich am [Mo, Di, …]` / `Monatlich am N. [Wochentag oder Datum]` / `Jährlich`. Endet: nie / nach N Wiederholungen / am Datum X. Live-Vorschau der nächsten 5 Termine. |
| F1.4.2 | RRULE-Anzeige im Kalender | FullCalendar `@fullcalendar/rrule`-Plugin. Recurring-Events erscheinen automatisch im richtigen Tag. Optisch: kleiner Wiederholungs-Icon im Chip (↻). |
| F1.4.3 | Edit-Mode bei Recurring | Klick auf Recurring-Event-Instance → Modal mit Optionen: „Diesen Termin bearbeiten" / „Alle ab heute" / „Komplette Serie". Standard-Verhalten konfigurierbar. |
| F1.4.4 | Exception-Handling | Einzelnen Recurring-Termin verschieben/löschen ohne Serie zu brechen → speichere als `EXDATE` + neuer Override-Event. |
| F1.4.5 | ICS-Export für RRULE | RFC-5545 RRULE-Property im VEVENT. Plus EXDATE für Exceptions. Test gegen IServ-Import. |

**Tech-Aufwand:**
- Neue Lib: `rrule` (NPM-Paket, ~30KB)
- Schema-Erweiterung: `PlanEvent.rrule?: string`, `PlanEvent.exdates?: ISODate[]`, `PlanEvent.recurrenceOverrides?: RecurrenceOverride[]`
- Migration: `version: 4 → 5`
- Tests: RRULE-Generation (Unit), Exception-Handling (Integration), ICS-Roundtrip mit RRULE

**Erfolgskriterien:**
- [ ] „Jeden 1. Mittwoch im Monat" erzeugt 10 korrekte Termine in einem Schuljahr
- [ ] Exception-Edit eines Termins ändert NICHT die Serie
- [ ] „Komplette Serie löschen" entfernt alle Instances + Overrides
- [ ] IServ importiert RRULE-Events korrekt (manuelle Verifikation)

---

### v1.5+ — Offene Optionen (Reihenfolge nach Nachfrage)

Folgende Features sind eingeplant, aber Reihenfolge entscheidet sich nach Nutzungs-Feedback:

| Feature | Effort | Begründung |
|---------|--------|-----------|
| **Mobile/Tablet-Layout** | ~3 Wochen | Read-only View für Smartphone (Kalender-only, kein Edit). Tablet: Touch-optimierte Edit-UI mit größeren Hit-Targets. Brauchbarkeit bei Konferenzen vor Ort. |
| **Print-Layout** | ~1 Woche | Druck-CSS für ganzes Schuljahr oder einzelnes Quartal als A4. Aushang im Lehrerzimmer. |
| **Statistiken-Dashboard** | ~2 Wochen | „123 Termine geplant · 5 Konferenzen · 18 Wandertage · 4 ausgelastete Wochen". Auf eigener Seite, exportierbar. |
| **Multi-User-Editing** | ~4-6 Wochen | Mehrere Schulleitungs-Personen editieren gleichen Plan parallel. CRDT-Lib (Yjs) oder OT (ShareJS). Voraussetzung: v1.3 Cloud-Backend stabil. |
| **WordPress-Plugin-Brücke** | ~1 Woche | Plugin-Setting „Curriculr-Planner-API-URL", bei Setzung wird ICS direkt vom Planner-API gezogen statt manueller Upload. Nahtloser Workflow. Voraussetzung: v1.3 |
| **Kategorien-Bibliothek** | ~1 Woche | Vordefinierte Kategorien-Sets pro Bundesland/Schulform. Onboarding-Schnellstart. |
| **Bundesland-Ferien-Presets** | ~3 Tage | Im Wizard: Dropdown „Niedersachsen 2026/27" füllt Ferien automatisch. Quelle: ferienapi.de oder eigener Daten-Dump. |
| **Audit-Log / Änderungshistorie** | ~1-2 Wochen | Welcher User wann was geändert hat. Sichtbar in Settings-Tab. Voraussetzung: v1.3 |
| **i18n** | ~1-2 Wochen | Englisch + Französisch. Falls Auslandsschulen Interesse zeigen. |
| **Custom-Themes** | ~3 Tage | Schul-eigene Farben einstellbar (statt Curriculr-Default). |
| **Permalink/Sharable-View** | ~1 Woche | Read-only-Link zur Weitergabe an Kollegium ohne Login. Voraussetzung: v1.3 |

---

### Versions-Übersicht (Cheat-Sheet)

```
v1.0 (MVP, 3 Wochen)      Wizard + Editor + Move + ICS-Export + LocalStorage
v1.1 (2 Wochen)            + Konflikte + Resize + ICS-Import
v1.2 (2-3 Wochen)          + Templates + Excel-Import + Schuljahr-View + Undo
v1.3 (2-3 Wochen)          + Cloud-Sync + WP-Plugin-ICS-URL
v1.4 (2 Wochen)            + RRULE / Wiederholungen
v1.5+ (offen)              Mobile, Print, Stats, Multi-User, …
```

**Gesamt v1.0 → v1.4:** ~11-13 Wochen. Realistisch bei Solo-Entwicklung neben Schulalltag: 4-6 Monate.

---

### Wartung + Releases

- **Versionsschema:** SemVer (MAJOR.MINOR.PATCH)
  - PATCH: Bugfix in laufender Version (v1.0.1, v1.0.2)
  - MINOR: Feature-Release wie oben (v1.1, v1.2)
  - MAJOR: Breaking Schema-Change (z.B. Datenmodell-Inkompatibilität)
- **Branch-Strategie:** `main` immer deploybar, Feature-Branches `feat/conflict-detection` etc., Merge per PR
- **Release-Notes:** `CHANGELOG.md` im Repo, semantisch wie Plugin-Changelog (Tag, Kategorie, kurzer Text)
- **Migrationen:** Bei jedem Schema-Bump `lib/migrations.ts` mit `migrate(oldDoc) → newDoc`-Funktion. Auto-Run beim Laden.
- **Telemetrie:** Keine. Reines Browser-Tool, kein Tracking.

---

### Brainstorming-Pfad pro neuer Version

Vor jedem MINOR-Bump:

1. `superpowers:brainstorming` öffnen mit Scope-Frage (welche Features genau, welche Trade-offs)
2. Neue Design-Spec `docs/superpowers/specs/YYYY-MM-DD-curriculr-planner-v1.X-design.md`
3. `superpowers:writing-plans` → Implementierungs-Plan `docs/superpowers/plans/YYYY-MM-DD-curriculr-planner-v1.X.md`
4. Implementierung via `subagent-driven-development` oder `executing-plans`
5. Test gegen Erfolgskriterien der Version
6. Release-Notes + Git-Tag

---

## Offene Punkte (für späteres Brainstorming)

- **Cloud-Provider-Wahl** (v1.3): Cloudflare Workers Backend vs Dropbox vs Google Drive vs WebDAV. Pre-Empfehlung oben, aber finale Entscheidung mit Kosten-/Account-Tradeoffs nochmal explizit besprechen.
- **RRULE-UI-Design** (v1.4): visueller Builder vs. Freitext-Mode für Power-User. Möglicherweise beide.
- **Print-Layout** (v1.5): separate Druck-CSS oder dediziertes PDF-Export via `react-pdf`?
- **Mobile** (v1.5): separater Editor-Modus oder reine Read-only-Sicht? Brainstorming mit echten Schulleitern.
- **Multi-User-Konflikt-Auflösung**: CRDT (autom. Merge) vs OT (Op-basiert) vs Lock-basiert (einer editiert)?
