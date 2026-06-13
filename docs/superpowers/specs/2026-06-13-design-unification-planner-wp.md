# Design-Spec: Curriculr Design-Vereinheitlichung Planner ↔ WordPress

**Datum:** 2026-06-13
**Status:** Approved (Brainstorming abgeschlossen)
**Scope:** Beide Repos — `curriculr-planner` (SPA) und `curriculr-terminplan` (WP-Plugin)

## Problem

Vier zusammenhängende Befunde aus dem Design-Review:

1. **Settings-Modal springt.** [`SettingsModal.tsx`](../../../src/components/settings/SettingsModal.tsx) hat feste Breite, aber keinen Höhen-Floor. Tab-Inhalt schwankt von ~10 (ExportTab) bis ~198 Zeilen (TemplatesTab); die Modal-Box wächst/schrumpft und re-zentriert bei jedem Tab-Wechsel.
2. **Planner-interne Token-/Typo-Drift.** `globals.css` führt parallele `marine-*` und Legacy-`primary-*` (identische Hex) → zwei Namen pro Farbe. Body durchgängig 13px ohne hierarchischen Kontrast. Schatten-Skala unterausgenutzt.
3. **WP-Admin-Settings schlecht organisiert.** `gsh_tp_settings_page()` vermischt Per-Schuljahr-Tabs (Config dupliziert, bis 5 Profile) mit Funktions-Tabs (Kategorien, „Kiosk & System", Logs). Eine 600+-Zeilen-Funktion enthält alle POST-Handler. Zwei Persistenz-Pfade (Settings-API vs. manuelle POST-Handler).
4. **WP-Display divergiert vom Planner.** Beide teilen die Brand (Marine/Gelb/Inter), aber `design-tokens.css` nutzt Glas-Optik (`rgba(255,255,255,.85)` + `blur(16px)`), Pillen-Buttons (`9999px`) und schwere Card-Schatten (`0 18px 40px`) — der Planner ist flach/Papier.

## Entscheidungen (aus Brainstorming)

- **Token-Sync:** manuell gespiegelt. WP `design-tokens.css` wird an die Planner-Werte angeglichen; beide Dateien tragen denselben Token-Block mit beiden Namensschemata (`marine-*` kanonisch + `primary-*` Alias). Kein Build-Schritt (WP hat kein Build-System). Cross-Repo-Sync per CLAUDE.md-Regel.
- **Scope:** alles gebündelt in eine Design-Spec; Planner-interne Politur inklusive.
- **Reihenfolge:** Planner zuerst. Drei Phasen, je eigener Spec→Plan→Umsetzung-Zyklus, aber diese eine Spec deckt alle ab.
- **WP-Display-Ästhetik:** Stil B — volle Vereinheitlichung auf den flachen Planner-Papier-Look.
- **WP-Admin-IA:** Option A — Schuljahr-Profil als Dropdown, Tabs nur funktional.

## Kanonisches Token-System

Planner `globals.css` ist die Quelle der Wahrheit. Werte (unverändert, dokumentiert zur Referenz):

| Gruppe | Tokens |
|--------|--------|
| Marine | 900 `#001F35`, 800 `#00345C`, 700 `#00467D`, 500 `#0058A0`, 100 `#E6F4FF` |
| Gelb | 500 `#FFC857`, 200 `#FFE9A8`, 100 `#FFF8E1` |
| Papier | bg `#F3F5F9`, card `#FFFFFF` (solid) |
| Tinte | 900 `#111827`, 500 `#4B5563`, 200 `#E2E8F0` |
| Status | green `#0E9F6E`, red `#E02424` |
| Kategorien | konferenz `#0058A0`, elternabend `#0E9F6E`, prüfung `#E02424`, sonder `#7C3AED`, schliesstag `#6B7280` |
| Radius | block `3px`, input `8px`, default `10px`, card `14px`, pill `9999px`, btn = `10px` |
| Schatten | card `0 1px 2px /.05`, modal `0 18px 40px /.15`, btn `0 2px 8px rgba(0,70,125,.25)`, focus |
| Typo-Scale | display 20/700, headline 15/600, title 13/600, body 13/400 |

WP `design-tokens.css` Änderungen gegenüber heute:
- `bg-surface: rgba(255,255,255,.85)` → `#FFFFFF` (Glas raus)
- `glass-blur: blur(16px)` → Nutzung entfernt/flach (alle Verwendungen in der Display-CSS auflösen)
- `radius-btn: 9999px` → `10px`; Event-Badges nutzen neu `radius-block: 3px`
- `shadow-card: 0 18px 40px` → `0 1px 2px /.05`; schwerer Schatten nur für Modals/Popups (eigenes Token)
- Beide Namensschemata aufnehmen (`marine-*` + `primary-*`-Alias), damit die 979-Zeilen-Display-CSS (nutzt `--primary-*`) ohne Massen-Rewrite weiterläuft; neue Regeln nutzen `marine-*`.
- Kopf-Kommentar: „Spiegel von curriculr-planner/src/styles/globals.css — bei Änderung dort mit-aktualisieren."

## Phase 1 — Planner SPA (isoliert, risikoarm)

**Komponenten:**
- `SettingsModal.tsx`: `DialogContent` bekommt feste Höhe `h-[min(680px,90vh)]` zusätzlich zu `max-h-[90vh]`. Content-Bereich (`flex-1 overflow-y-auto`) scrollt intern; die Box-Dimension bleibt über alle Tabs konstant.
- Token-Dedup: alle Komponenten-Nutzungen von `primary-*`/`accent-*`/`bg-*`/`text-*`-Legacy-Aliasen auf `marine-*`/kanonische Tokens migrieren. Danach den Legacy-Alias-Block in `globals.css` entfernen.
- Typo-Hierarchie: Überschriften (Modal-Titel, Tab-Sektionen, Editor-Header) auf den DESIGN.md-Scale (display/headline/title) heben statt flach 13px.
- Schatten-Skala: `--shadow-card`/`--shadow-modal`/`--shadow-btn` semantisch konsistent anwenden.

**Tests:** `SettingsModal`-Verhalten (Höhe stabil) per bestehendem Test-Setup; Typecheck + Lint (max-warnings 0) müssen grün bleiben. Token-Migration ist rein CSS-Variablen-Umbenennung — visuelle Diff-Prüfung.

**Versionierung:** `package.json` minor bump.

## Phase 2 — WP-Display-Transfer (Stil B)

**Datei:** `gsh-terminplan.css` (979 Zeilen). Nur Skin, **kein** Markup/Inhalt.
- Flächen solide statt Glas (`.gtp-*`-Card/Surface-Regeln).
- Quartal-Tabs: Underline-Stil mit Gelb-Akzent (statt Pillen-Hintergrund) — `.gtp-tab[aria-selected]` → `border-bottom-color: var(--accent-warning)` + Marine-Text.
- Event-Badges: `radius-block 3px` (eckig wie Planner-Event-Blöcke) statt `9999px`.
- Schatten dezent (`shadow-card` neu); Buttons `radius 10px`.

**Constraint:** CLAUDE.md des WP-Repos verbietet Eingriffe in Tabellen-Rendering, PDF-Export, `gsh_tp_js()`-Struktur. Diese Phase berührt ausschließlich CSS.

**Versionierung:** `GSH_TP_VERSION` an 4 Stellen + Changelog-Eintrag + neue `curriculr-terminplan-{version}.zip`.

## Phase 3 — WP-Admin-IA (Option A)

**Funktion:** `gsh_tp_settings_page()` + `$tabs`-Definition ([Zeile 2826](../../../../curriculr-terminplan/plugin/gsh-terminplan.php)).
- Schuljahr-Profil-Wahl wird ein **Dropdown** (aktives Profil) oben, nicht mehr ein Tab pro Profil. „+ neues Profil" als Aktion daneben.
- Tabs nur funktional: `Kalender-Quelle` / `Quartale` / `Kategorien` / `Curriculr-Sync` / `Kiosk` / `System & Logs` (Sync-Verlauf + Feedback-Log unter „System & Logs" zusammengefasst).
- Per-Schuljahr-Felder (iCal-URL, Cache, Quartal-Grenzen) klar getrennt von globalen (Kategorien, Sync, Kiosk).
- POST-Handler aus dem Funktionskopf in benannte Handler-Funktionen extrahieren (z.B. `gsh_tp_handle_save_profile()`), per Action-Key dispatcht. Reduziert die 600-Zeilen-Funktion.

**Constraint:** Persistenz-Verhalten (Settings-API-Optionen vs. Profil-Storage) bleibt funktional identisch — nur Organisation/Markup ändert sich. Keine DB-Schema-Änderung.

**Versionierung:** `GSH_TP_VERSION` bump + Changelog + ZIP.

## Cross-Repo-Sync-Regel

Ergänzung in beide CLAUDE.md: Token-Block in `globals.css` (SPA) und `design-tokens.css` (WP) sind Spiegel. Änderung an Brand-Tokens → beide aktualisieren.

## Nicht im Scope (YAGNI)

- Kein generierter Token-Build (bewusst gegen „eine Quelle, generiert" entschieden).
- Keine Sidebar-Nav im wp-admin (Option B verworfen).
- Keine Änderung an Editor-Views, Wizard, Sync-Logik, REST-API, DB-Schema.
