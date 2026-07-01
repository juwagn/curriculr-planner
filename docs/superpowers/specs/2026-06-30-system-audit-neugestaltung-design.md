# System-Audit und Neugestaltung — Curriculr Planner + Plugin

**Datum:** 2026-06-30  
**Status:** Entwurf (zur Review)  
**Betrifft:** `curriculr-planner` (SPA) + `curriculr-terminplan` (WP-Plugin)  
**Ansatz:** B — Informationsarchitektur + Workflows  
**Auslöser:** Generelle Qualitätssicherung vor Weiterentwicklung  

---

## 1. Ist-Analyse

### 1.1 Systemübersicht

Curriculr besteht aus zwei Anwendungen mit klar getrennten Rollen:

| Anwendung | Rolle | Stack | Stand |
|-----------|-------|-------|-------|
| `curriculr-planner` (SPA) | Erstellen, Bearbeiten, Veröffentlichen von Schuljahresplänen | React 19 + TypeScript + Vite + Zustand + Zod | v1.7.x, GitHub Pages |
| `curriculr-terminplan` (WP-Plugin) | Anzeigen auf Schulwebsite, Sync an IServ via ICS-Feeds, REST-Backend | PHP 8 prozedural, keine Abhängigkeiten | v4.25.0, manuelles ZIP-Deployment |

**Hosting:** SPA auf GitHub Pages · WP auf w3w.de Shared Hosting (kein SSH) · IServ schulintern

### 1.2 Datenfluss

```
[Schulleitung, Browser]
        │
        ▼
[SPA — GitHub Pages]
  - localStorage: PlannerDocument (v5, Zod)
  - Zustand-Stores: planner / ui / history / auth / wpSync
        │
        │  PUT /curriculr/v1/doc/{sj}           (Bearer app-token)
        │  POST /curriculr/v1/profile-map        (provisioniert Kalender)
        ▼
[WP-Plugin REST curriculr/v1]
  - wp_curriculr_docs         (ein Doc pro Schuljahr)
  - wp_curriculr_doc_revisions (50er Retention)
  - gsh_tp_schoolyears (Option): verschachtelt Schuljahre → Kalender
        │
        ├── GET /feed/{sj}/{token}.ics           (Haupt-Kalender, alle Termine)
        └── GET /feed/{sj}/{token}/{group}.ics   (Gruppen-Kalender, gefiltert)
                │
                ▼
        [IServ — abonniert ICS-URL, synchronisiert Gerätekalender]
                │
                ▼
        [Öffentliche WP-Seite: [gsh_terminplan] Shortcode]
```

**Auth-Kette:** IServ OIDC → WP-Callback → HS256-App-Token (30 min) → Bearer auf allen `curriculr/v1`-Routen

### 1.3 Datenmodell

**SPA — PlannerDocument (v5):**
```
PlannerDocument
├── version: 5
├── schoolyear: { id, label, firstSchoolDay, firstTeachingDay, lastSchoolDay,
│                 holidays[], quarterBoundaries[3], stateCode, createdAt, updatedAt }
├── categories[]: { id, label, color, slug, keywords[] }
├── events[]:     { id, title, start, end, startTime?, endTime?, allDay,
│                   categoryId, notes?, location?, groups[] }
├── annotations[]: { schoolweek, text, updatedAt }
├── availableGroups: string[]   ← Zielgruppen für Event-Tagging
├── templates[]:  { id, name, categoryId, defaultTitle?, allDay, ... }
├── ignoredConflicts: string[]
└── meta: { name, lastSaved, schoolName?, schoolInfo? }
```

**WP — gsh_tp_schoolyears (Option):**
```
schoolyears[]
└── schoolyear
    ├── key: 'sj_2026_27'     ← stabiler Schlüssel, entspricht SPA schoolyear.id
    ├── label: '2026/27'
    ├── is_active: bool        ← welches SJ der öffentliche Shortcode zeigt
    ├── created: '2026-06-30'
    ├── shared: { quartal_grenzen, schuljahr_start, cache_duration }
    └── calendars[]
        ├── { group: null,   label: 'Alle Termine',  ical_url, is_draft, managed, orphaned }
        └── { group: 'Schulleitung', label: ...,     ical_url, is_draft, managed, orphaned }
```

**Beziehung:** `SPA.schoolyear.id` ≈ `sj_{id}` = WP-Schuljahr-Schlüssel.  
`SPA.availableGroups[i]` = `WP.calendar.group` wenn Gruppen-Kalender provisioniert.

### 1.4 Aktuelle Navigationsstruktur

**SPA — Settings Modal (11 Tabs, 5 Gruppen):**
```
Schuljahr    → [Schuljahr & Quartale]
Inhalte      → [Kategorien] [Gruppen] [Vorlagen]
Darstellung  → [Ansicht] [Schule & Druck]
Daten        → [Export] [Import] [WordPress]
System       → [Über] [Datenschutz]
```

**SPA — Editor:**
- EditorHeader: Toolbar (Undo/Redo, ViewMode, Export-Dropdown, Einstellungen-Button)
- WpSyncControls: Pull/Push-Buttons im Header (nur wenn WP aktiv)
- Editor-Hauptbereich: WeekTable oder YearGrid

**WP Admin — Schul-Terminplan (4 Tabs):**
```
[Schuljahr-Profile] [Kategorien] [Kiosk] [System & Logs]
```

**WP — Schuljahr-Profile-Tab:**
Für jedes Schuljahr eine Card:
- Header: Label editierbar · "Als aktiv setzen" / AKTIV-Badge · ID-Code
- Body 1: Shared Settings (Schuljahr-Start, Cache-Dauer, Quartalsgrenzen)
- Body 2: Kalender-Tabelle (Haupt + Gruppen, Feed-URL, Status, Löschen)
- "Neues Schuljahr" Form (Key + Label)

### 1.5 Aktueller Workflow: Plan erstmalig veröffentlichen

Ein neuer Nutzer braucht folgende **12 Schritte** verteilt über 2 Anwendungen:

1. SPA → Einstellungen → "Daten" → "WordPress"
2. WordPress-URL eintragen
3. Synchronisation aktivieren (Checkbox)
4. IServ-Login durchführen (Browser-Redirect)
5. Schuljahr-Schlüssel prüfen/anpassen (technisches Feld `sj_2026_27`)
6. Schuljahr-Label prüfen
7. Gruppen-Kalender auswählen (Checkboxen)
8. "Konfiguration senden" klicken
9. Warten auf Bestätigung
10. Settings schließen → Editor
11. WpSyncControls → Push-Button klicken
12. In WP Admin prüfen ob Kalender angelegt

Kein einziger Schritt erklärt, WARUM er nötig ist.

---

## 2. Problemliste

### Kritisch (Kernfunktionalität oder massiver Nutzerfrustrations-Blocker)

| ID | Problem | Ort | Wirkung |
|----|---------|-----|---------|
| P-01 | **Mentales Modell: Komponenten statt Aufgaben** | System-weit | Nutzer verstehen nicht was sie TUN sollen, weil UI TECHNISCHE KONZEPTE zeigt statt AUFGABEN |
| P-02 | **Stage nirgends im Editor sichtbar** | SPA Editor | Nutzer wissen nicht ob ihr Plan "Entwurf", "intern" oder "öffentlich" ist — Status versteckt in WP-Tab |
| P-03 | **12-Schritt-Veröffentlichungsflow** | SPA + WP | Zu viele Schritte, zu verteilt, zu wenig Erklärung. Ohne Einweisung nicht schaffbar |
| P-04 | **"Schuljahr-Schlüssel (WP)" — technisches Freifeld** | SPA → WordPress-Tab | Nicht-Techniker sehen `sj_2026_27` und wissen nicht was das ist oder ob sie es anfassen dürfen |

### Hoch (Signifikante Verwirrung oder Lernaufwand)

| ID | Problem | Ort | Wirkung |
|----|---------|-----|---------|
| P-05 | **Tab-Proliferation: 11 SPA-Tabs** | SPA Settings | Kein klares Gewicht — was ist wichtig? Was ändert man täglich vs. einmalig? |
| P-06 | **"Schuljahr-Profile" als Tab-Name in WP** | WP Admin | Klingt wie "Profil-Verwaltung" (Nutzeraccounts?) statt Schuljahres-Verwaltung |
| P-07 | **Gruppen-Dopplung: andere Sprache, gleiche Sache** | SPA "Gruppen" ↔ WP "Gruppen-Kalender" | "Gruppen" in SPA = Event-Tags. "Kalender" in WP = gefilterte ICS-Feeds. Selbe Entität, zwei Begriffe. Nutzer sehen keinen Zusammenhang |
| P-08 | **"Als aktiv setzen" ohne Erklärung** | WP Schuljahr-Profile | Was bedeutet "aktiv"? Welche Seite zeigt es an? Was passiert mit dem alten Schuljahr? |
| P-09 | **"Konfiguration senden" — zu vage** | SPA WordPress-Tab | Welche Konfiguration? Wann? Mit welchem Effekt? |
| P-10 | **Feed-URLs nur in WP Admin sichtbar** | WP Admin | Nutzer müssen zwischen 2 Anwendungen wechseln um IServ-Abo-URL zu sehen |
| P-11 | **WP/Sync getrennt von Export/Import** | SPA "Daten"-Gruppe | Export, Import, und WordPress-Sync sind drei verschiedene Tabs für die gleiche Aufgabe: "Daten raus/rein" |

### Mittel (Lärm, Redundanz, Verbesserungspotential)

| ID | Problem | Ort | Wirkung |
|----|---------|-----|---------|
| P-12 | **Kalender-ID im WP-Admin sichtbar** (`sj_2026_27__schulleitung`) | WP Schuljahr-Karte | Technischer Lärm. Nicht-Techniker sind verunsichert, ob sie es kennen müssen |
| P-13 | **Import versteckt** | SPA → Daten → Import | Viele Nutzer wissen nicht, dass Excel-Import existiert |
| P-14 | **Stage-Begriffe technisch** | WP + SPA | "Entwurf / Genehmigt / Öffentlich" unklar ohne Erklärung wer was sieht |
| P-15 | **"Ansicht" + "Schule & Druck" separat** | SPA Settings | Beide = Darstellungs-Einstellungen. Kein Grund für Trennung aus Nutzersicht |
| P-16 | **"Über" + "Datenschutz" separat** | SPA Settings | Beide = informativer Inhalt. Verschwendet Navigations-Platz |
| P-17 | **WpSyncControls im Editor-Header versteckt** | SPA Editor | Push/Pull-Buttons tauchen erst auf wenn WP aktiviert ist — neue Nutzer sehen sie nie |

### Gering (Politur)

| ID | Problem | Ort | Wirkung |
|----|---------|-----|---------|
| P-18 | Changelog-Button im WP-Admin schwer zu finden | WP Header | Nur relevant für Admins die Version kennen |
| P-19 | "Aktuelle Stufe: Entwurf" als Plaintext-Label | SPA WordPress-Tab | Zu klein, zu wenig prominent |
| P-20 | Bestätigungsmeldung nach "Konfiguration senden" zu kurz | SPA | "✓ Gespeichert" — kein Hinweis was als Nächstes zu tun ist |

---

## 3. Zielarchitektur

### 3.1 Leitprinzip: Aufgabenorientierung

Das System denkt bisher in **Komponenten** (Profile, Kalender, Mappings, Schlüssel).  
Das Zielsystem denkt in **Aufgaben** (Plan erstellen, Termine einpflegen, veröffentlichen, neues Schuljahr):

```
BISHER (Komponentendenken):          ZIEL (Aufgabendenken):
──────────────────────────────       ─────────────────────────────
→ Schuljahr-Profile verwalten        → Plan für dieses Schuljahr
→ Profilzuordnung konfigurieren      → Termine einpflegen
→ Konfiguration senden               → [Veröffentlichen]
→ Push auslösen                      → Neues Schuljahr starten
→ Feed-URL kopieren
```

**Konsequenz:** Jede Einstellung, die mehr als einmal im Jahr gebraucht wird, muss auf der direkten Aufgaben-Route liegen. Alles andere kommt hinter "Erweitert".

### 3.2 Verantwortlichkeiten (neu explizit)

| Anwendung | Verantwortlich für | NICHT verantwortlich für |
|-----------|-------------------|--------------------------|
| SPA | Authoring (Termine, Kategorien, Gruppen) + Steuerung des WP-Backends | Anzeige, ICS-Generierung, IServ-Kommunikation |
| WP Plugin | REST-Backend + ICS-Feeds + öffentliche Anzeige | Planung, Dateneingabe |
| IServ | Kalender-Abo und Kiosk-Anzeige | Alles andere |

Diese Trennung ist schon im Code korrekt umgesetzt — sie ist aber bisher für Nutzer unsichtbar.

### 3.3 Begriffssystem (neu verbindlich)

Einheitliche Terminologie, die Technik verbirgt:

| Bisheriger Begriff | Neuer Begriff | Begründung |
|-------------------|---------------|------------|
| Schuljahr-Profil | **Schuljahr** | "Profil" klingt nach Nutzer-Account |
| Profilzuordnung / Curriculr-Sync | *(entfernt, bereits v4.24)* | War redundant |
| Konfiguration senden | **Kalender einrichten** | Beschreibt was passiert |
| Push / Sync | **Veröffentlichen** | Beschreibt den Effekt, nicht den Mechanismus |
| Entwurf / Genehmigt / Öffentlich | **Entwurf / Intern / Öffentlich** | "Genehmigt" klingt nach Prozess-Schritt, "Intern" nach Sichtbarkeit |
| Feed-URL | **Kalender-Link (für IServ)** | Erklärt Zweck |
| Schuljahr-Schlüssel (WP) | *(ausgeblendet, automatisch)* | Nie manuell nötig |
| Gruppen-Kalender | **Kalender für [Gruppe]** | Expliziter |
| app-token / Bearer | *(nie sichtbar)* | Rein intern |

### 3.4 Neue Systemstruktur

```
╔══════════════════════════════════════════╗
║  SPA (Planner)                           ║
║  ┌─────────────────────────────────┐     ║
║  │ Welcome / Wizard                │     ║
║  │ Editor (WeekTable / YearGrid)   │     ║
║  │   └─ StatusBar: Name│Stage│Push │     ║
║  │ Settings (7 Tabs, 4 Gruppen)    │     ║
║  │   └─ Veröffentlichung & Export  │     ║
║  │       ├─ WP verbinden           │     ║
║  │       ├─ Kalender einrichten    │     ║
║  │       └─ Export / Import        │     ║
║  └─────────────────────────────────┘     ║
╚══════════════════════════════════════════╝
              │ REST (Bearer)
              ▼
╔══════════════════════════════════════════╗
║  WP Plugin                              ║
║  ┌─────────────────────────────────┐    ║
║  │ Admin (3 Tabs)                  │    ║
║  │   [Schuljahre] [Kategorien]     │    ║
║  │   [System]                      │    ║
║  │                                 │    ║
║  │ REST curriculr/v1               │    ║
║  │ ICS-Feeds (Haupt + Gruppen)     │    ║
║  │ Shortcode [gsh_terminplan]      │    ║
║  └─────────────────────────────────┘    ║
╚══════════════════════════════════════════╝
              │ ICS-Feed-URL
              ▼
╔══════════════════════════════════════════╗
║  IServ  (Gerätekalender-Abo)            ║
╚══════════════════════════════════════════╝
```

---

## 4. Neue Informationsarchitektur

### 4.1 SPA — Settings Modal

**Von 11 Tabs (5 Gruppen) → 7 Tabs (4 Gruppen):**

```
Inhalt       → [Schuljahr & Quartale] [Kategorien] [Gruppen] [Vorlagen]
Ausgabe      → [Darstellung & Druck] [Veröffentlichung & Export]
Info         → [Info & Datenschutz]
```

*(3 Gruppen + Inhalt-Gruppe mit 4 Tabs — Darstellung und Veröffentlichung in einer "Ausgabe"-Gruppe, da beide beschreiben wie der Plan nach außen tritt)*

**Fusionen:**

| Bisherige Tabs | Neuer Tab | Begründung |
|---------------|-----------|------------|
| Ansicht + Schule & Druck | **Darstellung & Druck** | Beide steuern visuelles Erscheinungsbild; kein konzeptioneller Unterschied für Nutzer |
| WordPress + Export + Import | **Veröffentlichung & Export** | Alle drei = "Daten rausgeben oder reinholen". Ein Tab, drei Sektionen |
| Über + Datenschutz | **Info & Datenschutz** | Rein informativer Inhalt; keine Aktionen |

**Tab "Veröffentlichung & Export" — neue Struktur:**

```
─── WordPress-Verbindung ─────────────────────────────────
  [✓] WordPress-Synchronisation aktiv
  WordPress-Adresse: [https://schule.example]

  Angemeldet als Max Mustermann (Schulleitung)  [Abmelden]
                                                [Verbindung testen]
─── Kalender einrichten ──────────────────────────────────
  Plan: "Schuljahr 2026/27"

  [✓] Alle Termine (immer aktiv, für Kollegium)
  [ ] Schulleitung
  [✓] Eltern
  [ ] Schülerinnen und Schüler

  [Kalender einrichten →]          ← war: "Konfiguration senden"

  ✓ Eingerichtet. Kalender-Links für IServ:
    Alle Termine:  [https://…/feed/sj_2026_27/…ics]  [Kopieren]
    Eltern:        [https://…/feed/sj_2026_27/…/Eltern.ics]  [Kopieren]

  [▸ Erweitert]  ← versteckt: Schuljahr-Schlüssel, Schuljahr-Label
─── Export ───────────────────────────────────────────────
  Exportieren als:  [ICS herunterladen]  [Excel herunterladen]

─── Import ───────────────────────────────────────────────
  [Excel-Datei importieren (Konverter-Format)]
```

### 4.2 SPA — Editor-Header (neue StatusBar)

Unter der bestehenden Toolbar wird eine permanente StatusBar eingefügt:

```
[Curriculr Logo] Schuljahresplan 2026/27   [Entwurf▾] [Zuletzt gesendet: heute, 14:32] [Veröffentlichen]
                 ─────── EditorToolbar ──────────────────────────────────────────────────────
```

**StatusBar-Komponente:**
- Dokument-Name (aus `doc.meta.name`)
- Stage-Badge: Dropdown mit Erklärung:
  - **Entwurf** — Nur für dich sichtbar
  - **Intern** — Sichtbar für Kollegium (Entwurf-Kiosk)
  - **Öffentlich** — Auf Schulwebsite sichtbar
- "Zuletzt gesendet" Timestamp (aus wpSync-Store)
- **[Veröffentlichen]**-Button → öffnet PublishDialog

**PublishDialog:**
```
Plan veröffentlichen

Aktuelle Stufe:  [Entwurf ▾]
                  ○ Entwurf      – nur für dich sichtbar
                  ● Intern       – Kollegium sieht Entwurf-Kiosk
                  ○ Öffentlich   – erscheint auf der Schulwebsite

[Abbrechen]   [Jetzt veröffentlichen →]

  → Nach dem Veröffentlichen: Kein weiterer Schritt nötig.
    IServ aktualisiert sich automatisch.
```

### 4.3 WP Admin — neue Tab-Struktur

**Von 4 Tabs → 3 Tabs:**

```
[Schuljahre]  [Kategorien]  [System]
```

**Tab "Schuljahre" (war: "Schuljahr-Profile"):**

```
Schuljahre                                   [+ Schuljahr anlegen]

┌─────────────────────────────────────────────┐
│  2026/27                    AKTIV            │
│  Zuletzt gesendet: 30.06.2026               │
├──────────────────────────────────┬──────────┤
│ Kalender                         │ Status   │
├──────────────────────────────────┼──────────┤
│ Alle Termine                     │ Öffentlich│
│ Eltern                    Curriculr│ Intern  │
├──────────────────────────────────┴──────────┤
│ ▸ Einstellungen (Schuljahr-Start, Cache, Quartale)
│ ▸ Erweitert (ID: sj_2026_27, Feed-URLs)
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  2025/26                                     │
│  [Als aktives Schuljahr setzen]              │
│  Alle Termine             Öffentlich         │
│  ▸ Einstellungen    ▸ Erweitert             │
│  ▾ Löschen (inkl. Terminplan und ICS-Cache) │
└─────────────────────────────────────────────┘
```

**+ Schuljahr anlegen Dialog:**
```
Schuljahr: [2027/28]    ← Freitext, kein technisches Feld
Schlüssel: [sj_2027_28] ← vorgeschlagen, editierbar, hinter "Erweitert"
[Anlegen]
```

**Tab "System" (Kiosk-Sektion integriert):**
```
─── Kiosk & Entwurf-Vorschau ─────────────────────
  Entwurf-Vorschau:  [URL] [Seite testen ↗]
  IServ-Einbettung:  [Kiosk-URL] [Seite testen ↗]
  Kiosk-Token:       [●●●●●●●●] [Neu generieren]

─── Verbindung & Logs ─────────────────────────────
  Erlaubte Planner-Adresse: [https://…]
  [Verbindung testen]
  Letzte Sync-Versuche: [Anzeigen]

─── System ────────────────────────────────────────
  Datensicherung: [Einstellungen exportieren] [Importieren]
  Feedback-Log:   [Anzeigen] [Löschen]
```

---

## 5. Neue Benutzerabläufe

### 5.1 Ersteinrichtung (neu: 6 Schritte, ein System)

**Früher:** 12 Schritte, 2 Anwendungen, keine Erklärungen  
**Neu:** 6 Schritte, im SPA geführt, mit Erklärungen

```
1. SPA öffnen → Wizard
   Schritt 1: Schuljahr-Daten (Name, Zeitraum, Bundesland)
   Schritt 2: Ferien laden + Kategorien
   Schritt 3: Bestätigen → Editor

2. Termine einpflegen (Editor)

3. Einstellungen → Veröffentlichung & Export
   → WordPress-Adresse eintragen
   → "Mit IServ anmelden" → Browser-Redirect → zurück
   ✓ Angemeldet als [Name]

4. Kalender einrichten (gleicher Tab)
   → Häkchen für gewünschte Gruppen-Kalender
   → [Kalender einrichten →]
   ✓ Kalender-Links erscheinen

5. [Veröffentlichen]-Button im Editor
   → Stage wählen (Entwurf / Intern / Öffentlich)
   → Bestätigen
   ✓ "Plan veröffentlicht"

6. (Optional) WP Admin → System → Kiosk-URL für IServ-Einbettung kopieren
```

### 5.2 Jährlicher Zyklus (neu: 3 Schritte)

```
1. Welcome-Screen → "Neues Schuljahr anlegen"
   → Wizard: Schuljahr-Daten + Ferien (Schritt 1 + 2 wieder verwenden)
   → Kategorien übernehmen (Standard: ja)

2. Termine einpflegen

3. [Veröffentlichen] → "Öffentlich"
```

### 5.3 Gruppen-Kalender einrichten (neu: 2 Schritte)

```
1. Einstellungen → Gruppen: Gruppe hinzufügen (z.B. "Eltern")

2. Einstellungen → Veröffentlichung & Export → Kalender einrichten
   → "Eltern" erscheint automatisch in der Liste
   → Häkchen setzen → [Kalender einrichten →]
   ✓ Kalender-Link "Eltern" erscheint → Kopieren für IServ-Abo
```

**Früher:** Gruppe anlegen → WP-Tab → manuell Gruppe auswählen → "Konfiguration senden" → WP Admin öffnen → Kalender-URL suchen → Kopieren  
**Neu:** Gruppe anlegen → Häkchen → [Kalender einrichten] → URL kopieren (im SPA)

### 5.4 Stage wechseln und veröffentlichen (neu: 2 Klicks)

```
StatusBar → [Veröffentlichen] → Stage wählen → Bestätigen
```

**Früher:** Einstellungen → WordPress-Tab → Stage unklar wechselbar → Push in Editor → WP Admin prüfen

### 5.5 Schuljahr archivieren (neues Konzept)

Wenn ein neues Schuljahr aktiv gesetzt wird:

```
WP Admin → Schuljahre → 2025/26 → "Als aktives Schuljahr setzen" bei 2026/27

Meldung: Das Schuljahr 2025/26 ist nicht mehr das aktive Schuljahr.
Es bleibt gespeichert und kann jederzeit wieder aktiviert werden.
```

(Bisher: "Als aktiv setzen" ohne Erklärung des Effekts auf das vorherige Schuljahr)

---

## 6. Refactoring-Plan

### 6.1 SPA (`curriculr-planner/src/`)

#### Bleiben (unverändert)
- `App.tsx` — State machine, kein Änderungsbedarf
- `stores/planner.ts`, `stores/auth.ts`, `stores/history.ts`, `stores/wpSync.ts` — unverändert
- `lib/` — alle Pure-Functions unverändert
- `components/editor/WeekTable.tsx`, `YearGrid.tsx` — unverändert
- `components/wizard/` — unverändert
- `components/welcome/` — minimale Erweiterung (s.u.)
- `components/ui/` — shadcn-Primitives unverändert

#### Verschoben / Erweitert
- `components/settings/AppearanceTab.tsx` → **nimmt Inhalte von SchoolTab auf** (Schulname, Schullogo, Druck-Einstellungen)
- `components/settings/AboutTab.tsx` → **nimmt Inhalte von PrivacyTab auf**
- `components/editor/EditorHeader.tsx` → **fügt StatusBar-Bereich ein** (zwischen Logo und Toolbar)

#### Zusammengeführt (neue Dateien)
- **`components/settings/PublishTab.tsx`** (neu)  
  Zusammenführung von `WordpressTab` + `ExportTab` + `ImportTab`  
  Drei Sektionen: "WordPress-Verbindung" · "Kalender einrichten" · "Export / Import"

- **`components/settings/AppearanceTab.tsx`** (erweitert)  
  Bestehender Inhalt + Schulname, Schullogo, Druck-Einstellungen von SchoolTab

- **`components/settings/InfoTab.tsx`** (neu)  
  Zusammenführung von `AboutTab` + `PrivacyTab`

#### Neu erstellt
- **`components/editor/StatusBar.tsx`**  
  Zeigt: Dokument-Name | Stage-Badge (Dropdown) | "Zuletzt gesendet" | PublishButton  
  Liest: `usePlannerStore` (doc.meta.name) + `useWpSyncStore` (lastPushedAt) + `useAuthStore` (status)

- **`components/editor/PublishButton.tsx`**  
  Button-Wrapper. Öffnet PublishDialog. Deaktiviert wenn WP nicht aktiviert.

- **`components/editor/PublishDialog.tsx`**  
  Stage-Auswahl mit Erklärungen + Push-Auslöser + Feedback in einem Schritt.  
  Ersetzt den manuellen Push-Flow aus WpSyncControls.

- **`components/settings/SettingsModal.tsx`** (angepasst)  
  `NAV_GROUPS` von 5 auf 3 reduziert. Neuer `SettingsTab`-Typ:  
  `'schoolyear' | 'categories' | 'groups' | 'templates' | 'appearance' | 'publish' | 'info'`

  Nav-Gruppen: Inhalt (4), Ausgabe (2), Info (1)

#### Entfernt
- `components/settings/SchoolTab.tsx` (Inhalte in AppearanceTab)
- `components/settings/PrivacyTab.tsx` (Inhalte in InfoTab)
- `components/settings/ExportTab.tsx` (Sektion in PublishTab)
- `components/settings/ImportTab.tsx` (Sektion in PublishTab)
- `components/editor/WpSyncControls.tsx` (ersetzt durch StatusBar + PublishButton + PublishDialog)
- `stores/ui.ts`: `SettingsTab` Typ aktualisieren

### 6.2 WP Plugin (`curriculr-terminplan/plugin/gsh-terminplan.php`)

#### Tab-Umbenennung und -Reduktion
```php
// Vorher:
$tabs = array(
    '_profile'    => 'Schuljahr-Profile',
    '_kategorien' => 'Kategorien',
    '_kiosk'      => 'Kiosk',
    '_system'     => 'System &amp; Logs',
);

// Nachher:
$tabs = array(
    '_profile'    => 'Schuljahre',
    '_kategorien' => 'Kategorien',
    '_system'     => 'System &amp; Logs',
    // '_kiosk' entfernt — Kiosk-Sektion in _system integriert
);
```

#### `gsh_tp_render_profile_tab_v2()` — Anpassungen
- Überschrift "Schuljahr-Profile" → "Schuljahre"
- "Als aktiv setzen" → "Als aktives Schuljahr setzen" + Erklärungstext
- "Als aktiv setzen" beim aktiven Schuljahr: Text erklärt was passiert mit dem bisher aktiven
- Kalender-ID (`ID: sj_2026_27__schulleitung`) per `<details>` hinter "Erweitert" versteckt
- Neue Spalte "Status" (liest aus `wp_curriculr_docs.stage` und `updated_at`)
- "+ Neues Schuljahr" Formular: nur Label-Feld sichtbar, Schlüssel-Feld per `<details>` erreichbar

#### Neue Hilfsfunktion `gsh_tp_get_doc_status($sj_key)`
Liest `wp_curriculr_docs` für `stage` + `updated_at`. Gibt `['stage' => 'entwurf', 'last_sent' => '2026-06-30 14:32']` zurück. Wird in Schuljahr-Karte als "Status" angezeigt.

#### Kiosk-Sektion nach System-Tab verschieben
Kiosk-Render-Code aus eigenem `_kiosk`-Zweig in `gsh_tp_render_system_tab()` als erste Sektion einfügen. Redirect von `?tab=_kiosk` auf `?tab=_system` damit bestehende Bookmarks funktionieren.

#### Nicht berührt
- `curriculr-auth.php`, `curriculr-guard.php` — keine Änderungen
- `curriculr-data-layer.php` — keine REST-Shape-Änderungen
- ICS-Generierung, Shortcode, Kategorie-Mapping — keine Änderungen

---

## 7. Migrationsstrategie

### 7.1 Daten — keine Migration nötig

Alle Änderungen sind rein UI/Komponenten:

| Datenschicht | Änderung | Strategie |
|-------------|---------|----------|
| `localStorage` PlannerDocument v5 | keine | — |
| `gsh_tp_schoolyears` WP-Option | keine | — |
| `gsh_tp_profiles` WP-Option (legacy) | keine | Bleibt als Fallback gemäß Spec 2026-06-29 |
| `wp_curriculr_docs` Tabelle | keine | — |
| REST-Endpunkte | keine Shape-Änderungen | Alle bestehenden SPA-Versionen kompatibel |
| ICS-Feed-URLs | keine | Bestehende IServ-Abos laufen unverändert |

### 7.2 SPA-Einstellungen (wpSync Store)

`WpSyncConfig.links[docId]` enthält `schoolyearKey`, `schoolyearLabel`, `calendarGroups`, `provisionedCalendars`.  
Neue `PublishTab`-Komponente liest und schreibt denselben Store — keine Migration, nur neue UI.

### 7.3 WP-Admin-Nutzer

WP-Admins sehen nach dem Update:
- Tab heißt "Schuljahre" statt "Schuljahr-Profile" → intuitiver, kein Brechen
- Kiosk-Einstellungen jetzt unter "System" → einmaliger Umgewöhnungs-Moment, danach klarer
- Technische IDs ausgeblendet → weniger Verwirrung, via "Erweitert" erreichbar

### 7.4 Versionierung

- SPA: Minor-Bump `package.json` — UI-Änderungen, kein API-Break
- Plugin: Minor-Bump `GSH_TP_VERSION` (4 Stellen) — kein DB-Schema-Bump nötig

---

## 8. Benutzerdokumentation

*Für Lehrkräfte, Schulleitung und Schulsekretariat — kein technisches Vorwissen nötig.*

---

### Curriculr — Kurzanleitung

**Was ist Curriculr?**  
Curriculr ist ein Werkzeug zum Erstellen des Schuljahresterminplans. Du pflegst alle Termine an einem Ort. Curriculr kümmert sich darum, dass sie auf der Schulwebsite erscheinen und im IServ-Kalender landen.

---

#### Schuljahresplan erstellen (einmalig zu Beginn des Schuljahres)

1. Öffne den Curriculr Planner
2. Klicke **Neuen Plan erstellen**
3. Trage Schuljahr, Anfang/Ende und dein Bundesland ein → Ferien werden automatisch geladen
4. Kategorien bestätigen → **Fertig**

---

#### Termine einpflegen

- Klicke auf eine **Wochenzelle** → Neuer Termin
- Ziehe Termine **länger** für mehrtägige Termine
- Ziehe Termine in eine **andere Woche** zum Verschieben
- Rechts oben: Undo/Redo wenn etwas schiefgeht

---

#### Plan veröffentlichen

1. Klicke oben auf **[Veröffentlichen]**
2. Wähle Sichtbarkeit:
   - **Entwurf** — nur du siehst den Plan
   - **Intern** — Kollegium sieht die Vorschau
   - **Öffentlich** — erscheint auf der Schulwebsite
3. Klicke **Jetzt veröffentlichen** → fertig

IServ synchronisiert sich automatisch — kein weiterer Schritt nötig.

---

#### Gruppen-Kalender einrichten (z.B. für Eltern)

1. **Einstellungen** → **Gruppen** → "Eltern" hinzufügen
2. Bei Terminen: angeben welche Gruppe sie betrifft
3. **Einstellungen** → **Veröffentlichung** → Häkchen bei "Eltern" → **Kalender einrichten**
4. Den erscheinenden **Kalender-Link** in IServ als Kalender-Abo eintragen

Ab jetzt sehen Eltern in IServ nur ihre Termine.

---

#### Neues Schuljahr starten

1. Auf dem Startbildschirm: **Neues Schuljahr anlegen**
2. Schuljahr-Daten eintragen → Ferien werden geladen
3. Termine einpflegen → Veröffentlichen

Das alte Schuljahr bleibt im Archiv.

---

#### Häufige Fragen

**Was ist der Unterschied zwischen "Intern" und "Öffentlich"?**  
"Intern" zeigt den Plan im geschützten Vorschau-Bereich (für Kollegium). "Öffentlich" zeigt ihn auf der Schulwebsite für alle.

**Muss ich etwas in WordPress einstellen?**  
Nein — Curriculr erledigt das automatisch. WordPress-Einstellungen brauchst du nur bei der allerersten Einrichtung (einmalig, 5 Minuten).

**IServ zeigt keine Termine an. Was tun?**  
Prüfe ob der Plan auf "Öffentlich" gesetzt ist. IServ aktualisiert sich automatisch innerhalb von 1 Stunde.

**Kann ich einen alten Plan öffnen?**  
Ja — auf dem Startbildschirm siehst du alle gespeicherten Pläne.

---

## 9. Abschlussprüfung

### Prüffragen

| Frage | Antwort | Status |
|-------|---------|--------|
| Ist jede Funktion logisch eingeordnet? | WP-Sync in "Veröffentlichung", nicht in "Daten"; Stage im Editor sichtbar | ✓ |
| Ist jede Einstellung am richtigen Ort? | Technische IDs hinter "Erweitert"; Kiosk im System-Tab; Schuljahr-Settings im Schuljahr-Tab | ✓ |
| Gibt es doppelte Zuständigkeiten? | WordpressTab + WpSyncControls → zusammengeführt zu PublishTab + StatusBar + PublishDialog | ✓ |
| Sind alle Begriffe eindeutig? | "Schuljahr" statt Profil; "Kalender" statt Feed; "Veröffentlichen" statt Push/Sync | ✓ |
| Ist Planner-/Plugin-Unterschied verständlich? | SPA = Werkzeug zum Erstellen. Plugin = läuft im Hintergrund. Nutzer sehen nur SPA. | ✓ |
| Kann Lehrkraft ohne Einweisung arbeiten? | 6-Schritt-Ersteinrichtung geführt im SPA. Jährlicher Zyklus 3 Schritte. | ✓ |
| Weiß Nutzer wo er ist, warum, was als nächstes? | StatusBar zeigt: Plan-Name, Stage, letzter Push. [Veröffentlichen] immer sichtbar. | ✓ |

### Offene Punkte / Risiken

- **Pull-Funktion (WpSyncControls):** Muss nach WpSyncControls-Entfernung über PublishDialog oder StatusBar-Menü zugänglich bleiben. Prüfen ob Pull aktiv genutzt wird.
- **Stage-Wechsel ohne Push:** Stage-Dropdown im StatusBar ändert Stage lokal. Erst [Veröffentlichen] sendet. Badge-Hinweis: "Geändert — noch nicht gesendet" nötig.
- **Kiosk-Tab-Redirect:** `?tab=_kiosk` Bookmarks leiten auf `?tab=_system` weiterleiten (oder `#kiosk` Anker).
- **"Genehmigt" → "Intern":** Stage-Begriff-Änderung betrifft `wp-stage.ts` (STAGE_LABELS), WP-Anzeige, und ggf. ICS-DESCRIPTION-Felder.

### Umsetzungs-Empfehlung

**Phase 1 — Quick Wins (~2–3 Tage, geringes Risiko):**
- WP: Tab "Schuljahr-Profile" → "Schuljahre"
- WP: Kiosk-Tab in System-Tab integrieren
- WP: Kalender-IDs per `<details>` verstecken
- SPA: Stage-Begriffe "Genehmigt" → "Intern" (eine Konstanten-Datei)
- SPA: AppearanceTab + SchoolTab fusionieren
- SPA: AboutTab + PrivacyTab fusionieren

**Phase 2 — Kernumbau (~5–6 Tage, moderates Risiko):**
- SPA: StatusBar + PublishButton + PublishDialog erstellen
- SPA: WpSyncControls ersetzen/entfernen
- SPA: PublishTab erstellen (WordPress + Export + Import)
- SPA: SettingsModal NAV_GROUPS aktualisieren
- WP: Neue Hilfsfunktion `gsh_tp_get_doc_status()` + Status-Spalte in Schuljahr-Karte
