# Design — Startseite-Umbau + „Von WordPress laden"

**Datum:** 2026-06-14
**Repos:** `curriculr-planner` (SPA, primär) + `curriculr-terminplan` (WP-Plugin, ein neuer Endpoint)
**Status:** Entwurf zur Review

## Problem

Zwei konkrete Schmerzpunkte der Schulleitung:

1. **Plan auf anderem Rechner holen.** Ein Plan, der vom Heim-PC nach WordPress
   gespeichert wurde, lässt sich am Arbeits-PC nicht leicht laden. Heute braucht
   `wpSync.pull()` einen lokalen `WpPlanLink` (per-Gerät in `localStorage`) — den
   gibt es auf einem fremden Rechner nicht. Es existiert auch **kein** REST-Endpoint,
   der die auf WordPress vorhandenen Pläne auflistet; `GET /doc/{sj}` setzt voraus,
   dass man den `schoolyearKey` schon kennt.
2. **SSO-Login ist vergraben.** Der „Mit IServ anmelden"-Button liegt tief in
   Einstellungen → WordPress und verlangt vorher: Sync-Checkbox an + WP-Adresse
   tippen. Mühsam bei jedem neuen Rechner.

Zusätzlich soll die Startseite (`Welcome.tsx`) optisch und in der UX überarbeitet
werden (heute: flacher Button-Stapel in einer zentrierten Karte).

## Entscheidungen (mit Nutzer abgestimmt)

- **Multi-School:** Mehrere Schulen können das Tool nutzen → es darf **keine** feste
  WP-URL in den Build gebacken werden. Gewählt: Architektur **A** (URL einmal
  eintippen, danach in `localStorage` gemerkt; optionaler WP-Deeplink als Bonus).
- **Plan-Auswahl:** Liste durchsuchen → neuer WP-Endpoint `GET /curriculr/v1/docs`.
- **Login-Platzierung:** prominenter Button auf der Startseite (kein Auto-Redirect —
  rein lokale Nutzung ohne Internet muss möglich bleiben).
- **Startseiten-Layout:** Hybrid „zwei Spalten + Wo ist dein Plan?" (Marken-Panel
  links, Quellen-Umschalter rechts).
- **WP-Adresse-Eingabe:** Inline-Feld im Marken-Panel (erscheint nur wenn `baseUrl`
  leer, verschwindet sobald gemerkt).
- **Excel-Import:** komplett entfernen (`excel-import.ts` + Test + Welcome-Aufruf).
  Excel-**Export** bleibt (WP-Plugin konsumiert das Konverter-Schema).

## Architektur

### Flow „fremder PC"

```
Startseite (abgemeldet, baseUrl leer)
  → WP-Adresse eintippen → „Mit IServ anmelden"
  → IServ OIDC → zurück mit #auth=<code> → App-Token (sessionStorage)
  → Quelle „WordPress" → GET /docs → Plan-Liste
  → Plan „Laden" → GET /doc/{sj} → Zod-Validierung
  → lokal speichern + WpPlanLink anlegen + active setzen → Editor
```

Danach läuft Sync (push/pull) wie gewohnt, weil der Link jetzt lokal existiert.

### Komponenten / Units

**SPA — `welcome/Welcome.tsx` (Umbau)**
- Zwei-Spalten-Layout. Links `BrandPanel`, rechts `SourceSwitcher` + Quelllisten.
- Quellen: `'local' | 'wordpress' | 'new'`. Lokaler `useState`, kein globaler Store.
- Was es tut: zeigt verfügbare Pläne je Quelle, startet Laden/Anlegen, hostet Login.
- Abhängig von: `storage.listDocs()`, `useAuthStore`, `useWpSyncStore`,
  `wp-sync.fetchDocList`.

**SPA — `welcome/BrandPanel.tsx` (neu)**
- Marken-Panel + Account-Block. Angemeldet → Name/Gruppe/„Abmelden". Abgemeldet →
  „Mit IServ anmelden" + Inline-Feld „WP-Adresse" wenn `config.baseUrl` leer.
- Was es tut: Login/Logout auslösen, WP-Adresse erfassen. Reine Präsentation +
  Callbacks; keine Sync-Logik.

**SPA — `lib/wp-auth-actions.ts` (neu, klein)**
- `startIservLogin(baseUrl)` und `iservLogout(baseUrl, token)` — die heute in
  `WordpressTab.handleLogin/handleLogout` inline liegende Logik, extrahiert, damit
  Welcome **und** WordpressTab sie teilen (keine Duplikation).

**SPA — `lib/wp-sync.ts` (+ `fetchDocList`)**
```ts
export interface DocListItem {
  sj: string; name: string; stage: WpStage;
  version: number; updatedAt: string; authorName: string;
}
export async function fetchDocList(
  cfg: WpSyncConfig, token: string, fetchImpl?: FetchLike
): Promise<{ items: DocListItem[]; message?: string }>
```
- `GET {base}/docs` mit Bearer. 401/403 → `BAD_TOKEN`. Netzfehler → `NOT_REACHABLE`.
- Validiert Felder defensiv (wie `fetchLatestRevision`), liefert leeres Array bei
  Formatfehler statt zu werfen.

**SPA — `stores/wpSync.ts` (+ `loadFromWp`)**
```ts
loadFromWp(sj: string, name: string,
  setDocFn: (d: PlannerDocument) => void): Promise<'loaded' | 'error'>
```
- Ruft `fetchDoc(cfg, sj, token)`. Bei Erfolg: `storage.saveDoc(doc)`,
  `WpPlanLink` für `doc.schoolyear.id` anlegen
  (`{ schoolyearKey: sj, wpProfileId: '', stage, knownVersion: version }`),
  `storage.setActiveDoc`, `setDocFn`. Dok bereits Zod-validiert in `fetchDoc`/`storage`.
- `wpProfileId` bleibt leer (nur für Push nötig; setzt der Nutzer später in
  WordpressTab, falls er von diesem Gerät pushen will).

**SPA — `lib/wp-sync-config.ts`**
- Keine Schema-Änderung. Sicherstellen, dass `baseUrl` aus dem Welcome-Login-Feld
  via `setConfig` persistiert wird (Funktion existiert bereits).

**WP — `curriculr-data-layer.php` (+ List-Endpoint)**
- Route `GET /curriculr/v1/docs`, `permission_callback = gsh_tp_curriculr_perm`.
- Handler `gsh_tp_curriculr_rest_doc_list`: liest alle Zeilen aus
  `wp_curriculr_docs` (`sj, version, stage, updated_at`). `name` aus dem
  geparsten `doc_json` (`doc.meta.name`); `authorName` aus dem `author_name` der
  jeweils neuesten Revision in `wp_curriculr_doc_revisions`. Liefert Array von
  `{ sj, name, stage, version, updatedAt, authorName }`. **Kein** `doc_json` im
  Listing (Payload klein halten).
- Neuer Test `tests/curriculr/test-doc-list.php`.

### Datenfluss

- **Lokale Quelle:** `storage.listDocs()` → `DocSummary[]` (unverändert).
- **WP-Quelle:** Login vorhanden → `fetchDocList` → `DocListItem[]`. Ohne Login:
  Quelle „WordPress" zeigt Hinweis „Erst anmelden" statt Liste.
- **Laden:** `loadFromWp` → Editor. **Anlegen/Import/Demo/Tour:** bestehende
  `App.tsx`-Callbacks (`onCreateNew`, `onImportJson`, `onStartTour`) bleiben.

### Fehlerbehandlung

- `fetchDocList` Fehler → Liste leer + `toast`/Inline-Hinweis mit `message`.
- `loadFromWp` 404/ungültig → Toast, bleibt auf Startseite.
- Token abgelaufen (401/403) → `BAD_TOKEN`-Meldung + zurück in abgemeldeten Zustand.
- Offline / keine `baseUrl` → WP-Quelle deaktiviert mit erklärendem Hinweis; lokale
  Quelle + „Neu" funktionieren weiter.

### Sicherheit

- App-Token bleibt **`sessionStorage`** (RAM-nah, schließt mit Tab). Kein Wechsel zu
  `localStorage`. Auf einem Arbeits-PC = pro Sitzung ein IServ-Redirect (schnell via
  IServ-SSO-Session). Bewusst so.
- Geladene WP-Dokumente durchlaufen `PlannerDocumentSchema` (Trust-Boundary in
  `fetchDoc` + `storage`). Kein Bypass.
- Neuer `GET /docs` ist wie alle `curriculr/v1`-Routen Bearer-geschützt
  (`gsh_tp_curriculr_perm`); kein `doc_json` im Listing → minimale Exposition.

## Responsiv

- ≥ 720px: zwei Spalten (Panel 300px fix, Aktionen flexibel).
- < 720px: gestapelt — Panel oben (kompakt, Account-Block inline), Aktionen darunter.

## Tests

**SPA (Vitest):**
- `Welcome.test.tsx` anpassen: 3 Quellen-Umschalter, lokale Liste, „Neu"-Aktionen,
  **kein** Excel-Button mehr. Login-States (an/aus) im BrandPanel.
- `wp-sync.test.ts`: `fetchDocList` ok / 401 / Netzfehler / Formatfehler.
- `wpSync.test.ts`: `loadFromWp` legt Link an + speichert lokal + setzt active.

**WP (dependency-free):**
- `test-doc-list.php`: leeres Listing, ein/mehrere Docs, Feldform, Auth via Stub.

## Cross-Repo-Versionierung

- **WP:** `GSH_TP_VERSION` minor bump an 4 Stellen (neuer Endpoint) + Changelog +
  neue ZIP `curriculr-terminplan-<ver>.zip`. REST-Shape erweitert (additiv).
- **SPA:** `package.json` minor bump (Sync-Client kann jetzt listen/laden).

## Aufräumen

- `src/lib/excel-import.ts` + `src/lib/excel-import.test.ts` löschen.
- `parseKonverterXlsx`-Import/Aufruf + `xlsxInputRef` aus `Welcome.tsx` entfernen.
- **`settings/ImportTab.tsx` nutzt `parseKonverterXlsx` ebenfalls** (Zeile 6 + 36).
  „Ganz raus" heißt: Excel-Import-Option auch dort entfernen — also eine
  Verhaltensänderung in Settings → Import, nicht nur auf der Startseite. Andere
  Import-Wege im ImportTab (ICS etc.) bleiben. ⚠️ Bei Review bestätigen.
- **Excel-Export unangetastet** (`excel-export.ts`; WP konsumiert das Konverter-Schema).

## YAGNI / bewusst NICHT im Scope

- Kein zentrales Schul-Register / Dropdown (Architektur B verworfen).
- Kein Auto-Redirect-Login (C verworfen).
- WP-Deeplink „Im Planner öffnen" optional, **nicht** in diesem Durchgang.
- Kein Auto-Pull aller WP-Pläne beim Start (nur auf Klick der WP-Quelle).
