# Design — Editor-Header/Toolbar-Redesign (Overflow-Menü)

**Datum:** 2026-07-07
**Repo:** `curriculr-planner` (SPA)
**Status:** Entwurf zur Review

## Problem

`EditorHeader.tsx` (Reihe 1, marine-800) reiht 9 gleichgewichtete Elemente
nebeneinander: Logo, Plan-Name-Switcher, Speicherstatus-Pill, Presence-Pill,
`StatusBar` (Stage-Pill + Veröffentlichen/Login-Button), Auth-User-Pill mit
Logout, Tabelle/Schuljahr-Toggle, Konflikt-Badge, Hilfe-Icon,
Einstellungen-Icon, `ExportDropdown`. Alle im selben visuellen Gewicht (weiße
Pills auf dunklem Grund) — schwer scanbar, keine Priorisierung.

`EditorToolbar.tsx` (Reihe 2, weiß) hat zusätzlich ein rohes Emoji (📝) als
Icon bei „Notizen" — Verstoß gegen die No-Emoji-Icon-Konvention, die der Rest
der App (Lucide-Icons) durchgängig einhält.

## Entscheidungen (mit Nutzer abgestimmt)

- **Kernproblem:** zu viele Elemente in einer Zeile (nicht primär Gruppierung
  oder visueller Stil — die folgen daraus, aber die Elementzahl ist der Hebel).
- **Must-stay-visible (Reihe 1, nie hinter Overflow):** Plan-Name +
  Speicherstatus, Sync/Veröffentlichen-Status, IServ-Anmeldung (Auth-User).
- **Struktur:** Ansatz „Overflow-Menü" — Reihe 1 auf 4 Kernzonen reduzieren,
  alles andere in ein `⋯`-Dropdown oder auf Reihe 2 verschieben. Stärkste
  Deklutterung der drei diskutierten Ansätze (vs. Status-Popover oder reiner
  Konzern-Split ohne Overflow).

## Reihe 1 — EditorHeader.tsx (Ziel: 5 sichtbare Elemente, davon 1 bedingt)

Reihenfolge links → rechts:

1. `[Logo] Plan-Name ▼` (unverändert)
2. `✓ Gespeichert` — Speicherstatus **ohne eigene Pill**, nur Icon + Text,
   ruhiger als bisher. Presence-Info („Müller hat vor 5 Min gespeichert")
   wird **kein eigenes Element mehr**, sondern `title`-Tooltip auf diesem
   Element (Daten weiterhin aus `usePresence`).
3. `⚠ 1 Konflikt` — Konflikt-Badge, **nur gerendert wenn `conflicts.length > 0`**
   (Verhalten unverändert, bleibt Reihe 1 weil aktionsbedürftig).
4. `● Entwurf [Veröffentlichen]` / `Mit IServ anmelden` / `Nicht verbunden` —
   bestehende `StatusBar`-Komponente unverändert eingebunden (Logik dort schon
   gefixt, s. `PublishTab.tsx` `useEffect`-Fix vom selben Tag).
5. `Müller ✕` — Auth-User-Pill mit Logout (unverändert, Position bleibt rechts
   von Sync-Status).
6. `⋯` — neuer Overflow-Trigger (Lucide `MoreVertical`, ghost `Button`
   `size="icon"`, gleicher Stil wie bisherige Hilfe/Settings-Icons).

**Entfernt aus Reihe 1** (wandert wie unten beschrieben): Tabelle/Schuljahr-
Toggle → Reihe 2. Hilfe, Einstellungen, Export → `⋯`-Menü.

## Reihe 2 — EditorToolbar.tsx

- View-Toggle (`Tabelle`/`Schuljahr`) wandert von Reihe 1 hierher, **links vor**
  den Quartal-Tabs (beides „wo bin ich"-Navigation — gehört fachlich zusammen).
  Bei `viewMode === 'year'` ersetzt weiterhin der „Jahresübersicht"-Text die
  Quartal-Tabs (Verhalten unverändert, nur Toggle jetzt räumlich daneben statt
  in Reihe 1).
- `📝 Notizen` → Lucide `StickyNote`-Icon statt Emoji. Sonst unverändert
  (Undo/Redo, Vorlagen, + Termin bleiben wie sie sind).

## `⋯`-Overflow-Menü

Shadcn `DropdownMenu` (bereits in `ExportDropdown.tsx` verwendet — **keine
neue Primitive**, kein verschachteltes Dropdown-in-Dropdown). Items, in
dieser Reihenfolge:

1. „ICS exportieren" (`buildIcs` + `downloadBlob`, Logik aus `ExportDropdown`
   übernommen)
2. „Excel exportieren" (`buildExcel`)
3. „JSON-Backup exportieren" (`storage.exportJson`)
4. Trenner
5. „Hilfe" (`openHelp` aus `useUiStore`)
6. „Einstellungen" (`openSettings()` aus `useUiStore`)

`ExportDropdown.tsx` wird in diesem Zuge **aufgelöst** — seine drei
Export-Handler ziehen direkt in den neuen `⋯`-Handler-Block in
`EditorHeader.tsx` (kein zweiter Dropdown-Trigger neben `⋯` nötig, sonst
wieder 2 Overflow-Punkte statt 1).

## Visuelles

- Icons: durchgängig Lucide, gleicher Stroke wie bestehende `HelpCircle`/
  `SettingsIcon` (`w-4 h-4`), keine Mischung mit Emoji.
- Farben/Spacing: bestehende Tokens weiterverwenden
  (`--radius-pill`, `--color-paper-card`, `--dur-state`), keine neuen Werte.
- Konflikt-Badge-Styling (Rot bei `hasError`, Gelb sonst) unverändert.

## Datenfluss

Rein präsentational — keine neuen Stores, keine Schema-Änderung. Alle
verschobenen Elemente nutzen exakt dieselben bestehenden Hooks/Store-Selektoren
(`usePlannerStore`, `useUiStore`, `useAuthStore`, `useWpSyncStore`,
`useConflicts`, `usePresence`), nur an neuer Stelle im JSX gerendert.

## Tests

- `EditorHeader.test.tsx` (falls vorhanden, sonst neu anlegen): Reihe 1 zeigt
  4–5 Elemente, Konflikt-Badge nur bei `conflicts.length > 0`, `⋯`-Menü öffnet
  und enthält Export/Hilfe/Einstellungen.
- `EditorToolbar.test.tsx`: View-Toggle jetzt Teil der Toolbar, `StickyNote`-Icon
  statt Emoji-Text bei „Notizen".
- Bestehende `ExportDropdown`-Tests (falls vorhanden) auf neuen `⋯`-Handler-Block
  ummünzen oder entfernen, falls `ExportDropdown.tsx` komplett gelöscht wird.

## YAGNI / bewusst NICHT im Scope

- Kein Status-Popover (Ansatz B verworfen — zu wenig Deklutterung für den
  Aufwand).
- Presence bleibt Tooltip, wird **nicht** zusätzlich ins `⋯`-Menü verschoben
  (sonst Redundanz zweier Anzeigeorte für dieselbe Info).
- Keine Änderung an der `StatusBar`/`PublishTab`-Sync-Logik selbst — die ist
  bereits separat gefixt (Bug: `link` wurde nie automatisch angelegt).
- Kein Responsive-Sonderfall für sehr schmale Viewports in diesem Durchgang
  (bestehendes `hidden sm:inline`/`hidden md:inline` Verhalten bleibt wie es
  ist, wird nur auf neue Anordnung übertragen).
