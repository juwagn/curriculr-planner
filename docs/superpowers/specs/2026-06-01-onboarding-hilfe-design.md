# Onboarding & Hilfebereich — Design Spec

**Datum:** 2026-06-01  
**Zielgruppe:** Schulleitung (nicht-technische Nutzer)  
**Ziel:** Neue Nutzer befähigen, den Planner vollständig selbstständig zu bedienen — ohne externe Anleitung.

---

## Übersicht

Zwei separate Features, die zusammen einen vollständigen Hilfe-Layer bilden:

1. **Geführte Tour** — Spotlight-Tour durch den Editor (opt-in), auslösbar vom Welcome-Screen und aus dem Hilfe-Modal heraus.
2. **Hilfe-Modal** — Jederzeit aufrufbarer Referenzbereich mit 5 Sektionen, erreichbar über `?`-Button im Editor-Header.

---

## 1. Geführte Tour

### Verhalten

- **Opt-in** — startet nie automatisch, immer auf Nutzerinitiative.
- **Einstiegspunkte:**
  - Welcome-Screen: Button "▶ Geführte Tour starten" (vierter Ghost-Button, unter "Demo ausprobieren")
  - Hilfe-Modal: CTA "▶ Geführte Tour starten" in der linken Navigation
- **Ablauf Welcome → Tour:** Klick → `createDemoDoc()` laden + `setTourPending(true)` + Editor-Route gleichzeitig setzen → `TourManager` sieht Flag beim ersten Mount und startet driver.js
- **Ablauf Hilfe-Modal → Tour:** Modal schließen → `tourPending = true` → `TourManager` startet Tour
- **Abbruch:** ESC-Taste oder "Überspringen"-Link im driver.js-Popover → `setTourPending(false)` + driver.js-Cleanup. Kein Zustand persistiert — Tour jederzeit neu startbar.

### Tour-Schritte (8)

| # | Selektor | Titel | Beschreibungstext |
|---|---|---|---|
| 1 | *(kein — zentriertes Intro-Popup)* | Willkommen im Curriculr Planner | Wir zeigen dir die wichtigsten Funktionen. Dauert ca. 2 Minuten. |
| 2 | `[data-tour="plan-name"]` | Dein Jahresplan | Klick öffnet die Planübersicht — du kannst mehrere Pläne gleichzeitig verwalten. |
| 3 | `[data-tour="view-toggle"]` | Ansicht wechseln | Wechsle zwischen Wochen-Tabelle (Quartalsansicht) und Jahresübersicht. |
| 4 | `[data-tour="quarter-tabs"]` | Quartals-Navigation | Wechsle zwischen Q1–Q4. Jedes Quartal zeigt die zugehörigen Schulwochen. |
| 5 | `[data-tour="add-event-btn"]` | Termin anlegen | Öffnet das Formular: Titel, Kategorie, Datum und betroffene Gruppen eingeben. |
| 6 | `[data-tour="templates-btn"]` | Termin-Vorlagen | Vorlagen für wiederkehrende Termine — per Drag & Drop in den Plan ziehen. |
| 7 | `[data-tour="export-btn"]` | Exportieren | Plan als ICS für Kalender-Apps, Excel für das Schulwebsite-Plugin oder JSON-Backup. |
| 8 | `[data-tour="settings-btn"]` | Einstellungen | Kategorien, Gruppen, Schuljahr und Darstellung anpassen. |

### Implementierung: driver.js

- Package: `driver.js` (leichtgewichtig, ~2.3 kB gzip)
- Styling-Overrides in `src/styles/globals.css`:
  - Popover-Background → `var(--color-paper-card)`
  - Highlight-Border → `var(--color-gelb-400)`
  - Primary-Button → `var(--color-marine-800)` / `var(--color-paper-card)`
  - Secondary/Skip-Link → `var(--color-ink-500)`

### `data-tour` Attribute

Folgende Elemente erhalten `data-tour`-Attribute:

| Attribut | Element | Datei |
|---|---|---|
| `plan-name` | Plan-Name-Button | `EditorHeader.tsx` |
| `view-toggle` | Tabelle/Schuljahr-Toggle | `EditorHeader.tsx` |
| `settings-btn` | Settings-Icon-Button | `EditorHeader.tsx` |
| `export-btn` | ExportDropdown-Trigger | `ExportDropdown.tsx` |
| `quarter-tabs` | Q1–Q4 Container-Div | `EditorToolbar.tsx` |
| `add-event-btn` | "+ Termin"-Button | `EditorToolbar.tsx` |
| `templates-btn` | "Vorlagen"-Button | `EditorToolbar.tsx` |

---

## 2. Hilfe-Modal

### Auslöser

- `?`-Button in `EditorHeader`, platziert links vom Settings-Icon (beide Meta-Buttons gruppiert)
- Gleiche Ghost-Button-Variante wie das Settings-Icon (`variant="ghost" size="icon"`)

### Layout

- Größe: `max-w-[960px]` (identisch zu SettingsModal), `max-h-[80vh]`
- Zweigeteiltes Layout:
  - **Links (180 px, fix):** Sektions-Navigation + "Geführte Tour starten"-CTA ganz unten
  - **Rechts (flex):** Scrollbarer Inhalt der aktiven Sektion
- Kein Tab-System (wie Settings) — State `activeSection` intern in HelpModal, nicht im UI-Store

### Sektionen (5)

#### 1. Erste Schritte
- Schuljahr-Assistent (Wizard) kurz beschrieben
- Ersten Termin anlegen (Schritt-für-Schritt)
- Termin bearbeiten und verschieben (Drag & Drop)
- Plan exportieren (Kurzanleitung)
- Tastaturkürzel-Tabelle: `Strg+Z`, `Strg+Shift+Z`, `Esc`

#### 2. Termine & Kategorien
- Termin-Formular erklärt (alle Felder)
- Kategorien: Bedeutung, Farben, anpassen unter Einstellungen
- Gruppen: Zuweisung zu Terminen
- Konflikte: Was bedeutet die Warnanzeige

#### 3. Ansichten
- Wochentabelle: Spalten (Mo–Fr), Schulwochen, Ferienzeilen
- Jahresübersicht: Monats-Raster, Farbkodierung
- Quartale: Q1–Q4, Grenzen anpassen

#### 4. Vorlagen
- Vorlage erstellen (über Einstellungen → Vorlagen)
- Vorlage per Drag & Drop platzieren
- Vorlage per Klick platzieren (Alternativ-Methode)
- Vorlage bearbeiten / löschen

#### 5. Export & Backup
- **ICS:** Für Outlook, Google Kalender — Einzel- oder Gesamtexport
- **Excel:** Für das Terminplaner WordPress-Plugin
- **JSON-Backup:** Sichern und auf anderem Gerät wiederherstellen
- **Import:** ICS, Excel oder JSON-Backup laden (über Welcome-Screen)

### "Geführte Tour starten"-CTA

- Platzierung: Unten in der linken Navigation, oberhalb des unteren Rands
- Farbe: `var(--color-gelb-400)` Hintergrund, `var(--color-ink-900)` Text
- Aktion: `closeHelp()` + `setTourPending(true)`
- Subtext: "~2 Minuten"

---

## 3. Neue Dateien

### `src/components/tour/tour-steps.ts`

Statisches Array vom Typ `DriveStep[]` (driver.js Typ). Jeder Eintrag: `{ element, popover: { title, description, side, align } }`. Schritt 1 ohne `element` (Intro-Popup).

### `src/components/tour/TourManager.tsx`

- Rendert nichts (returns `null`)
- `useEffect` auf `tourPending`: wenn `true` → `driver.js` initialisieren mit `tour-steps`, `setTourPending(false)` aufrufen, Tour starten
- Mounted in `Editor.tsx` (innerhalb Editor-Layout, nach allen Tour-Targets)

### `src/components/help/HelpModal.tsx`

- Interner State: `activeSection: 'start' | 'events' | 'views' | 'templates' | 'export'`
- Standardsektion: `'start'`
- Kein Persist — Modal öffnet immer auf "Erste Schritte"
- Content: JSX-Komponenten pro Sektion (kein Markdown-Parser benötigt)

---

## 4. Store-Änderungen (`stores/ui.ts`)

```ts
// Neue Felder in UiState
helpOpen: boolean
tourPending: boolean

// Neue Actions
openHelp: () => void        // setzt helpOpen = true
closeHelp: () => void       // setzt helpOpen = false
setTourPending: (v: boolean) => void
```

Beide Flags ephemer (kein `localStorage`-Persist).

---

## 5. Geänderte Dateien (Übersicht)

| Datei | Änderung |
|---|---|
| `src/stores/ui.ts` | `helpOpen`, `tourPending`, Actions |
| `src/components/welcome/Welcome.tsx` | "▶ Geführte Tour starten"-Button (Ghost, letzter in der Liste) |
| `src/components/editor/EditorHeader.tsx` | `?`-Button + `data-tour`-Attribute auf plan-name, view-toggle, settings-btn |
| `src/components/export/ExportDropdown.tsx` | `data-tour="export-btn"` auf Trigger |
| `src/components/editor/EditorToolbar.tsx` | `data-tour`-Attribute auf quarter-tabs, add-event-btn, templates-btn |
| `src/components/editor/Editor.tsx` | `<TourManager />` + `<HelpModal />` einbinden |
| `src/styles/globals.css` | driver.js CSS-Override-Variablen |
| `package.json` | `driver.js` als Dependency |

---

## 6. Nicht im Scope

- Kein Persist von "Tour bereits gesehen" — bewusste Entscheidung, Tour bleibt jederzeit neu startbar
- Kein kontextabhängiges Inline-Tooltip-System (Hover-Hilfe an einzelnen Feldern)
- Kein Suchfeld im Hilfe-Modal
- Kein externer Markdown-Parser — Content als JSX hardcoded (wartbar, keine Abhängigkeit)
- Keine Versionierung des Hilfe-Inhalts

---

## 7. Erfolgskriterien

Eine Schulleitung ohne Vorkenntnisse kann nach Durchführung der Tour:
- Einen Jahresplan mit Schuljahrdaten anlegen
- Termine verschiedener Kategorien einplanen
- Den Plan als Excel exportieren
- Das Hilfe-Modal öffnen und eine konkrete Frage beantworten
