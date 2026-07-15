# Kategorien- & Gruppen-Sync + Kiosk-Filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Planner-Kategorien (Label+Farbe) und Termin-Gruppen fließen automatisch beim Push ins WP-Plugin; Kiosk-Seiten erhalten einen Gruppen-Filter; neue Schuljahre werden mit Gruppen-Kalendern provisioniert; Abo-Anleitung für Kolleg:innen.

**Architecture:** Server-seitiger Sync im `after_put`-Hook (Kategorien-Merge in `gsh_tp_categories`, `X-GSH-GROUPS` im generierten ICS, Auto-Provision mit `availableGroups`). Anzeige-seitig neuer Augment-Schritt nach dem geschützten Parser + additive Filter-Chips im bestehenden Filter-Bar-/JS-Muster.

**Tech Stack:** WordPress-Plugin (prozedurales PHP, dependency-freie CLI-Tests), React/TypeScript SPA (Vite, Vitest, Zustand).

**Spec:** `docs/superpowers/specs/2026-07-15-kategorien-gruppen-sync-design.md`

## Global Constraints

- Plugin-Repo: CSS ausschließlich in `plugin/assets/css/gsh-terminplan.css` — nie in PHP-Strings.
- Geschützte Bereiche (nur additiv erweitern, nie umbauen): `gsh_tp_parse_events`/`gsh_tp_parse_event`, Tabellen-Rendering, strukturelle Form von `gsh_tp_js()`/`gsh_tp_css()`.
- Plugin-Version 4.33.0 an 4 Stellen: Header-Kommentar `* Version:`, Header-Changelog-Block, `define('GSH_TP_VERSION', …)`, `gsh_tp_changelog()`-Array.
- Nach jeder PHP-Änderung: `php -l <datei>`.
- SPA: npm only; TypeScript strict, kein `any`; UI-Texte Deutsch; TDD für `src/lib/*`.
- SPA-Version → 1.15.0 in `package.json`.
- Commits: Plugin-Repo und SPA-Repo sind GETRENNTE Git-Repos (`curriculr-terminplan/`, `curriculr-planner/`).
- Kein Löschen von Kategorien beim Sync. Push darf nie an Sync-Nebenwirkungen scheitern.

---

### Task 1: `X-GSH-GROUPS` im generierten ICS (Plugin)

**Files:**
- Modify: `curriculr-terminplan/plugin/curriculr-data-layer.php` (Funktion `gsh_tp_curriculr_build_event`, nach dem `CATEGORIES`-Block ~Zeile 116-118)
- Create: `curriculr-terminplan/tests/curriculr/test-groups-ics.php`

**Interfaces:**
- Produces: ICS-Zeile `X-GSH-GROUPS:<v1>,<v2>` pro VEVENT — jeder Wert einzeln über `gsh_tp_curriculr_ics_escape()` escaped, Separator-Kommas bleiben un-escaped (Multi-Value-Semantik wie `CATEGORIES`). Kein Feld bei leeren/fehlenden `groups`. Task 4 parst genau dieses Format.

- [ ] **Step 1: Failing Test schreiben**

```php
<?php
define( 'GSH_TP_CURRICULR_TEST', true );
require __DIR__ . '/assert.php';
require __DIR__ . '/../../plugin/curriculr-data-layer.php';

$doc = array(
    'meta'       => array( 'name' => 'GruppenTest' ),
    'categories' => array(),
    'events'     => array(
        array( 'id' => 'g1', 'title' => 'Mit Gruppen', 'allDay' => true, 'start' => '2026-09-01', 'end' => '2026-09-01', 'groups' => array( 'Eltern', 'Sek I' ) ),
        array( 'id' => 'g2', 'title' => 'Ohne Gruppen', 'allDay' => true, 'start' => '2026-09-02', 'end' => '2026-09-02', 'groups' => array() ),
        array( 'id' => 'g3', 'title' => 'Escape', 'allDay' => true, 'start' => '2026-09-03', 'end' => '2026-09-03', 'groups' => array( 'A,B' ) ),
    ),
);

$ics = gsh_tp_curriculr_build_ics( $doc );

gsh_assert_contains( $ics, 'X-GSH-GROUPS:Eltern,Sek I', 'groups emitted comma-separated' );
gsh_assert_contains( $ics, 'X-GSH-GROUPS:A\\,B', 'comma inside group name escaped' );
// g2 (leer): kein X-GSH-GROUPS im g2-Block
preg_match( '/UID:g2@curriculr-planner.*?END:VEVENT/s', str_replace( "\r\n", "\n", $ics ), $m2 );
gsh_assert_true( isset( $m2[0] ) && strpos( $m2[0], 'X-GSH-GROUPS' ) === false, 'empty groups -> no X field' );

echo "ALL PASS\n";
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

Run: `cd curriculr-terminplan && php tests/curriculr/test-groups-ics.php`
Expected: FAIL bei „groups emitted comma-separated"

- [ ] **Step 3: Implementierung in `gsh_tp_curriculr_build_event()`** — direkt NACH dem `CATEGORIES`-if-Block, VOR `$lines[] = 'END:VEVENT';`:

```php
    if ( ! empty( $e['groups'] ) && is_array( $e['groups'] ) ) {
        $groups = array();
        foreach ( $e['groups'] as $g ) {
            $g = trim( (string) $g );
            if ( '' !== $g ) {
                $groups[] = gsh_tp_curriculr_ics_escape( $g );
            }
        }
        if ( $groups ) {
            // Multi-Value wie CATEGORIES: Werte einzeln escaped, Separator-Komma roh.
            $lines[] = 'X-GSH-GROUPS:' . implode( ',', $groups );
        }
    }
```

- [ ] **Step 4: Test grün + Syntax**

Run: `php -l plugin/curriculr-data-layer.php && php tests/curriculr/test-groups-ics.php`
Expected: `ALL PASS`

- [ ] **Step 5: Bestehende Tests grün**

Run: `for t in tests/curriculr/test-*.php; do php "$t" >/dev/null 2>&1 || echo "FAIL $t"; done`
Expected: keine Ausgabe

- [ ] **Step 6: Commit (im Plugin-Repo)**

```bash
cd curriculr-terminplan
git add plugin/curriculr-data-layer.php tests/curriculr/test-groups-ics.php
git commit -m "feat: emit X-GSH-GROUPS per event in generated ICS"
```

---

### Task 2: Kategorien-Sync beim Push (Plugin)

**Files:**
- Modify: `curriculr-terminplan/plugin/curriculr-data-layer.php` (neue Funktion + Aufruf am Anfang von `gsh_tp_curriculr_after_put`)
- Create: `curriculr-terminplan/tests/curriculr/test-category-sync.php`

**Interfaces:**
- Consumes: `gsh_tp_get_categories(): array` und `gsh_tp_save_categories(array): array|false` aus `gsh-terminplan.php` (Einträge: `{id, label, color, slug, keywords[]}`); im Test gestubbt.
- Produces: `gsh_tp_curriculr_sync_categories( $doc ): bool` — merged `doc['categories']` (`{id, label, color, slug, keywords}` aus dem Planner) in die globale Option. Match per `id`, Fallback `slug`; überschreibt nur `label`+`color`; legt Unbekannte neu an (`keywords: []`); löscht nie; ungültige Farbe (`#rrggbb`-Regex) → Eintrag übersprungen.

- [ ] **Step 1: Failing Test schreiben**

```php
<?php
define( 'GSH_TP_CURRICULR_TEST', true );
require __DIR__ . '/assert.php';

// Stubs: Kategorien-Speicher wie gsh-terminplan.php, minimal
$GLOBALS['wp_categories'] = array(
    array( 'id' => 'c1', 'label' => 'Alt-Label', 'color' => '#111111', 'slug' => 'ferien', 'keywords' => array( 'iserv-kw' ) ),
    array( 'id' => 'wp_only', 'label' => 'WP-Eigen', 'color' => '#222222', 'slug' => 'wp-eigen', 'keywords' => array() ),
);
function gsh_tp_get_categories() { return $GLOBALS['wp_categories']; }
function gsh_tp_save_categories( array $cats ) { $GLOBALS['wp_categories'] = $cats; return $cats; }
function sanitize_key( $k ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $k ) ); }
function sanitize_text_field( $s ) { return trim( strip_tags( (string) $s ) ); }

require __DIR__ . '/../../plugin/curriculr-data-layer.php';

$doc = array( 'categories' => array(
    array( 'id' => 'c1', 'label' => 'Ferien NEU', 'color' => '#ABCDEF', 'slug' => 'ferien', 'keywords' => array() ),
    array( 'id' => 'c9', 'label' => 'Neu vom Planner', 'color' => '#123456', 'slug' => 'neu', 'keywords' => array() ),
    array( 'id' => 'bad', 'label' => 'Kaputt', 'color' => 'rot', 'slug' => 'bad', 'keywords' => array() ),
) );

gsh_assert_true( gsh_tp_curriculr_sync_categories( $doc ), 'sync returns true' );

$cats = $GLOBALS['wp_categories'];
$by_id = array();
foreach ( $cats as $c ) { $by_id[ $c['id'] ] = $c; }

gsh_assert_eq( $by_id['c1']['label'], 'Ferien NEU', 'label updated from planner' );
gsh_assert_eq( $by_id['c1']['color'], '#ABCDEF', 'color updated from planner' );
gsh_assert_eq( $by_id['c1']['keywords'][0], 'iserv-kw', 'WP keywords preserved' );
gsh_assert_true( isset( $by_id['wp_only'] ), 'WP-only category never deleted' );
gsh_assert_true( isset( $by_id['c9'] ), 'new planner category created' );
gsh_assert_true( ! isset( $by_id['bad'] ), 'invalid color skipped' );
gsh_assert_true( gsh_tp_curriculr_sync_categories( array( 'meta' => array() ) ) === false, 'doc without categories -> no-op false' );

echo "ALL PASS\n";
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen** (`gsh_tp_curriculr_sync_categories not defined`)

Run: `php tests/curriculr/test-category-sync.php`

- [ ] **Step 3: Implementierung** — neue Funktion in `curriculr-data-layer.php` (Abschnitt vor `after_put`):

```php
/* ---------- Kategorien-Sync: Planner ist Quelle für Label + Farbe (Spec 2026-07-15) ---------- */
// Merge, nie löschen: Match per id (Fallback slug) -> Label/Farbe überschreiben,
// Unbekannte anlegen (keywords leer), WP-Stichwörter und WP-eigene Kategorien
// bleiben. Fail-silent: Rückgabewert wird vom PUT-Pfad ignoriert.

function gsh_tp_curriculr_sync_categories( $doc ) {
    if ( ! is_array( $doc ) || empty( $doc['categories'] ) || ! is_array( $doc['categories'] ) ) {
        return false;
    }
    if ( ! function_exists( 'gsh_tp_get_categories' ) || ! function_exists( 'gsh_tp_save_categories' ) ) {
        return false;
    }

    $existing = gsh_tp_get_categories();
    $by_id    = array();
    $by_slug  = array();
    foreach ( $existing as $i => $cat ) {
        $by_id[ (string) ( $cat['id'] ?? '' ) ] = $i;
        if ( ! empty( $cat['slug'] ) ) {
            $by_slug[ (string) $cat['slug'] ] = $i;
        }
    }

    $hex     = '/^#[0-9a-fA-F]{6}$/';
    $changed = false;

    foreach ( $doc['categories'] as $pc ) {
        if ( ! is_array( $pc ) ) {
            continue;
        }
        $id    = sanitize_key( $pc['id'] ?? '' );
        $label = sanitize_text_field( (string) ( $pc['label'] ?? '' ) );
        $color = (string) ( $pc['color'] ?? '' );
        $slug  = sanitize_key( $pc['slug'] ?? '' );
        if ( '' === $id || '' === $label || ! preg_match( $hex, $color ) ) {
            continue;
        }
        $idx = $by_id[ $id ] ?? ( '' !== $slug && isset( $by_slug[ $slug ] ) ? $by_slug[ $slug ] : null );
        if ( null !== $idx ) {
            if ( $existing[ $idx ]['label'] !== $label || $existing[ $idx ]['color'] !== $color ) {
                $existing[ $idx ]['label'] = $label;
                $existing[ $idx ]['color'] = $color;
                $changed                   = true;
            }
        } else {
            $existing[] = array(
                'id'       => $id,
                'label'    => $label,
                'color'    => $color,
                'slug'     => ( '' !== $slug ? $slug : $id ),
                'keywords' => array(),
            );
            $by_id[ $id ] = count( $existing ) - 1;
            $changed      = true;
        }
    }

    if ( ! $changed ) {
        return true;
    }
    return false !== gsh_tp_save_categories( $existing );
}
```

Aufruf am ANFANG von `gsh_tp_curriculr_after_put( $sj, $token )` (vor der Schoolyears-Schleife):

```php
    // Kategorien-Sync: Planner-Farben/-Labels gewinnen bei jedem Push.
    $row0 = gsh_tp_curriculr_repo_get( $sj );
    if ( $row0 ) {
        $doc0 = json_decode( $row0['json'], true );
        if ( is_array( $doc0 ) ) {
            gsh_tp_curriculr_sync_categories( $doc0 );
        }
    }
```

- [ ] **Step 4: Tests grün + Syntax**

Run: `php -l plugin/curriculr-data-layer.php && php tests/curriculr/test-category-sync.php && for t in tests/curriculr/test-*.php; do php "$t" >/dev/null 2>&1 || echo "FAIL $t"; done`
Expected: `ALL PASS`, keine FAIL-Zeilen. Hinweis: `test-integration-stubbed.php` definiert weder `gsh_tp_get_categories` noch `gsh_tp_save_categories` — der `function_exists`-Guard macht den Sync dort zum No-op. Falls dennoch FAIL: Guard prüfen.

- [ ] **Step 5: Commit**

```bash
git add plugin/curriculr-data-layer.php tests/curriculr/test-category-sync.php
git commit -m "feat: sync planner categories (label+color) into gsh_tp_categories on push"
```

---

### Task 3: Auto-Provision mit Planner-Gruppen (Plugin)

**Files:**
- Modify: `curriculr-terminplan/plugin/curriculr-data-layer.php` (Auto-Provision-Zweig in `gsh_tp_curriculr_after_put`, ~Zeile 1060-1075)
- Modify: `curriculr-terminplan/tests/curriculr/test-integration-stubbed.php` (Auto-Provision-Assertions erweitern)

**Interfaces:**
- Consumes: `gsh_tp_curriculr_provision_schoolyear( $sj, $label, $groups )` (bestehend, Limit 7 intern).
- Produces: Neues Schuljahr enthält Gruppen-Kalender für alle `doc['availableGroups']` (max 7).

- [ ] **Step 1: Test erweitern** — in `test-integration-stubbed.php` im Abschnitt „Auto-Provision": eigener Block NACH den bestehenden Auto-Provision-Assertions (vor dem `$GLOBALS['schoolyears'] = array();`-Reset, der den Legacy-Pfad-Test einleitet):

```php
// Auto-Provision inkl. Gruppen-Kalender aus availableGroups (Spec 2026-07-15)
$doc_grp = array(
    'meta'            => array( 'name' => 'Grp 27/28' ),
    'categories'      => array(),
    'availableGroups' => array( 'Eltern', 'Kollegium' ),
    'events'          => array(
        array( 'id' => 'ap1', 'title' => 'T', 'allDay' => true, 'start' => '2027-09-01', 'end' => '2027-09-01', 'groups' => array() ),
    ),
    'schoolyear'      => array( 'id' => 'x', 'label' => '2027/28', 'firstSchoolDay' => '2027-09-01', 'holidays' => array() ),
);
$GLOBALS['wpdb']->rows['sj_2027_28'] = array(
    'schoolyear' => 'sj_2027_28', 'json' => json_encode( $doc_grp ), 'version' => 1,
    'stage' => 'entwurf', 'feed_token' => 'grptoken', 'updated_at' => '2027-09-01 00:00:00',
);
gsh_tp_curriculr_after_put( 'sj_2027_28', 'grptoken' );
$grp_cals = array();
foreach ( gsh_tp_get_schoolyears() as $sy_check ) {
    if ( $sy_check['key'] === 'sj_2027_28' ) {
        foreach ( $sy_check['calendars'] as $c ) { $grp_cals[] = $c['group']; }
    }
}
gsh_assert_true( in_array( null, $grp_cals, true ), 'auto-provision: main calendar exists' );
gsh_assert_true( in_array( 'Eltern', $grp_cals, true ), 'auto-provision: Eltern group calendar created' );
gsh_assert_true( in_array( 'Kollegium', $grp_cals, true ), 'auto-provision: Kollegium group calendar created' );
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen** („Eltern group calendar created")

Run: `php tests/curriculr/test-integration-stubbed.php`

- [ ] **Step 3: Implementierung** — im Auto-Provision-Zweig von `after_put` die Zeile `gsh_tp_curriculr_provision_schoolyear( $sj, $label, array() );` ersetzen durch:

```php
        $groups = array();
        if ( is_array( $doc ) && ! empty( $doc['availableGroups'] ) && is_array( $doc['availableGroups'] ) ) {
            foreach ( $doc['availableGroups'] as $g ) {
                $g = trim( (string) $g );
                if ( '' !== $g ) {
                    $groups[] = $g;
                }
            }
            $groups = array_slice( array_values( array_unique( $groups ) ), 0, 7 );
        }
        gsh_tp_curriculr_provision_schoolyear( $sj, $label, $groups );
```

- [ ] **Step 4: Tests grün + Syntax**

Run: `php -l plugin/curriculr-data-layer.php && for t in tests/curriculr/test-*.php; do php "$t" >/dev/null 2>&1 || echo "FAIL $t"; done`

- [ ] **Step 5: Commit**

```bash
git add plugin/curriculr-data-layer.php tests/curriculr/test-integration-stubbed.php
git commit -m "feat: auto-provision new schoolyears with planner group calendars"
```

---

### Task 4: Augment-Schritt `gsh_tp_augment_event_groups` (Plugin)

**Files:**
- Modify: `curriculr-terminplan/plugin/gsh-terminplan.php` (neue Funktion DIREKT NACH `gsh_tp_augment_event_times`, ~Zeile 5921; Muster kopieren)
- Create: `curriculr-terminplan/tests/curriculr/test-augment-groups.php`

**Interfaces:**
- Consumes: Roh-ICS mit `X-GSH-GROUPS` aus Task 1; Event-Arrays des Parsers mit `uid`-Key.
- Produces: `gsh_tp_augment_event_groups( array $events, $data ): array` — setzt `$event['groups'] = string[]` (leer wenn kein X-Feld). Task 5 liest `$ev['groups']`.

- [ ] **Step 1: Failing Test schreiben** — `gsh-terminplan.php` ist mit Stubs ladbar (Muster: `tests/curriculr/test-schoolyears.php` Kopfzeilen 1-91 übernehmen — gleiche Stubs, gleiche `require`-Reihenfolge). Danach:

```php
$ics = "BEGIN:VCALENDAR\r\n"
     . "BEGIN:VEVENT\r\nUID:e1\r\nSUMMARY:A\r\nDTSTART;VALUE=DATE:20260901\r\nDTEND;VALUE=DATE:20260902\r\nX-GSH-GROUPS:Eltern,Sek I\r\nEND:VEVENT\r\n"
     . "BEGIN:VEVENT\r\nUID:e2\r\nSUMMARY:B\r\nDTSTART;VALUE=DATE:20260903\r\nDTEND;VALUE=DATE:20260904\r\nEND:VEVENT\r\n"
     . "BEGIN:VEVENT\r\nUID:e3\r\nSUMMARY:C\r\nDTSTART;VALUE=DATE:20260905\r\nDTEND;VALUE=DATE:20260906\r\nX-GSH-GROUPS:A\\,B\r\nEND:VEVENT\r\n"
     . "END:VCALENDAR\r\n";

$events = array(
    array( 'uid' => 'e1', 'summary' => 'A', 'allday' => true ),
    array( 'uid' => 'e2', 'summary' => 'B', 'allday' => true ),
    array( 'uid' => 'e3', 'summary' => 'C', 'allday' => true ),
);

$out = gsh_tp_augment_event_groups( $events, $ics );

gsh_assert_eq( implode( '|', $out[0]['groups'] ), 'Eltern|Sek I', 'groups parsed from X field' );
gsh_assert_true( $out[1]['groups'] === array(), 'no X field -> empty groups' );
gsh_assert_eq( $out[2]['groups'][0], 'A,B', 'escaped comma unescaped to single group' );

echo "ALL PASS\n";
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen** (Funktion fehlt)

- [ ] **Step 3: Implementierung** — nach `gsh_tp_augment_event_times` einfügen:

```php
/**
 * Reichert geparste Events um Gruppen aus X-GSH-GROUPS an (Roh-ICS-Scan
 * per UID, analog gsh_tp_augment_event_times — der Parser bleibt unberührt).
 * Multi-Value-Semantik wie CATEGORIES: Split an un-escaped Kommas, danach
 * ICS-Unescape je Wert.
 *
 * @since 4.33.0
 * @param  array  $events Geparste Events (mit 'uid').
 * @param  string $data   Rohe ICS-Daten.
 * @return array          Events mit 'groups' => string[].
 */
function gsh_tp_augment_event_groups( array $events, $data ) {
    foreach ( $events as &$ev ) {
        $ev['groups'] = array();
    }
    unset( $ev );
    if ( empty( $events ) || empty( $data ) ) {
        return $events;
    }

    preg_match_all( '/BEGIN:VEVENT(.*?)END:VEVENT/s', $data, $m );
    if ( empty( $m[1] ) ) {
        return $events;
    }

    $groups_by_uid = array();
    foreach ( $m[1] as $blk ) {
        $blk = str_replace( "\r\n", "\n", $blk );
        $blk = preg_replace( '/\n[ \t]/', '', $blk );
        if ( ! preg_match( '/^UID:(.*)$/m', $blk, $um ) ) {
            continue;
        }
        if ( ! preg_match( '/^X-GSH-GROUPS:(.*)$/m', $blk, $gm ) ) {
            continue;
        }
        $list = array();
        foreach ( preg_split( '/(?<!\\\\),/', trim( $gm[1] ) ) as $p ) {
            $p = str_replace( array( '\\,', '\\;', '\\n', '\\\\' ), array( ',', ';', "\n", '\\' ), $p );
            $p = trim( $p );
            if ( '' !== $p ) {
                $list[] = $p;
            }
        }
        $groups_by_uid[ trim( $um[1] ) ] = $list;
    }

    foreach ( $events as &$ev ) {
        if ( ! empty( $ev['uid'] ) && isset( $groups_by_uid[ $ev['uid'] ] ) ) {
            $ev['groups'] = $groups_by_uid[ $ev['uid'] ];
        }
    }
    unset( $ev );

    return $events;
}
```

- [ ] **Step 4: Tests grün + Syntax**

Run: `php -l plugin/gsh-terminplan.php && php tests/curriculr/test-augment-groups.php && for t in tests/curriculr/test-*.php; do php "$t" >/dev/null 2>&1 || echo "FAIL $t"; done`

- [ ] **Step 5: Commit**

```bash
git add plugin/gsh-terminplan.php tests/curriculr/test-augment-groups.php
git commit -m "feat: augment parsed events with groups from X-GSH-GROUPS"
```

---

### Task 5: Gruppen-Filter im Kiosk-Frontend (Plugin)

**Files:**
- Modify: `curriculr-terminplan/plugin/gsh-terminplan.php`:
  1. `gsh_tp_shortcode()` (~Zeile 6214): nach `$events = gsh_tp_augment_event_times(...)` → `$events = gsh_tp_augment_event_groups( $events, $data );` + Gruppen-Union in `$GLOBALS['gsh_tp_group_union']` ablegen.
  2. `gsh_tp_event_data_attrs()` (~Zeile 6652): `data-groups`-Attribut ergänzen.
  3. Filter-Bar-Builder (nach `</div>' // #gtp-filt-body`, ~Zeile 6396): Gruppen-Chip-Zeile.
  4. `gsh_tp_js()`: `gtpGrpSel`-State, `gtpGrpFil()`, Erweiterung `gtpApplyVisibility()` + `gtpReset()` + localStorage-Restore (~Zeile 8629).
- Modify: `curriculr-terminplan/plugin/assets/css/gsh-terminplan.css` (Chip-Styles ans Dateiende)

**Interfaces:**
- Consumes: `$ev['groups']` aus Task 4.
- Produces: UI-Verhalten; keine von späteren Tasks konsumierte API. Semantik: Chip aktiv = Gruppe sichtbar; Klick versteckt sie. Event ohne Gruppen ist IMMER sichtbar (Planner-Semantik `groups: []` = gilt für alle). Event mit Gruppen sichtbar, solange MINDESTENS EINE seiner Gruppen nicht versteckt ist. UND-Verknüpfung mit Kategorie-Filter und Suche bleibt.

- [ ] **Step 1: Shortcode-Pfad erweitern** — in `gsh_tp_shortcode()` direkt nach der `gsh_tp_augment_event_times`-Zeile:

```php
    $events = gsh_tp_augment_event_groups( $events, $data );

    // Union aller Termin-Gruppen für die Filter-Chips (Filter-Bar-Builder liest sie).
    $group_union = array();
    foreach ( $events as $ev_g ) {
        foreach ( (array) ( $ev_g['groups'] ?? array() ) as $g ) {
            $group_union[ $g ] = true;
        }
    }
    ksort( $group_union );
    $GLOBALS['gsh_tp_group_union'] = array_keys( $group_union );
```

- [ ] **Step 2: `data-groups` in `gsh_tp_event_data_attrs()`** — am Ende der Attribut-Sammlung, vor dem `return`:

```php
    $groups = (array) ( $ev['groups'] ?? array() );
    if ( $groups ) {
        $attrs .= ' data-groups="' . esc_attr( implode( '|', $groups ) ) . '"';
    }
```

- [ ] **Step 3: Chip-Zeile im Filter-Bar-Builder** — direkt nach `$o .= '</div>'; // #gtp-filt-body`:

```php
    $kiosk_groups = isset( $GLOBALS['gsh_tp_group_union'] ) ? (array) $GLOBALS['gsh_tp_group_union'] : array();
    if ( $kiosk_groups ) {
        $o .= '<div class="gtp-filt gtp-filt-open gtp-grp-row" id="gtp-grp-body">';
        $o .= '<span class="gtp-grp-label">Gruppen:</span>';
        foreach ( $kiosk_groups as $g ) {
            $o .= '<button type="button" class="gtp-gb gtp-gb-on" data-g="' . esc_attr( $g )
                . '" onclick="gtpGrpFil(this)" aria-pressed="true">' . esc_html( $g ) . '</button>';
        }
        $o .= '</div>';
    }
```

- [ ] **Step 4: JS erweitern** (in `gsh_tp_js()`, additive Blöcke — Struktur unangetastet):

Neben `var gtpSel = {}` (~Zeile 8147):

```js
var gtpGrpSel = {}; /* { gruppe: true } -> Gruppe VERSTECKT; leer = alle sichtbar */
function gtpGrpFil(btn){
  var g = btn.getAttribute("data-g");
  if(gtpGrpSel[g]){ delete gtpGrpSel[g]; } else { gtpGrpSel[g] = true; }
  btn.classList.toggle("gtp-gb-on", !gtpGrpSel[g]);
  btn.setAttribute("aria-pressed", gtpGrpSel[g] ? "false" : "true");
  try{ localStorage.setItem("gtpGrpSel", JSON.stringify(gtpGrpSel)); }catch(e){}
  gtpApply();
}
```

In `gtpApplyVisibility(el)` die Zeile `el.style.display = categoryOk ? "" : "none";` ersetzen durch:

```js
  var groupsAttr = el.getAttribute("data-groups");
  var groupOk = true;
  if(groupsAttr){
    groupOk = groupsAttr.split("|").some(function(g){ return !gtpGrpSel[g]; });
  }
  el.style.display = (categoryOk && groupOk) ? "" : "none";
```

(danach im Such-Block `categoryOk && q` → `categoryOk && groupOk && q`)

In `gtpReset()` zusätzlich:

```js
  gtpGrpSel = {};
  try{ localStorage.removeItem("gtpGrpSel"); }catch(e){}
  document.querySelectorAll(".gtp-gb").forEach(function(b){
    b.classList.add("gtp-gb-on");
    b.setAttribute("aria-pressed","true");
  });
```

Beim localStorage-Restore (~Zeile 8629, neben `gtpSel`-Restore):

```js
    var savedG = localStorage.getItem("gtpGrpSel");
    if(savedG){
      gtpGrpSel = JSON.parse(savedG);
      document.querySelectorAll(".gtp-gb").forEach(function(b){
        var g = b.getAttribute("data-g");
        b.classList.toggle("gtp-gb-on", !gtpGrpSel[g]);
        b.setAttribute("aria-pressed", gtpGrpSel[g] ? "false" : "true");
      });
      gtpApply();
    }
```

- [ ] **Step 5: CSS** — ans Ende von `assets/css/gsh-terminplan.css`:

```css
/* Gruppen-Filter-Chips (4.33.0) */
.gtp-grp-row{margin-top:4px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.gtp-grp-label{font-size:12px;font-weight:600;opacity:.7}
.gtp-gb{border:1px solid var(--gtp-border,#c3c4c7);border-radius:999px;padding:2px 10px;font-size:12px;background:transparent;cursor:pointer;opacity:.45;transition:opacity .15s}
.gtp-gb.gtp-gb-on{opacity:1;background:var(--gtp-chip-bg,rgba(0,52,92,.08))}
.gtp-gb:focus-visible{outline:2px solid var(--gtp-border,#00345C);outline-offset:1px}
```

- [ ] **Step 6: Syntax + alle Tests**

Run: `php -l plugin/gsh-terminplan.php && for t in tests/curriculr/test-*.php; do php "$t" >/dev/null 2>&1 || echo "FAIL $t"; done`

- [ ] **Step 7: Commit**

```bash
git add plugin/gsh-terminplan.php plugin/assets/css/gsh-terminplan.css
git commit -m "feat: group filter chips on kiosk/public schedule views"
```

---

### Task 6: Admin-Hinweis „Gruppen ohne Kalender" (Plugin)

**Files:**
- Modify: `curriculr-terminplan/plugin/gsh-terminplan.php` — Schuljahr-Karte in `gsh_tp_render_profile_tab_v2()`, direkt NACH dem Status-Badge-Block (`<?php endif; ?>` des `$doc_status`-Blocks, ~Zeile 4800)

**Interfaces:**
- Consumes: `gsh_tp_curriculr_repo_get( $sj )` (Zeile `json` = Doc), `$sy['calendars']`.

- [ ] **Step 1: Implementierung** — nach dem Status-Badge-Block einfügen:

```php
        <?php
        // Diskrepanz Planner-Gruppen ↔ provisionierte Kalender sichtbar machen (Spec 2026-07-15).
        $gsh_doc_row = function_exists( 'gsh_tp_curriculr_repo_get' ) ? gsh_tp_curriculr_repo_get( $sy_key ) : null;
        if ( $gsh_doc_row ) :
            $gsh_doc_json  = json_decode( $gsh_doc_row['json'], true );
            $gsh_plan_grps = ( is_array( $gsh_doc_json ) && is_array( $gsh_doc_json['availableGroups'] ?? null ) )
                ? array_map( 'strval', $gsh_doc_json['availableGroups'] ) : array();
            $gsh_cal_grps  = array();
            foreach ( $sy['calendars'] as $gsh_cal ) {
                if ( null !== $gsh_cal['group'] && empty( $gsh_cal['orphaned'] ) ) {
                    $gsh_cal_grps[] = (string) $gsh_cal['group'];
                }
            }
            $gsh_missing = array_diff( $gsh_plan_grps, $gsh_cal_grps );
            if ( $gsh_missing ) :
        ?>
        <div style="padding:6px 16px;background:#fff8e5;border-bottom:1px solid #c3c4c7;font-size:12px;color:#8a6d3b">
            Gruppen im Plan ohne eigenen Kalender:
            <strong><?php echo esc_html( implode( ', ', $gsh_missing ) ); ?></strong>
            — im Planner unter Einstellungen &rarr; Ver&ouml;ffentlichung anhaken und
            &bdquo;Kalender einrichten&ldquo; ausf&uuml;hren. Abo-Anleitung f&uuml;r Kolleg:innen:
            <code>docs/kalender-abo-anleitung.md</code> im Planner-Repository.
        </div>
        <?php endif; endif; ?>
```

- [ ] **Step 2: Syntax + Tests**

Run: `php -l plugin/gsh-terminplan.php && for t in tests/curriculr/test-*.php; do php "$t" >/dev/null 2>&1 || echo "FAIL $t"; done`

- [ ] **Step 3: Commit**

```bash
git add plugin/gsh-terminplan.php
git commit -m "feat: admin notice for planner groups without calendars"
```

---

### Task 7: Plugin-Release 4.33.0 (Version, Changelog, ZIP)

**Files:**
- Modify: `curriculr-terminplan/plugin/gsh-terminplan.php` (4 Stellen)

- [ ] **Step 1: Version bumpen** — alle 4 Stellen:
  1. Header `* Version:     4.32.0` → `4.33.0`
  2. Header-Changelog: nach `* Text Domain: gsh-terminplan` neuen Block `* v4.33.0` mit den Einträgen aus Schritt 2 einfügen (vor `* v4.32.0`).
  3. `define( 'GSH_TP_VERSION',       '4.32.0' );` → `'4.33.0'`
  4. `gsh_tp_changelog()`: neuen Block VOR `'version' => '4.32.0'`:

```php
        array(
            'version' => '4.33.0',
            'entries' => array(
                array( 'tag' => 'NEU', 'text' => 'Gruppen-Filter im Terminplan: Kolleg:innen können auf der öffentlichen Seite und in den Kiosk-Ansichten nach Planner-Gruppen (z. B. Eltern, Kollegium) filtern' ),
                array( 'tag' => 'NEU', 'text' => 'Kategorien-Sync: Labels und Farben aus dem Planner überschreiben beim Senden automatisch die Plugin-Kategorien — Stichwörter fürs IServ-Matching bleiben erhalten' ),
                array( 'tag' => 'NEU', 'text' => 'Neue Schuljahre aus dem Planner werden automatisch mit allen Gruppen-Kalendern angelegt (max 7)' ),
                array( 'tag' => 'UX', 'text' => 'Schuljahr-Karte warnt, wenn Planner-Gruppen ohne eigenen Kalender sind' ),
            ),
        ),
```

- [ ] **Step 2: Syntax + alle Tests + ZIP**

```bash
php -l plugin/gsh-terminplan.php
for t in tests/curriculr/test-*.php; do php "$t" >/dev/null 2>&1 || echo "FAIL $t"; done
cd plugin
VER=$(grep "define.*GSH_TP_VERSION" gsh-terminplan.php | grep -oE "[0-9]+\.[0-9]+\.[0-9]+" | head -1)
zip ../../curriculr-terminplan-$VER.zip gsh-terminplan.php curriculr-data-layer.php curriculr-auth.php curriculr-guard.php page-terminplan-entwurf.php page-terminplan-kiosk.php
zip -r ../../curriculr-terminplan-$VER.zip assets/
cd ..
```
Expected: `VER=4.33.0`, ZIP im Workspace-Root.

- [ ] **Step 3: Commit**

```bash
git add plugin/gsh-terminplan.php
git commit -m "chore: release 4.33.0"
```

---

### Task 8: SPA-Lib `missingGroupCalendars` (TDD)

**Files:**
- Create: `curriculr-planner/src/lib/publish-helpers.ts`
- Create: `curriculr-planner/src/lib/publish-helpers.test.ts`

**Interfaces:**
- Consumes: `WpCalendarGroup { group: string | null; label: string; feedUrl: string | null }` aus `@/lib/wp-sync-config`.
- Produces: `missingGroupCalendars(availableGroups: string[], provisioned: WpCalendarGroup[]): string[]` — Task 9 importiert sie.

- [ ] **Step 1: Failing Test** (`src/lib/publish-helpers.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import { missingGroupCalendars } from './publish-helpers';
import type { WpCalendarGroup } from './wp-sync-config';

const cal = (group: string | null): WpCalendarGroup => ({ group, label: group ?? 'Alle', feedUrl: null });

describe('missingGroupCalendars', () => {
  it('returns groups without a provisioned calendar', () => {
    expect(missingGroupCalendars(['Eltern', 'Kollegium'], [cal(null), cal('Kollegium')])).toEqual(['Eltern']);
  });
  it('ignores the main calendar (group null)', () => {
    expect(missingGroupCalendars(['Eltern'], [cal(null)])).toEqual(['Eltern']);
  });
  it('returns empty when everything is provisioned', () => {
    expect(missingGroupCalendars(['Eltern'], [cal(null), cal('Eltern')])).toEqual([]);
  });
  it('returns empty for no groups', () => {
    expect(missingGroupCalendars([], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Rot** — `cd curriculr-planner && npx vitest run src/lib/publish-helpers.test.ts` → FAIL (Modul fehlt)

- [ ] **Step 3: Implementierung** (`src/lib/publish-helpers.ts`):

```ts
import type { WpCalendarGroup } from './wp-sync-config';

/** Planner groups that have no provisioned WP group calendar yet. */
export function missingGroupCalendars(
  availableGroups: string[],
  provisioned: WpCalendarGroup[],
): string[] {
  const have = new Set(
    provisioned.map((c) => c.group).filter((g): g is string => typeof g === 'string' && g !== ''),
  );
  return availableGroups.filter((g) => !have.has(g));
}
```

- [ ] **Step 4: Grün** — `npx vitest run src/lib/publish-helpers.test.ts`

- [ ] **Step 5: Commit (im SPA-Repo)**

```bash
cd curriculr-planner
git add src/lib/publish-helpers.ts src/lib/publish-helpers.test.ts
git commit -m "feat: missingGroupCalendars helper"
```

---

### Task 9: PublishTab — Warnbox + IServ-Abo-Checkliste (SPA)

**Files:**
- Modify: `curriculr-planner/src/components/settings/PublishTab.tsx`

**Interfaces:**
- Consumes: `missingGroupCalendars` aus Task 8; bestehende `provisionedCalendars`, `availableGroups`, `doc`.

- [ ] **Step 1: Import ergänzen**

```tsx
import { missingGroupCalendars } from '@/lib/publish-helpers';
```

- [ ] **Step 2: Warnbox** — im „Kalender einrichten"-Abschnitt, direkt ÜBER dem `onSendProfileMap`-Button-Block (`<div className="flex items-center gap-3">`):

```tsx
          {(() => {
            const missing = missingGroupCalendars(availableGroups, provisionedCalendars);
            if (provisionedCalendars.length === 0 || missing.length === 0) return null;
            return (
              <div className="rounded-md border border-[var(--color-warning)] bg-[var(--color-gelb-100)] p-3 text-[12px]">
                ⚠ Ohne eigenen Kalender: <strong>{missing.join(', ')}</strong> — Häkchen oben setzen
                und „Kalender einrichten" erneut ausführen.
              </div>
            );
          })()}
```

- [ ] **Step 3: IServ-Abo-Checkliste** — INNERHALB des bestehenden `{provisionedCalendars.length > 0 && (...)}`-Blocks, nach der Feed-URL-Liste (vor dem schließenden `</div>`):

```tsx
              <ol className="mt-2 space-y-1 text-[12px] text-[var(--color-ink-500)] list-decimal list-inside border-t border-[var(--color-marine-200)] pt-2">
                <li>Feed-Link oben mit „Kopieren" in die Zwischenablage holen.</li>
                <li>In IServ: Kalender → Zahnrad → „Kalender abonnieren" → Link einfügen.</li>
                <li>Fertig — der Plan erscheint bei allen, die den Kalender abonniert haben.</li>
              </ol>
              <p className="text-[11px] text-[var(--color-ink-500)]">
                Anleitung für Handy &amp; IServ zum Weitergeben:{' '}
                <a
                  href="https://github.com/juwagn/curriculr-planner/blob/main/docs/kalender-abo-anleitung.md"
                  target="_blank" rel="noopener noreferrer" className="underline"
                >
                  kalender-abo-anleitung.md
                </a>
              </p>
```

- [ ] **Step 4: Gates** — `npm run typecheck && npm run lint && npm run test:run` → alles grün

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/PublishTab.tsx
git commit -m "feat: missing-group warning + IServ subscription checklist in PublishTab"
```

---

### Task 10: Abo-Anleitung als Markdown (SPA-Repo)

**Files:**
- Create: `curriculr-planner/docs/kalender-abo-anleitung.md`

- [ ] **Step 1: Datei anlegen** — vollständiger Inhalt:

```markdown
# Schulterminplan abonnieren (IServ, iPhone, Android)

Der Terminplan wird als Kalender-Feed (ICS) bereitgestellt. Einmal abonniert,
aktualisieren sich Termine automatisch. Den Feed-Link bekommt ihr von der
Schulleitung (pro Gruppe gibt es einen eigenen Link, z. B. „Alle Termine",
„Eltern", „Kollegium").

## IServ

1. IServ öffnen → Modul **Kalender**.
2. Zahnrad (Einstellungen) → **Kalender abonnieren**.
3. Feed-Link einfügen, Namen vergeben (z. B. „Terminplan 2026/27") → Speichern.

## iPhone / iPad

1. **Einstellungen** → **Kalender** → **Accounts** → **Account hinzufügen**.
2. **Andere** → **Kalenderabo hinzufügen**.
3. Feed-Link einfügen → **Weiter** → **Sichern**.

## Android (Google Kalender)

Google Kalender kann ICS-Abos nur über den Browser hinzufügen:

1. Am PC [calendar.google.com](https://calendar.google.com) öffnen.
2. Links neben „Weitere Kalender" auf **+** → **Per URL**.
3. Feed-Link einfügen → **Kalender hinzufügen**.
4. Auf dem Handy in der Google-Kalender-App unter Einstellungen den neuen
   Kalender einblenden (Synchronisieren aktivieren).

## Wichtig (Datenschutz)

- Der Feed-Link enthält einen Zugangsschlüssel. **Nur dienstlich weitergeben**
  (IServ, E-Mail ans Kollegium) — nicht auf der Schulwebsite oder in sozialen
  Medien veröffentlichen.
- Der Kalender enthält ausschließlich schulische Termine. Bitte keine
  personenbezogenen Daten (Namen von Schüler:innen etc.) in Termintitel oder
  Notizen des Planners eintragen.
- Bei versehentlicher Weitergabe: Schulleitung informieren — der Link kann
  neu erzeugt werden.
```

- [ ] **Step 2: Commit**

```bash
git add docs/kalender-abo-anleitung.md
git commit -m "docs: subscription guide for IServ/iPhone/Android"
```

---

### Task 11: SPA-Release 1.15.0 + Gesamt-Gates

**Files:**
- Modify: `curriculr-planner/package.json` (`"version": "1.14.1"` → `"1.15.0"`)

- [ ] **Step 1: Version bumpen**
- [ ] **Step 2: Alle Gates**

```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
```
Expected: alles grün, Build ok.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: release 1.15.0"
```

---

## Abschluss-Verifikation (manuell, durch Nutzer)

1. Plugin-ZIP 4.33.0 in WP-Admin hochladen.
2. SPA deployen (push → GitHub Pages CI).
3. Im Planner „Veröffentlichen" → WP-Admin: Kategorien-Farben = Planner-Farben.
4. Kiosk-Seite: Gruppen-Chips sichtbar, Filter kombiniert mit Kategorie + Suche.
5. Schuljahr-Karte: Warnung erscheint nur bei fehlenden Gruppen-Kalendern.
