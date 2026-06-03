# Curriculr Sync-Architektur — Planner ↔ WordPress ↔ IServ

**Datum:** 2026-06-03
**Status:** Design abgenommen (Brainstorming), bereit für Implementierungsplanung
**Betroffene Repos:** `curriculr-planner` (dieses, React/TS), `curriculr-terminplan` (WordPress-Plugin, PHP)

## 1. Kontext & Ziel

Heute laufen drei Werkzeuge unabhängig und einbahnig-manuell:

1. **Curriculr Planner** (React-SPA, GitHub Pages, nur LocalStorage) — Schulleitung plant das Schuljahr.
2. **IServ-Kalender** — Endgeräte der Lehrkräfte abonnieren ihn.
3. **curriculr-terminplan** (WordPress-Plugin) — zeigt dem Kollegium die Quartalsansicht inkl. Druck.

Ablauf bisher: Planner → ICS-Datei exportieren → manuell in IServ importieren → iCal-Link erzeugen → in WP-Plugin einfügen. Jede unterjährige Änderung erfordert erneuten Export + Re-Import. Daten leben in genau einem Browser.

**Ziel:** Schulleitung ändert einen Termin im Planner → die Änderung erscheint automatisch im IServ-Kalender (Endgeräte) **und** in der ausdruckbaren WordPress-Quartalsansicht. Plus automatische Speicherung und Sicherung gegen Datenverlust.

## 2. Abgenommene Grundentscheidungen

| Entscheidung | Wahl | Begründung |
|---|---|---|
| **Topologie** | WordPress als Hub | Voll self-hosted (PHP+DB+Cron), nutzt vorhandene, beherrschte Infrastruktur. |
| **Sync-Richtung** | Einbahn, Planner = Quelle der Wahrheit | Planner ist die Autoren-Oberfläche; IServ/WP sind Anzeige-Ziele. Keine Konflikt-/Merge-Logik gegen externe Änderungen. |
| **WP-Druckdesign** | 1:1 behalten, nur Datenquelle tauschen | Kein Design-Risiko. Polierter WP-Renderer bleibt unangetastet. |
| **IServ-Anbindung** | IServ abonniert WP-ICS-Feed (Pull) | IServ kann externe iCal abonnieren (bestätigt) → kein manueller Re-Import mehr. |
| **Feed-Privatsphäre** | Token in der Feed-URL | Unrätbar, analog zum bestehenden Kiosk-Token-Muster des Plugins. |
| **Auth** | WP Application Passwords | WP-Core (≥5.6), pro Gerät widerrufbar, kein eigener Auth-Code. |
| **WP-Codeorganisation** | Neue require'd Datei `plugin/curriculr-data-layer.php` (prozedural, `gsh_tp_curriculr_*`) im bestehenden `curriculr-terminplan`-Plugin — **kein** neues Repo, **keine** Klassen | Renderer lebt schon dort; 1 Plugin für den Schul-Admin; folgt Plugin-Konvention (Single-Procedural, kein Build); hält Monolith klein. |
| **WP-Anzeige-Datenpfad** | Feed-Reuse: Profil-`ical_url` = Feed-URL, bestehender Fetch/Parse/Cache 1:1, `gsh_tp_do_refresh` bei PUT — **kein** in-process Adapter | Null Renderer-/Parser-Änderung (max. „Design erhalten"); WP-Anzeige + IServ teilen denselben Feed; sofort-aktuell via vorhandene Refresh-Funktion. |

## 3. Gesamtarchitektur

Einbahn-Fluss, eine Quelle der Wahrheit:

```
① Planner (React-SPA, GitHub Pages)            [Autoren-UI bleibt 1:1]
   - LocalStorage  = Arbeitskopie + Offline-Puffer (bleibt, 300ms-Save)
   - Sync-Client (neu) = schiebt Doc nach WP, Status-Anzeige, Konflikt-Check
        │  HTTPS · REST · WP Application Password
        ▼
② WordPress — „Curriculr Data Layer" (neue require'd Datei, prozedural)
   - Tabelle wp_curriculr_docs          = Quelle der Wahrheit (1 Zeile / Schuljahr)
   - Tabelle wp_curriculr_doc_revisions = Historie (v1.1)
   - REST GET/PUT /doc + /health        = laden/speichern, Versions-Check
   - ICS-Feed-Endpoint /feed/{sj}/{token}.ics = EINZIGE Quelle für ③a UND ③b
   - bei PUT: Feed neu generieren + bestehendes gsh_tp_do_refresh($pid)
   - wp-cron Nacht-Backup (v1.1)
        │ Profil.ical_url = Feed-URL              │ ICS-Abo
        │ bestehender Fetch/Parse/Cache 1:1       │
        ▼                                        ▼
③a WP-Quartalsansicht + Druck/PDF        ③b IServ-Kalender → Endgeräte
   [Renderer + Parser UNVERÄNDERT]               [zieht Feed automatisch]
```

**Feed-Reuse statt Adapter (grounding-Erkenntnis):** WP-Anzeige und IServ konsumieren **denselben** Feed. Die `ical_url` des WP-Profils zeigt auf unsere Feed-URL; der komplette bestehende Fetch/Parse/Cache/Renderer-Pfad (`gsh_tp_fetch_ical` → `gsh_tp_parse_events` → Tabellen-Rendering) bleibt **1:1 unverändert**. Kein neuer Code am Renderer-Eingang. Bei `PUT` wird der Feed neu erzeugt und das bestehende `gsh_tp_do_refresh($pid)` aufgerufen → Anzeige sofort frisch (statt erst nach Cache-Ablauf).

**Ablauf neu:** im Planner ändern → Save → `wp_curriculr_docs` aktuell → Feed neu + `do_refresh` → Druckansicht **sofort** aktuell · IServ zieht den Feed → Endgeräte. Kein ICS-Datei-Upload mehr.

## 4. Datensicherheit — „Die Arbeit geht nicht verloren"

Prinzip: **local-first, durable überall, Nutzer nie blockiert.** Kein Single Point of Failure — die Kombination der Schichten garantiert es. Sichtbar im Header (Vertrauen zeigen): `Lokal gespeichert · ✓ Synchron · Offline – wird nachgereicht · Konflikt`.

| # | Schicht | Schützt gegen | Status | v1 |
|---|---|---|---|---|
| ① | LocalStorage, 300ms-debounced | Crash, Tab-zu, Reload | bleibt | ✓ |
| ② | beforeunload-Flush offener Änderungen | <1s Verlust beim Schließen | neu | ✓ |
| ③ | Undo/Redo-Stack (Cap 50) | versehentliches Löschen | bleibt | ✓ |
| ④ | Server-Kopie in WP (REST PUT) | Rechner-Tod, Geräte-Wechsel, Cache-Wipe | neu | ✓ |
| ⑤ | Offline-Queue + Retry (Backoff) | Netz weg beim Speichern | neu | ✓ |
| ⑥ | Versions-Guard (baseVersion → 409) | stilles Überschreiben durch altes Gerät | neu | ✓ |
| ⑦ | Server-Revisionen (Snapshot je Save) | schlechter Edit / Massen-Löschung (Rollback) | neu | v1.1 |
| ⑧ | Nacht-Backup wp-cron (JSON+ICS, offsite-fähig) | WP-DB-/Server-Verlust | neu | v1.1 |
| + | Manueller JSON-Export | Notausgang jederzeit | bleibt | ✓ |

Verlust-Ursache → aufgefangen von: Browser-Crash → ①②; anderes Gerät → ④ (Laden beim Start); offline → ⑤; Fehl-Löschung → ③⑦; stale Gerät → ⑥; Cache geleert → ④; DB-Verlust → ⑧ + Export.

## 5. Daten- & Sync-Modell

- **Arbeitskopie lokal:** Bestehender 300ms-`debouncedSave` in [src/stores/planner.ts](../../../src/stores/planner.ts) bleibt unverändert (LocalStorage via [src/lib/storage.ts](../../../src/lib/storage.ts)).
- **Remote-Sync:** Neuer Tier in der `StorageAdapter`-Abstraktion (`RemoteAdapter`). Nach Settle der lokalen Änderungen (Ruhe-Fenster, z.B. 2–5 s, oder bei Blur/explizit) wird das **vollständige** `PlannerDocument` per `PUT /doc/{schoolyear}` mit `baseVersion` übertragen.
- **Versionierung:** Jede gespeicherte Server-Version trägt eine monoton steigende `version`. Client sendet seine `baseVersion`.
  - `baseVersion == server.version` → speichern, `version++`, (v1.1) Revision-Snapshot, Antwort `{version, updatedAt}` (200).
  - `baseVersion < server.version` → **409 Conflict** + aktuelles Server-Doc. Client zeigt Konflikt-UI.
- **Konflikt-Auflösung (Geräte-Wechsel mit ungesynctem Lokalstand):** Server gewinnt automatisch, **aber** der Planner bietet vorher an, den lokalen Stand „als neue Version behalten" (lokales Doc wird auf die neue Server-`version`+1 angehoben und gepusht).
- **Laden beim Start:** Boot holt `GET /doc/{schoolyear}`; ist der Server neuer als lokal → übernehmen (mit explizitem Hinweis, falls lokal ungesyncte Änderungen vorliegen). Damit funktioniert der Geräte-Wechsel.
- **Offline-Verhalten:** WP nicht erreichbar → lokaler Stand bleibt sicher (①), Sync wird in einer Queue gehalten und mit Backoff erneut versucht, beim Reconnect geflusht. Nutzer wird nie blockiert.

## 6. API-Contract (Linchpin — SP0)

Beide Repos bauen gegen diesen Contract. REST-Namespace `curriculr/v1`.

| Methode | Route | Auth | Zweck |
|---|---|---|---|
| GET | `/curriculr/v1/doc/{schoolyear}` | App-PW | Doc + `version` + `updatedAt` laden (404 wenn leer) |
| PUT | `/curriculr/v1/doc/{schoolyear}` | App-PW | Body = `{ doc, baseVersion }`. Speichern + Versions-Check. Mismatch → 409 + Server-Doc |
| GET | `/curriculr/v1/health` | App-PW | Verbindungstest in den Planner-Settings |
| GET | `/curriculr/v1/doc/{schoolyear}/revisions` | App-PW | *(v1.1)* Snapshot-Liste |
| GET | `/curriculr/v1/doc/{schoolyear}/revisions/{id}` | App-PW | *(v1.1)* einzelner Snapshot |
| GET | `/curriculr/feed/{schoolyear}/{token}.ics` | **public + Token** | ICS für IServ-Abo + WP-Anzeige |

**Auth:** WP Application Passwords, `Authorization: Basic base64(user:app_pw)` über HTTPS. Schreib-Routen verlangen Capability (`manage_options` oder eigenes `manage_curriculr`). App-Passwort wird einmal in den Planner-Settings hinterlegt. Fallback, falls der Host Application Passwords sperrt: Shared-Secret-Key in den Plugin-Settings.

**CORS:** Planner-Origin (GitHub Pages) ist cross-origin → Plugin sendet `Access-Control-Allow-Origin` (konfigurierbarer Origin in Plugin-Settings), erlaubt `Authorization`-Header, beantwortet `OPTIONS`-Preflight. Explizit eingeplant (klassische Stolperfalle).

**Feed-Form = exakt heutige ICS-Form.** Der PHP-Feed-Generator spiegelt die VEVENT-Struktur aus [src/lib/ics-export.ts](../../../src/lib/ics-export.ts), damit IServ **und** der bestehende WP-Renderer keinen Unterschied sehen (Design erhalten).

## 7. Datenmodell (WP)

- `wp_curriculr_docs`: `schoolyear` (unique key), `json` LONGTEXT, `version` INT, `updated_at`, `updated_by`, `feed_token`.
- `wp_curriculr_doc_revisions` *(v1.1)*: `id`, `schoolyear`, `version`, `json`, `created_at`. Retention: letzte 50 + 1/Tag für 90 Tage; Prune im Cron.

Schuljahr-Schlüssel orientiert sich am bestehenden Plugin-Profilschema (z.B. `sj_2026_27`). Ein Doc + ein Feed-Token pro Schuljahr.

**Mapping zu bestehenden Profilen:** Das Plugin hält Profile in der Option `gsh_tp_profiles` (serialisiert, autoload, max 5), jedes mit `id` (pid) + `ical_url`. Ein Curriculr-Doc (schoolyear) ↔ ein Profil. Beim Aktivieren setzt das Data Layer `profile['ical_url']` auf die Feed-URL des Docs (`feed_token` aus `wp_curriculr_docs`). Damit greift der bestehende Fetch/Refresh-Mechanismus pro Profil unverändert.

## 8. Schema-Entkopplung (Resilienz & Wartbarkeit)

`PlannerDocument` hat eine Schema-`version` (aktuell `4`, siehe [src/lib/schemas.ts](../../../src/lib/schemas.ts)) mit Migrationskette.

- WP **speichert das Doc-JSON roh**, unabhängig von der Schema-Version → nie Datenverlust, auch wenn der Planner sein Schema hochzieht.
- Adapter und Feed lesen **nur die Felder, die sie brauchen** (Events: start/end/title/category, Schuljahr-Rahmen, Ferien) und sind tolerant gegen Extra-Felder.
- Unbekannte Schema-`version` > WP-Max → best-effort rendern + Admin-Hinweis „Plugin-Update empfohlen". Speichern/Sync bleiben funktionsfähig.

Damit sind Planner- und WP-Releases entkoppelt; ein Planner-Update zwingt nicht zum sofortigen WP-Update.

## 9. WP-Code-Organisation (an Plugin-Konventionen angepasst)

Das Plugin ist **prozedural, eine Datei** (`plugin/gsh-terminplan.php`, ~7900 Zeilen, `gsh_tp_*`-Funktionen), **kein Build-System, kein Composer, kein Autoload, keine Klassen** (AGENTS.md: „Simplicity First / Minimal Impact"). Das Data Layer folgt dieser Konvention:

- Neue Datei `plugin/curriculr-data-layer.php`, geladen via einem `require_once` aus `gsh-terminplan.php`. Hält den Monolithen klein, ohne Build/Autoloader.
- Prozedurale Funktionen mit Präfix `gsh_tp_curriculr_*`:
  - `gsh_tp_curriculr_install()` — `dbDelta` für `wp_curriculr_docs` (+ `_doc_revisions` v1.1).
  - `gsh_tp_curriculr_repo_get($sj)` / `gsh_tp_curriculr_repo_put($sj, $doc, $base_version)` — Tabellen-Zugriff + Versions-Check.
  - `gsh_tp_curriculr_register_rest()` (Hook `rest_api_init`) — Routen, Auth-/Capability-Check, CORS.
  - `gsh_tp_curriculr_feed($sj, $token)` — ICS-Generator, spiegelt die VEVENT-Form aus `ics-export.ts`.
  - `gsh_tp_curriculr_after_put($sj, $pid)` — Feed-Cache invalidieren + `gsh_tp_do_refresh($pid)`.
  - `gsh_tp_curriculr_backup_cron()` (v1.1) — Export + Revision-Prune.

**Renderer/Parser unverändert:** Es wird **kein** Adapter am Renderer-Eingang gebaut. Stattdessen zeigt die `ical_url` des zugehörigen Profils auf die Feed-URL (Feed-Reuse, §3). Renderer-Code, CSS, Tabs, Druck/PDF, iCal-Parser bleiben unangetastet.

**Plugin-Konventionen einhalten:** nach jeder Änderung `php -l`; Versionsnummer an allen 4 Stellen synchron (Header, `GSH_TP_VERSION`, `gsh_tp_changelog()`, Header-Changelog); Bezeichner Englisch, Kommentare Deutsch; CSS nur in `gsh-terminplan.css`.

## 10. Zerlegung & Baureihenfolge

Jedes Teil-Projekt: eigener Spec→Plan→Bau-Zyklus. Kritischer Pfad SP0 → SP1 → SP2 → SP3.

- **SP0 · Contract** (dieses Dokument): API + Doc/ICS-Form als Wahrheit für beide Repos. Gate.
- **SP1 · WP-Backend (Data Layer)** — Repo `curriculr-terminplan`, neue Datei `plugin/curriculr-data-layer.php`: Tabellen, REST GET/PUT/health, Application-PW-Auth + Capability, CORS, Versions-Check + 409, ICS-Feed (Token), Feed-Reuse-Verdrahtung (Profil-`ical_url` + `do_refresh` bei PUT). Standalone testbar (curl + Sample-Doc). **Fundament — wird zuerst gebaut.** *Repo ist lokal geklont nach `../curriculr-terminplan`.*
- **SP2 · Planner-Sync-Client** — dieses Repo: `RemoteAdapter`-Tier, Settings-UI (WP-URL + App-PW + Verbindungstest), debounced Sync nach Settle, Offline-Queue + Retry, baseVersion/Konflikt-UI, Tri-State-Header, Laden vom Server beim Start. Baut gegen SP1 (oder Mock des Contracts).
- **SP3 · Integration + Cutover** — Ops/Config: IServ abonniert WP-Token-Feed pro Schuljahr; aktuelles Schuljahr einmalig nach WP migrieren; End-to-End-Test (Planner → Gerät + Druck); alter Manual-Export-Pfad bleibt als Fallback bis stabil; Runbook.
- **SP4 · Härtung (v1.1)** — `curriculr-terminplan`: Revisions-Tabelle + Restore-UI (⑦); Nacht-Backup wp-cron JSON+ICS (⑧); Retention-Prune.

Der alte Export-Pfad bleibt über die gesamte Migration als Sicherheitsnetz aktiv.

## 11. Bewusst NICHT im Scope (YAGNI)

- **Bidirektionaler Sync** (Änderungen aus IServ zurück in den Planner): braucht Konflikt-/Merge-Logik, IServ-Event-ID-Mapping. Spätere optionale Erweiterung.
- **Reicheres WP-Druck-Layout** (Schulwochen-Zeilen, Notizen pro Woche): existiert bereits im Planner-Druck; keine Duplizierung in WP.
- **Mehrbenutzer-Kollaboration / Echtzeit-Sync:** ein Editor (Schulleitung) pro Schuljahr. Last-write-wins mit Versions-Guard genügt.
- **Eigenes Backend-Repo / Serverless / Git-as-DB:** verworfen zugunsten der vorhandenen WP-Infrastruktur.

## 12. Offene Punkte / vor SP1 zu prüfen

- **IServ-Abo-Details:** Aktualisierungsintervall des IServ-Pulls, ob Token-URL im Abo akzeptiert wird, ob HTTPS-Pflicht. (Nutzer prüft.)
- **CORS/Host-Eigenheiten:** Erlaubt der WP-Host Application Passwords und das Senden eigener CORS-Header? Falls nicht → Shared-Secret-Fallback.
- **wp-cron-Zuverlässigkeit:** Für ⑧ ggf. echter System-Cron statt wp-cron, falls Traffic gering.
- **Migration des laufenden Schuljahres:** Quelle = aktuelles LocalStorage-Doc bzw. vorhandener Excel/ICS-Stand; einmaliger initialer `PUT`.
