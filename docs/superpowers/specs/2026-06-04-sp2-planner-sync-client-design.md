# SP2 — Planner WordPress-Sync-Client + Entwurf/Freigabe-Workflow

**Datum:** 2026-06-04
**Status:** Design abgenommen (Brainstorming), bereit für Implementierungsplanung
**Baut auf:** [Umbrella-Spec](2026-06-03-curriculr-sync-architecture-design.md) + SP1 (WP Data Layer, PR #2)
**Repo:** `curriculr-planner` (React/TS) — plus kleine Ergänzungen im WP-Plugin (Abschnitt 7)

## 1. Ziel

Die Schulleitung kann im Planner per **Knopf** einen Schuljahresplan an WordPress senden und ihn über drei Stufen führen: **Entwurf** (nur Leitung) → **Genehmigt** (nur Leitung) → **Öffentlich** (ganzes Kollegium). Zwei Pläne laufen typischerweise parallel: das aktuelle Schuljahr (Öffentlich) und das kommende (Entwurf/Genehmigt).

## 2. Harte Randbedingung: Nicht-Disruption

Bis der Nutzer alles getestet und bewusst umgeschaltet hat, läuft der heutige Betrieb **unverändert** weiter (laufendes WP-Plugin + Planner auf GitHub Pages, alter Export→IServ→Link-Weg).

- WordPress-Sync im Planner ist **standardmäßig AUS**. Ohne Konfiguration verhält sich der Planner **exakt wie heute** (LocalStorage-Authoring, ICS/Excel-Export bleiben).
- Senden fasst **nur ein ausdrücklich zugeordnetes WP-Profil** an — **nie** automatisch das Live-Profil. Ohne Zuordnung passiert nichts.
- Der alte manuelle Weg bleibt **parallel** nutzbar (Export-Tab unverändert). Kein Cutover ohne explizite Nutzer-Aktion.

## 3. Workflow & Stufen

Jeder Plan trägt eine **Stufe**: `entwurf` → `genehmigt` → `oeffentlich`.

```
Bearbeiten im Planner ──[ Nach WordPress senden ]──► WordPress
Stufe:  ENTWURF ──[ Freigeben ]──► GENEHMIGT ──[ Öffentlich schalten ]──► ÖFFENTLICH
        nur Leitung (geschützter Link)   nur Leitung                      alle sehen es
```

- **„Nach WordPress senden"** überträgt die aktuellen Bearbeitungen; die Stufe bleibt unverändert.
- **„Freigeben"**: `entwurf` → `genehmigt` (bleibt geschützt; interne Genehmigung).
- **„Öffentlich schalten"**: `genehmigt` → `oeffentlich` (wird für alle sichtbar).
- Aktuelles Schuljahr = ein Plan auf `oeffentlich` (Korrekturen: bearbeiten → Senden → sofort sichtbar). Kommendes = `entwurf`/`genehmigt`.
- Stufen-Rücksprung (z.B. Öffentlich → zurück zu Entwurf) ist **nicht** im Scope (YAGNI).

## 4. Planner-Komponenten (dieses Repo)

### 4.1 Einstellungen → neuer Tab „WordPress" (`src/components/settings/WordpressTab.tsx`)
Felder: `baseUrl` (z.B. `https://schule.example`), `username` (WP-Benutzer), `appPassword` (Application Password), `enabled` (Schalter, Default aus). Button **„Verbindung testen"** → `GET {baseUrl}/wp-json/curriculr/v1/health` mit Basic-Auth → zeigt „verbunden, Plugin v4.5.0" oder klaren Fehler. Hilfetext erklärt in einfachen Worten, wo das Application Password in WordPress erzeugt wird.

### 4.2 Pro-Plan-Verknüpfung
Jeder Planner-Plan (`PlannerDocument.id`) wird mit einem WordPress-Ziel verknüpft: `{ schoolyearKey: string, wpProfileId: string, stage: 'entwurf'|'genehmigt'|'oeffentlich' }`. Auswahl im WordPress-Tab oder beim ersten Senden. **Schutz:** Die Liste der wählbaren Profile schließt das Live-Profil aus bzw. warnt deutlich; Default ist ein neu anzulegendes Test-/Curriculr-Profil.

### 4.3 Sync-Service (`src/lib/wp-sync.ts`, framework-agnostisch, TDD)
- `testConnection(config)` → `GET /health`.
- `pushDoc(config, target, doc, baseVersion)` → `PUT /doc/{schoolyearKey}` mit `{ doc, baseVersion, stage }`. Antworten: `200` (neue version + feedUrl), `400` (ungültig), `409` (Konflikt + Server-Doc).
- `fetchDoc(config, schoolyearKey)` → `GET /doc/{schoolyearKey}` (Laden beim Start / Geräte-Wechsel).
- Reiner `fetch`-Wrapper mit Basic-Auth-Header; injizierbar für Tests (kein echtes Netz im Test).
- **Kein Offline-Queue in v1** (manueller Knopf): bei Fehler/Netzproblem klare Fehlermeldung + erneut versuchen. (Queue war für Auto-Sync gedacht — entfällt hier, YAGNI.)

### 4.4 Bedienelemente
- **Stufen-Abzeichen** + Knöpfe „Senden", „Freigeben", „Öffentlich schalten" im Editor-Kopf bzw. Plan-Bereich. Knopf-Verfügbarkeit richtet sich nach Stufe (Freigeben nur bei `entwurf`, Öffentlich schalten nur bei `genehmigt`).
- Destruktive/öffentlich-machende Aktion („Öffentlich schalten") mit kurzer Bestätigung.
- **Status-Anzeige** erweitert die bestehende ([EditorHeader.tsx](../../../src/components/editor/EditorHeader.tsx) `savingState`): zusätzlich `wpSyncState` = `idle | sending | synced | conflict | error`, Texte „✓ An WordPress gesendet" / „Konflikt — bitte prüfen" / „Senden fehlgeschlagen".

### 4.5 Konflikt (409)
Server neuer als lokal → klarer Dialog: „WordPress hat eine neuere Version. (A) Server laden (lokale Änderungen verwerfen) oder (B) meinen Stand behalten und erneut senden." Einzelnutzer → seltener Fall, aber sauber abgefangen.

### 4.6 Laden beim Start (Geräte-Wechsel)
Wenn Sync aktiv + Plan verknüpft: optionaler Abgleich beim Öffnen — ist die Server-`version` höher als lokal, Hinweis + Übernahme anbieten. Lokales Authoring bleibt führend, Server ist Sicherung.

### 4.7 Konfigurations-Speicher
WP-Konfiguration + Pro-Plan-Verknüpfung in `localStorage` (eigener Key `curriculr-planner:wp-sync`). Das Application Password liegt dort im Klartext — vertretbar für dieses Einzelnutzer-Tool auf dem Schul-Rechner; im Hilfetext erwähnt, jederzeit in WordPress widerrufbar.

## 5. Datenfluss

Bearbeiten → LocalStorage (wie heute, unverändert) → Klick „Senden" → `wp-sync.pushDoc` → `PUT curriculr/v1/doc/{sj}` (mit `stage`) → WP speichert + (bei `oeffentlich`) Feed-Reuse-Refresh des zugeordneten Profils. Stufen-Knöpfe senden ein `PUT` mit geänderter `stage`.

## 6. Fehlerbehandlung

Klare deutsche Meldungen, nie stiller Verlust: Verbindungsfehler → „WordPress nicht erreichbar — Internet/Adresse prüfen"; Auth-Fehler 401 → „Benutzer oder Application Password falsch"; 409 → Konfliktdialog (4.5); 400 → „Daten ungültig" (sollte nicht auftreten, da lokal Zod-validiert).

## 7. Ergänzungen im WP-Plugin (Repo `curriculr-terminplan`, SP1.1)

Klein, baut auf SP1:
- **Stufen-Feld** `stage` (`entwurf|genehmigt|oeffentlich`, Default `entwurf`) in `wp_curriculr_docs`; `PUT` nimmt `stage` aus dem Envelope an und speichert es.
- **Anzeige-Routing nach Stufe:** `oeffentlich` → öffentliche Quartalsansicht (bestehend); `entwurf`/`genehmigt` → **geschützter** Zugang über das bereits vorhandene Entwurf-Vorschau-/Kiosk-Token des Plugins (kein neuer Mechanismus).
- **Sicherheits-Standard:** `gsh_tp_curriculr_after_put` fasst nur ein **explizit gemapptes** Profil an; der bisherige Rückfall auf das aktive Profil entfällt (Nicht-Disruption, Abschnitt 2). Feed-Reuse-Refresh nur bei `stage = oeffentlich`.

## 8. Bewusst NICHT im Scope (YAGNI)

- Automatisches Senden (späterer Schalter „automatisch veröffentlichen").
- Offline-Queue/Retry-Automatik (manueller Knopf genügt).
- Stufen-Rücksprung, Mehrbenutzer-Kollaboration, Echtzeit.
- Verwaltung der geschützten Leitungs-Zugänge selbst (nutzt vorhandenes Plugin-Token; Verteilung des Links = organisatorisch, SP3).

## 9. Testing

- `wp-sync.ts` TDD mit injiziertem `fetch`: testConnection (ok/401/Netzfehler), pushDoc (200/400/409 + stage), fetchDoc, Header/Body-Form. Kein echtes Netz.
- Stufen-Logik (welcher Knopf bei welcher Stufe) als reine Funktion + Test.
- Komponenten-Tests: WordpressTab (Eingabe/Test), Knopf-Sichtbarkeit nach Stufe, Konfliktdialog.

## 10. Offene Punkte / SP3

- IServ abonniert den **öffentlichen** Feed des Live-Profils (wie Umbrella §3); der geschützte Entwurf-Feed wird **nicht** in IServ abonniert.
- Verteilung des geschützten Entwurf-Links an die Leitung (organisatorisch).
- Einmalige Migration des laufenden Schuljahres in ein Curriculr-Profil beim echten Cutover.
