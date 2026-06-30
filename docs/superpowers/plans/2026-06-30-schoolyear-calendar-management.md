# Schuljahr-zentrierte Kalenderverwaltung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat profile list with a nested schoolyear→calendars model so the SPA can auto-provision a main calendar + optional group calendars with one REST call, and the WP admin displays them grouped under their schoolyear.

**Architecture:** New `gsh_tp_schoolyears` WP option is source of truth. `gsh_tp_get_profiles()` becomes a flattening projection for backward compat (~40 consumers unchanged). SPA sends `{sj, label, groups[]}`, WP provisions everything. After_put writes ICS cache for all calendars under that schoolyear. Admin UI shows grouped cards instead of a flat dropdown.

**Tech Stack:** PHP (no Composer), custom assert-based tests (`php tests/curriculr/test-xxx.php`), TypeScript + Vitest (SPA), `npm run test:run` for SPA tests.

## Global Constraints

- PHP lint mandatory before every commit: `php -l plugin/gsh-terminplan.php && php -l plugin/curriculr-data-layer.php`
- No Composer, no npm in WP plugin
- SPA package manager: npm only
- WP option `gsh_tp_profiles` must NOT be deleted (read-fallback for pre-migration installs)
- `gsh_tp_curriculr_profile_map` must NOT be auto-migrated (legacy kompat path must survive)
- Haupt-Kalender (`group === null`) never deletable, never orphaned
- Max 8 calendars per schoolyear (enforced in REST handler)
- `GSH_TP_CACHE_VERSION` stays at 3 — no cache structure change, only new keys added
- Stable calendar ID: `gsh_tp_calendar_id(sj_key, null)` = `sj_key`, `gsh_tp_calendar_id(sj_key, 'Schulleitung')` = `sj_key . '__schulleitung'`
- Spec: `curriculr-planner/docs/superpowers/specs/2026-06-29-schoolyear-calendar-management-design.md`

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `curriculr-terminplan/plugin/gsh-terminplan.php` | Modify | +schoolyear helpers, projection rewrite of `gsh_tp_get_profiles()`, migration, admin UI overhaul, version bump |
| `curriculr-terminplan/plugin/curriculr-data-layer.php` | Modify | new `gsh_tp_curriculr_provision_schoolyear()`, rewrite `after_put` dual-path, rewrite `profile_map_put` REST handler |
| `curriculr-terminplan/tests/curriculr/test-schoolyears.php` | Create | Tests for model helpers, projection, migration |
| `curriculr-terminplan/tests/curriculr/test-provision.php` | Create | Tests for REST provisioning, orphan logic, limit |
| `curriculr-planner/src/lib/wp-sync-config.ts` | Modify | New types (`WpCalendarGroup`, updated `WpPlanLink`) |
| `curriculr-planner/src/lib/wp-sync.ts` | Modify | `postProfileMap` new signature + response type |
| `curriculr-planner/src/lib/wp-sync.test.ts` | Modify | Update tests for new `postProfileMap` shape |
| `curriculr-planner/src/components/settings/WordpressTab.tsx` | Modify | Replace manual mapping UI with group checklist + feed URL display |
| `curriculr-planner/src/components/settings/GroupsTab.tsx` | Modify | Add "Orga" to `SUGGESTED_GROUPS` |

---

## Task 1: WP — Schoolyear data model helpers

**Files:**
- Modify: `curriculr-terminplan/plugin/gsh-terminplan.php` (add functions after `gsh_tp_save_profiles` ~line 1442)
- Create: `curriculr-terminplan/tests/curriculr/test-schoolyears.php`

**Interfaces:**
- Produces:
  - `gsh_tp_get_schoolyears(): array` — reads `gsh_tp_schoolyears` option
  - `gsh_tp_save_schoolyears(array $schoolyears): void`
  - `gsh_tp_calendar_id(string $sj_key, ?string $group): string` — stable profile-ID generator
  - `gsh_tp_sanitize_calendar(array $cal): array` — sanitizes one calendar entry
  - `gsh_tp_sanitize_schoolyear(array $sy): array` — sanitizes one schoolyear entry

- [ ] **Step 1: Create the test file**

Create `curriculr-terminplan/tests/curriculr/test-schoolyears.php`:

```php
<?php
require __DIR__ . '/assert.php';

// Stub WP functions used by helpers
if ( ! function_exists( 'sanitize_key' ) ) {
    function sanitize_key( $key ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $key ) ); }
}
if ( ! function_exists( 'sanitize_text_field' ) ) {
    function sanitize_text_field( $str ) { return trim( strip_tags( $str ) ); }
}
if ( ! function_exists( 'absint' ) ) {
    function absint( $v ) { return abs( (int) $v ); }
}
if ( ! function_exists( 'sanitize_textarea_field' ) ) {
    function sanitize_textarea_field( $str ) { return trim( $str ); }
}
if ( ! function_exists( 'esc_url_raw' ) ) {
    function esc_url_raw( $url ) { return filter_var( trim($url), FILTER_SANITIZE_URL ) ?: ''; }
}
if ( ! function_exists( 'current_time' ) ) {
    function current_time( $fmt ) { return date( $fmt ); }
}

define( 'GSH_TP_CACHE_VERSION', 3 );

// In-memory option storage for tests
$GLOBALS['_wp_options'] = array();
function get_option( $key, $default = false ) { return $GLOBALS['_wp_options'][$key] ?? $default; }
function update_option( $key, $value ) { $GLOBALS['_wp_options'][$key] = $value; return true; }

require __DIR__ . '/../../plugin/gsh-terminplan.php';

// ---- gsh_tp_calendar_id ----
gsh_assert_eq( gsh_tp_calendar_id( 'sj_2026_27', null ),          'sj_2026_27',              'null group → sj_key' );
gsh_assert_eq( gsh_tp_calendar_id( 'sj_2026_27', '' ),            'sj_2026_27',              'empty group → sj_key' );
gsh_assert_eq( gsh_tp_calendar_id( 'sj_2026_27', 'Schulleitung'), 'sj_2026_27__schulleitung','Schulleitung suffix' );
gsh_assert_eq( gsh_tp_calendar_id( 'sj_2026_27', 'Eltern' ),      'sj_2026_27__eltern',      'Eltern suffix' );
gsh_assert_eq( gsh_tp_calendar_id( 'sj_2026_27', 'Klassen 5-7'), 'sj_2026_27__klassen-5-7', 'spaces → hyphens via sanitize_key' );

// ---- gsh_tp_get_schoolyears / gsh_tp_save_schoolyears ----
gsh_assert_eq( gsh_tp_get_schoolyears(), array(), 'empty when option missing' );

$test_sy = array(
    array(
        'key'       => 'sj_2026_27',
        'label'     => '2026/27',
        'is_active' => true,
        'created'   => '2026-06-30',
        'shared'    => array( 'quartal_grenzen' => '', 'schuljahr_start' => '', 'cache_duration' => 3600 ),
        'calendars' => array(
            array( 'group' => null, 'label' => 'Alle Termine', 'ical_url' => 'https://x.de/feed.ics',
                   'is_draft' => false, 'managed' => true, 'orphaned' => false ),
            array( 'group' => 'Schulleitung', 'label' => 'Schulleitung', 'ical_url' => '',
                   'is_draft' => false, 'managed' => true, 'orphaned' => false ),
        ),
    ),
);
gsh_tp_save_schoolyears( $test_sy );
$loaded = gsh_tp_get_schoolyears();
gsh_assert_eq( count( $loaded ), 1, 'one schoolyear saved and loaded' );
gsh_assert_eq( $loaded[0]['key'], 'sj_2026_27', 'key preserved' );
gsh_assert_eq( count( $loaded[0]['calendars'] ), 2, 'two calendars preserved' );

// ---- Projection: gsh_tp_get_profiles() reads from schoolyears ----
$profiles = gsh_tp_get_profiles();
gsh_assert_eq( count( $profiles ), 2, 'projection yields 2 profiles' );

// Main calendar → is_active true
$main = null;
$sl   = null;
foreach ( $profiles as $p ) {
    if ( null === $p['group'] ) $main = $p;
    if ( 'Schulleitung' === $p['group'] ) $sl = $p;
}
gsh_assert_true( null !== $main, 'main calendar in projection' );
gsh_assert_true( null !== $sl, 'Schulleitung calendar in projection' );
gsh_assert_eq( $main['id'],        'sj_2026_27',               'main id = sj_key' );
gsh_assert_eq( $main['is_active'], true,                        'main calendar is_active for active schoolyear' );
gsh_assert_eq( $sl['id'],          'sj_2026_27__schulleitung',  'group id = sj__group' );
gsh_assert_eq( $sl['is_active'],   false,                       'group calendar never is_active' );
gsh_assert_eq( $sl['sj_key'],      'sj_2026_27',                'sj_key set on projected profile' );
gsh_assert_eq( $sl['group'],       'Schulleitung',              'group set on projected profile' );
gsh_assert_eq( $sl['cache_duration'], 3600,                     'shared cache_duration projected' );

// Fallback: when schoolyears empty, fall back to gsh_tp_profiles flat option
$GLOBALS['_wp_options'] = array(); // reset
update_option( 'gsh_tp_profiles', array(
    array( 'id' => 'old_id', 'label' => 'Old', 'ical_url' => '', 'cache_duration' => 3600,
           'quartal_grenzen' => '', 'schuljahr_start' => '', 'is_active' => true, 'is_draft' => false, 'created' => '2025-01-01' ),
) );
$profiles_fallback = gsh_tp_get_profiles();
gsh_assert_eq( count( $profiles_fallback ), 1, 'fallback to flat option when schoolyears missing' );
gsh_assert_eq( $profiles_fallback[0]['id'], 'old_id', 'old flat profile id preserved in fallback' );

gsh_test_done();
```

- [ ] **Step 2: Run test — expect FAIL (functions not defined)**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-terminplan
php tests/curriculr/test-schoolyears.php 2>&1 | head -5
```
Expected: error like `Call to undefined function gsh_tp_calendar_id()`

- [ ] **Step 3: Add functions to `gsh-terminplan.php`**

Find the section after `gsh_tp_save_profiles` (around line 1442) and add before `gsh_tp_get_profile`:

```php
/* ── Schuljahr-Model (nested, 4.24.0) ── */

/**
 * Liefert alle Schuljahre aus der nested Source-of-Truth.
 *
 * @since 4.24.0
 * @return array Array von Schuljahr-Arrays.
 */
function gsh_tp_get_schoolyears() {
    $raw = get_option( 'gsh_tp_schoolyears', array() );
    return is_array( $raw ) ? $raw : array();
}

/**
 * Speichert das Schuljahr-Array.
 *
 * @since 4.24.0
 * @param  array $schoolyears Bereinigte Schuljahre.
 */
function gsh_tp_save_schoolyears( $schoolyears ) {
    update_option( 'gsh_tp_schoolyears', $schoolyears, true );
}

/**
 * Erzeugt eine stabile Profil-ID für einen Kalender.
 *
 * Haupt-Kalender: id = sj_key.
 * Gruppen-Kalender: id = sj_key . '__' . sanitize_key(group).
 *
 * @since 4.24.0
 * @param  string      $sj_key Schuljahr-Schlüssel.
 * @param  string|null $group  Gruppenname oder null für Haupt-Kalender.
 * @return string              Stabile Profil-ID.
 */
function gsh_tp_calendar_id( $sj_key, $group ) {
    $base = sanitize_key( $sj_key );
    if ( null === $group || '' === $group ) {
        return $base;
    }
    return $base . '__' . sanitize_key( $group );
}

/**
 * Sanitiert einen Kalender-Eintrag.
 *
 * @since 4.24.0
 * @param  array $cal Roher Kalender-Eintrag.
 * @return array      Bereinigter Kalender-Eintrag.
 */
function gsh_tp_sanitize_calendar( $cal ) {
    $group = isset( $cal['group'] ) && is_string( $cal['group'] ) && '' !== $cal['group']
        ? sanitize_text_field( $cal['group'] ) : null;
    return array(
        'group'    => $group,
        'label'    => sanitize_text_field( $cal['label'] ?? '' ),
        'ical_url' => isset( $cal['ical_url'] ) ? gsh_tp_sanitize_url_raw( $cal['ical_url'] ) : '',
        'is_draft' => ! empty( $cal['is_draft'] ),
        'managed'  => ! empty( $cal['managed'] ),
        'orphaned' => ! empty( $cal['orphaned'] ),
    );
}

/**
 * Sanitiert ein Schuljahr-Array.
 *
 * @since 4.24.0
 * @param  array $sy Rohes Schuljahr-Array.
 * @return array     Bereinigtes Schuljahr-Array oder leeres Array bei fehlendem Key.
 */
function gsh_tp_sanitize_schoolyear( $sy ) {
    $key = sanitize_key( $sy['key'] ?? '' );
    if ( '' === $key ) {
        return array();
    }
    $shared = $sy['shared'] ?? array();
    $cals   = array();
    foreach ( (array) ( $sy['calendars'] ?? array() ) as $cal ) {
        $clean = gsh_tp_sanitize_calendar( $cal );
        if ( '' !== ( $clean['label'] ?? '' ) || null === $clean['group'] ) {
            $cals[] = $clean;
        }
    }
    return array(
        'key'       => $key,
        'label'     => sanitize_text_field( $sy['label'] ?? $key ),
        'is_active' => ! empty( $sy['is_active'] ),
        'created'   => sanitize_text_field( $sy['created'] ?? current_time( 'Y-m-d' ) ),
        'shared'    => array(
            'quartal_grenzen' => sanitize_textarea_field( $shared['quartal_grenzen'] ?? '' ),
            'schuljahr_start' => sanitize_text_field( $shared['schuljahr_start'] ?? '' ),
            'cache_duration'  => max( 300, min( 86400, absint( $shared['cache_duration'] ?? 3600 ) ) ),
        ),
        'calendars' => $cals,
    );
}
```

**Now rewrite `gsh_tp_get_profiles()`** (replace the existing function body at ~line 1392):

```php
function gsh_tp_get_profiles() {
    $schoolyears = gsh_tp_get_schoolyears();
    if ( ! empty( $schoolyears ) ) {
        // Nested source-of-truth: project to flat profile shape.
        $profiles = array();
        foreach ( $schoolyears as $sy ) {
            foreach ( ( $sy['calendars'] ?? array() ) as $cal ) {
                $id = gsh_tp_calendar_id( $sy['key'], $cal['group'] );
                $profiles[] = array(
                    'id'              => $id,
                    'label'           => $cal['label'],
                    'ical_url'        => $cal['ical_url'] ?? '',
                    'cache_duration'  => $sy['shared']['cache_duration'] ?? 3600,
                    'quartal_grenzen' => $sy['shared']['quartal_grenzen'] ?? '',
                    'schuljahr_start' => $sy['shared']['schuljahr_start'] ?? '',
                    'is_active'       => ( ! empty( $sy['is_active'] ) && null === $cal['group'] ),
                    'is_draft'        => ! empty( $cal['is_draft'] ),
                    'created'         => $sy['created'] ?? '',
                    // Extra fields for new code
                    'sj_key'          => $sy['key'],
                    'group'           => $cal['group'],
                    'managed'         => ! empty( $cal['managed'] ),
                    'orphaned'        => ! empty( $cal['orphaned'] ),
                );
            }
        }
        return $profiles;
    }
    // Fallback: pre-migration flat option.
    $raw = get_option( 'gsh_tp_profiles', array() );
    return is_array( $raw ) ? $raw : array();
}
```

- [ ] **Step 4: PHP lint**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-terminplan
php -l plugin/gsh-terminplan.php
```
Expected: `No syntax errors detected`

- [ ] **Step 5: Run test — expect ALL PASS**

```bash
php tests/curriculr/test-schoolyears.php
```
Expected: `ALL PASS`

- [ ] **Step 6: Run existing tests to verify no regression**

```bash
php tests/curriculr/test-ics.php && \
php tests/curriculr/test-settings-backup.php && \
php tests/curriculr/test-quartal-grenzen.php
```
Expected: all `ALL PASS`

- [ ] **Step 7: Commit**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-terminplan
git add plugin/gsh-terminplan.php tests/curriculr/test-schoolyears.php
git commit -m "feat: add nested schoolyear data model + gsh_tp_get_profiles projection"
```

---

## Task 2: WP — Migration (flat profiles → schoolyears)

**Files:**
- Modify: `curriculr-terminplan/plugin/gsh-terminplan.php` (add migration function, hook into `admin_init`)
- Modify: `curriculr-terminplan/tests/curriculr/test-schoolyears.php` (add migration tests)

**Interfaces:**
- Consumes: `gsh_tp_get_schoolyears()`, `gsh_tp_save_schoolyears()`, `gsh_tp_calendar_id()` from Task 1
- Produces: `gsh_tp_migrate_profiles_to_schoolyears(): void` — called by `admin_init`, idempotent

- [ ] **Step 1: Add migration tests**

Append to `curriculr-terminplan/tests/curriculr/test-schoolyears.php` before `gsh_test_done()`:

```php
// ---- Migration: flat gsh_tp_profiles → gsh_tp_schoolyears ----
$GLOBALS['_wp_options'] = array(); // fresh state
update_option( 'gsh_tp_profiles', array(
    array( 'id' => 'sj_2025_26', 'label' => 'Schuljahr 2025/26', 'ical_url' => 'https://iserv.de/cal.ics',
           'cache_duration' => 7200, 'quartal_grenzen' => "2025-09-01|2025-11-28\n2025-12-01|2026-02-06",
           'schuljahr_start' => '2025-09-01', 'is_active' => true, 'is_draft' => false, 'created' => '2025-01-01' ),
    array( 'id' => 'sj_2026_27', 'label' => 'Schuljahr 2026/27', 'ical_url' => '',
           'cache_duration' => 3600, 'quartal_grenzen' => '', 'schuljahr_start' => '',
           'is_active' => false, 'is_draft' => true, 'created' => '2026-06-01' ),
) );

gsh_tp_migrate_profiles_to_schoolyears();

$migrated = gsh_tp_get_schoolyears();
gsh_assert_eq( count( $migrated ), 2, 'migration creates 2 schoolyears' );

$sy25 = null;
$sy26 = null;
foreach ( $migrated as $sy ) {
    if ( 'sj_2025_26' === $sy['key'] ) $sy25 = $sy;
    if ( 'sj_2026_27' === $sy['key'] ) $sy26 = $sy;
}
gsh_assert_true( null !== $sy25, '2025/26 schoolyear migrated' );
gsh_assert_true( null !== $sy26, '2026/27 schoolyear migrated' );
gsh_assert_eq( $sy25['is_active'], true,  '2025/26 is_active preserved' );
gsh_assert_eq( $sy26['is_active'], false, '2026/27 not active preserved' );
gsh_assert_eq( $sy25['shared']['cache_duration'], 7200, 'cache_duration migrated' );
gsh_assert_eq( $sy25['shared']['schuljahr_start'], '2025-09-01', 'schuljahr_start migrated' );

// Main calendar ID must equal original flat profile ID
gsh_assert_eq( count( $sy25['calendars'] ), 1, 'one calendar per migrated schoolyear' );
gsh_assert_eq( $sy25['calendars'][0]['group'], null, 'migrated calendar is main (group=null)' );
gsh_assert_eq( $sy25['calendars'][0]['ical_url'], 'https://iserv.de/cal.ics', 'ical_url migrated' );
gsh_assert_eq( $sy25['calendars'][0]['managed'], false, 'migrated calendar not managed (manual)' );

// Projection after migration: id of main = sj_key (same as old flat id)
$proj = gsh_tp_get_profiles();
$ids = array_column( $proj, 'id' );
gsh_assert_true( in_array( 'sj_2025_26', $ids, true ), 'old flat id preserved as calendar id after migration' );

// Idempotency: running migration again must not duplicate
gsh_tp_migrate_profiles_to_schoolyears();
gsh_assert_eq( count( gsh_tp_get_schoolyears() ), 2, 'migration is idempotent' );

// profile_map NOT auto-migrated (stays as-is)
$map_before = array( 'sj_2025_26' => array( array( 'profileId' => 'sj_2025_26', 'group' => null ) ) );
update_option( 'gsh_tp_curriculr_profile_map', $map_before );
gsh_tp_migrate_profiles_to_schoolyears(); // re-run
gsh_assert_eq( get_option( 'gsh_tp_curriculr_profile_map' ), $map_before, 'profile_map not touched by migration' );
```

- [ ] **Step 2: Run test — expect FAIL (function not defined)**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-terminplan
php tests/curriculr/test-schoolyears.php 2>&1 | grep FAIL | head -3
```
Expected: `FAIL` on migration assertion

- [ ] **Step 3: Add `gsh_tp_migrate_profiles_to_schoolyears` to `gsh-terminplan.php`**

Add after `gsh_tp_sanitize_schoolyear` (Task 1 additions):

```php
/**
 * Einmalige Migration: flache gsh_tp_profiles → gsh_tp_schoolyears.
 *
 * Guard: läuft nur wenn gsh_tp_schoolyears leer ist und gsh_tp_profiles Daten hat.
 * profile_map wird NICHT migriert — Kompat-Pfad bleibt aktiv.
 * Wird per admin_init aufgerufen.
 *
 * @since 4.24.0
 */
function gsh_tp_migrate_profiles_to_schoolyears() {
    // Guard: schoolyears already populated → nothing to do.
    if ( ! empty( gsh_tp_get_schoolyears() ) ) {
        return;
    }
    $flat = get_option( 'gsh_tp_profiles', array() );
    if ( empty( $flat ) || ! is_array( $flat ) ) {
        return;
    }

    $schoolyears = array();
    foreach ( $flat as $p ) {
        $key = sanitize_key( $p['id'] ?? '' );
        if ( '' === $key ) {
            continue;
        }
        // Check for duplicate key (shouldn't happen but be safe).
        foreach ( $schoolyears as $existing ) {
            if ( $existing['key'] === $key ) {
                continue 2;
            }
        }
        $schoolyears[] = array(
            'key'       => $key,
            'label'     => sanitize_text_field( $p['label'] ?? $key ),
            'is_active' => ! empty( $p['is_active'] ),
            'created'   => sanitize_text_field( $p['created'] ?? current_time( 'Y-m-d' ) ),
            'shared'    => array(
                'quartal_grenzen' => sanitize_textarea_field( $p['quartal_grenzen'] ?? '' ),
                'schuljahr_start' => sanitize_text_field( $p['schuljahr_start'] ?? '' ),
                'cache_duration'  => max( 300, min( 86400, absint( $p['cache_duration'] ?? 3600 ) ) ),
            ),
            'calendars' => array(
                array(
                    'group'    => null,
                    'label'    => sanitize_text_field( $p['label'] ?? $key ) . ' · Alle Termine',
                    'ical_url' => gsh_tp_sanitize_url_raw( $p['ical_url'] ?? '' ),
                    'is_draft' => ! empty( $p['is_draft'] ),
                    'managed'  => false, // pre-existing calendars are manual, not managed
                    'orphaned' => false,
                ),
            ),
        );
    }

    if ( ! empty( $schoolyears ) ) {
        gsh_tp_save_schoolyears( $schoolyears );
    }
}
```

Hook migration into `admin_init`. Find the `add_action( 'admin_init', ...)` section (around line 2060 in the existing file) and add:

```php
add_action( 'admin_init', 'gsh_tp_migrate_profiles_to_schoolyears' );
```

- [ ] **Step 4: PHP lint + run tests**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-terminplan
php -l plugin/gsh-terminplan.php && php tests/curriculr/test-schoolyears.php
```
Expected: `No syntax errors` + `ALL PASS`

- [ ] **Step 5: Commit**

```bash
git add plugin/gsh-terminplan.php tests/curriculr/test-schoolyears.php
git commit -m "feat: add migration flat gsh_tp_profiles → gsh_tp_schoolyears (idempotent, profile_map untouched)"
```

---

## Task 3: WP — REST Auto-Provisioning + dual-path after_put

**Files:**
- Modify: `curriculr-terminplan/plugin/curriculr-data-layer.php`
- Create: `curriculr-terminplan/tests/curriculr/test-provision.php`

**Interfaces:**
- Consumes: `gsh_tp_get_schoolyears()`, `gsh_tp_save_schoolyears()`, `gsh_tp_calendar_id()`, `gsh_tp_curriculr_feed_url()`, `gsh_tp_curriculr_feed_url_group()`, `gsh_tp_curriculr_build_ics()`
- Produces:
  - `gsh_tp_curriculr_provision_schoolyear(string $sj, string $label, array $groups): WP_REST_Response`
  - Updated `gsh_tp_curriculr_rest_profile_map_put(WP_REST_Request $req)` — detects new vs old form
  - Updated `gsh_tp_curriculr_after_put(string $sj, string $token)` — dual path: schoolyears-native OR legacy

- [ ] **Step 1: Create provision test file**

Create `curriculr-terminplan/tests/curriculr/test-provision.php`:

```php
<?php
require __DIR__ . '/assert.php';

// WP stubs
if ( ! function_exists( 'sanitize_key' ) ) {
    function sanitize_key( $key ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $key ) ); }
}
if ( ! function_exists( 'sanitize_text_field' ) ) {
    function sanitize_text_field( $str ) { return trim( strip_tags( $str ) ); }
}
if ( ! function_exists( 'absint' ) ) { function absint( $v ) { return abs( (int) $v ); } }
if ( ! function_exists( 'sanitize_textarea_field' ) ) {
    function sanitize_textarea_field( $s ) { return trim( $s ); }
}
if ( ! function_exists( 'esc_url_raw' ) ) {
    function esc_url_raw( $url ) { return filter_var(trim($url), FILTER_SANITIZE_URL) ?: ''; }
}
if ( ! function_exists( 'current_time' ) ) { function current_time( $f ) { return date($f); } }
if ( ! function_exists( 'rest_url' ) ) {
    function rest_url( $path ) { return 'https://example.com/wp-json/' . $path; }
}

define( 'GSH_TP_CACHE_VERSION', 3 );

$GLOBALS['_wp_options'] = array();
function get_option( $k, $d = false ) { return $GLOBALS['_wp_options'][$k] ?? $d; }
function update_option( $k, $v, $autoload = true ) { $GLOBALS['_wp_options'][$k] = $v; return true; }
function delete_transient( $k ) { return true; }
function wp_cache_flush() {}

// Minimal WP_REST_Response stub
class WP_REST_Response {
    public $data; public $status;
    public function __construct( $data, $status = 200 ) { $this->data = $data; $this->status = $status; }
}

require __DIR__ . '/../../plugin/gsh-terminplan.php';
require __DIR__ . '/../../plugin/curriculr-data-layer.php';

// ---- gsh_tp_curriculr_provision_schoolyear ----

// Create new schoolyear with groups
$resp = gsh_tp_curriculr_provision_schoolyear( 'sj_2026_27', '2026/27', array( 'Schulleitung', 'Eltern' ) );
gsh_assert_eq( $resp->status, 200, 'provision returns 200' );
gsh_assert_eq( $resp->data['updated'], true, 'updated true' );

$sys = gsh_tp_get_schoolyears();
gsh_assert_eq( count( $sys ), 1, 'one schoolyear created' );
gsh_assert_eq( $sys[0]['key'], 'sj_2026_27', 'key correct' );
gsh_assert_eq( count( $sys[0]['calendars'] ), 3, 'Haupt + 2 groups = 3 calendars' );

$groups_in_cals = array_filter( array_column( $sys[0]['calendars'], 'group' ) );
gsh_assert_true( in_array( 'Schulleitung', $groups_in_cals, true ), 'Schulleitung calendar created' );
gsh_assert_true( in_array( 'Eltern', $groups_in_cals, true ), 'Eltern calendar created' );

// Main calendar always present
$main_cal = null;
foreach ( $sys[0]['calendars'] as $c ) { if ( null === $c['group'] ) $main_cal = $c; }
gsh_assert_true( null !== $main_cal, 'main calendar present' );
gsh_assert_eq( $main_cal['managed'], true, 'main calendar managed' );

// Idempotent: re-send same groups
$resp2 = gsh_tp_curriculr_provision_schoolyear( 'sj_2026_27', '2026/27', array( 'Schulleitung', 'Eltern' ) );
gsh_assert_eq( $resp2->status, 200, 'idempotent re-provision returns 200' );
$sys2 = gsh_tp_get_schoolyears();
gsh_assert_eq( count( $sys2[0]['calendars'] ), 3, 'no duplicate calendars on re-provision' );

// Orphan: remove Eltern from groups
$resp3 = gsh_tp_curriculr_provision_schoolyear( 'sj_2026_27', '2026/27', array( 'Schulleitung' ) );
gsh_assert_eq( $resp3->status, 200, 'orphan marking returns 200' );
$sys3 = gsh_tp_get_schoolyears();
gsh_assert_eq( count( $sys3[0]['calendars'] ), 3, 'orphaned calendar NOT deleted' );
$eltern_cal = null;
foreach ( $sys3[0]['calendars'] as $c ) { if ( 'Eltern' === $c['group'] ) $eltern_cal = $c; }
gsh_assert_eq( $eltern_cal['orphaned'], true, 'Eltern marked orphaned' );
// Main never orphaned
gsh_assert_eq( $main_cal['orphaned'], false, 'main calendar not orphaned' );

// Un-orphan: add Eltern back
$resp4 = gsh_tp_curriculr_provision_schoolyear( 'sj_2026_27', '2026/27', array( 'Schulleitung', 'Eltern' ) );
$sys4 = gsh_tp_get_schoolyears();
foreach ( $sys4[0]['calendars'] as $c ) {
    if ( 'Eltern' === $c['group'] ) {
        gsh_assert_eq( $c['orphaned'], false, 'Eltern un-orphaned on re-add' );
    }
}

// Limit: max 8 calendars (1 main + 7 groups)
$too_many = array( 'G1','G2','G3','G4','G5','G6','G7','G8' ); // 8 groups + 1 main = 9
$GLOBALS['_wp_options'] = array(); // fresh
$resp_limit = gsh_tp_curriculr_provision_schoolyear( 'sj_test', 'Test', $too_many );
gsh_assert_eq( $resp_limit->status, 400, '9 calendars → 400 limit error' );

// Response includes calendars array
$GLOBALS['_wp_options'] = array();
$resp5 = gsh_tp_curriculr_provision_schoolyear( 'sj_2026_27', '2026/27', array( 'Schulleitung' ) );
gsh_assert_true( isset( $resp5->data['calendars'] ), 'response includes calendars array' );
gsh_assert_eq( count( $resp5->data['calendars'] ), 2, 'response has 2 calendars (main + Schulleitung)' );

gsh_test_done();
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-terminplan
php tests/curriculr/test-provision.php 2>&1 | head -5
```
Expected: `Call to undefined function gsh_tp_curriculr_provision_schoolyear()`

- [ ] **Step 3: Add `gsh_tp_curriculr_provision_schoolyear` to `curriculr-data-layer.php`**

Add after `gsh_tp_curriculr_rest_profile_map_put` (around line 645):

```php
/**
 * Provisioniert ein Schuljahr mit Haupt-Kalender + optionalen Gruppen-Kalendern.
 *
 * Legt das Schuljahr (falls fehlt) und alle angeforderten Kalender an.
 * Entfernte verwaltete Gruppen-Kalender werden als orphaned markiert (nicht gelöscht).
 * Vorhandene verwaiste Kalender werden reaktiviert wenn ihre Gruppe wieder genannt wird.
 *
 * @since 4.24.0
 * @param  string $sj     Schuljahr-Schlüssel (z.B. 'sj_2026_27').
 * @param  string $label  Schuljahr-Label (z.B. '2026/27').
 * @param  array  $groups Gruppenname-Liste (Strings).
 * @return WP_REST_Response
 */
function gsh_tp_curriculr_provision_schoolyear( $sj, $label, $groups ) {
    // Deduplizieren und sanitieren der Gruppen
    $requested = array();
    foreach ( (array) $groups as $g ) {
        $g = sanitize_text_field( $g );
        if ( '' !== $g && ! in_array( $g, $requested, true ) ) {
            $requested[] = $g;
        }
    }

    // Limit: max 7 Gruppen (= 8 Kalender inkl. Haupt)
    if ( count( $requested ) > 7 ) {
        return new WP_REST_Response(
            array( 'code' => 'limit_exceeded', 'message' => 'Max 7 group calendars per schoolyear (8 total)' ),
            400
        );
    }

    $schoolyears = gsh_tp_get_schoolyears();

    // Schuljahr finden oder anlegen
    $sy_idx = null;
    foreach ( $schoolyears as $i => $sy ) {
        if ( $sy['key'] === $sj ) {
            $sy_idx = $i;
            break;
        }
    }
    if ( null === $sy_idx ) {
        $schoolyears[] = array(
            'key'       => sanitize_key( $sj ),
            'label'     => sanitize_text_field( $label ),
            'is_active' => false,
            'created'   => current_time( 'Y-m-d' ),
            'shared'    => array( 'quartal_grenzen' => '', 'schuljahr_start' => '', 'cache_duration' => 3600 ),
            'calendars' => array(),
        );
        $sy_idx = count( $schoolyears ) - 1;
    }

    $sy = &$schoolyears[ $sy_idx ];

    // Haupt-Kalender sicherstellen
    $has_main = false;
    foreach ( $sy['calendars'] as $cal ) {
        if ( null === $cal['group'] ) {
            $has_main = true;
            break;
        }
    }
    if ( ! $has_main ) {
        array_unshift( $sy['calendars'], array(
            'group'    => null,
            'label'    => sanitize_text_field( $label ) . ' · Alle Termine',
            'ical_url' => '',
            'is_draft' => false,
            'managed'  => true,
            'orphaned' => false,
        ) );
    }

    // Gruppen-Kalender sicherstellen / un-orphanen
    foreach ( $requested as $group ) {
        $found = false;
        foreach ( $sy['calendars'] as &$cal ) {
            if ( $cal['group'] === $group ) {
                $cal['orphaned'] = false; // un-orphan on re-add
                $found = true;
                break;
            }
        }
        unset( $cal );
        if ( ! $found ) {
            $sy['calendars'][] = array(
                'group'    => $group,
                'label'    => $group,
                'ical_url' => '',
                'is_draft' => false,
                'managed'  => true,
                'orphaned' => false,
            );
        }
    }

    // Verwaltete Gruppen-Kalender die nicht (mehr) angefordert sind → orphaned
    foreach ( $sy['calendars'] as &$cal ) {
        if ( null === $cal['group'] ) {
            continue; // Haupt niemals orphanen
        }
        if ( ! empty( $cal['managed'] ) && ! in_array( $cal['group'], $requested, true ) ) {
            $cal['orphaned'] = true;
        }
    }
    unset( $cal );

    gsh_tp_save_schoolyears( $schoolyears );

    // Response: alle nicht-orphaned Kalender mit Feed-URL (leer wenn noch kein Token)
    $result = array();
    foreach ( $sy['calendars'] as $cal ) {
        if ( ! empty( $cal['orphaned'] ) ) {
            continue;
        }
        $result[] = array(
            'group'   => $cal['group'],
            'label'   => $cal['label'],
            'feedUrl' => ( '' !== $cal['ical_url'] ) ? $cal['ical_url'] : null,
        );
    }

    return new WP_REST_Response( array( 'updated' => true, 'calendars' => $result ), 200 );
}
```

- [ ] **Step 4: Rewrite `gsh_tp_curriculr_rest_profile_map_put`**

Replace the existing function in `curriculr-data-layer.php`:

```php
/**
 * POST /curriculr/v1/profile-map
 *
 * New form (4.24.0): { sj: string, label: string, groups: string[] }
 * Old form (kompat):  { sj: string, mappings: [{profileId: string, group: string|null}] }
 *
 * @since 4.22.0 (rewritten 4.24.0)
 */
function gsh_tp_curriculr_rest_profile_map_put( $req ) {
    $body = $req->get_json_params();
    $sj   = isset( $body['sj'] ) ? sanitize_key( $body['sj'] ) : '';

    if ( '' === $sj ) {
        return new WP_REST_Response( array( 'code' => 'invalid_input', 'message' => 'sj required' ), 400 );
    }

    // Detect form: new = has 'groups' key (even if empty array)
    if ( array_key_exists( 'groups', $body ) ) {
        $label  = isset( $body['label'] ) ? sanitize_text_field( $body['label'] ) : $sj;
        $groups = is_array( $body['groups'] ) ? $body['groups'] : array();
        return gsh_tp_curriculr_provision_schoolyear( $sj, $label, $groups );
    }

    // Old form: { sj, mappings:[{profileId, group}] } — Kompat-Pfad
    $mappings = isset( $body['mappings'] ) ? $body['mappings'] : null;
    if ( ! is_array( $mappings ) || empty( $mappings ) ) {
        return new WP_REST_Response( array( 'code' => 'invalid_input', 'message' => 'mappings required (old form) or groups required (new form)' ), 400 );
    }

    $normalised = array();
    foreach ( $mappings as $m ) {
        if ( ! is_array( $m ) ) {
            return new WP_REST_Response( array( 'code' => 'invalid_input', 'message' => 'each mapping must be an object' ), 400 );
        }
        $pid = sanitize_key( $m['profileId'] ?? '' );
        if ( '' === $pid ) {
            return new WP_REST_Response( array( 'code' => 'invalid_input', 'message' => 'profileId required' ), 400 );
        }
        $group        = ( isset( $m['group'] ) && is_string( $m['group'] ) && '' !== $m['group'] )
            ? sanitize_text_field( $m['group'] ) : null;
        $normalised[] = array( 'profileId' => $pid, 'group' => $group );
    }

    $map        = get_option( 'gsh_tp_curriculr_profile_map', array() );
    $map        = is_array( $map ) ? $map : array();
    $map[ $sj ] = $normalised;
    update_option( 'gsh_tp_curriculr_profile_map', $map, false );

    return new WP_REST_Response( array( 'updated' => true ), 200 );
}
```

- [ ] **Step 5: Rewrite `gsh_tp_curriculr_after_put` with dual path**

Replace the existing `gsh_tp_curriculr_after_put` function in `curriculr-data-layer.php`:

```php
/**
 * Nach erfolgreichem PUT: ICS-Cache + Feed-URL für alle Kalender dieses Schuljahres aktualisieren.
 *
 * Dual-path: schoolyears-nativ wenn das Schuljahr in gsh_tp_schoolyears liegt,
 * sonst legacy-Pfad via gsh_tp_curriculr_profile_map (Kompat für alte Installs).
 *
 * @since 4.6.0 (dual-path seit 4.24.0)
 * @param  string $sj    Schuljahr-Schlüssel.
 * @param  string $token Feed-Token.
 */
function gsh_tp_curriculr_after_put( $sj, $token ) {
    // Check schoolyears first (new nested model)
    $schoolyears = gsh_tp_get_schoolyears();
    $sy_idx      = null;
    foreach ( $schoolyears as $i => $sy ) {
        if ( $sy['key'] === $sj ) {
            $sy_idx = $i;
            break;
        }
    }

    if ( null !== $sy_idx ) {
        gsh_tp_curriculr_after_put_nested( $schoolyears, $sy_idx, $sj, $token );
        return;
    }

    // Legacy path: read from profile_map → flat profiles
    gsh_tp_curriculr_after_put_legacy( $sj, $token );
}

/**
 * after_put for nested schoolyears model.
 *
 * @since 4.24.0
 */
function gsh_tp_curriculr_after_put_nested( &$schoolyears, $sy_idx, $sj, $token ) {
    $sy  = &$schoolyears[ $sy_idx ];
    $row = gsh_tp_curriculr_repo_get( $sj );
    $doc = $row ? json_decode( $row['json'], true ) : null;

    $grenzen  = is_array( $doc ) ? gsh_tp_curriculr_quartal_grenzen_from_doc( $doc ) : '';
    $sj_start = '';
    if ( '' !== $grenzen && isset( $doc['schoolyear']['firstSchoolDay'] ) && gsh_tp_curriculr_is_iso_date( $doc['schoolyear']['firstSchoolDay'] ) ) {
        $sj_start = gsh_tp_curriculr_monday_of_week( $doc['schoolyear']['firstSchoolDay'] );
    }

    if ( '' !== $grenzen )  { $sy['shared']['quartal_grenzen'] = $grenzen; }
    if ( '' !== $sj_start ) { $sy['shared']['schuljahr_start'] = $sj_start; }

    foreach ( $sy['calendars'] as &$cal ) {
        if ( ! empty( $cal['orphaned'] ) ) {
            continue;
        }
        $group    = $cal['group'];
        $cal_id   = gsh_tp_calendar_id( $sj, $group );
        $feed_url = ( null === $group )
            ? gsh_tp_curriculr_feed_url( $sj, $token )
            : gsh_tp_curriculr_feed_url_group( $sj, $token, $group );

        $cal['ical_url'] = $feed_url;

        if ( $row && function_exists( 'gsh_tp_ck' ) && is_array( $doc ) ) {
            $pid_key = sanitize_key( $cal_id );
            update_option( gsh_tp_ck( 'gsh_tp_ical_', $pid_key ), gsh_tp_curriculr_build_ics( $doc, $group ), false );
            delete_transient( gsh_tp_ck( 'gsh_tp_fresh_', $pid_key ) );
        }
    }
    unset( $cal );

    gsh_tp_save_schoolyears( $schoolyears );
}

/**
 * after_put legacy path: reads gsh_tp_curriculr_profile_map → gsh_tp_profiles (flat).
 * Runs only when schoolyears model doesn't have this sj yet.
 *
 * @since 4.24.0 (extracted from original after_put)
 */
function gsh_tp_curriculr_after_put_legacy( $sj, $token ) {
    $mappings = gsh_tp_curriculr_profile_for( $sj );
    if ( empty( $mappings ) ) {
        return;
    }

    $row = gsh_tp_curriculr_repo_get( $sj );
    $doc = $row ? json_decode( $row['json'], true ) : null;

    $grenzen  = is_array( $doc ) ? gsh_tp_curriculr_quartal_grenzen_from_doc( $doc ) : '';
    $sj_start = '';
    if ( '' !== $grenzen && isset( $doc['schoolyear']['firstSchoolDay'] ) && gsh_tp_curriculr_is_iso_date( $doc['schoolyear']['firstSchoolDay'] ) ) {
        $sj_start = gsh_tp_curriculr_monday_of_week( $doc['schoolyear']['firstSchoolDay'] );
    }

    $profiles = get_option( 'gsh_tp_profiles', array() );
    $profiles = is_array( $profiles ) ? $profiles : array();
    $changed  = false;

    foreach ( $mappings as $mapping ) {
        if ( empty( $mapping['profileId'] ) ) { continue; }
        $pid      = $mapping['profileId'];
        $group    = isset( $mapping['group'] ) && is_string( $mapping['group'] ) ? $mapping['group'] : null;
        $feed_url = ( null === $group )
            ? gsh_tp_curriculr_feed_url( $sj, $token )
            : gsh_tp_curriculr_feed_url_group( $sj, $token, $group );

        foreach ( $profiles as &$p ) {
            if ( ! isset( $p['id'] ) || $p['id'] !== $pid ) { continue; }
            if ( ( $p['ical_url'] ?? '' ) !== $feed_url ) { $p['ical_url'] = $feed_url; $changed = true; }
            if ( '' !== $grenzen && ( $p['quartal_grenzen'] ?? '' ) !== $grenzen ) { $p['quartal_grenzen'] = $grenzen; $changed = true; }
            if ( '' !== $sj_start && ( $p['schuljahr_start'] ?? '' ) !== $sj_start ) { $p['schuljahr_start'] = $sj_start; $changed = true; }
        }
        unset( $p );

        if ( $row && function_exists( 'gsh_tp_ck' ) && is_array( $doc ) ) {
            $pid_key = sanitize_key( $pid );
            update_option( gsh_tp_ck( 'gsh_tp_ical_', $pid_key ), gsh_tp_curriculr_build_ics( $doc, $group ), false );
            delete_transient( gsh_tp_ck( 'gsh_tp_fresh_', $pid_key ) );
        }
    }

    if ( $changed ) {
        update_option( 'gsh_tp_profiles', $profiles, true );
    }
}
```

- [ ] **Step 6: PHP lint both files**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-terminplan
php -l plugin/gsh-terminplan.php && php -l plugin/curriculr-data-layer.php
```
Expected: `No syntax errors detected` for both

- [ ] **Step 7: Run all WP tests**

```bash
php tests/curriculr/test-provision.php && \
php tests/curriculr/test-schoolyears.php && \
php tests/curriculr/test-ics.php
```
Expected: all `ALL PASS`

- [ ] **Step 8: Commit**

```bash
git add plugin/curriculr-data-layer.php tests/curriculr/test-provision.php
git commit -m "feat: REST auto-provisioning + dual-path after_put (schoolyears-native + legacy kompat)"
```

---

## Task 4: WP — Admin UI (schoolyear-grouped) + Curriculr-Sync cleanup

**Files:**
- Modify: `curriculr-terminplan/plugin/gsh-terminplan.php`
  - Replace `gsh_tp_render_profile_chooser` + `gsh_tp_render_profile_tab` with schoolyear-grouped render
  - Replace `gsh_tp_handle_new_profile` with free-label/key version
  - Add `gsh_tp_handle_new_schoolyear`, `gsh_tp_handle_save_schoolyear`, `gsh_tp_handle_activate_schoolyear`, `gsh_tp_handle_delete_calendar`
  - Remove `Curriculr-Sync` tab entry (move Origin field to System tab)

**Interfaces:**
- Consumes: `gsh_tp_get_schoolyears()`, `gsh_tp_save_schoolyears()`, `gsh_tp_calendar_id()`, `gsh_tp_sanitize_schoolyear()`
- No new external interfaces — admin UI only

- [ ] **Step 1: Update tab definitions in `gsh_tp_settings_page`**

Find the `$tabs = array(...)` around line 3261 and update:

```php
$tabs = array(
    '_profile'    => 'Schuljahr-Profile',
    '_kategorien' => 'Kategorien',
    '_kiosk'      => 'Kiosk',
    '_system'     => 'System & Logs',
    // '_sync' removed — Curriculr-Sync 1:1 mapping superseded by SPA auto-provisioning
);
```

- [ ] **Step 2: Move Origin field to System tab**

In `gsh_tp_render_system_tab()` (or wherever system info is rendered), find where Origin (`gsh_tp_curriculr_origin`) is referenced and add a display-only row:

```php
// In gsh_tp_render_system_tab, find the Curriculr-Einstellungen section and keep it.
// The Origin INPUT field that was in the Sync tab must remain accessible.
// Find the existing Origin row in gsh_tp_render_sync_tab() and move it into
// gsh_tp_render_system_tab() under a new <h2>Curriculr REST-Einstellungen</h2>.
// The form POST handler (gsh_tp_handle_save_curriculr_settings) stays unchanged.
```

Concretely: locate `gsh_tp_render_sync_tab()` (around line ~3990), extract only the `<tr>` for `gsh_tp_curriculr_origin` and the `<tr>` for `gsh_tp_curriculr_sj_key` (the old 1:1 mapping — keep it for now as informational), and add them at the bottom of `gsh_tp_render_system_tab()`.

> Note: `gsh_tp_render_system_tab` and `gsh_tp_render_sync_tab` are large; find them by searching for `function gsh_tp_render_sync_tab` and `function gsh_tp_render_system_tab`.

- [ ] **Step 3: Replace `gsh_tp_render_profile_chooser` and `gsh_tp_render_profile_tab`**

Replace both functions with a single schoolyear-grouped render:

```php
/**
 * Rendert den Schuljahr-Profile-Tab (schoolyear-zentriert, 4.24.0).
 *
 * @since 4.24.0
 */
function gsh_tp_render_profile_tab_v2() {
    $schoolyears = gsh_tp_get_schoolyears();
    ?>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <h2 style="margin:0">Schuljahr-Profile</h2>
        <?php if ( count( $schoolyears ) < 5 ) : ?>
        <form method="post" style="margin:0">
            <?php wp_nonce_field( 'gsh_tp_new_schoolyear', 'gsh_tp_nsy_n' ); ?>
            <input type="text" name="gsh_tp_new_sy_key"   placeholder="sj_2027_28" class="regular-text" style="width:130px" required />
            <input type="text" name="gsh_tp_new_sy_label" placeholder="2027/28"    class="regular-text" style="width:100px" required />
            <button type="submit" name="gsh_tp_new_schoolyear" value="1" class="button" style="color:#27ae60;border-color:#27ae60">
                + Neues Schuljahr
            </button>
        </form>
        <?php endif; ?>
    </div>

    <?php if ( empty( $schoolyears ) ) : ?>
        <p class="description">Noch keine Schuljahre vorhanden. Erstelle das erste Schuljahr oder synchronisiere über den Planner.</p>
    <?php endif; ?>

    <?php foreach ( $schoolyears as $sy ) :
        $sy_key = $sy['key'];
        $pid    = sanitize_key( $sy_key );
    ?>
    <div style="border:1px solid #c3c4c7;border-radius:6px;margin-bottom:20px;overflow:hidden">
        <!-- Schuljahr-Header -->
        <div style="background:<?php echo ! empty( $sy['is_active'] ) ? '#e6f4ea' : '#f6f7f7'; ?>;padding:12px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <form method="post" style="margin:0;display:flex;align-items:center;gap:8px;flex:1">
                <?php wp_nonce_field( 'gsh_tp_save_schoolyear_' . $pid, 'gsh_tp_ssy_n_' . $pid ); ?>
                <input type="hidden" name="gsh_tp_ssy_key" value="<?php echo esc_attr( $sy_key ); ?>" />
                <strong style="min-width:60px">Schuljahr:</strong>
                <input type="text" name="gsh_tp_ssy_label" value="<?php echo esc_attr( $sy['label'] ); ?>"
                       class="regular-text" style="width:140px" />
                <button type="submit" name="gsh_tp_save_schoolyear" value="1" class="button button-small">Speichern</button>
            </form>
            <?php if ( empty( $sy['is_active'] ) ) : ?>
            <form method="post" style="margin:0">
                <?php wp_nonce_field( 'gsh_tp_activate_sy_' . $pid, 'gsh_tp_asy_n' ); ?>
                <input type="hidden" name="gsh_tp_asy_key" value="<?php echo esc_attr( $sy_key ); ?>" />
                <button type="submit" name="gsh_tp_activate_schoolyear" value="1"
                        class="button button-small" style="color:#1e8449;border-color:#1e8449">
                    Als aktiv setzen
                </button>
            </form>
            <?php else : ?>
                <span style="background:#1e8449;color:#fff;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600">AKTIV</span>
            <?php endif; ?>
            <span style="color:#888;font-size:12px">ID: <code><?php echo esc_html( $sy_key ); ?></code></span>
        </div>

        <!-- Shared Settings (Quartal etc.) -->
        <div style="padding:12px 16px;border-bottom:1px solid #c3c4c7">
            <form method="post">
                <?php wp_nonce_field( 'gsh_tp_save_shared_' . $pid, 'gsh_tp_ssh_n' ); ?>
                <input type="hidden" name="gsh_tp_ssh_key" value="<?php echo esc_attr( $sy_key ); ?>" />
                <table class="form-table" style="margin:0">
                    <tr>
                        <th style="padding:4px 10px 4px 0;width:200px"><label>Start Schulwoche 01</label></th>
                        <td style="padding:4px 0">
                            <input type="date" name="gsh_tp_ssh_start" value="<?php echo esc_attr( $sy['shared']['schuljahr_start'] ?? '' ); ?>" />
                        </td>
                    </tr>
                    <tr>
                        <th style="padding:4px 10px 4px 0"><label>Cache-Dauer (Sek.)</label></th>
                        <td style="padding:4px 0">
                            <input type="number" name="gsh_tp_ssh_cache" min="300" max="86400"
                                   value="<?php echo esc_attr( $sy['shared']['cache_duration'] ?? 3600 ); ?>" style="width:100px" />
                        </td>
                    </tr>
                    <tr>
                        <th style="padding:4px 10px 4px 0"><label>Quartalsgrenzen</label></th>
                        <td style="padding:4px 0">
                            <textarea name="gsh_tp_ssh_quartal" rows="4" class="large-text"
                            ><?php echo esc_textarea( $sy['shared']['quartal_grenzen'] ?? '' ); ?></textarea>
                            <p class="description" style="margin:2px 0 0">Pro Zeile: Startdatum|Enddatum (JJJJ-MM-TT).</p>
                        </td>
                    </tr>
                </table>
                <p><button type="submit" name="gsh_tp_save_shared" value="1" class="button">Einstellungen speichern</button></p>
            </form>
        </div>

        <!-- Kalender-Liste -->
        <table class="widefat" style="border:none;box-shadow:none">
            <thead>
                <tr>
                    <th>Kalender</th>
                    <th>Feed-URL</th>
                    <th>Status</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
            <?php foreach ( $sy['calendars'] as $cal ) :
                $cal_id  = gsh_tp_calendar_id( $sy_key, $cal['group'] );
                $is_main = null === $cal['group'];
                $row_bg  = ! empty( $cal['orphaned'] ) ? '#fff8f0' : '#fff';
            ?>
                <tr style="background:<?php echo esc_attr( $row_bg ); ?>">
                    <td>
                        <?php if ( $is_main ) : ?>
                            <strong>Alle Termine</strong>
                            <span style="font-size:11px;color:#888;margin-left:6px">(Haupt-Kalender)</span>
                        <?php else : ?>
                            <?php echo esc_html( $cal['group'] ); ?>
                            <?php if ( ! empty( $cal['managed'] ) ) : ?>
                                <span style="font-size:11px;background:#e6f0ff;color:#1a56db;padding:1px 6px;border-radius:10px;margin-left:4px">Curriculr</span>
                            <?php endif; ?>
                            <?php if ( ! empty( $cal['orphaned'] ) ) : ?>
                                <span style="font-size:11px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:10px;margin-left:4px">verwaist</span>
                            <?php endif; ?>
                        <?php endif; ?>
                        <br><span style="font-size:11px;color:#aaa">ID: <code><?php echo esc_html( $cal_id ); ?></code></span>
                    </td>
                    <td>
                        <?php if ( ! empty( $cal['ical_url'] ) ) : ?>
                            <input type="text" readonly value="<?php echo esc_attr( $cal['ical_url'] ); ?>"
                                   style="width:100%;font-size:12px;border:1px solid #ddd;padding:3px 6px"
                                   onclick="this.select()" title="Klicken zum Auswählen" />
                        <?php else : ?>
                            <em style="color:#aaa;font-size:12px">— wird nach Planner-Speichern gesetzt —</em>
                        <?php endif; ?>
                    </td>
                    <td>
                        <?php echo ! empty( $cal['is_draft'] ) ? '<span style="color:#b7950b">Entwurf</span>' : '<span style="color:#1e8449">Beschlossen</span>'; ?>
                    </td>
                    <td>
                        <?php if ( ! $is_main ) : ?>
                        <form method="post" style="margin:0;display:inline">
                            <?php wp_nonce_field( 'gsh_tp_del_cal_' . sanitize_key($cal_id), 'gsh_tp_dc_n' ); ?>
                            <input type="hidden" name="gsh_tp_dc_sy"  value="<?php echo esc_attr( $sy_key ); ?>" />
                            <input type="hidden" name="gsh_tp_dc_cal" value="<?php echo esc_attr( $cal['group'] ); ?>" />
                            <button type="submit" name="gsh_tp_del_cal" value="1"
                                    class="button button-small" style="color:#c0392b;border-color:#c0392b"
                                    onclick="return confirm('Kalender «Kalender<?php echo esc_js($cal['group']); ?>» wirklich löschen?')">
                                &times; Löschen
                            </button>
                        </form>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endforeach; ?>
    <?php
}
```

- [ ] **Step 4: Add POST handlers for schoolyear admin actions**

Add after `gsh_tp_handle_new_profile` (or replace it):

```php
function gsh_tp_handle_new_schoolyear() {
    if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['gsh_tp_nsy_n'] ?? '' ) ), 'gsh_tp_new_schoolyear' ) ) {
        echo '<div class="notice notice-error"><p>Sicherheitsprüfung fehlgeschlagen.</p></div>'; return;
    }
    $key   = sanitize_key( wp_unslash( $_POST['gsh_tp_new_sy_key'] ?? '' ) );
    $label = sanitize_text_field( wp_unslash( $_POST['gsh_tp_new_sy_label'] ?? '' ) );
    if ( '' === $key ) { echo '<div class="notice notice-error"><p>Schuljahr-Schlüssel fehlt.</p></div>'; return; }

    $schoolyears = gsh_tp_get_schoolyears();
    foreach ( $schoolyears as $sy ) {
        if ( $sy['key'] === $key ) {
            echo '<div class="notice notice-warning"><p>Schuljahr <strong>' . esc_html($key) . '</strong> existiert bereits.</p></div>'; return;
        }
    }
    if ( count( $schoolyears ) >= 5 ) {
        echo '<div class="notice notice-error"><p>Maximal 5 Schuljahre.</p></div>'; return;
    }
    $schoolyears[] = array(
        'key'       => $key,
        'label'     => $label ?: $key,
        'is_active' => false,
        'created'   => current_time( 'Y-m-d' ),
        'shared'    => array( 'quartal_grenzen' => '', 'schuljahr_start' => '', 'cache_duration' => 3600 ),
        'calendars' => array(),
    );
    gsh_tp_save_schoolyears( $schoolyears );
    echo '<div class="notice notice-success"><p>Schuljahr <strong>' . esc_html($label ?: $key) . '</strong> angelegt.</p></div>';
}

function gsh_tp_handle_save_schoolyear() {
    $sy_key = sanitize_key( wp_unslash( $_POST['gsh_tp_ssy_key'] ?? '' ) );
    if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['gsh_tp_ssy_n_' . $sy_key] ?? '' ) ), 'gsh_tp_save_schoolyear_' . $sy_key ) ) {
        echo '<div class="notice notice-error"><p>Sicherheitsprüfung fehlgeschlagen.</p></div>'; return;
    }
    $label       = sanitize_text_field( wp_unslash( $_POST['gsh_tp_ssy_label'] ?? '' ) );
    $schoolyears = gsh_tp_get_schoolyears();
    $changed     = false;
    foreach ( $schoolyears as &$sy ) {
        if ( $sy['key'] === $sy_key ) { $sy['label'] = $label ?: $sy['key']; $changed = true; break; }
    }
    unset( $sy );
    if ( $changed ) { gsh_tp_save_schoolyears( $schoolyears ); echo '<div class="notice notice-success"><p>Schuljahr gespeichert.</p></div>'; }
}

function gsh_tp_handle_save_shared() {
    $sy_key = sanitize_key( wp_unslash( $_POST['gsh_tp_ssh_key'] ?? '' ) );
    if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['gsh_tp_ssh_n'] ?? '' ) ), 'gsh_tp_save_shared_' . $sy_key ) ) {
        echo '<div class="notice notice-error"><p>Sicherheitsprüfung fehlgeschlagen.</p></div>'; return;
    }
    $schoolyears = gsh_tp_get_schoolyears();
    foreach ( $schoolyears as &$sy ) {
        if ( $sy['key'] !== $sy_key ) { continue; }
        $sy['shared']['schuljahr_start'] = sanitize_text_field( wp_unslash( $_POST['gsh_tp_ssh_start'] ?? '' ) );
        $sy['shared']['cache_duration']  = max( 300, min( 86400, absint( $_POST['gsh_tp_ssh_cache'] ?? 3600 ) ) );
        $sy['shared']['quartal_grenzen'] = sanitize_textarea_field( wp_unslash( $_POST['gsh_tp_ssh_quartal'] ?? '' ) );
        break;
    }
    unset( $sy );
    gsh_tp_save_schoolyears( $schoolyears );
    echo '<div class="notice notice-success"><p>Einstellungen gespeichert.</p></div>';
}

function gsh_tp_handle_activate_schoolyear() {
    $act_key = sanitize_key( wp_unslash( $_POST['gsh_tp_asy_key'] ?? '' ) );
    if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['gsh_tp_asy_n'] ?? '' ) ), 'gsh_tp_activate_sy_' . $act_key ) ) {
        echo '<div class="notice notice-error"><p>Sicherheitsprüfung fehlgeschlagen.</p></div>'; return;
    }
    $schoolyears = gsh_tp_get_schoolyears();
    foreach ( $schoolyears as &$sy ) { $sy['is_active'] = ( $sy['key'] === $act_key ); }
    unset( $sy );
    gsh_tp_save_schoolyears( $schoolyears );
    echo '<div class="notice notice-success"><p>Schuljahr als aktiv gesetzt.</p></div>';
}

function gsh_tp_handle_delete_calendar() {
    $sy_key = sanitize_key( wp_unslash( $_POST['gsh_tp_dc_sy'] ?? '' ) );
    $group  = sanitize_text_field( wp_unslash( $_POST['gsh_tp_dc_cal'] ?? '' ) );
    $cal_id = gsh_tp_calendar_id( $sy_key, $group );
    if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['gsh_tp_dc_n'] ?? '' ) ), 'gsh_tp_del_cal_' . sanitize_key($cal_id) ) ) {
        echo '<div class="notice notice-error"><p>Sicherheitsprüfung fehlgeschlagen.</p></div>'; return;
    }
    if ( '' === $group ) { echo '<div class="notice notice-error"><p>Haupt-Kalender kann nicht gelöscht werden.</p></div>'; return; }
    $schoolyears = gsh_tp_get_schoolyears();
    foreach ( $schoolyears as &$sy ) {
        if ( $sy['key'] !== $sy_key ) { continue; }
        $sy['calendars'] = array_values( array_filter( $sy['calendars'], function($c) use ($group) { return $c['group'] !== $group; } ) );
        break;
    }
    unset( $sy );
    gsh_tp_save_schoolyears( $schoolyears );
    echo '<div class="notice notice-success"><p>Kalender <strong>' . esc_html($group) . '</strong> gelöscht.</p></div>';
}
```

- [ ] **Step 5: Wire POST handlers and render into `gsh_tp_settings_page`**

In `gsh_tp_settings_page()`, in the POST-handler dispatch section, add:

```php
// POST: new schoolyear admin actions (4.24.0)
if ( isset( $_POST['gsh_tp_new_schoolyear'] ) )   { gsh_tp_handle_new_schoolyear(); }
if ( isset( $_POST['gsh_tp_save_schoolyear'] ) )  { gsh_tp_handle_save_schoolyear(); }
if ( isset( $_POST['gsh_tp_save_shared'] ) )      { gsh_tp_handle_save_shared(); }
if ( isset( $_POST['gsh_tp_activate_schoolyear'] ) ) { gsh_tp_handle_activate_schoolyear(); }
if ( isset( $_POST['gsh_tp_del_cal'] ) )          { gsh_tp_handle_delete_calendar(); }
```

In the tab render switch (around line 3379), update the `_profile` case:

```php
// replace:
//   gsh_tp_render_profile_chooser( $profiles, $sel_profile );
//   gsh_tp_render_profile_tab( $sel_profile );
// with:
gsh_tp_render_profile_tab_v2();
```

- [ ] **Step 6: PHP lint**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-terminplan
php -l plugin/gsh-terminplan.php
```
Expected: `No syntax errors detected`

- [ ] **Step 7: Smoke-test migration + existing tests**

```bash
php tests/curriculr/test-schoolyears.php && \
php tests/curriculr/test-provision.php && \
php tests/curriculr/test-ics.php
```
Expected: all `ALL PASS`

- [ ] **Step 8: Commit**

```bash
git add plugin/gsh-terminplan.php
git commit -m "feat: schoolyear-grouped admin UI, new free-label create, remove stale Curriculr-Sync tab"
```

---

## Task 5: SPA — Types + sync client

**Files:**
- Modify: `curriculr-planner/src/lib/wp-sync-config.ts`
- Modify: `curriculr-planner/src/lib/wp-sync.ts`
- Modify: `curriculr-planner/src/lib/wp-sync.test.ts` (update existing + add new test)

**Interfaces:**
- Produces:
  - `WpCalendarGroup: { group: string | null; label: string; feedUrl: string | null }` — response item
  - `WpPlanLink` updated: drop `wpProfileId` + `calendarMappings`, add `calendarGroups?: string[]`, `provisionedCalendars?: WpCalendarGroup[]`
  - `postProfileMap(cfg, token, sj, label, groups, fetch?) => Promise<{ status: 'ok'|'error'; calendars?: WpCalendarGroup[] }>`

- [ ] **Step 1: Update types in `wp-sync-config.ts`**

```typescript
import type { UUID } from '@/types';
import type { WpStage } from './wp-stage';

const KEY = 'curriculr-planner:wp-sync';
const VALID_STAGES = new Set<string>(['entwurf', 'genehmigt', 'oeffentlich']);

/** Calendar returned by REST provisioning. */
export interface WpCalendarGroup {
  group: string | null;
  label: string;
  feedUrl: string | null;
}

export interface WpPlanLink {
  schoolyearKey: string;
  schoolyearLabel: string;
  stage: WpStage;
  knownVersion: number;
  feedUrl?: string;
  /** Selected group names to provision as separate calendars. */
  calendarGroups?: string[];
  /** Last-provisioned calendars with feed URLs (set after successful send). */
  provisionedCalendars?: WpCalendarGroup[];
}

export interface WpSyncConfig {
  enabled: boolean;
  baseUrl: string;
  links: Record<UUID, WpPlanLink>;
}

export const EMPTY_CONFIG: WpSyncConfig = {
  enabled: false, baseUrl: '', links: {},
};

function parseCalendarGroups(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const groups = raw
    .filter((g): g is string => typeof g === 'string' && g.length > 0);
  return groups.length > 0 ? groups : undefined;
}

function parseProvisionedCalendars(raw: unknown): WpCalendarGroup[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const cals = raw
    .filter((c): c is Record<string, unknown> => c !== null && typeof c === 'object')
    .map((c): WpCalendarGroup | null => {
      const label = typeof c.label === 'string' ? c.label : '';
      if (!label) return null;
      const group = typeof c.group === 'string' ? c.group : null;
      const feedUrl = typeof c.feedUrl === 'string' ? c.feedUrl : null;
      return { group, label, feedUrl };
    })
    .filter((c): c is WpCalendarGroup => c !== null);
  return cals.length > 0 ? cals : undefined;
}

function parseLink(v: unknown): WpPlanLink | null {
  if (!v || typeof v !== 'object') return null;
  const l = v as Record<string, unknown>;
  const stage = typeof l.stage === 'string' && VALID_STAGES.has(l.stage) ? (l.stage as WpStage) : 'entwurf';
  const feedUrl = typeof l.feedUrl === 'string' && /^https:\/\//i.test(l.feedUrl) ? l.feedUrl : undefined;
  const calendarGroups = parseCalendarGroups(l.calendarGroups);
  const provisionedCalendars = parseProvisionedCalendars(l.provisionedCalendars);
  return {
    schoolyearKey:   typeof l.schoolyearKey   === 'string' ? l.schoolyearKey   : '',
    schoolyearLabel: typeof l.schoolyearLabel  === 'string' ? l.schoolyearLabel  : '',
    stage,
    knownVersion: typeof l.knownVersion === 'number' ? l.knownVersion : 0,
    ...(feedUrl             ? { feedUrl }             : {}),
    ...(calendarGroups      ? { calendarGroups }      : {}),
    ...(provisionedCalendars ? { provisionedCalendars } : {}),
  };
}

export function loadWpConfig(): WpSyncConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY_CONFIG);
    const p = JSON.parse(raw);
    const rawLinks = p.links && typeof p.links === 'object' ? p.links : {};
    const links: Record<UUID, WpPlanLink> = {};
    for (const [k, v] of Object.entries(rawLinks)) {
      const parsed = parseLink(v);
      if (parsed) links[k as UUID] = parsed;
    }
    return { enabled: !!p.enabled, baseUrl: typeof p.baseUrl === 'string' ? p.baseUrl : '', links };
  } catch {
    return structuredClone(EMPTY_CONFIG);
  }
}

export function saveWpConfig(cfg: WpSyncConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}
```

- [ ] **Step 2: Update `postProfileMap` in `wp-sync.ts`**

Replace the `postProfileMap` function (leave all other functions unchanged):

```typescript
export async function postProfileMap(
  cfg: WpSyncConfig,
  token: string,
  sj: string,
  label: string,
  groups: string[],
  fetchImpl: FetchLike = fetch,
): Promise<{ status: 'ok' | 'error'; calendars?: WpCalendarGroup[] }> {
  try {
    const res = await fetchImpl(`${base(cfg)}/profile-map`, {
      method: 'POST',
      headers: { Authorization: bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sj, label, groups }),
    });
    if (!res.ok) return { status: 'error' };
    const data = await res.json() as Record<string, unknown>;
    const calendars = Array.isArray(data.calendars)
      ? (data.calendars as WpCalendarGroup[])
      : undefined;
    return { status: 'ok', calendars };
  } catch {
    return { status: 'error' };
  }
}
```

Add the `WpCalendarGroup` import at the top of `wp-sync.ts`:

```typescript
import type { WpSyncConfig, WpCalendarGroup } from './wp-sync-config';
```

(Remove the old `CalendarMapping` import if present.)

- [ ] **Step 3: Update `wp-sync.test.ts`**

Find the test for `postProfileMap` (or add if missing) — check `src/lib/wp-sync.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { postProfileMap } from './wp-sync';
import type { WpSyncConfig } from './wp-sync-config';

const cfg: WpSyncConfig = { enabled: true, baseUrl: 'https://example.com', links: {} };
const token = 'tok';

describe('postProfileMap', () => {
  it('sends new-form body and returns ok + calendars', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        updated: true,
        calendars: [
          { group: null,          label: 'Alle Termine',  feedUrl: 'https://example.com/wp-json/curriculr/v1/feed/sj_2026_27/abc.ics' },
          { group: 'Schulleitung', label: 'Schulleitung', feedUrl: 'https://example.com/wp-json/curriculr/v1/feed/sj_2026_27/abc/schulleitung.ics' },
        ],
      }),
    });

    const result = await postProfileMap(cfg, token, 'sj_2026_27', '2026/27', ['Schulleitung'], fakeFetch);

    expect(result.status).toBe('ok');
    expect(result.calendars).toHaveLength(2);
    expect(result.calendars![0].group).toBeNull();
    expect(result.calendars![1].group).toBe('Schulleitung');

    const body = JSON.parse(fakeFetch.mock.calls[0][1].body as string);
    expect(body).toEqual({ sj: 'sj_2026_27', label: '2026/27', groups: ['Schulleitung'] });
    expect(body).not.toHaveProperty('mappings'); // new form, not old form
  });

  it('returns error on non-ok response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await postProfileMap(cfg, token, 'sj', '26/27', [], fakeFetch);
    expect(result.status).toBe('error');
  });

  it('returns error on network failure', async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await postProfileMap(cfg, token, 'sj', '26/27', [], fakeFetch);
    expect(result.status).toBe('error');
  });
});
```

- [ ] **Step 4: Run SPA type check + tests**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-planner
npm run typecheck 2>&1 | tail -5
npm run test:run -- src/lib/wp-sync.test.ts 2>&1 | tail -10
```
Expected: no type errors, tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-planner
git add src/lib/wp-sync-config.ts src/lib/wp-sync.ts src/lib/wp-sync.test.ts
git commit -m "feat: update postProfileMap to new {sj, label, groups} form + WpCalendarGroup types"
```

---

## Task 6: SPA — WordpressTab + GroupsTab

**Files:**
- Modify: `curriculr-planner/src/components/settings/WordpressTab.tsx`
- Modify: `curriculr-planner/src/components/settings/GroupsTab.tsx`
- Modify: `curriculr-planner/src/stores/wpSync.ts` (update patchLink call)

**Interfaces:**
- Consumes: `postProfileMap` (Task 5), `WpCalendarGroup`, updated `WpPlanLink` (Task 5)
- No new exports

- [ ] **Step 1: Add "Orga" to `SUGGESTED_GROUPS` in `GroupsTab.tsx`**

Find `const SUGGESTED_GROUPS = [` in [src/components/settings/GroupsTab.tsx](src/components/settings/GroupsTab.tsx) and add `'Orga',` after `'Schulleitung',`:

```typescript
const SUGGESTED_GROUPS = [
  'Lehrkräfte',
  'Eltern',
  'Schülerinnen und Schüler',
  'Schulleitung',
  'Orga',            // ← add
  'Sekretariat',
  'Hausmeister',
  'Kollegium',
  'Förderverein',
  'Klassenlehrkräfte',
  'Fachschaften',
];
```

- [ ] **Step 2: Rewrite `WordpressTab.tsx`**

Replace the entire file content:

```typescript
import { useState } from 'react';
import { useWpSyncStore } from '@/stores/wpSync';
import { usePlannerStore } from '@/stores/planner';
import { useAuthStore } from '@/stores/auth';
import { testConnection, postProfileMap } from '@/lib/wp-sync';
import { startIservLogin, iservLogout } from '@/lib/wp-auth-actions';
import { STAGE_LABELS, type WpStage } from '@/lib/wp-stage';
import type { WpPlanLink, WpCalendarGroup } from '@/lib/wp-sync-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export function WordpressTab() {
  const config = useWpSyncStore((s) => s.config);
  const setConfig = useWpSyncStore((s) => s.setConfig);
  const doc = usePlannerStore((s) => s.doc);
  const authStatus = useAuthStore((s) => s.status);
  const claims = useAuthStore((s) => s.claims);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const [testState, setTestState] = useState({ msg: '', busy: false });
  const [pmStatus, setPmStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  const docId = doc?.schoolyear.id;
  const link = docId ? config.links[docId] : undefined;

  // Auto-suggest schoolyear key from doc id (doc.schoolyear.id is already slug-like)
  const suggestedSjKey = doc?.schoolyear.id
    ? `sj_${doc.schoolyear.id.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
    : '';
  const suggestedLabel = doc?.meta?.name ?? '';

  function handleLogin() {
    if (!config.enabled || !config.baseUrl) return;
    startIservLogin(config.baseUrl);
  }

  function handleLogout() {
    const currentToken = token;
    logout();
    if (config.baseUrl && currentToken) void iservLogout(config.baseUrl, currentToken);
  }

  async function onTest() {
    if (!token) return;
    setTestState({ msg: 'Teste…', busy: true });
    const r = await testConnection(config, token);
    setTestState({ msg: r.message, busy: false });
  }

  function patchLink(patch: Partial<WpPlanLink>) {
    if (!docId) return;
    const base: WpPlanLink = link ?? {
      schoolyearKey: suggestedSjKey,
      schoolyearLabel: suggestedLabel,
      stage: 'entwurf',
      knownVersion: 0,
    };
    setConfig({ ...config, links: { ...config.links, [docId]: { ...base, ...patch } } });
  }

  const calendarGroups: string[] = link?.calendarGroups ?? [];
  const provisionedCalendars: WpCalendarGroup[] = link?.provisionedCalendars ?? [];

  function toggleGroup(group: string) {
    const next = calendarGroups.includes(group)
      ? calendarGroups.filter((g) => g !== group)
      : [...calendarGroups, group];
    patchLink({ calendarGroups: next });
  }

  async function onSendProfileMap() {
    if (!token || !docId || !link) return;
    const sj    = link.schoolyearKey;
    const label = link.schoolyearLabel || link.schoolyearKey;
    setPmStatus('sending');
    const result = await postProfileMap(config, token, sj, label, calendarGroups);
    if (result.status === 'ok') {
      patchLink({ provisionedCalendars: result.calendars ?? [] });
      setPmStatus('ok');
    } else {
      setPmStatus('error');
    }
  }

  // Groups available for calendar provisioning (from the open document)
  const availableGroups = doc?.availableGroups ?? [];

  return (
    <div className="space-y-5 max-w-xl">
      <p className="text-[13px] text-[var(--color-ink-500)]">
        Optional. Aus = der Planner arbeitet lokal + Export. Ein = Pläne an WordPress senden.
      </p>

      <label className="flex items-center gap-2 text-[14px]">
        <Checkbox checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: !!v })} />
        WordPress-Synchronisation aktivieren
      </label>

      <div>
        <Label>WordPress-Adresse</Label>
        <Input
          value={config.baseUrl}
          placeholder="https://schule.example"
          onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
        />
      </div>

      {/* IServ-Anmeldung */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-[13px] font-semibold">Anmeldung (IServ-SSO)</p>
        {authStatus === 'authenticated' && claims ? (
          <div className="space-y-2">
            <p className="text-[13px]">
              Angemeldet als <strong>{claims.name}</strong>
              <span className="ml-2 text-[11px] text-[var(--color-ink-500)]">({claims.groups.join(', ')})</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={onTest} disabled={testState.busy}>Verbindung testen</Button>
              <Button variant="outline" onClick={handleLogout}>Abmelden</Button>
            </div>
            {testState.msg && <p className="text-[13px]">{testState.msg}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[12px] text-[var(--color-ink-500)]">Anmeldung über IServ erforderlich.</p>
            <Button onClick={handleLogin} disabled={!config.baseUrl || !config.enabled}>
              Mit IServ anmelden
            </Button>
            {!config.baseUrl && (
              <p className="text-[11px] text-[var(--color-warning)]">Zuerst WordPress-Adresse eintragen.</p>
            )}
          </div>
        )}
      </div>

      {/* Schuljahr-Verknüpfung */}
      {doc && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-[13px] font-semibold">Schuljahr-Verknüpfung für „{doc.meta.name}"</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Schuljahr-Schlüssel (WP)</Label>
              <Input
                value={link?.schoolyearKey ?? suggestedSjKey}
                placeholder="sj_2026_27"
                onChange={(e) => patchLink({ schoolyearKey: e.target.value })}
              />
              <p className="text-[11px] text-[var(--color-ink-500)] mt-1">
                Identifiziert das Schuljahr in WordPress eindeutig.
              </p>
            </div>
            <div>
              <Label>Schuljahr-Label (WP)</Label>
              <Input
                value={link?.schoolyearLabel ?? suggestedLabel}
                placeholder="2026/27"
                onChange={(e) => patchLink({ schoolyearLabel: e.target.value })}
              />
            </div>
          </div>
          {link && (
            <div className="text-[12px] space-y-1">
              <p>Aktuelle Stufe: <strong>{STAGE_LABELS[link.stage as WpStage]}</strong></p>
              {link.feedUrl && (
                <p>Haupt-Feed: <a href={link.feedUrl} target="_blank" rel="noopener noreferrer"
                   className="underline break-all" style={{ color: 'var(--color-marine-500)' }}>
                  {link.feedUrl}
                </a></p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Gruppen-Kalender */}
      {doc && link && config.enabled && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-[13px] font-semibold">Kalender-Konfiguration</p>
          <div className="rounded-md bg-[var(--color-marine-100)] border border-[var(--color-marine-500)] p-3 space-y-1">
            <p className="text-[12px] text-[var(--color-ink-500)]">
              WordPress legt automatisch einen <strong>Haupt-Kalender mit allen Terminen</strong> an
              (für das Kollegium). Zusätzlich kannst du separate Kalender je Gruppe einrichten.
            </p>
            <p className="text-[12px] text-[var(--color-ink-500)]">
              Termine <strong>ohne Gruppe</strong> erscheinen in allen Gruppen-Feeds.
            </p>
          </div>

          {/* Haupt-Kalender — immer an */}
          <div className="flex items-center gap-2 opacity-60">
            <Checkbox checked disabled />
            <span className="text-[13px]">Haupt-Kalender (alle Termine) — immer aktiv</span>
          </div>

          {/* Gruppen-Checkboxen */}
          {availableGroups.length > 0 ? (
            availableGroups.map((g) => (
              <label key={g} className="flex items-center gap-2 text-[13px] cursor-pointer">
                <Checkbox
                  checked={calendarGroups.includes(g)}
                  onCheckedChange={() => toggleGroup(g)}
                />
                {g}
              </label>
            ))
          ) : (
            <p className="text-[12px] text-[var(--color-ink-500)]">
              Keine Gruppen im Planner definiert. Füge Gruppen unter Einstellungen → Gruppen hinzu.
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={onSendProfileMap} disabled={pmStatus === 'sending' || !link.schoolyearKey}>
              {pmStatus === 'sending' ? 'Sende…' : 'Konfiguration senden'}
            </Button>
            {pmStatus === 'ok'    && <p className="text-[12px] text-[var(--color-status-green)]">✓ Gespeichert</p>}
            {pmStatus === 'error' && <p className="text-[12px] text-[var(--color-status-red)]">Fehler beim Senden</p>}
          </div>

          {/* Provisioned feed URLs */}
          {provisionedCalendars.length > 0 && (
            <div className="rounded-md border border-[var(--color-marine-200)] p-3 space-y-2">
              <p className="text-[12px] font-semibold text-[var(--color-ink-700)]">Kalender-Feeds (für IServ-Abo):</p>
              {provisionedCalendars.map((cal) => (
                <div key={cal.group ?? '__main'} className="text-[12px]">
                  <span className="font-medium">{cal.group ?? 'Alle Termine'}:</span>{' '}
                  {cal.feedUrl ? (
                    <a href={cal.feedUrl} target="_blank" rel="noopener noreferrer"
                       className="underline break-all" style={{ color: 'var(--color-marine-500)' }}>
                      {cal.feedUrl}
                    </a>
                  ) : (
                    <em className="text-[var(--color-ink-400)]">wird nach Speichern des Plans gesetzt</em>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type check**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-planner
npm run typecheck 2>&1 | tail -10
```
Expected: no errors

- [ ] **Step 4: Run full SPA test suite**

```bash
npm run test:run 2>&1 | tail -15
```
Expected: all pass (no regressions from type changes)

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/WordpressTab.tsx src/components/settings/GroupsTab.tsx
git commit -m "feat: WordpressTab group-checkbox + provisioned feed URLs, add Orga to suggestions"
```

---

## Task 7: Version bumps + ZIP

**Files:**
- Modify: `curriculr-terminplan/plugin/gsh-terminplan.php` (4 version locations)
- Modify: `curriculr-planner/package.json`

**Interfaces:** none — release artifacts only

- [ ] **Step 1: Bump WP plugin version to 4.24.0 (4 places)**

In `curriculr-terminplan/plugin/gsh-terminplan.php`, update all four occurrences:

```
Line 6:   * Version:     4.24.0
Line 584: define( 'GSH_TP_VERSION', '4.24.0' );
Changelog array entry (search for "'version' => '4.23.0'" around line 829):
            'version'  => '4.24.0',
            'entries'  => array(
                array( 'tag' => 'NEU',   'text' => 'Schuljahr-zentrierte Kalenderverwaltung: nested gsh_tp_schoolyears + Projektion, automatische Gruppen-Kalender-Provisionierung via SPA' ),
                array( 'tag' => 'NEU',   'text' => 'REST POST /curriculr/v1/profile-map neue Form: {sj, label, groups[]} — WP legt Haupt-Kalender + Gruppen-Kalender automatisch an' ),
                array( 'tag' => 'NEU',   'text' => 'Admin-UI Schuljahr-gruppiert: Schuljahre als Karten mit eingerückten Kalender-Feeds, freier Schlüssel + Label beim Anlegen' ),
                array( 'tag' => 'NEU',   'text' => 'Migration flat gsh_tp_profiles → gsh_tp_schoolyears (einmalig, admin_init, idempotent, profile_map unberührt)' ),
                array( 'tag' => 'FIX',   'text' => 'after_put dual-path: schoolyears-nativ wenn Schuljahr provisioniert, sonst legacy profile_map Kompat-Pfad' ),
                array( 'tag' => 'UX',    'text' => 'Curriculr-Sync Tab entfernt — 1:1 Mapping superseded durch SPA auto-provisioning; Origin-Feld in System & Logs' ),
            ),
```

Also update the `'version' => '4.23.0'` in the changelog array to reference 4.23.0 correctly (it should already be there as the previous version entry — just insert the new 4.24.0 block before it).

- [ ] **Step 2: Bump SPA version**

In `curriculr-planner/package.json`, change:
```json
"version": "1.9.0",
```
to:
```json
"version": "1.10.0",
```

- [ ] **Step 3: Final lint + test run**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-terminplan
php -l plugin/gsh-terminplan.php && php -l plugin/curriculr-data-layer.php && \
php tests/curriculr/test-schoolyears.php && \
php tests/curriculr/test-provision.php && \
php tests/curriculr/test-ics.php

cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-planner
npm run typecheck && npm run test:run
```
Expected: all pass

- [ ] **Step 4: Commit both repos**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-terminplan
git add plugin/gsh-terminplan.php
git commit -m "chore: bump to 4.24.0 — schuljahr-zentrierte Kalenderverwaltung"

cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-planner
git add package.json
git commit -m "chore: bump to 1.10.0 — new group calendar provisioning UI"
```

- [ ] **Step 5: Build ZIP**

```bash
cd /Users/julian.wagner/Coding/curriculr-planner/curriculr-terminplan/plugin
VER=$(grep "define.*GSH_TP_VERSION" gsh-terminplan.php | grep -oE "[0-9]+\.[0-9]+\.[0-9]+" | head -1)
echo "Building $VER"
zip ../../curriculr-terminplan-$VER.zip \
    gsh-terminplan.php \
    curriculr-data-layer.php \
    curriculr-auth.php \
    curriculr-guard.php \
    page-terminplan-entwurf.php \
    page-terminplan-kiosk.php
zip -r ../../curriculr-terminplan-$VER.zip assets/
echo "ZIP: curriculr-terminplan-$VER.zip"
ls -lh ../../curriculr-terminplan-$VER.zip
```
Expected: file exists, size reasonable (< 500 KB)

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| nested `gsh_tp_schoolyears` source-of-truth | Task 1 |
| `gsh_tp_get_profiles()` flat projection | Task 1 |
| Fallback to old flat option | Task 1 |
| Migration flat → nested | Task 2 |
| profile_map NOT auto-migrated | Task 2 |
| REST auto-provisioning new form | Task 3 |
| Haupt-Kalender always provisioned | Task 3 |
| Orphan marking (no delete) | Task 3 |
| Max 8 calendars | Task 3 |
| Old form kompat | Task 3 |
| after_put dual path | Task 3 |
| Admin grouped by schoolyear | Task 4 |
| Free label/key on create | Task 4 |
| Stale Sync tab removed | Task 4 |
| Feed-URL display (copy) | Task 4 |
| Delete group calendar only | Task 4 |
| SPA types updated | Task 5 |
| `postProfileMap` new signature | Task 5 |
| WordpressTab group checklist | Task 6 |
| Feed URLs shown after send | Task 6 |
| "Orga" in suggestions | Task 6 |
| Version bumps (4 WP + SPA) | Task 7 |
| ZIP built | Task 7 |

All spec requirements covered. No placeholders remaining.
