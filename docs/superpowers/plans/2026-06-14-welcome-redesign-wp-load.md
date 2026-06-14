# Welcome Redesign + Load-from-WordPress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Planner start page as a two-column "Wo ist dein Plan?" surface with IServ login on it, and let a fresh PC list + load plans saved on WordPress.

**Architecture:** New Bearer-protected `GET /curriculr/v1/docs` endpoint on the WP plugin returns a lightweight plan list. The SPA `Welcome` component gains a source switcher (Dieses Gerät · WordPress · Neu); the WordPress source calls `fetchDocList` and loads a chosen plan via `loadFromWp` (saves locally + creates a `WpPlanLink` so sync continues). Login moves to a `BrandPanel` on the welcome screen, sharing extracted auth helpers with the existing WordpressTab. Excel-import is removed.

**Tech Stack:** React 19 + TypeScript + Vite + Zustand + Tailwind v4 + shadcn/ui (SPA); PHP / WordPress REST (plugin); Vitest (SPA tests); dependency-free PHP test harness (plugin).

**Two repos:**
- SPA: `/Users/julian.wagner/curriculr-planner/curriculr-planner`
- WP: `/Users/julian.wagner/curriculr-planner/curriculr-terminplan`

**Spec:** `curriculr-planner/docs/superpowers/specs/2026-06-14-welcome-redesign-wp-load-design.md`

---

## File Structure

**WordPress plugin (`curriculr-terminplan/plugin/`):**
- Modify `curriculr-data-layer.php` — add `gsh_tp_curriculr_rest_doc_list` handler + register `GET /docs` route.
- Modify `gsh-terminplan.php` — version bump (4 places) + changelog entry.
- Create `tests/curriculr/test-doc-list.php` — handler test.

**SPA (`curriculr-planner/src/`):**
- Modify `lib/wp-sync.ts` — add `DocListItem` type + `fetchDocList`.
- Modify `lib/wp-sync.test.ts` — tests for `fetchDocList`.
- Create `lib/wp-auth-actions.ts` — `startIservLogin` / `iservLogout` (extracted).
- Create `lib/wp-auth-actions.test.ts` — tests for the URL building + logout call.
- Modify `stores/wpSync.ts` — add `loadFromWp`.
- Modify `stores/wpSync.test.ts` — tests for `loadFromWp`.
- Create `components/welcome/BrandPanel.tsx` — brand + account/login block.
- Modify `components/welcome/Welcome.tsx` — two-column layout + source switcher; remove Excel.
- Modify `components/welcome/Welcome.test.tsx` — new structure, no Excel button.
- Modify `components/settings/WordpressTab.tsx` — use extracted auth helpers.
- Modify `components/settings/ImportTab.tsx` — remove Excel-import option.
- Modify `App.tsx` — pass an `onEnterEditor` routing callback to Welcome.
- Delete `lib/excel-import.ts` + `lib/excel-import.test.ts`.
- Modify `package.json` — version minor bump.

---

## Task 1: WP — `GET /curriculr/v1/docs` list endpoint

**Files:**
- Create: `curriculr-terminplan/tests/curriculr/test-doc-list.php`
- Modify: `curriculr-terminplan/plugin/curriculr-data-layer.php` (add handler near `gsh_tp_curriculr_rest_revisions_list` ~line 559; register route inside `gsh_tp_curriculr_register_rest` ~line 420)

- [ ] **Step 1: Write the failing test**

Create `curriculr-terminplan/tests/curriculr/test-doc-list.php`:

```php
<?php
/**
 * Tests für den Plan-Listen-Endpoint GET /curriculr/v1/docs.
 * Dependency-free, läuft mit plain `php`.
 */
define( 'GSH_TP_CURRICULR_TEST', true );
define( 'GSH_TP_VERSION', '4.17.0-test' );
define( 'ARRAY_A', 'ARRAY_A' );

require __DIR__ . '/assert.php';

/* ---------- WP-Stubs ---------- */
class Gsh_Fake_Wpdb_List {
    public $prefix = 'wp_';
    public $docs   = array();  // ARRAY_A rows keyed by schoolyear
    public $revs   = array();  // list of array(schoolyear, version, author_name)

    public function get_results( $query, $out = null ) {
        return array_values( $this->docs );
    }
    public function prepare( $q, ...$args ) {
        // rev author lookup: prepare(sql, sj, version) -> marker
        if ( count( $args ) === 2 ) {
            return '__rev__:' . (string) $args[0] . ':' . (int) $args[1];
        }
        return $q;
    }
    public function get_row( $key, $out = null ) {
        if ( is_string( $key ) && strncmp( $key, '__rev__:', 8 ) === 0 ) {
            $p   = explode( ':', $key, 3 );
            $sj  = $p[1] ?? '';
            $ver = isset( $p[2] ) ? (int) $p[2] : -1;
            foreach ( $this->revs as $r ) {
                if ( $r['schoolyear'] === $sj && (int) $r['version'] === $ver ) {
                    return (object) $r;
                }
            }
        }
        return null;
    }
}

class WP_REST_Response {
    public $data; public $status;
    public function __construct( $data, $status = 200 ) { $this->data = $data; $this->status = $status; }
    public function get_data() { return $this->data; }
    public function get_status() { return $this->status; }
}
function sanitize_key( $k ) { return strtolower( preg_replace( '/[^a-z0-9_\-]/i', '', (string) $k ) ); }

global $wpdb;
$wpdb = new Gsh_Fake_Wpdb_List();
$wpdb->docs = array(
    'sj_2026_27' => array(
        'schoolyear' => 'sj_2026_27',
        'json'       => json_encode( array( 'meta' => array( 'name' => 'Schuljahr 2026/27' ) ) ),
        'version'    => 12,
        'stage'      => 'genehmigt',
        'updated_at' => '2026-06-12 09:00:00',
    ),
    'sj_2025_26' => array(
        'schoolyear' => 'sj_2025_26',
        'json'       => json_encode( array( 'meta' => array( 'name' => 'Schuljahr 2025/26' ) ) ),
        'version'    => 40,
        'stage'      => 'oeffentlich',
        'updated_at' => '2026-06-03 10:00:00',
    ),
);
$wpdb->revs = array(
    array( 'schoolyear' => 'sj_2026_27', 'version' => 12, 'author_name' => 'M. Weber' ),
    array( 'schoolyear' => 'sj_2025_26', 'version' => 40, 'author_name' => 'A. Klein' ),
);

require __DIR__ . '/../../plugin/curriculr-data-layer.php';

$res = gsh_tp_curriculr_rest_doc_list();
$data = $res->get_data();

gsh_assert_eq( 200, $res->get_status(), 'status 200' );
gsh_assert_eq( 2, count( $data ), 'zwei Pläne gelistet' );

$byKey = array();
foreach ( $data as $row ) { $byKey[ $row['sj'] ] = $row; }

gsh_assert_eq( 'Schuljahr 2026/27', $byKey['sj_2026_27']['name'], 'name aus doc.meta.name' );
gsh_assert_eq( 'genehmigt', $byKey['sj_2026_27']['stage'], 'stage übernommen' );
gsh_assert_eq( 12, $byKey['sj_2026_27']['version'], 'version übernommen' );
gsh_assert_eq( 'M. Weber', $byKey['sj_2026_27']['authorName'], 'authorName aus neuester Revision' );
gsh_assert_eq( '2026-06-12 09:00:00', $byKey['sj_2026_27']['updatedAt'], 'updatedAt übernommen' );
gsh_assert_false( isset( $byKey['sj_2026_27']['json'] ), 'kein json im Listing' );

gsh_assert_eq( 'A. Klein', $byKey['sj_2025_26']['authorName'], 'authorName zweiter Plan' );

echo "test-doc-list: OK\n";
```

> Note: this test `require`s the real `curriculr-data-layer.php`. That file is large and defines many functions; the existing `test-revisions.php` does the same successfully, so the include is safe in the harness. If the include emits "function already defined" for helpers, mirror `test-revisions.php`'s guard pattern. Check `tests/curriculr/assert.php` for the exact assert helper names (`gsh_assert_eq`, `gsh_assert_false`) before running and adjust if they differ.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd curriculr-terminplan && php tests/curriculr/test-doc-list.php`
Expected: FAIL — `Call to undefined function gsh_tp_curriculr_rest_doc_list()`.

- [ ] **Step 3: Add the handler**

In `curriculr-terminplan/plugin/curriculr-data-layer.php`, add this function immediately after `gsh_tp_curriculr_rest_revisions_list` (ends ~line 574):

```php
function gsh_tp_curriculr_rest_doc_list() {
    global $wpdb;
    $docs_table = gsh_tp_curriculr_table();
    $rev_table  = gsh_tp_curriculr_revisions_table();

    $rows = $wpdb->get_results(
        "SELECT schoolyear, json, version, stage, updated_at FROM $docs_table ORDER BY updated_at DESC",
        ARRAY_A
    );
    if ( $rows === null ) {
        return new WP_REST_Response( array( 'error' => 'db_error' ), 500 );
    }

    $out = array();
    foreach ( (array) $rows as $row ) {
        $doc  = json_decode( $row['json'], true );
        $name = ( is_array( $doc ) && isset( $doc['meta']['name'] ) && '' !== $doc['meta']['name'] )
            ? (string) $doc['meta']['name']
            : (string) $row['schoolyear'];

        $rev = $wpdb->get_row( $wpdb->prepare(
            "SELECT author_name FROM {$rev_table} WHERE schoolyear = %s AND version = %d LIMIT 1",
            $row['schoolyear'],
            (int) $row['version']
        ) );

        $out[] = array(
            'sj'         => (string) $row['schoolyear'],
            'name'       => $name,
            'stage'      => isset( $row['stage'] ) ? (string) $row['stage'] : 'entwurf',
            'version'    => (int) $row['version'],
            'updatedAt'  => (string) $row['updated_at'],
            'authorName' => $rev ? (string) $rev->author_name : '',
        );
    }

    return new WP_REST_Response( $out, 200 );
}
```

- [ ] **Step 4: Register the route**

In `gsh_tp_curriculr_register_rest()` (~line 420), add this `register_rest_route` block after the `/health` block (~line 445):

```php
    register_rest_route(
        'curriculr/v1',
        '/docs',
        array(
            'methods'             => 'GET',
            'callback'            => 'gsh_tp_curriculr_rest_doc_list',
            'permission_callback' => 'gsh_tp_curriculr_perm',
        )
    );
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd curriculr-terminplan && php tests/curriculr/test-doc-list.php`
Expected: `test-doc-list: OK`

- [ ] **Step 6: Syntax-check + run full PHP suite**

Run:
```bash
cd curriculr-terminplan
php -l plugin/curriculr-data-layer.php
for t in tests/curriculr/test-*.php; do php "$t" || break; done
```
Expected: `No syntax errors` + every test prints `OK`.

- [ ] **Step 7: Commit**

```bash
cd curriculr-terminplan
git add plugin/curriculr-data-layer.php tests/curriculr/test-doc-list.php
git commit -m "feat(rest): add GET /curriculr/v1/docs plan-list endpoint"
```

---

## Task 2: WP — version bump + ZIP

**Files:**
- Modify: `curriculr-terminplan/plugin/gsh-terminplan.php` (4 version locations + changelog)

- [ ] **Step 1: Find current version + the 4 locations**

Run: `cd curriculr-terminplan && grep -n "4\.16\.0\|GSH_TP_VERSION\|gsh_tp_changelog" plugin/gsh-terminplan.php | head`
Expected: shows the header `* Version: 4.16.0`, the `define('GSH_TP_VERSION', '4.16.0')`, the header changelog block, and `gsh_tp_changelog()`.

- [ ] **Step 2: Bump all 4 to 4.17.0 + add changelog line**

In `plugin/gsh-terminplan.php`:
1. Header comment: `* Version: 4.17.0`
2. `define( 'GSH_TP_VERSION', '4.17.0' );`
3. Header changelog block — prepend: `* 4.17.0 - REST: GET /docs Plan-Liste für Planner-Startseite`
4. `gsh_tp_changelog()` — prepend a matching entry in that function's array/string (match the existing format exactly).

- [ ] **Step 3: Syntax-check**

Run: `cd curriculr-terminplan && php -l plugin/gsh-terminplan.php`
Expected: `No syntax errors detected`

- [ ] **Step 4: Build the ZIP**

Run:
```bash
cd curriculr-terminplan/plugin
VER=$(grep "define.*GSH_TP_VERSION" gsh-terminplan.php | grep -oP "'\K[^']+")
zip ../../curriculr-terminplan-$VER.zip gsh-terminplan.php curriculr-data-layer.php curriculr-auth.php curriculr-guard.php
zip -r ../../curriculr-terminplan-$VER.zip assets/
```
Expected: creates `curriculr-terminplan-4.17.0.zip` at workspace root.

- [ ] **Step 5: Commit**

```bash
cd curriculr-terminplan
git add plugin/gsh-terminplan.php
git commit -m "chore: bump plugin to 4.17.0 (GET /docs endpoint)"
```

> The ZIP at workspace root is a build artifact; follow repo convention (it is not committed inside `curriculr-terminplan`). Manual upload to WP admin happens outside this plan.

---

## Task 3: SPA — `fetchDocList` in `wp-sync.ts`

**Files:**
- Modify: `curriculr-planner/src/lib/wp-sync.ts`
- Test: `curriculr-planner/src/lib/wp-sync.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `curriculr-planner/src/lib/wp-sync.test.ts` (inside the existing top-level `describe`, or add a new `describe('fetchDocList', ...)`). Match the file's existing import of `fetchDocList` from `./wp-sync`:

```ts
describe('fetchDocList', () => {
  const cfg = { enabled: true, baseUrl: 'https://schule.example', links: {} };

  it('parses a valid list response', async () => {
    const body = [
      { sj: 'sj_2026_27', name: 'Schuljahr 2026/27', stage: 'genehmigt', version: 12, updatedAt: '2026-06-12 09:00:00', authorName: 'M. Weber' },
      { sj: 'sj_2025_26', name: 'Schuljahr 2025/26', stage: 'oeffentlich', version: 40, updatedAt: '2026-06-03 10:00:00', authorName: 'A. Klein' },
    ];
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
    const res = await fetchDocList(cfg, 'tok', fetchImpl as unknown as typeof fetch);
    expect(res.items).toHaveLength(2);
    expect(res.items[0]).toMatchObject({ sj: 'sj_2026_27', name: 'Schuljahr 2026/27', stage: 'genehmigt', version: 12 });
    expect(res.message).toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://schule.example/wp-json/curriculr/v1/docs',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('returns BAD_TOKEN message on 401', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const res = await fetchDocList(cfg, 'tok', fetchImpl as unknown as typeof fetch);
    expect(res.items).toEqual([]);
    expect(res.message).toMatch(/abgelaufen/);
  });

  it('drops malformed items and keeps valid ones', async () => {
    const body = [
      { sj: 'ok', name: 'A', stage: 'entwurf', version: 1, updatedAt: 't', authorName: '' },
      { sj: 123, name: 'B' }, // malformed
    ];
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
    const res = await fetchDocList(cfg, 'tok', fetchImpl as unknown as typeof fetch);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].sj).toBe('ok');
  });

  it('returns NOT_REACHABLE message on network error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('boom'));
    const res = await fetchDocList(cfg, 'tok', fetchImpl as unknown as typeof fetch);
    expect(res.items).toEqual([]);
    expect(res.message).toMatch(/nicht erreichbar/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd curriculr-planner && npx vitest run src/lib/wp-sync.test.ts -t fetchDocList`
Expected: FAIL — `fetchDocList is not a function` / import error.

- [ ] **Step 3: Implement `DocListItem` + `fetchDocList`**

In `curriculr-planner/src/lib/wp-sync.ts`, add near the other interfaces (after `LatestRevision`, ~line 99):

```ts
const STAGES = new Set<WpStage>(['entwurf', 'genehmigt', 'oeffentlich']);

export interface DocListItem {
  sj: string;
  name: string;
  stage: WpStage;
  version: number;
  updatedAt: string;
  authorName: string;
}

function parseDocListItem(v: unknown): DocListItem | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.sj !== 'string' || typeof o.name !== 'string') return null;
  const stage = typeof o.stage === 'string' && STAGES.has(o.stage as WpStage)
    ? (o.stage as WpStage) : 'entwurf';
  return {
    sj: o.sj,
    name: o.name,
    stage,
    version: typeof o.version === 'number' ? o.version : 0,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : '',
    authorName: typeof o.authorName === 'string' ? o.authorName : '',
  };
}

export async function fetchDocList(
  cfg: WpSyncConfig,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ items: DocListItem[]; message?: string }> {
  try {
    const res = await fetchImpl(`${base(cfg)}/docs`, {
      headers: { Authorization: bearerHeader(token) },
    });
    if (res.status === 401 || res.status === 403) return { items: [], message: BAD_TOKEN };
    if (!res.ok) return { items: [], message: `Server antwortete mit ${res.status}.` };
    const data = await res.json();
    if (!Array.isArray(data)) return { items: [], message: 'Ungültige Antwort vom Server.' };
    const items = data.map(parseDocListItem).filter((x): x is DocListItem => x !== null);
    return { items };
  } catch (err) {
    const msg = err instanceof Error ? err.message : NOT_REACHABLE;
    return { items: [], message: msg === BAD_URL ? msg : NOT_REACHABLE };
  }
}
```

> `WpStage` is already imported at the top of `wp-sync.ts` (`import type { WpStage } from './wp-stage';`). Verify; if missing, add it.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd curriculr-planner && npx vitest run src/lib/wp-sync.test.ts`
Expected: PASS (all, including the new `fetchDocList` block).

- [ ] **Step 5: Commit**

```bash
cd curriculr-planner
git add src/lib/wp-sync.ts src/lib/wp-sync.test.ts
git commit -m "feat(sync): add fetchDocList client for GET /docs"
```

---

## Task 4: SPA — `loadFromWp` in the wpSync store

**Files:**
- Modify: `curriculr-planner/src/stores/wpSync.ts`
- Test: `curriculr-planner/src/stores/wpSync.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `curriculr-planner/src/stores/wpSync.test.ts`. The file already mocks `@/lib/wp-sync` and `@/lib/wp-sync-config`; add a mock for `@/lib/storage` at the top alongside them:

```ts
vi.mock('@/lib/storage', () => ({
  storage: { saveDoc: vi.fn(), setActiveDoc: vi.fn() },
}));
```

Then add the test block:

```ts
import { storage } from '@/lib/storage';

describe('loadFromWp()', () => {
  const wpDoc = {
    schoolyear: { id: 'sy-load', label: '2026/27', firstSchoolDay: '2026-08-01', firstTeachingDay: '2026-08-03', lastSchoolDay: '2027-07-15', holidays: [], quarterBoundaries: ['2026-10-01', '2026-12-15', '2027-03-01'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    categories: [], events: [], annotations: [], availableGroups: [], ignoredConflicts: [], templates: [],
    meta: { name: 'Schuljahr 2026/27', lastSaved: '2026-01-01T00:00:00Z' },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  it('saves locally, creates a link, sets active, and returns loaded', async () => {
    mockFetchDoc.mockResolvedValueOnce({ exists: true, doc: wpDoc, version: 7, stage: 'genehmigt' });
    let received: unknown = null;
    const result = await useWpSyncStore.getState().loadFromWp('sj_2026_27', 'Schuljahr 2026/27', (d) => { received = d; });

    expect(result).toBe('loaded');
    expect(storage.saveDoc).toHaveBeenCalledWith(wpDoc);
    expect(storage.setActiveDoc).toHaveBeenCalledWith('sy-load');
    expect(received).toBe(wpDoc);
    const link = useWpSyncStore.getState().config.links['sy-load'];
    expect(link).toMatchObject({ schoolyearKey: 'sj_2026_27', stage: 'genehmigt', knownVersion: 7 });
    expect(useWpSyncStore.getState().syncState).toBe('synced');
  });

  it('returns error when not authenticated', async () => {
    useAuthStore.setState({ token: null, claims: null });
    const result = await useWpSyncStore.getState().loadFromWp('sj_2026_27', 'X', () => {});
    expect(result).toBe('error');
  });

  it('returns error when the doc is not found on WP', async () => {
    mockFetchDoc.mockResolvedValueOnce({ exists: false });
    const result = await useWpSyncStore.getState().loadFromWp('sj_2026_27', 'X', () => {});
    expect(result).toBe('error');
    expect(useWpSyncStore.getState().syncState).toBe('error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd curriculr-planner && npx vitest run src/stores/wpSync.test.ts -t loadFromWp`
Expected: FAIL — `loadFromWp is not a function`.

- [ ] **Step 3: Implement `loadFromWp`**

In `curriculr-planner/src/stores/wpSync.ts`:

Add import at top:
```ts
import { storage } from '@/lib/storage';
```

Add to the `WpSyncStore` interface:
```ts
  loadFromWp(sj: string, name: string, setDocFn: (doc: PlannerDocument) => void): Promise<'loaded' | 'error'>;
```

Add the implementation inside `create<WpSyncStore>(...)`, after `pull`:
```ts
  async loadFromWp(sj, name, setDocFn) {
    const { config } = get();
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ syncState: 'error', message: 'Nicht angemeldet — bitte mit IServ anmelden.' });
      return 'error';
    }
    set({ syncState: 'sending', message: `Lade „${name}" von WordPress…` });
    const res = await fetchDoc(config, sj, token);
    if (!res.exists || !res.doc) {
      set({ syncState: 'error', message: res.message ?? 'Plan nicht auf WordPress gefunden.' });
      return 'error';
    }
    const doc = res.doc as PlannerDocument;
    const docId = doc.schoolyear.id;
    const version = res.version ?? 0;
    const stage = res.stage ?? 'entwurf';
    await storage.saveDoc(doc);
    await storage.setActiveDoc(docId);
    const link: WpPlanLink = {
      schoolyearKey: sj,
      wpProfileId: config.links[docId]?.wpProfileId ?? '',
      stage,
      knownVersion: version,
    };
    get().setConfig({ ...config, enabled: true, links: { ...config.links, [docId]: link } });
    setDocFn(doc);
    set({ syncState: 'synced', message: '✓ Von WordPress geladen', conflict: null });
    return 'loaded';
  },
```

> `WpPlanLink` is already imported in this file (line 5). Verify the import list includes it.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd curriculr-planner && npx vitest run src/stores/wpSync.test.ts`
Expected: PASS (whole file).

- [ ] **Step 5: Commit**

```bash
cd curriculr-planner
git add src/stores/wpSync.ts src/stores/wpSync.test.ts
git commit -m "feat(sync): add loadFromWp (fetch + local save + link)"
```

---

## Task 5: SPA — extract shared auth actions

**Files:**
- Create: `curriculr-planner/src/lib/wp-auth-actions.ts`
- Test: `curriculr-planner/src/lib/wp-auth-actions.test.ts`
- Modify: `curriculr-planner/src/components/settings/WordpressTab.tsx`

- [ ] **Step 1: Write the failing test**

Create `curriculr-planner/src/lib/wp-auth-actions.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { iservLoginUrl, iservLogout } from './wp-auth-actions';

describe('iservLoginUrl', () => {
  it('builds the login URL and strips trailing slashes', () => {
    expect(iservLoginUrl('https://schule.example/')).toBe(
      'https://schule.example/wp-json/curriculr/v1/auth/login',
    );
  });
});

describe('iservLogout', () => {
  it('POSTs to the logout endpoint with a bearer token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    await iservLogout('https://schule.example', 'tok', fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://schule.example/wp-json/curriculr/v1/auth/logout',
      expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('never throws on network failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(iservLogout('https://schule.example', 'tok', fetchImpl as unknown as typeof fetch)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd curriculr-planner && npx vitest run src/lib/wp-auth-actions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `curriculr-planner/src/lib/wp-auth-actions.ts`:

```ts
type FetchLike = typeof fetch;

function apiBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '') + '/wp-json/curriculr/v1';
}

/** URL that starts the IServ SSO redirect dance. */
export function iservLoginUrl(baseUrl: string): string {
  return `${apiBase(baseUrl)}/auth/login`;
}

/** Navigates the browser to IServ login. Side-effecting wrapper around iservLoginUrl. */
export function startIservLogin(baseUrl: string): void {
  window.location.href = iservLoginUrl(baseUrl);
}

/** Best-effort server-side logout. Never throws. */
export async function iservLogout(
  baseUrl: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  try {
    await fetchImpl(`${apiBase(baseUrl)}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    /* offline / ignore — local logout already happened */
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd curriculr-planner && npx vitest run src/lib/wp-auth-actions.test.ts`
Expected: PASS

- [ ] **Step 5: Refactor `WordpressTab.tsx` to use the helper**

In `curriculr-planner/src/components/settings/WordpressTab.tsx`:

Add import:
```ts
import { startIservLogin, iservLogout } from '@/lib/wp-auth-actions';
```

Replace `handleLogin` (lines ~26-30) with:
```ts
  function handleLogin() {
    if (!config.enabled || !config.baseUrl) return;
    startIservLogin(config.baseUrl);
  }
```

Replace `handleLogout` (lines ~32-42) with:
```ts
  function handleLogout() {
    const currentToken = token;
    logout();
    if (config.baseUrl && currentToken) void iservLogout(config.baseUrl, currentToken);
  }
```

- [ ] **Step 6: Run the WordpressTab tests + typecheck**

Run:
```bash
cd curriculr-planner
npx vitest run src/components/settings/WordpressTab.test.tsx
npm run typecheck
```
Expected: PASS + no type errors.

- [ ] **Step 7: Commit**

```bash
cd curriculr-planner
git add src/lib/wp-auth-actions.ts src/lib/wp-auth-actions.test.ts src/components/settings/WordpressTab.tsx
git commit -m "refactor(auth): extract shared startIservLogin/iservLogout helpers"
```

---

## Task 6: SPA — `BrandPanel` component

**Files:**
- Create: `curriculr-planner/src/components/welcome/BrandPanel.tsx`
- Test: `curriculr-planner/src/components/welcome/BrandPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `curriculr-planner/src/components/welcome/BrandPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandPanel } from './BrandPanel';

describe('BrandPanel', () => {
  it('logged out with empty baseUrl: shows address field + disabled login', () => {
    render(<BrandPanel authed={false} userName={null} groups={[]} baseUrl="" onBaseUrlChange={() => {}} onLogin={() => {}} onLogout={() => {}} />);
    expect(screen.getByPlaceholderText(/schule/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /anmelden/i })).toBeDisabled();
  });

  it('logged out with baseUrl: login enabled, calls onLogin', () => {
    const onLogin = vi.fn();
    render(<BrandPanel authed={false} userName={null} groups={[]} baseUrl="https://schule.example" onBaseUrlChange={() => {}} onLogin={onLogin} onLogout={() => {}} />);
    const btn = screen.getByRole('button', { name: /anmelden/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onLogin).toHaveBeenCalled();
  });

  it('logged in: shows name + group + logout', () => {
    const onLogout = vi.fn();
    render(<BrandPanel authed userName="Martina Weber" groups={['Schulleitung']} baseUrl="https://schule.example" onBaseUrlChange={() => {}} onLogin={() => {}} onLogout={onLogout} />);
    expect(screen.getByText('Martina Weber')).toBeInTheDocument();
    expect(screen.getByText(/Schulleitung/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /abmelden/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd curriculr-planner && npx vitest run src/components/welcome/BrandPanel.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `BrandPanel.tsx`**

Create `curriculr-planner/src/components/welcome/BrandPanel.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  authed: boolean;
  userName: string | null;
  groups: string[];
  baseUrl: string;
  onBaseUrlChange(url: string): void;
  onLogin(): void;
  onLogout(): void;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '–';
}

export function BrandPanel({ authed, userName, groups, baseUrl, onBaseUrlChange, onLogin, onLogout }: Props) {
  return (
    <div className="flex flex-col p-7 text-white bg-[linear-gradient(160deg,var(--color-marine-800)_0%,#012740_100%)]">
      <div className="w-12 h-12 rounded-[12px] bg-[var(--color-gelb-500)] text-[var(--color-marine-800)] font-extrabold text-2xl flex items-center justify-center">
        C
      </div>
      <div className="text-[23px] font-extrabold tracking-[-0.4px] mt-4">
        Curri<span className="text-[var(--color-gelb-500)]">culr</span>
      </div>
      <p className="text-[13px] text-[var(--color-marine-200)] mt-2 leading-[1.55]">
        Jahresterminplan für die Schulleitung
      </p>

      <div className="flex-1" />

      <div className="border-t border-white/15 pt-4">
        {authed && userName ? (
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-[34px] h-[34px] rounded-full bg-[var(--color-gelb-500)] text-[var(--color-marine-800)] font-extrabold text-[14px] flex items-center justify-center">
                {initials(userName)}
              </div>
              <div>
                <div className="text-[13px] font-bold">{userName}</div>
                <div className="text-[11px] text-[var(--color-marine-200)]">{groups.join(', ')}</div>
              </div>
            </div>
            <button onClick={onLogout} className="text-[11px] text-[var(--color-marine-200)] underline mt-3">
              Abmelden
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[11px] text-[var(--color-marine-200)]">Nicht angemeldet</div>
            {!baseUrl && (
              <Input
                value={baseUrl}
                placeholder="WP-Adresse deiner Schule (https://…)"
                onChange={(e) => onBaseUrlChange(e.target.value)}
                className="bg-white/10 border-white/25 text-white placeholder:text-white/50"
              />
            )}
            <Button
              onClick={onLogin}
              disabled={!baseUrl}
              className="w-full bg-[var(--color-gelb-500)] text-[var(--color-marine-800)] hover:bg-[var(--color-gelb-400)]"
            >
              Mit IServ anmelden
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

> Confirm the exact token names by grepping `src/styles/globals.css` for `--color-gelb` and `--color-marine-200`. If a token is absent (e.g. `--color-gelb-400`), substitute the nearest existing one (`--color-gelb-500`) — never hardcode a hex.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd curriculr-planner && npx vitest run src/components/welcome/BrandPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd curriculr-planner
git add src/components/welcome/BrandPanel.tsx src/components/welcome/BrandPanel.test.tsx
git commit -m "feat(welcome): add BrandPanel with login/account block"
```

---

## Task 7: SPA — rebuild `Welcome.tsx` (two columns + source switcher)

**Files:**
- Modify: `curriculr-planner/src/components/welcome/Welcome.tsx`
- Modify: `curriculr-planner/src/App.tsx`
- Test: `curriculr-planner/src/components/welcome/Welcome.test.tsx`

- [ ] **Step 1: Update `App.tsx` to pass routing + keep existing callbacks**

In `curriculr-planner/src/App.tsx`, the `Welcome` render (lines ~109-116) becomes:

```tsx
      {route === 'welcome' && (
        <Welcome
          onCreateNew={() => setRoute('wizard')}
          onOpenDoc={openDoc}
          onImportJson={importDoc}
          onStartTour={startTour}
          onEnterEditor={() => setRoute('editor')}
        />
      )}
```

- [ ] **Step 2: Write the failing test**

Replace the body of `curriculr-planner/src/components/welcome/Welcome.test.tsx` with tests for the new structure. Keep any existing test-setup imports. Mock `@/lib/storage` so `listDocs` is deterministic:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Welcome } from './Welcome';

vi.mock('@/lib/storage', () => ({
  storage: {
    listDocs: vi.fn().mockResolvedValue([
      { id: 'sy1', name: 'Mein Plan', schoolyearLabel: '2026/27', eventCount: 12, lastSaved: '2026-06-12T09:00:00Z' },
    ]),
  },
}));

const noop = () => {};
function renderWelcome(over = {}) {
  return render(
    <Welcome onCreateNew={noop} onOpenDoc={noop} onImportJson={noop} onStartTour={noop} onEnterEditor={noop} {...over} />,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('Welcome', () => {
  it('shows the three source switches', () => {
    renderWelcome();
    expect(screen.getByRole('button', { name: /Dieses Gerät/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /WordPress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Neu/i })).toBeInTheDocument();
  });

  it('local source lists saved plans and opens one', async () => {
    const onOpenDoc = vi.fn();
    renderWelcome({ onOpenDoc });
    await waitFor(() => expect(screen.getByText('Mein Plan')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /öffnen/i }));
    expect(onOpenDoc).toHaveBeenCalledWith('sy1');
  });

  it('"Neu" source exposes create / ICS / demo / tour and NO Excel', () => {
    const onCreateNew = vi.fn();
    renderWelcome({ onCreateNew });
    fireEvent.click(screen.getByRole('button', { name: /^Neu/i }));
    expect(screen.getByRole('button', { name: /Neuen Jahresplan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ICS/i })).toBeInTheDocument();
    expect(screen.queryByText(/Excel/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Neuen Jahresplan/i }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it('WordPress source while logged out prompts to log in', () => {
    renderWelcome();
    fireEvent.click(screen.getByRole('button', { name: /WordPress/i }));
    expect(screen.getByText(/anmelden/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd curriculr-planner && npx vitest run src/components/welcome/Welcome.test.tsx`
Expected: FAIL — new structure not present (no source switches, Excel still there, missing `onEnterEditor` prop).

- [ ] **Step 4: Rewrite `Welcome.tsx`**

Replace `curriculr-planner/src/components/welcome/Welcome.tsx` with:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { storage, type DocSummary } from '@/lib/storage';
import { parseIcs, mapToEvents, type ParsedEvent } from '@/lib/ics-import';
import { createEmptyDoc, usePlannerStore } from '@/stores/planner';
import { createDemoDoc } from '@/lib/demo';
import { IcsImportDialog } from '@/components/import/IcsImportDialog';
import { BrandPanel } from './BrandPanel';
import { useAuthStore } from '@/stores/auth';
import { useWpSyncStore } from '@/stores/wpSync';
import { startIservLogin, iservLogout } from '@/lib/wp-auth-actions';
import { fetchDocList, type DocListItem } from '@/lib/wp-sync';
import { STAGE_LABELS, type WpStage } from '@/lib/wp-stage';
import { toast } from 'sonner';
import type { PlannerDocument } from '@/types';

type Source = 'local' | 'wordpress' | 'new';

interface Props {
  onCreateNew(): void;
  onOpenDoc(id: string): void;
  onImportJson(doc: PlannerDocument): void;
  onStartTour(): void;
  onEnterEditor(): void;
}

export function Welcome({ onCreateNew, onOpenDoc, onImportJson, onStartTour, onEnterEditor }: Props) {
  const [source, setSource] = useState<Source>('local');
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [wpItems, setWpItems] = useState<DocListItem[]>([]);
  const [wpLoading, setWpLoading] = useState(false);
  const [wpMsg, setWpMsg] = useState<string | null>(null);
  const icsInputRef = useRef<HTMLInputElement>(null);
  const [icsParsed, setIcsParsed] = useState<ParsedEvent[] | null>(null);

  const authed = useAuthStore((s) => s.status === 'authenticated');
  const claims = useAuthStore((s) => s.claims);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const config = useWpSyncStore((s) => s.config);
  const setConfig = useWpSyncStore((s) => s.setConfig);
  const loadFromWp = useWpSyncStore((s) => s.loadFromWp);
  const setDoc = usePlannerStore((s) => s.setDoc);

  const defaultCategories = useMemo(
    () => createEmptyDoc('_', '_', '2000-01-01', '2000-01-01', '2000-01-02').categories,
    [],
  );

  useEffect(() => { storage.listDocs().then(setDocs); }, []);

  // Auto-load the WordPress list when the source is selected while authenticated.
  useEffect(() => {
    if (source !== 'wordpress' || !authed || !token) return;
    setWpLoading(true);
    setWpMsg(null);
    fetchDocList(config, token).then(({ items, message }) => {
      setWpItems(items);
      setWpMsg(message ?? (items.length === 0 ? 'Keine Pläne auf WordPress.' : null));
      setWpLoading(false);
    });
  }, [source, authed, token, config]);

  const handleLogin = () => {
    if (!config.enabled) setConfig({ ...config, enabled: true });
    if (config.baseUrl) startIservLogin(config.baseUrl);
  };
  const handleLogout = () => {
    const t = token;
    logout();
    if (config.baseUrl && t) void iservLogout(config.baseUrl, t);
  };

  const handleLoadWp = async (item: DocListItem) => {
    const result = await loadFromWp(item.sj, item.name, setDoc);
    if (result === 'loaded') {
      toast.success(`Plan „${item.name}" geladen`);
      onEnterEditor();
    } else {
      toast.error(useWpSyncStore.getState().message || 'Laden fehlgeschlagen');
    }
  };

  const handleIcs = async (file: File) => {
    try {
      const events = parseIcs(await file.text());
      if (events.length === 0) { toast.error('Keine Termine in der ICS gefunden'); return; }
      setIcsParsed(events);
    } catch (e) {
      toast.error('ICS ungültig: ' + (e as Error).message);
    }
  };

  const buildDocFromIcs = (parsed: ParsedEvent[]): PlannerDocument => {
    const minStart = parsed.reduce((m, e) => (e.start < m ? e.start : m), parsed[0].start);
    const maxEnd = parsed.reduce((m, e) => (e.end > m ? e.end : m), parsed[0].end);
    const startYear = Number(minStart.slice(0, 4));
    const label = `${startYear}/${(startYear + 1) % 100}`;
    const doc = createEmptyDoc(`Import ${label}`, label, minStart, minStart, maxEnd);
    const fallbackId = doc.categories.find((c) => c.slug === 'sondertag')?.id ?? doc.categories[0].id;
    doc.events = mapToEvents(parsed, doc.categories, fallbackId);
    return doc;
  };

  const Tab = ({ id, label }: { id: Source; label: string }) => (
    <button
      onClick={() => setSource(id)}
      className={`flex-1 text-[13px] font-bold py-2 px-2 rounded-[8px] transition ${
        source === id
          ? 'bg-white text-[var(--color-marine-800)] shadow-[0_2px_8px_rgba(0,52,92,.12)]'
          : 'text-[var(--color-ink-500)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <Card className="max-w-4xl w-full overflow-hidden border-[var(--color-ink-200)] shadow-[var(--shadow-modal)] grid grid-cols-1 md:grid-cols-[300px_1fr] p-0">
        <BrandPanel
          authed={authed}
          userName={claims?.name ?? null}
          groups={claims?.groups ?? []}
          baseUrl={config.baseUrl}
          onBaseUrlChange={(url) => setConfig({ ...config, baseUrl: url })}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />

        <div className="p-7">
          <div className="text-[20px] font-extrabold text-[var(--color-ink-900)] tracking-[-0.3px]">
            Wo ist dein Plan?
          </div>
          <p className="text-[13px] text-[var(--color-ink-500)] mt-1 mb-4">
            Lokal auf diesem Gerät, auf eurem WordPress oder neu beginnen.
          </p>

          <div className="flex gap-1.5 bg-[var(--color-ink-100)] p-1.5 rounded-[12px] mb-4">
            <Tab id="local" label="Dieses Gerät" />
            <Tab id="wordpress" label="WordPress" />
            <Tab id="new" label="Neu" />
          </div>

          {source === 'local' && (
            <div className="space-y-2">
              {docs.length === 0 && (
                <p className="text-[13px] text-[var(--color-ink-500)]">Noch keine Pläne auf diesem Gerät.</p>
              )}
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between border border-[var(--color-ink-200)] rounded-[12px] p-3.5">
                  <div>
                    <div className="text-[14px] font-bold text-[var(--color-ink-900)]">{d.name}</div>
                    <div className="text-[12px] text-[var(--color-ink-500)] tabular-nums">
                      {d.eventCount} Termine · {new Date(d.lastSaved).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  <Button onClick={() => onOpenDoc(d.id)}>Öffnen</Button>
                </div>
              ))}
            </div>
          )}

          {source === 'wordpress' && (
            <div className="space-y-2">
              {!authed && (
                <p className="text-[13px] text-[var(--color-ink-500)]">
                  Zum Laden von WordPress links mit IServ anmelden.
                </p>
              )}
              {authed && wpLoading && <p className="text-[13px] text-[var(--color-ink-500)]">Lädt…</p>}
              {authed && !wpLoading && wpMsg && (
                <p className="text-[13px] text-[var(--color-ink-500)]">{wpMsg}</p>
              )}
              {authed && wpItems.map((it) => (
                <div key={it.sj} className="flex items-center justify-between border border-[var(--color-ink-200)] rounded-[12px] p-3.5">
                  <div>
                    <div className="text-[14px] font-bold text-[var(--color-ink-900)]">
                      {it.name}
                      <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-ink-100)] text-[var(--color-ink-500)]">
                        {STAGE_LABELS[it.stage as WpStage]}
                      </span>
                    </div>
                    <div className="text-[12px] text-[var(--color-ink-500)] tabular-nums">
                      v{it.version}{it.authorName ? ` · ${it.authorName}` : ''}{it.updatedAt ? ` · ${it.updatedAt.slice(0, 10)}` : ''}
                    </div>
                  </div>
                  <Button onClick={() => handleLoadWp(it)}>Laden</Button>
                </div>
              ))}
              <p className="text-[11px] text-[var(--color-ink-500)] pt-1">Geladene Pläne werden lokal gespeichert.</p>
            </div>
          )}

          {source === 'new' && (
            <div className="flex flex-col gap-2">
              <Button size="lg" onClick={onCreateNew}>+ Neuen Jahresplan erstellen</Button>
              <Button variant="outline" onClick={() => icsInputRef.current?.click()}>Aus ICS-Datei erstellen</Button>
              <div className="flex gap-2 pt-1 border-t border-[var(--color-ink-200)]">
                <Button variant="ghost" className="flex-1" onClick={() => onImportJson(createDemoDoc())}>Demo ausprobieren</Button>
                <Button variant="ghost" className="flex-1 flex items-center gap-1.5" onClick={onStartTour}>
                  <Play className="w-3 h-3" /> Geführte Tour
                </Button>
              </div>
              <input
                ref={icsInputRef}
                type="file"
                accept=".ics"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIcs(f); e.target.value = ''; }}
              />
            </div>
          )}
        </div>
      </Card>

      <IcsImportDialog
        open={icsParsed !== null}
        parsed={icsParsed ?? []}
        categories={defaultCategories}
        targetSchoolyear={null}
        onCancel={() => setIcsParsed(null)}
        onConfirm={() => { if (icsParsed) onImportJson(buildDocFromIcs(icsParsed)); setIcsParsed(null); }}
      />
    </div>
  );
}
```

> Note: JSON-backup import was dropped from the new welcome (it lives in Settings → Import). If the user wants it kept, re-add a "JSON-Backup laden" button under "Neu" reusing the old `handleFile`. Confirm `--shadow-modal`, `--color-ink-100`, `--color-marine-200` exist in `globals.css`; substitute nearest token if not.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd curriculr-planner && npx vitest run src/components/welcome/Welcome.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd curriculr-planner
git add src/components/welcome/Welcome.tsx src/App.tsx src/components/welcome/Welcome.test.tsx
git commit -m "feat(welcome): two-column source switcher + load-from-WordPress"
```

---

## Task 8: SPA — remove Excel-import

**Files:**
- Delete: `curriculr-planner/src/lib/excel-import.ts`, `curriculr-planner/src/lib/excel-import.test.ts`
- Modify: `curriculr-planner/src/components/settings/ImportTab.tsx`

- [ ] **Step 1: Inspect `ImportTab.tsx` to scope the Excel removal**

Run: `cd curriculr-planner && cat src/components/settings/ImportTab.tsx`
Identify the Excel block: the `parseKonverterXlsx` import (line ~6), its handler (~line 36), the `.xlsx` file input, and its trigger button. Leave the ICS import path untouched.

- [ ] **Step 2: Remove the Excel-import wiring from `ImportTab.tsx`**

Delete from `ImportTab.tsx`:
- `import { parseKonverterXlsx } from '@/lib/excel-import';`
- the Excel handler function (the one calling `parseKonverterXlsx`)
- the `.xlsx` `<input>` + the button that triggers it (and its `useRef` if Excel-only)

Keep all ICS-related code.

- [ ] **Step 3: Delete the lib + its test**

Run:
```bash
cd curriculr-planner
git rm src/lib/excel-import.ts src/lib/excel-import.test.ts
```

- [ ] **Step 4: Verify no dangling references**

Run: `cd curriculr-planner && grep -rn "excel-import\|parseKonverterXlsx" src/`
Expected: **no output**. (If `ImportTab.test.tsx` references it, update that test too.)

- [ ] **Step 5: Typecheck + run affected tests**

Run:
```bash
cd curriculr-planner
npm run typecheck
npx vitest run src/components/settings/
```
Expected: no type errors; Settings tests pass.

- [ ] **Step 6: Commit**

```bash
cd curriculr-planner
git add -A
git commit -m "chore: remove unused Excel-import (lib + welcome + ImportTab)"
```

---

## Task 9: SPA — version bump + full green

**Files:**
- Modify: `curriculr-planner/package.json`

- [ ] **Step 1: Bump the SPA version (minor)**

In `curriculr-planner/package.json`, bump the `"version"` field one minor (e.g. `1.x.0 → 1.(x+1).0`). Run `grep '"version"' package.json` first to read the current value.

- [ ] **Step 2: Full verification gate**

Run:
```bash
cd curriculr-planner
npm run typecheck
npm run lint
npm run test:run
npm run build
```
Expected: typecheck clean, lint `0 warnings`, all Vitest suites pass, build succeeds.

- [ ] **Step 3: Commit**

```bash
cd curriculr-planner
git add package.json
git commit -m "chore: bump SPA version (welcome redesign + WP load)"
```

- [ ] **Step 4: Manual smoke (optional, recommended)**

Run: `cd curriculr-planner && npm run dev`
Check: welcome shows two columns; switching sources works; logged-out WordPress source prompts login; "Neu" has no Excel button; local plans open.

---

## Self-Review notes (for the implementer)

- **Spec coverage:** Welcome redesign → Task 6+7. Login on welcome → Task 6+7 (BrandPanel + handlers). `GET /docs` → Task 1. `fetchDocList` → Task 3. `loadFromWp` (+ link + local save) → Task 4. Shared auth helpers → Task 5. Excel removal incl. ImportTab → Task 8. Cross-repo version bumps → Task 2 (WP) + Task 9 (SPA). Security (sessionStorage unchanged, Zod via `fetchDoc`/`storage`) → unchanged by design; no task weakens it.
- **Type consistency:** `DocListItem` defined in Task 3, consumed in Tasks 4/7. `loadFromWp(sj, name, setDocFn)` signature identical in Tasks 4 + 7. `iservLoginUrl`/`startIservLogin`/`iservLogout` defined in Task 5, used in Tasks 5 + 7.
- **Token names:** every UI task tells the implementer to verify `--color-*` tokens against `globals.css` before trusting the names — do that grep, never hardcode hex.
- **Order matters:** WP endpoint (Task 1) before SPA client (Task 3) so the contract is fixed first. Within SPA, lib → store → components.
```
