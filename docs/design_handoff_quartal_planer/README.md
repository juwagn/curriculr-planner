# Handoff: Quartal-Planungs-Editor (Curriculr Planner)

## Overview

Dieser Handoff beschreibt einen **Quartal-Planungs-Editor** für Curriculr Planner — ein Tool, mit dem Schulleitungen den Jahresterminplan ihrer Schule pflegen. Statt einer Monats-Kalenderansicht (Google/Outlook-Stil) gibt es eine **zeilenweise Schulwochen-Übersicht** als Tabelle (eine Zeile pro Schulwoche, Spalten Mo–Fr + Anmerkungen). Das Modell orientiert sich an dem traditionellen Halbjahresplan-Word-Dokument, das viele Schulen ohnehin schon nutzen — siehe `reference_screenshot.png`.

Funktional umfasst der Editor:

- Quartal-Tabs (Q1–Q4) zum Umschalten zwischen Quartalen
- Anlegen, Bearbeiten und Löschen von Terminen pro Wochentag-Zelle
- Kategorisierung von Terminen (Konferenz, Elternabend, Potenzialanalyse, …) mit farblicher Kennzeichnung
- Highlight-Termine in Akzent-Gelb
- Ferien-Zeilen, die Mo–Fr komplett überspannen (`colspan=5`) mit Diagonal-Schraffur
- Anmerkungs-Spalte mit Notiz-Popover pro Schulwoche
- (Drag & Drop visuell vorgesehen — Logik bleibt der Implementation überlassen)

## About the Design Files

Die Dateien in diesem Bundle sind **Design-Referenzen, die in HTML erstellt wurden** — Prototypen, die das angedachte Aussehen und Verhalten zeigen, **kein produktionsreifer Code**.

Die Aufgabe ist es, **dieses HTML-Design in der Ziel-Codebase (React 19 + TypeScript + Tailwind v4 + shadcn/ui) nachzubauen**, dabei die etablierten Patterns, Komponenten und Konventionen des Projekts zu nutzen. Der HTML-Prototyp nutzt React via Babel-CDN und Tailwind CDN, weil das ein One-File-Mockup ist — die echte Implementation gehört in das richtige Build-System (Vite / Next.js o.ä.) mit echten shadcn-Komponenten (Dialog, Popover, Tabs, Select, etc.).

## Fidelity

**High-fidelity (hifi).** Farben, Typografie, Spacing und Interaktions-Verhalten sind final und sollten pixel-genau nachgebaut werden — allerdings mit den shadcn-Komponenten der Codebase statt der inline gebauten Modal/Popover/Tab-Equivalente aus dem Prototyp.

## Tech Stack (Ziel)

- React 19 + TypeScript
- Tailwind CSS v4 (mit `@theme`-Tokens; siehe Design Tokens unten)
- shadcn/ui — explizit zu nutzen: `Dialog`, `Popover`, `Tabs`, `Select`, `Input`, `Textarea`, `Button`, `Badge`, `ScrollArea`, `DropdownMenu`
- Sprache: **Deutsch** (alle UI-Texte sind deutsch — Wochentage, Buttons, Labels)
- date-fns oder Temporal API für Datumsberechnungen (Mo–Fr aus Schulwochen-Start ableiten)
- DnD: empfohlen `@dnd-kit/core` für Drag & Drop von Terminen zwischen Tag-Zellen

## Brand & Design Tokens

### Farben (Brand)

```ts
// Primary — Curriculr-Dunkelblau (in Tailwind als 800/900)
--curriculr-900: #002A4A;  // tiefster Ton
--curriculr-800: #00345C;  // PRIMARY (Header, Buttons, Logo)
--curriculr-700: #073A5E;
--curriculr-600: #0F4670;
--curriculr-500: #1E5887;
--curriculr-400: #3773AC;
--curriculr-300: #6996C1;
--curriculr-200: #9BB9D5;
--curriculr-100: #CDDCEA;
--curriculr-50:  #EAF0F6;

// Accent — Gelb für Highlights
--accent:      #FFC857;
--accent-soft: #FFE9A8;   // Hintergrund von Highlight-Termin-Blöcken
--accent-bg:   #FFF8E1;   // Hintergrund der Anmerkungs-Zelle bei Inhalt
```

### Kategorie-Farben

| Kategorie | Hex | Verwendung |
|---|---|---|
| `konferenz` (Konferenz) | `#3B82F6` | blau |
| `elternabend` (Elternabend) | `#22C55E` | grün |
| `potenzial` (Potenzialanalyse) | `#FFC857` | brand-akzent gelb |
| `prowo` (Praktikum / ProWo) | `#06B6D4` | cyan |
| `kaoa` (KAoA / Berufsorient.) | `#8B5CF6` | violett |
| `schulleitung` (Schulleitung) | `#0F4C81` | dunkelblau |
| `klausur` (Klausur / Prüfung) | `#EF4444` | rot |
| `unterricht` (Unterricht / Org.) | `#64748B` | slate |
| `veranstaltung` (Veranstaltung) | `#F97316` | orange |
| `fortbildung` (Fortbildung) | `#14B8A6` | teal |

Termin-Blöcke nutzen die Kategorie-Farbe als **3px linke Border** + einen Pastell-Tint des gleichen Farbtons als Hintergrund (RGB → `rgba(r, g, b, 0.10)`).

### Neutrals (an Tailwind slate angelehnt)

```ts
--bg-page:        #F4F6F8;   // Hintergrund der gesamten Seite
--bg-card:        #FFFFFF;   // Tabellen-Card
--bg-row-alt:     rgba(248, 250, 252, 0.6); // SW-Spalten Hintergrund
--border:         #E2E8F0;   // alle Tabellen-Trennlinien (slate-200)
--text-strong:    #0F1B2E;   // Überschriften
--text-default:   slate-800 / slate-900
--text-muted:     #64748B    (slate-500)
```

### Typografie

- **Font Family:** `Inter` (Google Fonts: weights 400, 500, 600, 700, 800), Fallback `ui-sans-serif, system-ui, sans-serif`
- **Tabular Numbers:** Datum, Uhrzeit und SW-Nummer immer mit `font-variant-numeric: tabular-nums`

| Element | Größe | Weight | Notes |
|---|---|---|---|
| Page-Title „Termine 2026/27" | 20px | 700 | Farbe `#00345C` |
| Header-Zeilen (Mo/Di/Mi/Do/Fr) | 12.5px | 600 | weiß auf Curriculr-900, `text-left`, `pl-2` |
| Sub-Header (#, Schulwoche, Anmerkungen) | 12px | 600 | Uppercase, Letter-Spacing wider |
| SW-Nummer | 15px | 700 | tabular-nums, zentriert |
| Datum-Range | 12.5px | 400 | tabular-nums |
| Termin Uhrzeit | 12px | 700 | tabular-nums |
| Termin Titel | 12px | 400 / 600 (bei `bold`) | line-height 1.35 |
| Anmerkung-Text | 12px | 400 | line-height 1.4 |
| Quartal-Tab (aktiv) | 13px | 500/600 | Curriculr-800 Hintergrund |

### Spacing & Sizes

- **Page max-width:** 1400px, horizontale Padding 24px (`px-6`)
- **Lesbar bei 1366px Bildschirmbreite** — keine horizontale Scrollbar
- **Tabellen-Border-Radius:** 8px (`rounded-lg`), Inhalt clippt
- **Spalten-Breiten (fixed table-layout):**
  - `#` → 50px
  - `Schulwoche` → 120px
  - 5 Wochentage → je flexibel (gleich aufgeteilte Restbreite ≈ 16% der Tabelle)
  - `Anmerkungen` → 180px
- **Zeilenhöhe pro Schulwoche:** min-height 84px (Standard); 60px (kompakt), 110px (geräumig) — Tweak
- **Header-Zeilen-Padding:** `py-2.5` (10px vertikal)
- **Tag-Zell-Padding:** `px-1.5 py-1.5` (Standard)
- **Termin-Block:** `px-2 py-1`, `gap-1` zwischen mehreren Blöcken in einer Zelle, `border-radius: 3px`
- **Ferien-Zeile:** Höhe 48px (`h-12`)
- **Modal:** max-width 28rem (`max-w-md`), `rounded-xl`, `shadow-2xl`
- **Notiz-Popover:** Breite 320px (`w-80`)

### Shadows

```css
--shadow-card:   0 1px 2px rgb(0 0 0 / 0.05);  /* shadcn Card-Standard */
--shadow-modal:  0 25px 50px -12px rgb(0 0 0 / 0.25); /* shadow-2xl */
```

## Datenmodell

```ts
// Aus der ursprünglichen Spec — unverändert übernehmen
interface PlanEvent {
  id: string;
  title: string;
  start: string;          // 'YYYY-MM-DD'
  end: string;
  startTime?: string;     // 'HH:mm'
  endTime?: string;
  allDay: boolean;
  categoryId: string;     // FK auf Category.id
  notes?: string;
  location?: string;
  groups: string[];       // freitext-Tags: 'KL 8', 'WW-FLuL', etc.
  highlight?: boolean;    // gelber Hintergrund (Akzent)
  bold?: boolean;         // Titel in semibold rendern
}

interface Category {
  id: string;
  label: string;
  color: string;          // Hex
  slug: string;
}

interface WeekAnnotation {
  schoolweek: number;     // SW-Index
  text: string;           // Mehrzeilig erlaubt; \n als Trennzeichen
  highlight?: string;     // optionaler gelber Hinweis (z.B. Feiertage)
  bold?: string;          // optionaler fetter Hinweis vorn
}

interface SchoolweekRange {
  index: number;          // 0, 1, 2, …  (auch als Label „00", „01" angezeigt)
  startDate: string;      // Montag (YYYY-MM-DD)
  endDate: string;        // Freitag
}

interface Holiday {
  // Ein Ferien-„Eintrag" pro Woche — d.h. zweiwöchige Herbstferien => 2 Holiday-Records
  label: string;          // 'Herbstferien', 'Weihnachtsferien', …
  startDate: string;
  endDate: string;
}

interface Quarter {
  id: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  label: string;
  subtitle: string;       // 'Aug – Okt 2026'
  hj: 1 | 2;              // welches Halbjahr
  weekRange: [number, number]; // SW-Index-Bereich
}
```

Realistische Beispieldaten für 1. Halbjahr 2026/27 (Gesamtschule Horst) liegen in `data.js`. Backend-Endpunkte sind nicht Teil dieses Handoffs — die Datenstruktur kann 1:1 aus dem Mock übernommen werden.

## Screens / Views

Dies ist eine **Single-Page-Ansicht** mit einer Tabelle und mehreren Overlay-Komponenten (Modal, Popover).

### 1) Page Shell (Top-Chrome)

- **Position:** ganz oben, voller Browserbreite
- **Höhe:** 48px
- **Hintergrund:** weiß, `border-b border-slate-200`
- **Inhalt (3-Spalten Flex):**
  - **Links:** Curriculr-Logo (28×28 px abgerundetes Quadrat mit `#00345C`-Hintergrund, weißes „C") + Wortmarke „Curriculr" (semibold) mit Sub-Label „Planner"
  - **Mitte:** Navigation — 5 Tab-Links: `Dashboard`, **`Jahresplan`** (aktiv, slate-100), `Vorlagen`, `Kategorien`, `Einstellungen`. Größe 13px, padding `px-3 py-1.5`, rounded.
  - **Rechts:** Buttons „📥 Export", „🖨️ Drucken" + Avatar-Kreis 28px mit User-Initialen
- In der Produktion sollten Icons durch lucide-react-Icons (`Download`, `Printer`, `User`) ersetzt werden — keine Emojis.

### 2) TopBar (Quartal-Tabs + Title)

- **Position:** unterhalb der Chrome, in der Page-Section (`max-w-[1400px] mx-auto px-6 pt-5`)
- **Zwei Sub-Bereiche, vertikal gestapelt:**

**(a) Tabs + Aktionen:**
- Links: Quartal-Tabs als shadcn-`Tabs` oder Segmented Control — Container weiß, `border border-slate-200 rounded-lg shadow-sm p-1`. Jeder Tab: `px-3.5 py-1.5 rounded-md text-[13px]`. Aktiv → `bg-curriculr-800 text-white`, sonst grau hover. Tab zeigt z.B. „**Q1** Aug – Okt 2026" (Label fett, Subtitle kleiner und 75% opacity wenn aktiv).
- Rechts: Outline-Button „🔍 Filter" + Primary-Button „**+ Neuer Termin**" (Curriculr-800 Hintergrund, weißer Text).

**(b) Title-Leiste (3-Spalten-Grid, items-baseline):**
- Links: „Gesamtschule Horst" — 15px semibold
- Mitte: „Termine 2026/27" — 20px bold, Farbe `#00345C`, zentriert
- Rechts: „1. Halbjahr" 15px semibold + „(KW 35 – KW 04)" 11.5px slate-500, rechts ausgerichtet

### 3) Haupt-Tabelle (Schulwochen-Plan)

Container: weiß, `rounded-lg shadow-sm border border-slate-200`, `overflow-hidden`. Die `<table>` ist `table-layout: fixed`, `width: 100%`, `border-collapse: collapse`.

#### Header-Zeile (`<thead>`)
- Hintergrund `#00345C`
- Alle Zellen `py-2.5`, weiße Schrift, `border-r border-white/15` zwischen Spalten
- Spalten-Reihenfolge: `#` (50px, zentriert, uppercase), `Schulwoche` (120px, links-aligned `pl-2`), Mo, Di, Mi, Do, Fr (text-left `pl-2`, 12.5px semibold normalcase), `Anmerkungen` (180px, uppercase)

#### Reguläre Schulwoche-Zeile (`<tr>` pro `SchoolweekRange`)
- min-height 84px, hover `bg-slate-50/30`
- **Zelle 1 (#):** `bg-slate-50/60`, zentriert, 15px tabular-nums bold, slate-700, Inhalt z.B. „01"
- **Zelle 2 (Schulwoche):** gleicher Hintergrund, `px-2`, 12.5px tabular-nums, whitespace-nowrap, Inhalt z.B. „24.08.–28.08." (Format `DD.MM.–DD.MM.`, en-dash zwischen den Datümern, Punkt nach jedem Datum)
- **Zellen 3–7 (Mo–Fr):** Border `border-r border-b border-slate-200`, `align-top`, `py-1.5 px-1.5`. Hover gibt einen leichten `bg-slate-50/60`-Tint und zeigt unten in der Zelle einen Geist-Hint „+ Termin" in slate-400/11px (siehe Interactions).
- **Zelle 8 (Anmerkungen):** siehe „AnnotationCell" unten

#### EventBlock (in einer Tag-Zelle)
Mehrere Termine werden vertikal mit `flex flex-col gap-1` gestapelt. Jeder Block:

- `width: 100%; text-align: left; padding: 4px 8px; border-radius: 3px; font-size: 12px; line-height: 1.35; cursor: pointer`
- Style abhängig vom Tweak `categoryColor`:
  - **left-border (Standard):** `border-left: 3px solid <kategorie-color>`, Hintergrund `rgba(r,g,b,0.10)` desselben Farbtons
  - **dot:** Hintergrund `#F8FAFC`, vor dem Titel ein 6px farbiger Kreis
  - **pill:** Hintergrund `rgba(r,g,b,0.18)`, keine Border
  - **solid:** Hintergrund = Kategorie-Farbe, Text-Farbe automatisch über YIQ-Kontrast
- **Highlight (`event.highlight === true`):** Hintergrund `#FFE9A8` (accent-soft), Border-Left bleibt Kategorie-Farbe
- **Inhalt:**
  - Uhrzeit (falls vorhanden): fett, tabular-nums, Format „09.00" oder Range „14.00-16.00", direkt gefolgt von einem Leerzeichen und dem Titel auf derselben Zeile
  - Titel: normal (oder semibold wenn `event.bold === true`), umbricht innerhalb der Zelle (`word-break: break-word`)
- **Hover:** `box-shadow: sm` + `transform: translateY(-0.5px)` (subtile Lift-Animation, 150ms ease)
- **Klick:** öffnet Event-Modal im Edit-Modus (stoppt Propagation, damit nicht versehentlich der Cell-Click den Create-Modal öffnet)
- **`draggable="true"`** für DnD-Reorder zwischen Zellen (Logik via `@dnd-kit`)

#### AnnotationCell (rechte Spalte)
- Wenn `note` leer → weißer Hintergrund, beim Hover erscheint Geist-Hint „📝 Notiz hinzufügen" (11px slate-400)
- Wenn `note` gefüllt → Hintergrund `#FFF8E1` (gelblich), `border-b border-slate-200`, `px-2 py-1.5`, Text 12px slate-800, line-height 1.4
- Note kann String sein (mehrzeilig per `\n`) ODER Objekt `{ bold?, text?, highlight? }`:
  - `bold` → semibold slate-900 Block oben (z.B. „Letzter Termin:\nKlassensprecherwahl")
  - `text` → normaler Body-Text
  - `highlight` → inline-Block mit `bg: #FFE9A8`, kleines Padding `px-1 rounded-[2px]` (z.B. Feiertagshinweis)
- Klick irgendwo in der Zelle öffnet das Notiz-Popover (Anker = Cell-Rect)

#### Ferien-Zeile (HolidayRow)
- Höhe 48px
- Zelle 1 (#): leer, `bg-slate-50`
- Zelle 2 (Datum-Range): `bg-slate-50`, normaler Text z.B. „19.10.–23.10."
- Zellen 3–7 zusammengeführt: `<td colSpan={5}>`, zentrierter Text:
  - Default Stripes: `repeating-linear-gradient(45deg, #E2E8F0 0 8px, #EDF2F8 8px 16px)` (diagonal)
  - Tweak `dotted`: `radial-gradient(#CBD5E1 1px, transparent 1.2px) 0 0 / 8px 8px, #F1F5F9`
  - Tweak `solid`: `#E2E8F0`
  - Inhalt: kursiv, semibold, 14px slate-700, tracking-wide, z.B. „Herbstferien"
- Zelle 8 (Anmerkungen): leer, `bg-slate-50`

### 4) EventModal (Termin erstellen / bearbeiten)

shadcn `Dialog` mit `DialogContent` 448px (`max-w-md`), `rounded-xl`. Layout:

- **Header (`px-5 py-4 border-b`)**:
  - Eyebrow (11px uppercase, slate-500, semibold, letter-spacing-wider): „Termin bearbeiten" oder „Neuer Termin"
  - Titel (15px semibold slate-900): das berechnete Datum-Label, Format „Montag, 31.08.2026"
  - Close-Button rechts oben (X, 28×28 rounded hover bg-slate-100)
- **Body (`p-5 space-y-3`)**:
  - **Titel** — Input, autofocus, placeholder „z.B. Zeugniskonferenz Sek I"
  - **Beginn / Ende** — 2-Spalten-Grid, tabular-nums, placeholder „14:15" / „optional"
  - **Kategorie** — Wrap-Flex von Pillen-Buttons (`text-[12px] px-2.5 py-1 rounded-full border`), jede mit 8px Farbpunkt + Label. Aktiv: `border-slate-900 bg-slate-900 text-white`, sonst grau hover. Implementieren mit shadcn `ToggleGroup` (single).
  - **Gruppen / Beteiligte** — Input, freitext, placeholder „z.B. KL 8, WW-FLuL"
  - **Notiz** — Textarea, 2 Rows
  - **Highlight-Toggle** — Checkbox `accent-[#FFC857]`, Label „Als Highlight markieren (gelb)"
- **Footer (`px-5 py-3.5 bg-slate-50 border-t`)**:
  - Links: „Löschen" rot (nur im Edit-Mode)
  - Rechts: Sekundär-Button „Abbrechen" (link-style) + Primary „Termin anlegen" / „Speichern" (`bg: #00345C`, weiß, `text-[13px] px-4 py-1.5 rounded-md font-medium shadow-sm`)
- Alle Inputs nutzen `focus:outline-none focus:ring-2 focus:ring-[#00345C]/30 focus:border-[#00345C]` als Fokus-Stil

### 5) NotePopover

shadcn `Popover`, anchored an die geklickte Anmerkungs-Zelle. Wir positionieren manuell `top: rect.top, left: rect.right - 280` damit das Popover links der Zelle erscheint (Tabelle ist breit, Anmerkung ganz rechts → nach links auf-popen). Breite 320px, `rounded-lg shadow-2xl border border-slate-200`.

- Header (`px-3.5 py-2.5 border-b`): „📝 Anmerkung für die Woche" + Close-X
- Textarea (4 rows, gelblicher Hintergrund `#FFF8E1`, autofocus, kein border, 13px)
- Footer (`bg-slate-50 border-t`): „Abbrechen" + „Speichern" (Curriculr-Primary)

## Interactions & Behavior

| Interaktion | Verhalten |
|---|---|
| Klick auf leere Tag-Zelle | Öffnet EventModal in `create`-Mode, vorausgefüllt mit `sw`, `day`, `cat: 'konferenz'` und Datum-Label |
| Klick auf bestehenden EventBlock | `stopPropagation` + Öffnet EventModal in `edit`-Mode mit allen Event-Daten |
| Klick auf Anmerkungs-Zelle | Öffnet NotePopover, Anker = Bounding-Rect der Zelle |
| Klick auf Quartal-Tab | Filtert sichtbare Schulwochen — Q1: SW 0–7, Q2: SW 8–18 (jeweils inkl. Ferien-Zeilen anhand des Monats) |
| Klick auf „+ Neuer Termin" (TopBar) | Öffnet EventModal ohne vorausgefüllten Tag (User wählt manuell) |
| Hover über leere Zelle | Zeigt subtilen `+ Termin`-Geist-Hint (opacity 0 → 100, 150ms) |
| Hover über EventBlock | Box-Shadow + `translateY(-0.5px)` |
| Hover über Anmerkungs-Zelle (leer) | Zeigt „📝 Notiz hinzufügen"-Geist-Hint |
| Drag EventBlock auf andere Tag-Zelle | (Zu implementieren mit @dnd-kit) Event wechselt `sw` und `day`; Drop-Zone = jede Tag-Zelle, Drop-Indicator = leichter Curriculr-50-Hintergrund während Drag-over |
| Esc | Schließt Modal/Popover |
| Klick außerhalb (Backdrop) | Schließt Modal/Popover |

### Quartal-Filterlogik

```ts
const QUARTERS = [
  { id: 'Q1', subtitle: 'Aug – Okt 2026',     weekRange: [0, 7]   },
  { id: 'Q2', subtitle: 'Nov 2026 – Jan 2027', weekRange: [8, 18] },
  { id: 'Q3', subtitle: 'Feb – Apr 2027',     weekRange: [19, 26] },
  { id: 'Q4', subtitle: 'Mai – Jul 2027',     weekRange: [27, 38] },
];

// Reguläre Schulwochen: include if week.index ∈ [from, to]
// Ferien (haben kein index): include based on startDate-Monat
//   Q1: Oktober (Herbstferien)
//   Q2: Dezember + Januar (Weihnachtsferien)
//   Q3: April (Osterferien)  — analog umzusetzen
//   Q4: Juli (Sommerferien) — analog
```

### Datums-Helfer

```ts
// 'YYYY-MM-DD' → 'DD.MM.–DD.MM.'
const fmtRange = (startISO, endISO) => `${fmtDot(startISO)}–${fmtDot(endISO)}`;
const fmtDot = (iso) => { const [, m, d] = iso.split('-'); return `${d}.${m}.`; };

// Mo-Datum + Wochentag-Index (1–5) → ISO-Datum dieses Tags
const computeDayDate = (mondayISO, day) => {
  const d = new Date(mondayISO + 'T00:00:00');
  d.setDate(d.getDate() + (day - 1));
  return d.toISOString().slice(0, 10);
};
```

## State Management

Lokaler State im PlannerApp-Root (oder via Zustand/Jotai/Redux je nach Codebase-Konvention):

- `activeQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'` — Quartal-Filter
- `events: PlanEvent[]` — alle Termine (vom Server geladen, lokal mutiert)
- `annotations: Record<SchoolweekIndex, WeekAnnotation>`
- `modal: { mode: 'create' | 'edit', initial: PartialEvent } | null`
- `notePopover: { sw: number, initial: string|object, anchor: { x, y } } | null`

### State-Transitionen

- `openCreate(week, day)` → setzt `modal` mit pre-filled sw/day/cat
- `openEdit(event)` → setzt `modal` mit kompletten event-Daten
- `saveEvent(form)` → bei create: append; bei edit: replace; close modal
- `deleteEvent()` → filter events; close modal
- `openNote(week)` → setzt notePopover anchor
- `saveNote(text)` → update annotations[sw]; close popover

### Datenfetching

- Beim Mount: `GET /api/school-year/2026-27` → liefert Schulwochen, Quartale, Ferien
- `GET /api/events?halfYear=1` → alle Termine
- `POST /api/events`, `PATCH /api/events/:id`, `DELETE /api/events/:id` — CRUD
- `PUT /api/annotations/:sw` — Notiz speichern

(Diese Endpunkte sind Vorschlag — anpassen an Backend.)

## Responsive

- Optimiert für **Desktop ab 1366px Breite** (Schulleitungs-Laptops)
- Unter 1366px: horizontales Scrollen der Tabelle ist akzeptabel
- Mobil/Tablet ist explizit **kein Ziel** dieses Editors (separate Read-only-Ansicht denkbar)

## Druck

- `@media print`: `body { background: white }`, alle Chrome-Elemente (Header-Nav, Tweaks-Panel) `display: none`, Tabelle soll auf A4-Querformat passen
- Klare Trennlinien sind explizites Anforderung — keine subtilen 1px / 50% opacity Borders im Print

## Tweaks (im Prototyp enthalten, nicht zwingend in Produktion)

Das Mock-File enthält ein Tweaks-Panel mit Variationen:
- **Zeilen-Dichte:** kompakt / standard / geräumig (min-height 60 / 84 / 110 px)
- **Termin-Stil:** linke Border, Farb-Punkt, Pille, solider Block
- **Ferien-Schraffur:** diagonal / Punkte / einfarbig
- **Tabellen-Header:** solid / Verlauf / fast schwarz
- **Kategorie-Legende:** ein/aus

Für die Produktion empfehlen wir, **„Standard-Dichte" + „left-border Termin-Stil" + „diagonale Schraffur" + „solid Curriculr-Header"** als feste Defaults zu setzen. Optional könnte „kompakt/standard/geräumig" als User-Setting (gespeichert pro User) übernommen werden — das ist aber Phase 2.

## Files

| Datei | Inhalt |
|---|---|
| `Curriculr Planner.html` | Einstiegspunkt — lädt React, Tailwind, Babel und alle JSX-Dateien |
| `app.jsx` | Haupt-React-Komponente (`PlannerApp`), enthält Layout, Modal, Popover, Tabelle, alle Render-Logik |
| `data.js` | Mock-Daten: Kategorien, Schulwochen 1. Halbjahr 2026/27, Quartale, Events (aus Original-Screenshot abgeleitet), Anmerkungen. **Realistische deutsche Schul-Beispieldaten — nicht 1:1 in Produktion übernehmen**, aber gut als Test-Fixture |
| `tweaks-panel.jsx` | Mock-spezifisches Tweaks-Framework — in Produktion **nicht übernehmen** |
| `reference_screenshot.png` | Original-Word-Dokument der Gesamtschule Horst, das als Vorbild dient |

## Open Questions / Phase 2

Diese Punkte sind im aktuellen Design **nicht** ausgearbeitet — bitte mit Product klären:

1. **Mehrtägige Termine** — der Prototyp behandelt jeden Eintrag als single-day; bei mehrtägigen Veranstaltungen (z.B. „Betriebspraktikum Q1" über die ganze Woche) wird in jedem Tag separat angezeigt. Soll das in Phase 2 als ein Block über mehrere Spalten gerendert werden?
2. **Konflikt-Erkennung** — zwei Termine zur gleichen Uhrzeit für dieselbe Gruppe (z.B. „KL 8") sollten visuell markiert werden (roter Punkt im EventBlock?)
3. **Jahrgangs-Filter** — UI vorhanden („Filter"-Button), aber Logik fehlt. Welche Filter-Dimensionen? Kategorie, Jahrgang, Beteiligte?
4. **Recurring Events** — wöchentliche Wiederholungen (z.B. „14.15 Projektgruppen" alle 2 Wochen)?
5. **Vergleich mit Vorjahr** — Möglichkeit, Termine aus dem Vorjahr zu kopieren / „aus Vorlage erstellen"?
6. **Permissions** — Wer darf bearbeiten? Schulleitung, AL, Klassenleitung mit unterschiedlichen Rechten?
7. **Audit-Log / Versionierung** — Wer hat wann was geändert?
8. **Tag der offenen Tür / Sponsorenlauf etc. — sind das Termin-Kategorien oder separate Entitäten?**

---

Bei Fragen zum Design: bitte rückfragen statt raten. Wenn etwas im Mock unklar ist, ist der Mock die Source of Truth für Visuals — die Backend-/Modell-Entscheidungen liegen beim Produktteam.
