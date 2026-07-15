# Kategorien- & Gruppen-Synchronisation Planner → Plugin + Kiosk-Filter

**Datum:** 2026-07-15
**Release-Ziel:** Plugin `curriculr-terminplan` 4.33.0, SPA `curriculr-planner` 1.15.0
**Status:** Design vom Nutzer genehmigt (2026-07-15)

## Problem

1. Kategorien existieren doppelt: im Planner (Quelle, mit Farben) und im Plugin
   (globale Option `gsh_tp_categories` mit eigenen Farben + IServ-Stichwörtern).
   Sync nur über manuellen Admin-Button (seit 4.27.0) — läuft auseinander.
2. Gruppen existieren anzeigeseitig im Plugin gar nicht. Sie stecken nur als
   Text `Gruppen: …` in der ICS-DESCRIPTION und als separate Gruppen-Kalender
   (Feed-URLs). Kolleg:innen, die nur die Kiosk-Seite in IServ nutzen, können
   nicht nach Gruppen filtern („Eltern fehlt").
3. Neues Schuljahr per Auto-Provision (4.31.0) erhält nur den Haupt-Kalender —
   keine Gruppen-Kalender.
4. Es fehlt eine Anleitung, wie Kolleg:innen die Kalender-Feeds auf
   Handy/IServ abonnieren.

## Entscheidungen (mit Nutzer abgestimmt)

| Frage | Entscheidung |
|---|---|
| Kategorien-Sync-Semantik | **Automatisch bei jedem Push**, global. Match per `id`, Fallback `slug`: Label + Farbe vom Planner überschreiben, neue Kategorien anlegen. WP-Stichwörter (`keywords`) und WP-eigene Kategorien bleiben erhalten. Es wird **nie gelöscht**. |
| Gruppen-Chip-Liste im Kiosk | **Union der Gruppen aller Termine im Feed** (keine toten Chips, keine Extra-Option). |
| Gruppen-Transport in der ICS | **Eigenes X-Feld `X-GSH-GROUPS`** (komma-separiert, ICS-escaped) statt DESCRIPTION-Parsing. Kalender-Apps ignorieren X-Felder. |
| Auto-Provision Gruppen | **Ja:** neues Schuljahr wird mit allen `doc.availableGroups` provisioniert (max 7, bestehendes Limit). Bestehende Schuljahre werden nicht angefasst. |
| Anleitung | **Beides:** Markdown-Dokument im Repo + kompakte Checkliste in der SPA (PublishTab) und Hinweis im WP-Admin. |
| Feed-Gating nach Stufe | **Status quo:** Feed liefert token-geschützt auch Entwurf-Stände. |

## Architektur / Datenfluss

```
PUT /curriculr/v1/doc/{sj}  (SPA „Veröffentlichen")
        │
        ▼
gsh_tp_curriculr_after_put()
        ├─ NEU gsh_tp_curriculr_sync_categories( $doc )
        │     doc.categories → gsh_tp_categories (Merge, s. o.)
        ├─ gsh_tp_curriculr_build_ics(): pro Event NEU
        │     X-GSH-GROUPS:<escaped, komma-separiert>   (nur wenn groups nicht leer)
        └─ Auto-Provision (nur wenn Schuljahr fehlt):
              gsh_tp_curriculr_provision_schoolyear( sj, label, doc.availableGroups )
```

Anzeige (Shortcode `[gsh_terminplan]`, genutzt von öffentlicher Seite,
Kiosk-Seite und Entwurf-Kiosk — eine Änderung wirkt überall):

```
gsh_tp_fetch_ical() → gsh_tp_parse_events()   [geschützt, unangetastet]
        → gsh_tp_augment_event_times()         [bestehend]
        → NEU gsh_tp_augment_event_groups()    [liest X-GSH-GROUPS aus Roh-ICS]
        → Rendering: data-groups="…" pro Termin-Element
        → NEU Gruppen-Filter-Chips neben Kategorie-Filter
```

## Komponenten

### Plugin (`curriculr-terminplan/plugin/`)

1. **`curriculr-data-layer.php`**
   - `gsh_tp_curriculr_build_event()`: `X-GSH-GROUPS:` emittieren, Werte über
     `gsh_tp_curriculr_ics_escape()`.
   - `gsh_tp_curriculr_after_put()`: Aufruf `gsh_tp_curriculr_sync_categories()`;
     Auto-Provision-Zweig übergibt `availableGroups` statt `array()`.
   - NEU `gsh_tp_curriculr_sync_categories( $doc )`: pure-ish Merge-Funktion
     (testbar mit Stubs), nutzt `gsh_tp_get_categories()` /
     `gsh_tp_save_categories()`; Farb-Validierung `#rrggbb`, ungültige
     Einträge überspringen; ohne `doc['categories']` No-op.
2. **`gsh-terminplan.php`**
   - NEU `gsh_tp_augment_event_groups( $events, $data )`: analog
     `gsh_tp_augment_event_times` — Roh-ICS nach UID→X-GSH-GROUPS scannen,
     `$event['groups'] = string[]` setzen. Parser bleibt unangetastet.
   - Shortcode-Pfad: Augment-Aufruf ergänzen; Termin-Markup bekommt
     `data-groups` (escaped).
   - Filter-Bar: Gruppen-Chips (Union aus Events), gleiches Toggle- und
     localStorage-Muster wie Kategorie-Filter, UND-Verknüpfung mit
     Suche + Kategorien. Keine Gruppen → Chip-Zeile wird nicht gerendert.
   - Schuljahr-Karte (Admin): Hinweiszeile „Gruppen im Plan ohne Kalender: …"
     (Vergleich `doc.availableGroups` ↔ `calendars[].group`), plus Kurzhinweis
     auf die Abo-Anleitung.
   - JS/CSS: additive Erweiterung; CSS ausschließlich in
     `assets/css/gsh-terminplan.css` (Repo-Regel), Struktur von
     `gsh_tp_js()` / `gsh_tp_css()` unverändert.
   - Version 4.33.0 an allen 4 Stellen + Changelog.
3. **Tests (`tests/curriculr/`)**
   - build_ics: X-GSH-GROUPS gesetzt/escaped/weggelassen.
   - augment_event_groups: Zuordnung per UID, fehlendes X-Feld → leer.
   - sync_categories: Update per id, Fallback slug, Neuanlage, Keywords
     bleiben, ungültige Farbe übersprungen, nie löschen.
   - Auto-Provision: Gruppen-Kalender aus availableGroups, Limit 7.

### SPA (`curriculr-planner/`)

4. **`src/components/settings/PublishTab.tsx`**
   - Warnbox: `doc.availableGroups`, die in `provisionedCalendars` fehlen →
     „Ohne Kalender: … — Häkchen setzen und ‚Kalender einrichten' klicken."
   - IServ-Abo-Checkliste (3 Schritte) unter den Feed-URLs + Link auf die
     Anleitung.
   - Berechnung als pure Funktion in `src/lib/` mit Vitest-Test.
5. **`docs/kalender-abo-anleitung.md`** (neu)
   - Abo-Schritte: IServ (Kalender → Abonnement), iPhone (Kalenderabo),
     Android (Google Kalender „Über URL").
   - Datenschutz-Absatz: Feed-URL = Zugangsschlüssel (nur dienstlich
     weitergeben, nicht öffentlich posten); Termine enthalten keine
     personenbezogenen Daten — keine solchen in Titel/Notizen einpflegen.
6. Version 1.15.0.

## Fehlerfälle

- Doc ohne `categories`/`availableGroups` → No-ops.
- Ungültige Farbe → Kategorie-Eintrag übersprungen, Rest läuft.
- Alte ICS-Caches ohne X-GSH-GROUPS → leere Gruppen, Filterzeile erscheint
  nicht (regeneriert beim nächsten Push).
- `gsh_tp_save_categories()`-Fehler → fail-silent, Push schlägt NICHT fehl
  (Kategorien-Sync ist Nebenwirkung, nie Push-Blocker).

## Datenschutz & Sicherheit

- Keine neuen personenbezogenen Daten. X-GSH-GROUPS enthält organisatorische
  Gruppennamen. Feed-Token-Regime unverändert.
- Alle ausgegebenen Werte (Chips, data-Attribute) escaped (XSS).
- Kategorien-Merge validiert Farben/Strings serverseitig (kein ungefiltertes
  JSON in Optionen).

## Teststrategie

- Plugin: dependency-freie CLI-Tests wie bestehend (`php tests/curriculr/…`),
  `php -l` auf allen PHP-Dateien, ZIP-Build 4.33.0.
- SPA: Vitest für neue lib-Funktion + bestehende Suite grün, typecheck, lint,
  Prod-Build.
- Manuelle Verifikation: Push aus Planner → WP-Admin Kategorien-Farben =
  Planner-Farben; Kiosk zeigt Gruppen-Chips; Filter kombiniert korrekt.
