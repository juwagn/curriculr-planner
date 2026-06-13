# M5 Conflict Author Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a 409 conflict occurs, show who last saved the WordPress version and when, so the user can make an informed decision.

**Architecture:** The WP plugin's 409 response is enriched with `authorName` and `savedAt` from `wp_curriculr_doc_revisions`. The SPA lib parses them into `PushResult`, the store stores them in `ConflictInfo`, and the conflict dialog surfaces them. No new fields in `PlannerDocument`; no schema migration.

**Tech Stack:** PHP (WP plugin), React 19, TypeScript strict, Zustand, Vitest + jsdom

---

## Working directories

- **WP Plugin:** `curriculr-terminplan/` (PHP, `php` CLI tests, no WP needed)
- **SPA:** `curriculr-planner/curriculr-planner/` (Vite + React, `npm run ...`)

---

## File map

| File | Action | Purpose |
|------|--------|---------|
| `curriculr-terminplan/plugin/curriculr-data-layer.php` | MODIFY | `repo_put` looks up revision author on conflict; `rest_put` includes `authorName`/`savedAt` in 409 body |
| `curriculr-terminplan/plugin/gsh-terminplan.php` | MODIFY | Version bump 4.11.1 → 4.12.0 |
| `curriculr-terminplan/tests/curriculr/test-integration-stubbed.php` | MODIFY | Update `Gsh_Fake_Wpdb` to support 2-arg revision lookup; add 409+author test |
| `curriculr-planner/src/lib/wp-sync.ts` | MODIFY | `PushResult` gets `authorName?`/`savedAt?`; parsed from 409 |
| `curriculr-planner/src/lib/wp-sync.test.ts` | MODIFY | Test: 409 with author fields → result has them |
| `curriculr-planner/src/stores/wpSync.ts` | MODIFY | `ConflictInfo` gets `authorName?`/`savedAt?`; `send()` passes them through |
| `curriculr-planner/src/stores/wpSync.test.ts` | MODIFY | Test: `send()` conflict response populates `conflict.authorName`/`savedAt` |
| `curriculr-planner/src/components/editor/WpSyncControls.tsx` | MODIFY | Conflict dialog shows author name + timestamp when present |

---

## Task 1: WP Plugin — 409 response with author info

**Files:**
- Modify: `curriculr-terminplan/plugin/curriculr-data-layer.php`
- Modify: `curriculr-terminplan/plugin/gsh-terminplan.php`
- Modify: `curriculr-terminplan/tests/curriculr/test-integration-stubbed.php`

**Context:** `gsh_tp_curriculr_repo_put` currently returns `array('status' => 'conflict', 'current' => $existing)` when a version conflict is detected. The caller (`gsh_tp_curriculr_rest_put`) then builds the 409 response with only `serverVersion` and `doc`. The revisions table (`wp_curriculr_doc_revisions`) has `author_name` and `created_at` columns for each successful PUT. We look up the revision for the conflicting version and include it.

**Test infrastructure note:** `test-integration-stubbed.php` uses `Gsh_Fake_Wpdb` whose `prepare($q, $a = null)` only captures the first arg. The revision lookup needs two args `($sj, $version)`. We must update the stub to support this.

- [ ] **Step 1: Update test stub to support 2-arg revision lookup**

In `curriculr-terminplan/tests/curriculr/test-integration-stubbed.php`, replace the `Gsh_Fake_Wpdb` stub class methods `prepare` and `get_row`:

```php
// OLD:
public function prepare( $q, $a = null ) { return $a; }
public function get_row( $key, $out = null ) { return $this->rows[ $key ] ?? null; }
```

```php
// NEW:
public function prepare( $q, ...$args ) {
    if ( count( $args ) === 2 ) {
        return '__rev__:' . (string) $args[0] . ':' . (int) $args[1];
    }
    return isset( $args[0] ) ? $args[0] : $q;
}
public function get_row( $key, $out = null ) {
    if ( is_string( $key ) && strncmp( $key, '__rev__:', 8 ) === 0 ) {
        $parts = explode( ':', $key, 3 );
        $sj    = $parts[1] ?? '';
        $ver   = isset( $parts[2] ) ? (int) $parts[2] : -1;
        foreach ( $this->revs as $rev ) {
            if ( $rev['schoolyear'] === $sj && (int) $rev['version'] === $ver ) {
                return (object) $rev;
            }
        }
        return null;
    }
    return $this->rows[ $key ] ?? null;
}
```

- [ ] **Step 2: Run existing tests to verify stub change doesn't break anything**

```bash
php /Users/julian.wagner/curriculr-planner/curriculr-terminplan/tests/curriculr/test-integration-stubbed.php
```

Expected: all existing assertions pass (no output = success, exit code 0).

- [ ] **Step 3: Modify `repo_put` to look up revision author on conflict**

In `curriculr-terminplan/plugin/curriculr-data-layer.php`, find `gsh_tp_curriculr_repo_put` (around line 227). The conflict return currently reads:

```php
    if ( gsh_tp_curriculr_version_decision( $current, $base_version ) === 'conflict' ) {
        return array( 'status' => 'conflict', 'current' => $existing );
    }
```

Replace with:

```php
    if ( gsh_tp_curriculr_version_decision( $current, $base_version ) === 'conflict' ) {
        $rev_table = gsh_tp_curriculr_revisions_table();
        $rev       = $wpdb->get_row( $wpdb->prepare(
            "SELECT author_name, created_at FROM {$rev_table} WHERE schoolyear = %s AND version = %d LIMIT 1",
            $sj, $current
        ) );
        return array(
            'status'     => 'conflict',
            'current'    => $existing,
            'authorName' => $rev ? (string) $rev->author_name : '',
            'savedAt'    => $rev ? (string) $rev->created_at  : '',
        );
    }
```

- [ ] **Step 4: Modify `rest_put` to include author fields in 409 response**

In the same file, find the `rest_put` conflict block (around line 441):

```php
    if ( $res['status'] === 'conflict' ) {
        return new WP_REST_Response(
            array(
                'error'         => 'conflict',
                'serverVersion' => (int) $res['current']['version'],
                'doc'           => json_decode( $res['current']['json'], true ),
            ),
            409
        );
    }
```

Replace with:

```php
    if ( $res['status'] === 'conflict' ) {
        return new WP_REST_Response(
            array(
                'error'         => 'conflict',
                'serverVersion' => (int) $res['current']['version'],
                'doc'           => json_decode( $res['current']['json'], true ),
                'authorName'    => (string) ( $res['authorName'] ?? '' ),
                'savedAt'       => (string) ( $res['savedAt']    ?? '' ),
            ),
            409
        );
    }
```

- [ ] **Step 5: Bump plugin version to 4.12.0**

In `curriculr-terminplan/plugin/gsh-terminplan.php`, update:
- Header comment line 6: `* Version:     4.11.1` → `* Version:     4.12.0`
- Constant line ~529: `define( 'GSH_TP_VERSION', '4.11.0' );` → `define( 'GSH_TP_VERSION', '4.12.0' );`

Also add a changelog entry after the 4.11.0 block in the header comment (search for `* Changelog 4.11.0:` and add above it):

```php
 * Changelog 4.12.0:
 * - [M5]    409-Konflikt-Response enthält authorName + savedAt aus Revisions-Tabelle
 *
```

- [ ] **Step 6: Add test for 409 response with author info**

At the end of `test-integration-stubbed.php`, add a new test block. The existing state in `$wpdb` already has `sj_2026_27` at some version. To test in isolation, use a new schoolyear key `sj_author_test`. The `$guard` global drives `author_name`/`author_sub` on a successful PUT.

Append at the very end of the file:

```php
/* ---------- 409 + Author-Attribution ---------- */
// Use a fresh schoolyear key to avoid version-state from earlier tests.
$GLOBALS['gsh_tp_curriculr_current_claims'] = array( 'sub' => 'u1', 'name' => 'Max Mustermann' );
$pa1 = gsh_tp_curriculr_rest_put( new Gsh_Fake_Req(
    array( 'doc' => $doc, 'baseVersion' => 0 ),
    array( 'sj' => 'sj_author_test' )
) );
gsh_assert_eq( $pa1->status, 200, 'author test: first PUT ok' );

$pa2 = gsh_tp_curriculr_rest_put( new Gsh_Fake_Req(
    array( 'doc' => $doc, 'baseVersion' => 0 ),  // stale — should conflict
    array( 'sj' => 'sj_author_test' )
) );
gsh_assert_eq( $pa2->status, 409, 'author test: stale PUT yields 409' );
gsh_assert_eq( $pa2->data['authorName'], 'Max Mustermann', '409 includes authorName of last saver' );
gsh_assert_true( strlen( $pa2->data['savedAt'] ) > 0, '409 includes non-empty savedAt' );
$GLOBALS['gsh_tp_curriculr_current_claims'] = null;
```

- [ ] **Step 7: Run all WP tests**

```bash
php /Users/julian.wagner/curriculr-planner/curriculr-terminplan/tests/curriculr/test-integration-stubbed.php
```

Expected: all assertions pass.

Run the full WP test suite to catch regressions:

```bash
for f in /Users/julian.wagner/curriculr-planner/curriculr-terminplan/tests/curriculr/test-*.php; do echo "=== $f ==="; php "$f"; done
```

Expected: all pass, no error output.

- [ ] **Step 8: Commit**

```bash
cd /Users/julian.wagner/curriculr-planner/curriculr-terminplan
git add plugin/curriculr-data-layer.php plugin/gsh-terminplan.php tests/curriculr/test-integration-stubbed.php
git commit -m "feat(sync): 409 response includes authorName + savedAt from revisions table (M5 Task 1)"
```

---

## Task 2: SPA lib — parse author from 409

**Files:**
- Modify: `curriculr-planner/src/lib/wp-sync.ts`
- Modify: `curriculr-planner/src/lib/wp-sync.test.ts`

**Context:** `PushResult` is the return type of `pushDoc`. For the `conflict` status, it currently carries `serverVersion` and `serverDoc`. We add `authorName?: string` and `savedAt?: string`. In `pushDoc`, the 409 branch currently is:

```typescript
return { status: 'conflict', serverVersion: data.serverVersion, serverDoc: parsed.data };
```

We extend it to parse the two new fields defensively (only if they're non-empty strings).

- [ ] **Step 1: Write the failing test**

In `curriculr-planner/src/lib/wp-sync.test.ts`, inside the `describe('wp-sync client', ...)` block, after the existing `pushDoc 409` tests, add:

```typescript
it('pushDoc 409 includes authorName and savedAt when present', async () => {
  const serverDoc = { version: 3, schoolyear: { id: 'sy1', label: 'T', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15', holidays: [], quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }, categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [], meta: { name: 'T', lastSaved: '2026-01-01T00:00:00Z' } };
  const f = (async () => fakeRes(409, { error: 'conflict', serverVersion: 5, doc: serverDoc, authorName: 'Max Mustermann', savedAt: '2026-01-01 12:00:00' })) as unknown as typeof fetch;
  const r = await pushDoc(cfg, 'sj', {} as any, 1, 'entwurf', token, f);
  expect(r.status).toBe('conflict');
  expect(r.authorName).toBe('Max Mustermann');
  expect(r.savedAt).toBe('2026-01-01 12:00:00');
});

it('pushDoc 409 without author fields returns undefined authorName/savedAt', async () => {
  const serverDoc = { version: 3, schoolyear: { id: 'sy1', label: 'T', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15', holidays: [], quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }, categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [], meta: { name: 'T', lastSaved: '2026-01-01T00:00:00Z' } };
  const f = (async () => fakeRes(409, { error: 'conflict', serverVersion: 5, doc: serverDoc })) as unknown as typeof fetch;
  const r = await pushDoc(cfg, 'sj', {} as any, 1, 'entwurf', token, f);
  expect(r.authorName).toBeUndefined();
  expect(r.savedAt).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/julian.wagner/curriculr-planner/curriculr-planner
npx vitest run src/lib/wp-sync.test.ts
```

Expected: the 2 new tests FAIL (`r.authorName` is `undefined` / `r.savedAt` is `undefined`).

- [ ] **Step 3: Add fields to `PushResult` and parse in `pushDoc`**

In `curriculr-planner/src/lib/wp-sync.ts`, update `PushResult`:

```typescript
export interface PushResult {
  status: 'ok' | 'conflict' | 'error';
  version?: number;
  stage?: WpStage;
  feedUrl?: string;
  serverDoc?: PlannerDocument;
  serverVersion?: number;
  authorName?: string;
  savedAt?: string;
  message?: string;
}
```

In `pushDoc`, replace the 409 return line:

```typescript
// OLD:
return { status: 'conflict', serverVersion: data.serverVersion, serverDoc: parsed.data };

// NEW:
return {
  status: 'conflict',
  serverVersion: data.serverVersion,
  serverDoc: parsed.data,
  authorName: typeof data.authorName === 'string' && data.authorName ? data.authorName : undefined,
  savedAt: typeof data.savedAt === 'string' && data.savedAt ? data.savedAt : undefined,
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/wp-sync.test.ts
```

Expected: all tests pass (2 new pass).

- [ ] **Step 5: Commit**

```bash
git add src/lib/wp-sync.ts src/lib/wp-sync.test.ts
git commit -m "feat(sync): PushResult carries authorName + savedAt from 409 conflict (M5 Task 2)"
```

---

## Task 3: SPA store + conflict dialog — surface author attribution

**Files:**
- Modify: `curriculr-planner/src/stores/wpSync.ts`
- Modify: `curriculr-planner/src/stores/wpSync.test.ts`
- Modify: `curriculr-planner/src/components/editor/WpSyncControls.tsx`

**Context:** `ConflictInfo` in `wpSync.ts` currently holds `docId`, `serverVersion`, `serverDoc`. We add `authorName?` and `savedAt?` to it, passing them through from `PushResult` in `send()`. The `WpSyncControls` conflict dialog then conditionally renders "Gespeichert von X am TT.MM.JJJJ um HH:MM Uhr".

The `formatSavedAt` helper converts MySQL datetime `'2026-01-01 12:00:00'` → ` am 01.01.2026 um 12:00 Uhr`. The space-to-T replacement handles the MySQL format. If parsing fails, returns empty string.

- [ ] **Step 1: Write the failing store test**

In `curriculr-planner/src/stores/wpSync.test.ts`, add to the existing `describe('pull()', ...)` block (or after it as a new `describe`). First, add `pushDoc` to the existing `vi.mock` at the top (it is already mocked with `vi.fn()` from Task 1 of M4). Then add:

```typescript
import { pushDoc } from '@/lib/wp-sync';
const mockPushDoc = vi.mocked(pushDoc);
```

Add a new describe block:

```typescript
describe('send()', () => {
  it('conflict response stores authorName and savedAt in conflict state', async () => {
    const serverDoc = { version: 3, schoolyear: { id: 'sy1', label: 'T', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15', holidays: [], quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }, categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [], meta: { name: 'T', lastSaved: '2026-01-01T00:00:00Z' } } as any;
    mockPushDoc.mockResolvedValueOnce({
      status: 'conflict',
      serverVersion: 5,
      serverDoc,
      authorName: 'Max Mustermann',
      savedAt: '2026-01-01 12:00:00',
    });
    const doc = { schoolyear: { id: 'sy1' } } as any;
    const result = await useWpSyncStore.getState().send(doc);
    expect(result).toBe('conflict');
    expect(useWpSyncStore.getState().conflict?.authorName).toBe('Max Mustermann');
    expect(useWpSyncStore.getState().conflict?.savedAt).toBe('2026-01-01 12:00:00');
  });

  it('conflict response without author sets undefined authorName', async () => {
    const serverDoc = { version: 3, schoolyear: { id: 'sy1', label: 'T', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15', holidays: [], quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }, categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [], meta: { name: 'T', lastSaved: '2026-01-01T00:00:00Z' } } as any;
    mockPushDoc.mockResolvedValueOnce({ status: 'conflict', serverVersion: 5, serverDoc });
    const doc = { schoolyear: { id: 'sy1' } } as any;
    await useWpSyncStore.getState().send(doc);
    expect(useWpSyncStore.getState().conflict?.authorName).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/julian.wagner/curriculr-planner/curriculr-planner
npx vitest run src/stores/wpSync.test.ts
```

Expected: 2 new tests FAIL (`conflict?.authorName` is `undefined`).

- [ ] **Step 3: Extend `ConflictInfo` and update `send()`**

In `curriculr-planner/src/stores/wpSync.ts`, update `ConflictInfo`:

```typescript
// OLD:
interface ConflictInfo { docId: UUID; serverVersion: number; serverDoc: PlannerDocument; }

// NEW:
interface ConflictInfo { docId: UUID; serverVersion: number; serverDoc: PlannerDocument; authorName?: string; savedAt?: string; }
```

In `send()`, update the conflict branch:

```typescript
// OLD:
conflict: { docId, serverVersion: res.serverVersion ?? 0, serverDoc: res.serverDoc as PlannerDocument }

// NEW:
conflict: { docId, serverVersion: res.serverVersion ?? 0, serverDoc: res.serverDoc as PlannerDocument,
  authorName: res.authorName, savedAt: res.savedAt }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/stores/wpSync.test.ts
```

Expected: all 5 tests pass (2 new pass).

- [ ] **Step 5: Add `formatSavedAt` helper and update the conflict dialog**

In `curriculr-planner/src/components/editor/WpSyncControls.tsx`, add the helper function just above the `WpSyncControls` function export (after the existing `showSyncToast` function, around line 44):

```typescript
function formatSavedAt(raw: string): string {
  const d = new Date(raw.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return ` am ${date} um ${time} Uhr`;
}
```

Update the conflict dialog body (around line 169–172). Replace:

```tsx
          <p className="text-[14px] text-[var(--color-text-muted)]">
            Auf WordPress liegt bereits eine neuere Fassung (Version {conflict?.serverVersion}). Was möchtest du tun?
          </p>
```

With:

```tsx
          <p className="text-[14px] text-[var(--color-text-muted)]">
            Auf WordPress liegt bereits eine neuere Fassung (Version {conflict?.serverVersion}).
            {conflict?.authorName && (
              <> Gespeichert von <strong className="font-semibold text-[var(--color-text-main)]">{conflict.authorName}</strong>
              {conflict.savedAt ? formatSavedAt(conflict.savedAt) : ''}.</>
            )}
            {' '}Was möchtest du tun?
          </p>
```

- [ ] **Step 6: Run typecheck + lint + full test suite**

```bash
cd /Users/julian.wagner/curriculr-planner/curriculr-planner
npm run typecheck && npm run lint && npm run test:run
```

Expected: 243 tests pass (241 + 2 new), no lint warnings.

- [ ] **Step 7: Commit**

```bash
git add src/stores/wpSync.ts src/stores/wpSync.test.ts src/components/editor/WpSyncControls.tsx
git commit -m "feat(sync): conflict dialog shows who last saved WP version (M5 Task 3)"
```

---

## Final verification

- [ ] **Full SPA test suite**

```bash
cd /Users/julian.wagner/curriculr-planner/curriculr-planner
npm run typecheck && npm run lint && npm run test:run
```

Expected: 243 tests pass, no warnings.

- [ ] **WP PHP tests**

```bash
for f in /Users/julian.wagner/curriculr-planner/curriculr-terminplan/tests/curriculr/test-*.php; do echo "=== $f ==="; php "$f"; done
```

Expected: all pass.

- [ ] **Manual smoke test**

1. Open Planner in two browser tabs (same WP link configured)
2. Tab A: Make a change, send to WordPress → succeeds (version N)
3. Tab B: App already loaded at version N-1; make a different change, send to WordPress
4. Expected: 409 conflict dialog appears, shows "Gespeichert von [your name] am TT.MM.JJJJ um HH:MM Uhr"
5. Click "Server-Stand laden" → dialog closes, Tab B shows Tab A's version
6. If `authorName` is empty (dev environment without SSO): dialog shows only version number, no author line — correct fallback behavior
