---
name: Curriculr Planner
description: Sachliches Schul-Planungstool mit dem Charakter eines gut geführten Konrektor-Notizbuchs.
colors:
  konrektoren-marine: "#00345C"
  konrektoren-marine-700: "#00467D"
  konrektoren-marine-500: "#0058A0"
  konrektoren-marine-100: "#E6F4FF"
  doppelpunkt-gelb: "#FFC857"
  doppelpunkt-gelb-soft: "#FFE9A8"
  doppelpunkt-gelb-bg: "#FFF8E1"
  meldung-gruen: "#0E9F6E"
  meldung-rot: "#E02424"
  papier-bg: "#F3F5F9"
  papier-card: "#FFFFFF"
  tinten-grau-900: "#111827"
  tinten-grau-500: "#4B5563"
  tinten-grau-200: "#E2E8F0"
  ferien-schraffur-a: "#E2E8F0"
  ferien-schraffur-b: "#EDF2F8"
  kategorie-konferenz: "#0058A0"
  kategorie-elternabend: "#0E9F6E"
  kategorie-pruefung: "#E02424"
  kategorie-sonder: "#7C3AED"
  kategorie-schliesstag: "#6B7280"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.05em"
  tabular:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.3
    fontFeature: "'tnum' 1"
rounded:
  block: "3px"
  input: "8px"
  default: "10px"
  card: "14px"
  pill: "9999px"
spacing:
  cell: "6px"
  tight: "8px"
  default: "16px"
  section: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.konrektoren-marine}"
    textColor: "{colors.papier-card}"
    rounded: "{rounded.default}"
    padding: "6px 14px"
  button-primary-hover:
    backgroundColor: "{colors.konrektoren-marine-700}"
    textColor: "{colors.papier-card}"
    rounded: "{rounded.default}"
    padding: "6px 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.tinten-grau-900}"
    rounded: "{rounded.default}"
    padding: "6px 14px"
  button-destructive:
    backgroundColor: "#FEE2E2"
    textColor: "{colors.meldung-rot}"
    rounded: "{rounded.default}"
    padding: "6px 14px"
  input:
    backgroundColor: "{colors.papier-card}"
    textColor: "{colors.tinten-grau-900}"
    rounded: "{rounded.input}"
    padding: "4px 10px"
    height: "32px"
  card:
    backgroundColor: "{colors.papier-card}"
    textColor: "{colors.tinten-grau-900}"
    rounded: "{rounded.card}"
    padding: "16px"
  week-table-header:
    backgroundColor: "{colors.konrektoren-marine}"
    textColor: "{colors.papier-card}"
    typography: "{typography.label}"
    padding: "10px 8px"
  event-block:
    backgroundColor: "{colors.konrektoren-marine-100}"
    textColor: "{colors.tinten-grau-900}"
    typography: "{typography.body}"
    rounded: "{rounded.block}"
    padding: "4px 8px"
  annotation-cell-filled:
    backgroundColor: "{colors.doppelpunkt-gelb-bg}"
    textColor: "{colors.tinten-grau-900}"
    typography: "{typography.body}"
    padding: "6px 8px"
---

# Design System: Curriculr Planner

## 1. Overview

**Creative North Star: "Das Konrektor-Notizbuch"**

Curriculr Planner sieht aus wie das gut geführte Notizbuch einer erfahrenen Schulleitung: klar liniert, sorgfältig beschriftet, ohne Spielerei. Die Tabelle ist die Hauptbühne (Schulwoche × Mo–Fr, Anmerkungen rechts), genau wie sie es in Word und auf Papier seit Jahren ist. Aber das Notizbuch ist digital aufgewertet: Schulwochen werden automatisch nummeriert, Kategorien tragen konsistente Farben, Ferien sind als Schraffur sofort lesbar, und nichts geht unbemerkt verloren.

Die visuelle Sprache lebt von einer einzigen Konfrontation: das tiefe **Konrektoren-Marine** der Tabellen-Header und Buttons gegen das warme **Doppelpunkt-Gelb** für Anmerkungen und Highlights. Diese zwei Farben tragen das ganze System; alles andere ist getöntes Neutral. Das System lehnt explizit drei Welten ab: den generischen Termin-Kalender (Google/Outlook), die behördliche Verwaltungs-Software (IServ, Logineo) und das statische Word-Dokument. Es ist keines davon.

Schichtung statt Schatten: Tiefe entsteht durch Hintergrund-Töne und Tabellen-Linien, nicht durch dekorative Drop-Shadows. Der Body ist `papier-bg`, Cards sind `papier-card`, aktive Zeilen heben sich durch sanftes `slate-50/30`. Schatten erscheinen nur als bewusste State-Antwort: gehobener Termin-Block beim Hover, Modal über dem Dim-Overlay, Drag-Lift während des Verschiebens.

**Key Characteristics:**
- Tabellen-Layout als Primär-Surface, nicht Kalender-Grid
- Inter durchgehend, tabular-nums für Datum/Schulwochen-Nummern
- Zwei-Farben-System: Marine + Gelb, alles andere ist Tinten-Grau
- Flach mit definierten Linien, keine kosmetischen Schatten
- Deutsch, formell-höflich, ohne Marketing-Lyrik
- Lesbarkeit für 22"-Monitore und Lesebrillen vor maximaler Dichte

## 2. Colors

Die Palette ist absichtlich schmal. Zwei gesättigte Farben tragen Identität (Marine, Gelb), drei Status-Farben warnen oder bestätigen (Grün, Rot, Violett für Sonderkategorien), der Rest ist getöntes Neutral mit leichter Marine-Wärme.

### Primary
- **Konrektoren-Marine** (#00345C): Tabellen-Header, Primary-Buttons, Logo, Plan-Name. Trägt Autorität und Vertrauen. Kontrast 12:1 auf Weiß; gut für 50+ Augen ohne Anstrengung.
- **Konrektoren-Marine-700** (#00467D): Hover-State des Primary-Buttons. Spürbar dunkler ohne den Marine-Charakter zu brechen.
- **Konrektoren-Marine-500** (#0058A0): Standard-Kategorie Konferenz; auch als Link-Farbe in Settings.
- **Konrektoren-Marine-100** (#E6F4FF): Drag-Over-Hint, Quartal-Tab-Active-Subtle, Auswahl-States.

### Secondary
- **Doppelpunkt-Gelb** (#FFC857): Akzent aus dem Logo (Curricu**:**lr Doppelpunkt). Highlight-Termine, Save-Indicator, View-Toggle-Active. Nie als Flächen-Hintergrund.
- **Doppelpunkt-Gelb-Soft** (#FFE9A8): Pastellisierte Variante für Termin-Block-Hintergrund bei `highlight: true`.
- **Doppelpunkt-Gelb-BG** (#FFF8E1): Anmerkungs-Zelle mit Inhalt. Subtil genug für lange Lesedauer, gelb genug für sofortige Erkennung.

### Tertiary (Status & Kategorien)
- **Meldung-Grün** (#0E9F6E): Kategorie Elternabend; positive Toasts.
- **Meldung-Rot** (#E02424): Kategorie Prüfung; destruktive Aktionen, Validierungs-Fehler.
- **Kategorie-Sonder** (#7C3AED): Sonderveranstaltungen.
- **Kategorie-Schliesstag** (#6B7280): Schließtag, Service-Termine.

### Neutral
- **Papier-BG** (#F3F5F9): Body-Hintergrund. Leicht kühl, knapp neben Weiß.
- **Papier-Card** (#FFFFFF): Tabellen-Container, Modals, Popover. Reines Weiß, getöntes Marine-Element davor sorgt für Atmosphäre.
- **Tinten-Grau-900** (#111827): Body-Text. Nicht reines Schwarz; reduziert Lese-Ermüdung.
- **Tinten-Grau-500** (#4B5563): Sekundär-Text, Hilfslabels.
- **Tinten-Grau-200** (#E2E8F0): Tabellen-Trennlinien, Card-Borders. Sichtbar genug für Struktur, leise genug für Ruhe.
- **Ferien-Schraffur-A / -B** (#E2E8F0 / #EDF2F8): Diagonal-Streifen für Ferien-Zeilen (45°, 8px).

### Named Rules

**Die Zwei-Stimmen-Regel.** Konrektoren-Marine und Doppelpunkt-Gelb sind die einzigen zwei gesättigten Farben, die das Chrome trägt. Header, Buttons, Auswahl, Status: alles ist Marine oder Gelb. Kategorie-Farben (Grün, Rot, Violett etc.) bleiben in den Termin-Blöcken eingesperrt; sie wandern nie ins UI-Chrome. Wenn etwas im Chrome eine dritte Farbe brauchen will, ist das Symptom für falsche Hierarchie, nicht für fehlende Farbe.

**Die Gelb-Sparsamkeitsregel.** Doppelpunkt-Gelb deckt nie mehr als 8% des sichtbaren Bildschirms. Es markiert das Bemerkenswerte: Anmerkungen mit Inhalt, Highlight-Termine, der aktive View-Toggle. Werden mehrere gelbe Flächen gleichzeitig sichtbar, verliert das Akzentsystem seine Funktion. Bei Überschreitung: visuell sortieren, nicht das Limit verschieben.

## 3. Typography

**Display Font:** Inter (mit `system-ui, -apple-system, 'Segoe UI', sans-serif` Fallback)
**Body Font:** Inter
**Label/Mono Font:** Inter mit `font-feature-settings: 'tnum' 1` für tabellarische Ziffern

**Character:** Inter trägt die ganze App. Eine einzige Schriftfamilie, weil Schul-Software nicht mit Type-Konfrontation glänzt. Sachliche Humanist-Sans, hohe Lesbarkeit ab 12px, gute Vertical-Metrics. Tabular-Nums sind nicht-verhandelbar für Datum, Uhrzeit und SW-Nummern.

### Hierarchy
- **Display** (Inter 700, 20px / 1.2): Plan-Titel im Header („Termine 2026/27"). Auch der Page-Titel im Welcome-Screen.
- **Headline** (Inter 600, 15px / 1.3): Plan-Name im Header, Modal-Titel, Tab-Aktiv.
- **Title** (Inter 600, 13px / 1.4): Form-Labels, sekundäre Modal-Titel, Sidebar-Heading.
- **Body** (Inter 400, 13px / 1.5): Standard-Text. Body-Lesezeilen werden via Container-Breite auf 65–75ch begrenzt.
- **Label** (Inter 600, 12px, letter-spacing 0.05em, Uppercase): Tabellen-Header (#, Schulwoche, Anmerkungen), Eyebrow im Modal.
- **Tabular** (Inter 400, 12.5px, `'tnum' 1`): Datum-Ranges in Tabelle, Uhrzeiten in Termin-Blöcken, SW-Nummern.

### Named Rules

**Die Tabular-Nums-Regel.** Jede Ziffer, die in einer Spalte über mehreren Zeilen erscheint, läuft mit `'tnum' 1`. SW-Nummern (01, 02, … 18), Datum-Ranges (24.08.–28.08.), Uhrzeiten (14.30–16.00). Proportional-Ziffern in einer Tabellenspalte sind ein Schul-Tabelle-Bruch und nicht akzeptabel.

**Die Inter-Only-Regel.** Keine zweite Schrift. Nicht für Code-Snippets (gibt es nicht), nicht für Display-Akzente, nicht für Logo-Lyrik. Hierarchie entsteht über Gewicht (400, 600, 700) und Größe (12 → 13 → 15 → 20), nie über Schrift-Konfrontation. Wenn ein Element Aufmerksamkeit braucht, ist die Antwort weight 700 oder Doppelpunkt-Gelb, nicht ein Serif-Display.

## 4. Elevation

Schichtung statt Schatten. Tiefe entsteht durch Hintergrund-Töne und sichtbare Tabellen-Linien, nicht durch kosmetische Drop-Shadows. Body ist Papier-BG, Cards sind Papier-Card, aktive Zeilen heben sich durch sanftes `slate-50/30`. Die Tabelle erzeugt Struktur durch ihre eigenen Linien (1px `tinten-grau-200`), nicht durch Schatten.

Schatten existieren, aber als bewusste State-Antwort: Modal über dem Dim-Overlay, Drag-Lift des Termin-Blocks während des Verschiebens, Popover mit klarer Kante. Nie dekorativ, nie zur Card-Differenzierung.

### Shadow Vocabulary
- **Card-Schatten** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.05)`): Sehr dezent. Editor-Tabelle, Settings-Tabs-Container. Markiert „dies ist ein Block", nicht „dies schwebt".
- **Modal-Schatten** (`box-shadow: 0 18px 40px rgba(15, 23, 42, 0.15)`): Modal-Dialog, EventModal, SettingsModal. Klar gehoben über Backdrop-Blur.
- **Button-Schatten** (`box-shadow: 0 2px 8px rgba(0, 70, 125, 0.25)`): Primary-Button im Default-State. Subtile Lift, marine-getönt.
- **Focus-Ring** (`box-shadow: 0 0 0 3px rgba(0, 70, 125, 0.25)`): Sichtbarer Tastatur-Fokus. Drei-Pixel-Ring in Marine, hoch sichtbar ohne Kontrast-Konflikt.

### Named Rules

**Die State-Schatten-Regel.** Schatten ist immer State, nie Identität. Ein Termin-Block bekommt erst beim Hover Schatten und Translate-Y(-0.5px). Ein Modal bekommt seinen Schatten erst durch Öffnen. Eine Card hat im Default-State maximal den 0/1/2/0.05-Card-Schatten als Form-Marker. Wer dekorativen Schatten zur Card-Hierarchie nutzt (Card-A schwebt höher als Card-B), bricht die Regel.

## 5. Components

### Buttons
- **Shape:** Abgerundet, 10px Radius (`rounded-default`). Nicht Pill (das ist nur Quartal-Tabs vorbehalten), nicht eckig.
- **Primary:** Konrektoren-Marine Hintergrund, Papier-Card Text. Padding 6×14px, Höhe 32px. Hover wechselt zu Marine-700 plus sehr leichter Translate-Down beim Active-State. Verwendet für: Speichern, Plan erstellen, Termin anlegen, Schulwochen neu berechnen.
- **Hover / Focus:** Marine-700-Hintergrund auf Hover. Tastatur-Fokus zeigt Focus-Ring (3px Marine/25%). Active-State drückt 1px nach unten.
- **Ghost / Outline:** Transparenter Hintergrund, Tinten-Grau-900 Text, sanfter Hover-Tint (`muted/50`). Sekundäre Aktionen wie „Abbrechen" und Filter.
- **Destructive:** Rot-getöntes Hintergrund-Pastell (#FEE2E2), Meldung-Rot Text. Verwendet für „Löschen" im EventModal. Nicht für Standard-Bestätigungen.
- **Pill (Quartal-Tabs, View-Toggle):** `rounded-pill` (9999px). Aktiv: Marine oder Gelb-Hintergrund. Inaktiv: transparent oder gray-100. Quartal-Tab-Aktiv: Marine-BG, Papier-Card Text. View-Toggle-Aktiv: Doppelpunkt-Gelb-BG, schwarzer Text.

### Cards / Container
- **Corner Style:** 14px Radius (`rounded-card`) für Welcome-Screen-Cards und Settings-Dialog. 10px (`rounded-default`) für Tabellen-Container.
- **Background:** Papier-Card (#FFFFFF). Nie eine zweite Card-Farbe.
- **Shadow Strategy:** Card-Schatten (0/1/2/0.05) als Default. Mehr nur bei interaktivem State.
- **Border:** 1px Tinten-Grau-200. Sichtbar genug für Struktur, leise genug für Ruhe.
- **Internal Padding:** 16px Standard, 24px für Welcome-Sektionen, 0px für Tabellen-Container (Tabelle selbst trägt das Padding).

### Inputs / Fields
- **Style:** Papier-Card Hintergrund, Tinten-Grau-200 Border (1px), Padding 4×10px, Höhe 32px, Radius 8px.
- **Focus:** Border wechselt zu Marine, plus 3px-Focus-Ring in Marine/50%. Kein Glow-Schatten, keine Animation.
- **Error:** Border wechselt zu Meldung-Rot, plus 3px-Ring in Rot/20%. `aria-invalid="true"` löst aus.
- **Disabled:** Background `input/50`, Text-Opazität 50%, `cursor: not-allowed`.
- **Label-Spacing:** Label hat default `margin-bottom: 6px` zum Input. Keine Label-Input-Berührung (siehe Don'ts).

### Navigation
- **Top-Chrome:** Marine-Hintergrund, weißer Text. Plan-Name links als klickbarer Switcher, Status-Indikator + View-Toggle + Settings + Export-Dropdown rechts. Höhe 48px.
- **Tabs (Settings-Modal):** Standard shadcn-Tabs, `flex-wrap h-auto` damit auf schmalen Modals umbrechen statt clippen.
- **Quartal-Tabs (Toolbar):** Pill-Buttons, Marine-BG aktiv, slate-100 inaktiv. Reihenfolge Q1 → Q4 fest.

### Signature: Schulwochen-Tabelle (`WeekTable`)
Die definierende Komponente. `<table>` mit `table-layout: fixed`. Header sticky bei Vertical-Scroll. Spalten-Reihenfolge: # (50px) · Schulwoche (120px) · Mo · Di · Mi · Do · Fr (je flex) · Anmerkungen (180px).

- **Header:** Konrektoren-Marine-Hintergrund, Papier-Card Text, Label-Typographie (12px semibold uppercase, letter-spacing 0.05em). `border-r border-white/15` zwischen Spalten.
- **Schulwoche-Zeile:** Min-Höhe 80–220px (Density-abhängig). #-Zelle und Datum-Zelle haben `bg-slate-50/60` für Spalten-Differenzierung. Tag-Zellen sind weiß mit `hover:bg-slate-50/60`. Klick auf leere Zelle öffnet EventModal mit pre-filled Datum.
- **Ferien-Zeile:** Höhe 56px, colspan=5 über alle Tag-Spalten, Diagonal-Schraffur (`repeating-linear-gradient(45deg, #E2E8F0 0 8px, #EDF2F8 8px 16px)`). Ferien-Label kursiv-semibold zentriert.
- **Anmerkungs-Zelle:** Bei Inhalt Doppelpunkt-Gelb-BG (#FFF8E1), sonst weiß mit Geist-Hint „📝 Notiz hinzufügen" im Hover.

### Signature: Termin-Block (`EventBlock`)
- **Form:** Sehr kleines Radius (3px, `rounded-block`), bewusst Tabellen-Format-nah.
- **Hintergrund:** Pastel-Variante der Kategorie-Farbe (12% Mix mit Weiß über `pastelize()`).
- **Linke Akzent-Linie:** 3px Kategorie-Farbe als `border-left`. *(Bewusst beibehalten aus dem Design-Handoff; siehe Don'ts für die generelle Regel und die Begründung der Ausnahme.)*
- **Typographie:** Body 12px, Uhrzeit-Prefix bold tabular-nums.
- **Interaction:** Draggable via @dnd-kit. Hover-Lift (`translateY(-0.5px)` + Card-Schatten, 150ms). Klick öffnet EventModal mit `stopPropagation`.

### Named Rules

**Die Tabellen-Atmen-Regel.** Tabellen-Zeilen sind nie kleiner als 80px Höhe. Wenn Quartal-Filterung wenige Wochen zurücklässt, wachsen die Zeilen auf bis zu 220px (Density `auto`), um den Viewport zu füllen. Schul-Termine brauchen Lese-Atemraum, nicht maximale Dichte.

**Die Modal-letzter-Ausweg-Regel.** Modals nur dann, wenn die Aktion außerhalb des aktuellen Surface-Kontexts stattfinden muss: EventModal (komplexer Form), NotePopover (fokussierte Texteingabe), SettingsModal (Multi-Tab-Konfiguration). Niemals für Bestätigungen, Tooltips, Hilfetexte, einfache Auswahlen.

## 6. Do's and Don'ts

### Do:
- **Do** Konrektoren-Marine (#00345C) als Primary-Chrome-Farbe nutzen: Header, Primary-Buttons, Tabellen-Header.
- **Do** Doppelpunkt-Gelb (#FFC857) sparsam einsetzen, max ~8% des sichtbaren Bildschirms. Für Highlights, Anmerkungen-mit-Inhalt, aktive View-Toggle.
- **Do** Inter durchgehend mit `font-feature-settings: 'tnum' 1` für jede tabellarisch ausgerichtete Ziffer (SW-Nummern, Datum, Uhrzeit).
- **Do** Form-Label mit `margin-bottom: 6px` vom Input absetzen. Berührende Label sind nicht akzeptabel.
- **Do** Schulwochen-Zeilen mindestens 80px hoch halten, im Auto-Density-Modus bis 220px aufwachsen lassen.
- **Do** Schatten als State-Antwort einsetzen (Hover, Drag, Modal-Open), nie als Card-Identität.
- **Do** Tabellen-Trennlinien sichtbar belassen (1px `tinten-grau-200`). Das ist die Hauptstruktur, kein optionaler Schmuck.
- **Do** Deutsche, formell-höfliche Verben verwenden: „Termin speichern", „Plan erstellen", „Schulwochen neu berechnen".

### Don't:
- **Don't** wie Google Calendar oder Outlook aussehen. Kein Monats-Grid als Primär-Surface, keine Drag-zwischen-Stunden, keine Mini-Kalender-Sidebar.
- **Don't** wie IServ oder Logineo aussehen. Keine grauen 11px-Tabellen, keine bürokratischen ID-Anzeigen („Plan #ABC-2026-Q1"), keine 90er-Jahre-Form-Layouts.
- **Don't** wie Word oder Excel aussehen. Wenn ein Element keinen sichtbaren Mehrwert gegenüber dem Word-Halbjahresplan-Dokument hat (Auto-SW-Berechnung, Drag-Drop, Farb-Kategorien, Auto-Save), gehört es nicht ins Tool.
- **Don't** Marketing-Adjektive verwenden: „smart", „intuitive", „powerful", „awesome", „easy". Sachliche Verben.
- **Don't** Emojis im UI-Chrome als Schmuck. 📝 für Notiz-Icon ist akzeptiert (semantisch, etabliert), sonst keine.
- **Don't** eine dritte gesättigte Farbe ins Chrome einführen (Header, Buttons, Tabs). Kategorie-Farben (Grün, Rot, Violett) bleiben in den Termin-Blöcken.
- **Don't** Card-Hierarchie über Schatten lösen. Hintergrund-Töne und Linien tragen Struktur.
- **Don't** Modal als erstes Werkzeug. Inline-Editing, Popover-Anchor, Toolbar-Aktion zuerst prüfen.
- **Don't** Multi-Schriftfamilien einführen. Inter ist die einzige Schrift; Hierarchie über Gewicht und Größe.
- **Don't** Color-Only-Information. Kategorie-Farben immer mit Label kombinieren. Highlight-Termine immer mit zusätzlichem visuellem Marker (BG + Border-Left).
- **Don't generell, Ausnahme dokumentiert**: 3px+ Side-Stripe-Border als Kategorie-Marker. Im Termin-Block ist dieses Pattern bewusst beibehalten worden, weil die Schul-Halbjahresplan-Konvention (Word-Tabelle) genau so funktioniert und Wiedererkennung wichtiger ist als Strict-Compliance. Außerhalb von `EventBlock`: nie. Für Callouts, Alerts, List-Items: volle Border, Hintergrund-Tints oder führendes Icon nutzen.
- **Don't** Em-Dashes. Komma, Semikolon, Klammern oder Punkt nutzen.
