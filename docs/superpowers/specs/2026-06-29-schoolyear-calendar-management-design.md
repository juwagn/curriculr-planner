# Schuljahr-zentrierte Kalenderverwaltung — Design

**Datum:** 2026-06-29
**Status:** Entwurf (zur Review)
**Betrifft:** `curriculr-terminplan` (WP-Plugin) + `curriculr-planner` (SPA)
**Vorgänger:** [2026-06-03-curriculr-sync-architecture-design.md](2026-06-03-curriculr-sync-architecture-design.md)

## Problem

Die 4.23.0-Gruppen-Kalender-Funktion missbraucht das *Schuljahr-Anzeige-Profil* als
„Feed-Ziel". Das führt zu schlechter UX:

- Profil-Anlegen (`gsh_tp_handle_new_profile`) ist auf Schuljahr-Semantik verdrahtet:
  ID erzwungen `sj_<jahr>_<jahr+1>`, Label erzwungen `Schuljahr 2026/2027`, immer `is_draft`.
  Ein „Schulleitung"-Gruppen-Kalender erscheint dadurch als „Schuljahr 26/27 Entwurf".
- Workflow überspannt zwei Systeme: Profil in WP anlegen → Auto-ID ablesen → in SPA
  als „WP-Profil-ID" eintragen → Mapping senden → Plan speichern. Fehleranfällig.
- Stale `Curriculr-Sync`-Tab zeigt noch das alte 1:1-Mapping, konkurriert mit der
  neuen n:m-Zuordnung aus der SPA.
- Flache Profil-Liste droht bei mehreren Gruppen-Kalendern pro Schuljahr zu wuchern.

## Ziele

1. **Ein Haupt-Kalender mit ALLEN Terminen pro Schuljahr** — immer vorhanden, für das
   Kollegium + IServ. Nicht entfernbar.
2. Optionale Gruppen-Kalender (Presets: Schulleitung, Orga, Eltern) per Auswahl.
3. **SPA steuert, WP provisioniert automatisch** — kein manuelles Profil-Anlegen,
   kein ID-Kopieren.
4. In WP **unter einem Schuljahr zusammengefasst** (echte Verschachtelung), damit die
   Profil-Liste nicht wuchert.
5. **Abwärtskompatibilität zwingend**: aktuelles Schuljahr + alle bestehenden
   Terminpläne (alte flache Profile, alte `profile_map`) funktionieren unverändert weiter.

## Nicht-Ziele

- Keine Änderung am ICS-Renderer (`gsh_tp_curriculr_build_ics`) oder am Shortcode-Markup.
- Keine Änderung am Auth-/Guard-Flow.
- Kein Umbau der Kategorien-, Kiosk- oder Feedback-Tabs.

## Architekturentscheidung

**Echte Verschachtelung** (Schuljahre enthalten Kalender) als Source-of-Truth,
**plus flache Projektion** für Rückwärtskompatibilität. Damit bleiben ~40 Lese-Consumer
(Shortcode, Sync, Cache-Keys, Frontend-Schuljahr-Switcher) unangetastet; nur Schreibpfade,
Admin-UI und SPA werden nested-nativ.

Begründung: reine flache Felder (`sj_key`/`group`) wären risikoärmer, aber der Nutzer hat
explizit das saubere verschachtelte Modell gewählt. Die Projektion deckelt das Risiko.

## Datenmodell

### Neue Source-of-Truth: Option `gsh_tp_schoolyears`

```php
[
  [
    'key'        => 'sj_2026_27',          // stabiler Schuljahr-Schlüssel, == SPA schoolyearKey
    'label'      => '2026/27',
    'is_active'  => true,                   // welches Schuljahr der öffentliche Shortcode zeigt
    'created'    => '2026-06-29',
    'shared'     => [                       // Anzeige-Settings, gelten für alle Kalender des Jahres
      'quartal_grenzen' => '…',
      'schuljahr_start' => '2026-08-…',
      'cache_duration'  => 3600,
    ],
    'calendars'  => [
      [ 'group' => null,            'label' => 'Haupt-Kalender (alle Termine)',
        'ical_url' => '…', 'is_draft' => false, 'managed' => true,  'orphaned' => false ],
      [ 'group' => 'Schulleitung',  'label' => 'Schulleitung',
        'ical_url' => '…', 'is_draft' => false, 'managed' => true,  'orphaned' => false ],
    ],
  ],
]
```

**Feld-Semantik:**
- `managed` = vom Curriculr-Auto-Provisioning erzeugt (vs. manuell in WP angelegt).
- `orphaned` = von der SPA-Liste entfernt, aber NICHT gelöscht (siehe Pruning).
- Haupt-Kalender hat immer `group => null`, ist nicht löschbar, immer vorhanden.

### Stabile Profil-ID je Kalender (für Cache-Keys)

- Haupt (`group === null`): `id = key` → z.B. `sj_2026_27`
- Gruppe: `id = key . '__' . sanitize_key( group )` → z.B. `sj_2026_27__schulleitung`

Damit bleiben `gsh_tp_ck( 'gsh_tp_ical_', $id )` & Co. gültig. Der Haupt-Kalender behält
die ID des alten flachen Profils → gecachte ICS überlebt die Migration.

### Flache Projektion: `gsh_tp_get_profiles()` neu

Liest `gsh_tp_schoolyears`, flacht jeden Kalender in die alte Profil-Form ab:

```php
[ 'id'=>…, 'label'=>…, 'ical_url'=>…, 'cache_duration'=>…(aus shared),
  'quartal_grenzen'=>…(aus shared), 'schuljahr_start'=>…(aus shared),
  'is_active'=> ($schuljahr.is_active && group===null),   // nur Haupt-Kal des aktiven Jahres
  'is_draft'=>…, 'sj_key'=>key, 'group'=>group, 'managed'=>…, 'orphaned'=>… ]
```

`is_active` ist nur für den **Haupt-Kalender des aktiven Schuljahres** true → der öffentliche
Shortcode (`gsh_tp_active_profile_id()`) zeigt weiterhin „alle Termine", Verhalten unverändert.

**Fallback:** Ist `gsh_tp_schoolyears` leer (Pre-Migration-Zustand), liest die Projektion das
alte `gsh_tp_profiles` direkt → nahtlose Übergangsphase.

## REST: Auto-Provisioning

### `POST /curriculr/v1/profile-map` — neue Form

```json
{ "sj": "sj_2026_27", "label": "2026/27", "groups": ["Schulleitung", "Eltern"] }
```

Handler `gsh_tp_curriculr_rest_profile_map_put`:
1. Schuljahr `sj` finden/anlegen (Label aus SPA, sonst `sj` als Label).
2. Haupt-Kalender (`group === null`) sicherstellen — immer.
3. Pro angefragter Gruppe einen Kalender sicherstellen (Label = Gruppenname).
4. Verwaltete Kalender, deren Gruppe NICHT mehr in `groups` ist → `orphaned => true`
   markieren (**nie löschen**, Pruning-Entscheidung).
5. Gefilterte ICS + Feed-URL je Kalender schreiben (bestehende `after_put`-Logik wiederverwenden).
6. Rückgabe: `{ updated: true, calendars: [ { group, label, feedUrl } ] }`.

**Limits:** max. 8 Kalender pro Schuljahr (Haupt + 7 Gruppen). Über-Limit → 400.

**Abwärtskompat:** alte Body-Form `{ sj, mappings:[{profileId, group}] }` wird weiter
akzeptiert und intern normalisiert (jedes Mapping → Gruppe unter `sj`).

**Non-Disruption:** Auto-Provisioning legt ausschließlich unter dem gesendeten `sj` an.
Andere (Live-)Schuljahre werden nie angefasst. Guard validiert weiterhin Token + Gruppen.

## SPA: `WordpressTab.tsx`

Ersetzt das freie „WP-Profil-ID"-Feld und die manuellen `calMapping`-Zeilen:

- **Schuljahr-Schlüssel** — auto-vorgeschlagen aus `doc.schoolyear` (z.B. `sj_2026_27`), editierbar.
- **Schuljahr-Label** — Freitext.
- **Haupt-Kalender (alle Termine)** — fix angezeigt, an, nicht abwählbar.
- **Gruppen-Kalender-Checkliste** — Presets (`Schulleitung`, `Orga`, `Eltern`) ∩ `doc.availableGroups`,
  plus „weitere Gruppe" aus `availableGroups` wählbar. Nur Gruppen, mit denen Termine getaggt
  werden können.
- **„Senden"** → POST neue Form. Danach: Liste der erzeugten Kalender mit Feed-URL + Kopier-Button
  (für IServ-Abo).

Typänderung in `wp-sync.ts` (`postProfileMap`) + `wp-sync-config.ts` (`CalendarMapping` →
schuljahr-zentriert). „Orga" zu `SUGGESTED_GROUPS` in `GroupsTab.tsx` ergänzen.

## WP-Admin: Schuljahr-Profil-Tab

Gruppiert nach Schuljahr. Pro Schuljahr-Karte:
- Label (editierbar), Aktiv-Schalter (genau ein aktives Schuljahr).
- Shared-Settings (Quartalsgrenzen, Schulwochenstart, Cache) auf Schuljahr-Ebene.
- Eingerückte Kalenderliste: Haupt + Gruppen. Je Zeile: Name, Feed-URL (Kopieren),
  Entwurf/Beschlossen, Badge „von Curriculr verwaltet", Badge „verwaist" falls `orphaned`.
- Löschen nur für Gruppen-Kalender (Haupt nie). Verwaiste explizit löschbar.
- „+ Neues Schuljahr" mit **freiem** Label + Key (kein Auto-Zwang mehr).

Der stale `Curriculr-Sync`-Tab (1:1 `sj_key → profile_id`) entfällt; seine Restfunktion
(Origin-Whitelist) wandert in `System & Logs`.

## Migration

DB-Version-Guard (`gsh_tp_curriculr_db_version` o.ä.). Beim Upgrade auf die neue Version:

1. Falls `gsh_tp_schoolyears` leer und `gsh_tp_profiles` vorhanden:
   - Jedes flache Profil → ein Schuljahr mit `key = id`, `label = label`, `is_active` erhalten,
     `shared` aus dessen `quartal_grenzen`/`schuljahr_start`/`cache_duration`,
     ein Haupt-Kalender (`group => null`) mit dessen `ical_url`/`is_draft`, `managed => false`.
2. **`gsh_tp_curriculr_profile_map` NICHT zwangsmigrieren.** Grund: die alte Map mischt zwei
   verschiedene Schlüssel (SPA-`sj` vs. ziel-WP-`profileId`); automatisches Falten würde
   fehlzuordnen. Stattdessen bleibt die alte Map gültig und wird über den Kompat-Pfad
   (`after_put` akzeptiert weiter die alte Map) bedient, **bis** die SPA das nächste Mal mit
   der neuen Form „Senden" auslöst — dann provisioniert das Schuljahr `sj` sich sauber neu.
   So gibt es keinen fragilen Migrations-Rateschritt; das aktuelle Schuljahr läuft ungestört.
3. `gsh_tp_profiles` als Read-Fallback belassen (nicht löschen), bis Migration verifiziert.

**Garantie:** Haupt-Kalender behält die alte Profil-ID → gecachte ICS (`gsh_tp_ical_<id>`),
Sync-Zeitstempel und Shortcode-Anzeige des aktuellen Schuljahres bleiben unverändert gültig.
Bestehende IServ-Feed-Abos (alte Map) brechen nicht, bis bewusst neu gesendet wird.

## Versionierung

- `GSH_TP_VERSION` an allen 4 Stellen bumpen (Minor, z.B. 4.24.0) + Changelog-Eintrag.
- `gsh_tp_curriculr_db_version` für Migrations-Guard.
- SPA `package.json` bumpen (REST-Shape geändert).

## Betroffene Dateien (Übersicht)

**WP-Plugin (`curriculr-terminplan/plugin/`):**
- `gsh-terminplan.php` — `gsh_tp_get_profiles()` (Projektion), neue nested Helper
  (`gsh_tp_get_schoolyears`, `…_save_schoolyears`, `…_calendar_id`), Profil-Tab-Render +
  POST-Handler (create/rename/activate/delete nested), Migration, Version-Bumps.
- `curriculr-data-layer.php` — `gsh_tp_curriculr_rest_profile_map_put` (Auto-Provisioning),
  `after_put` nested-nativ, Feed-URL-Helper unverändert.

**SPA (`curriculr-planner/src/`):**
- `components/settings/WordpressTab.tsx` — neue Kalender-Auswahl-UI.
- `lib/wp-sync.ts`, `lib/wp-sync-config.ts` — `postProfileMap`-Shape + Typen.
- `components/settings/GroupsTab.tsx` — „Orga" in Presets.

## Testing

- WP: Migration-Test (flach → nested, ID-Erhalt, Cache-Erhalt). Auto-Provisioning-Test
  (create, idempotent re-send, orphan-on-remove, Limit-400). Projektion-Test (is_active nur Haupt).
- SPA: `wp-sync.test.ts` neue Body-Form; `WordpressTab` Auswahl/Render.
- Bestehende Tests in `tests/curriculr/` müssen grün bleiben (Abwärtskompat-Beleg).

## Offene Punkte

Keine — Prune = verwaist (markieren, nie auto-löschen), Abwärtskompat bestätigt.
