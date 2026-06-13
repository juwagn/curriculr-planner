# SP3 — Release & Cutover: Merge, Profil-Zuordnung, IServ-Abo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beide SP1+SP2-PRs zu main mergen, Profile-Map-UI im WP-Admin ergänzen, aktuelles Schuljahr einmalig nach WP migrieren und IServ auf den öffentlichen Token-ICS-Feed abonnieren.

**Architecture:** Ein kleines Code-Feature (Profil-Zuordnung im WP-Admin-Settings), danach reine Ops-Schritte (PR-Merge, WP-Konfiguration, einmaliger PUT via Planner, IServ-Abo). Kein neuer Planner-Code. Alter manueller Export-Pfad bleibt als Fallback erhalten.

**Tech Stack:** PHP (prozedural, kein Build), WordPress 6.x, WP Application Passwords, GitHub Actions (CI → Pages), IServ (iCal-Abo)

---

## Task 1: Profil-Map UI im WP-Admin

Ermöglicht dem WP-Admin, einem Curriculr-Schuljahr-Schlüssel (z.B. `sj_2026_27`) ein WP-Profil zuzuweisen. Ohne diese Zuordnung löst `oeffentlich`-PUT **kein** `gsh_tp_do_refresh` aus → Anzeige veraltet.

**Files:**
- Modify: `curriculr-terminplan/plugin/gsh-terminplan.php` (POST-Handler ~Zeile 2667, HTML ~Zeile 3472, Version)

- [ ] **Schritt 1: POST-Handler erweitern**

  In `gsh-terminplan.php` den Block `// ── POST: Curriculr-Planner-Sync speichern ──` (Zeile ~2665) so ersetzen:

  ```php
  // ── POST: Curriculr-Planner-Sync speichern ──
  if ( isset( $_POST['gsh_tp_save_curriculr'] ) ) {
      if ( wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['gsh_tp_cur_n'] ?? '' ) ), 'gsh_tp_save_curriculr' ) ) {
          update_option( 'gsh_tp_curriculr_origin', esc_url_raw( wp_unslash( $_POST['gsh_tp_curriculr_origin'] ?? '' ) ) );
          $sj_key    = sanitize_key( wp_unslash( $_POST['gsh_tp_curriculr_sj_key']     ?? '' ) );
          $profile_id = sanitize_key( wp_unslash( $_POST['gsh_tp_curriculr_profile_id'] ?? '' ) );
          if ( $sj_key && $profile_id ) {
              update_option( 'gsh_tp_curriculr_profile_map', array( $sj_key => $profile_id ), false );
          } elseif ( ! $sj_key && ! $profile_id ) {
              update_option( 'gsh_tp_curriculr_profile_map', array(), false );
          }
          echo '<div class="notice notice-success"><p>' . gsh_tp_icon( 'check' ) . ' Curriculr-Sync-Einstellungen gespeichert.</p></div>';
      } else {
          echo '<div class="notice notice-error"><p>Sicherheitspr&uuml;fung fehlgeschlagen.</p></div>';
      }
  }
  ```

- [ ] **Schritt 2: HTML-Zeile für Profil-Zuordnung hinzufügen**

  In `gsh_tp_settings_page()` im HTML-Block der Curriculr-Form (nach dem `<tr>` mit `gsh_tp_curriculr_origin`, vor `submit_button`), diese neue Zeile einfügen:

  ```php
  <?php
  $cur_map     = get_option( 'gsh_tp_curriculr_profile_map', array() );
  $cur_sj_key  = array_key_first( $cur_map ) ?? '';
  $cur_prof_id = $cur_map ? reset( $cur_map ) : '';
  ?>
  <tr>
      <th><label for="gsh_tp_curriculr_sj_key">Profil-Zuordnung</label></th>
      <td>
          <input type="text" id="gsh_tp_curriculr_sj_key" name="gsh_tp_curriculr_sj_key"
                 value="<?php echo esc_attr( $cur_sj_key ); ?>"
                 class="regular-text" placeholder="sj_2026_27" />
          &rarr;
          <select name="gsh_tp_curriculr_profile_id">
              <option value="">— kein Profil —</option>
              <?php foreach ( gsh_tp_get_profiles() as $p ) : ?>
                  <option value="<?php echo esc_attr( $p['id'] ); ?>"
                      <?php selected( $cur_prof_id, $p['id'] ); ?>>
                      <?php echo esc_html( $p['id'] . ( ! empty( $p['is_active'] ) ? ' (aktiv)' : '' ) ); ?>
                  </option>
              <?php endforeach; ?>
          </select>
          <p class="description">
              Schuljahr-Schlüssel, den der Planner sendet (z.B. <code>sj_2026_27</code>), dem Profil zuordnen, das der Terminplan anzeigen soll.<br>
              Nur wenn diese Zuordnung gesetzt ist, aktualisiert sich die Anzeige automatisch bei „Öffentlich schalten".
          </p>
      </td>
  </tr>
  ```

- [ ] **Schritt 3: Versionsnummer von 4.7.0 → 4.8.0 an allen 4 Stellen**

  Alle vier Stellen in `gsh-terminplan.php` aktualisieren (Plugin-Header, `GSH_TP_VERSION`-Konstante, `gsh_tp_changelog()`-Array, Changelog-Kommentar im Header).

  Changelog-Eintrag oben einfügen (im `gsh_tp_changelog()`-Array und im Header-Kommentar):
  ```
  4.8.0: [FEATURE] Curriculr Profil-Zuordnung: Schuljahr-Schlüssel ↔ WP-Profil im System-Tab konfigurierbar
  ```

- [ ] **Schritt 4: PHP-Syntax prüfen**

  ```bash
  php -l plugin/gsh-terminplan.php
  ```
  Erwartete Ausgabe: `No syntax errors detected in plugin/gsh-terminplan.php`

- [ ] **Schritt 5: Commit**

  ```bash
  git add plugin/gsh-terminplan.php
  git commit -m "feat: Curriculr Profil-Zuordnung im System-Tab konfigurierbar (v4.8.0)"
  ```

  Commit in Branch `feat/curriculr-stage-safety` (SP1+SP1.1-Branch, wird in Task 2 gemergt).

---

## Task 2: Terminplan-PR #3 mergen (SP1 + SP1.1)

**Files:** keine Code-Änderung. Nur Git/GitHub.

- [ ] **Schritt 1: Lokalen Branch auf main-Stand prüfen**

  ```bash
  cd curriculr-terminplan
  git fetch origin
  git log --oneline main..feat/curriculr-stage-safety
  ```
  Erwartete Ausgabe: Alle SP1+SP1.1+SP3-Commits sichtbar, kein Merge-Konflikt.

- [ ] **Schritt 2: PR #3 auf GitHub mergen**

  Über GitHub UI PR #3 „Curriculr Data Layer + Publikations-Stufe & Sicherung" → Merge → Squash or Merge Commit (je nach Projektpraxis).
  
  Alternativ via CLI:
  ```bash
  gh pr merge 3 --merge --repo juwagn/curriculr-terminplan
  ```

- [ ] **Schritt 3: Alten PR #2 schließen**

  PR #2 ist durch PR #3 superseded — ohne Merge schließen:
  ```bash
  gh pr close 2 --repo juwagn/curriculr-terminplan --comment "Superseded by PR #3 (SP1+SP1.1+SP3)."
  ```

- [ ] **Schritt 4: Lokal aufräumen**

  ```bash
  git checkout main && git pull origin main
  ```

---

## Task 3: Planner-PR #4 mergen (SP2)

**Files:** keine Code-Änderung.

- [ ] **Schritt 1: PR #4 auf GitHub mergen**

  ```bash
  gh pr merge 4 --merge --repo juwagn/curriculr-planner
  ```
  
  Nach dem Merge läuft der `deploy.yml`-Workflow (push to main → typecheck + test:run + build → GitHub Pages).

- [ ] **Schritt 2: CI-Ergebnis abwarten**

  ```bash
  gh run watch --repo juwagn/curriculr-planner
  ```
  Erwartete Ausgabe: alle Jobs grün, Pages-URL verfügbar.

- [ ] **Schritt 3: Lokal aufräumen**

  ```bash
  cd curriculr-planner
  git checkout main && git pull origin main
  ```

---

## Task 4: WP-Admin konfigurieren

**Voraussetzung:** Plugin v4.8.0 live (manuell hochgeladen oder über WP-Update).

- [ ] **Schritt 1: Plugin-Datei auf WP hochladen**

  `plugin/gsh-terminplan.php` + `plugin/curriculr-data-layer.php` via SFTP/WP-Dateimanager in das Plugin-Verzeichnis hochladen und Plugin reaktivieren (oder WP-CLI: `wp plugin deactivate curriculr-terminplan && wp plugin activate curriculr-terminplan`).

- [ ] **Schritt 2: CORS-Adresse prüfen**

  WP-Admin → Terminplan → Einstellungen → System → Curriculr Planner-Sync.  
  Feld „Erlaubte Planner-Adresse" muss `https://juwagn.github.io` enthalten (Standard-Wert, keine Änderung nötig, wenn Planner von GitHub Pages kommt).

- [ ] **Schritt 3: Profil-Zuordnung setzen**

  Im selben Formular:
  - „Schuljahr" (Textfeld): `sj_2026_27` (oder den Schuljahr-Schlüssel, den der Planner verwenden wird — muss identisch zum Wert im Planner-Settings-Tab sein)
  - „Profil" (Dropdown): das Profil auswählen, das aktuell die Terminplan-Anzeige zeigt (i.d.R. das aktive Profil)
  - „Curriculr-Sync speichern" klicken → grüne Erfolgsmeldung

- [ ] **Schritt 4: REST-Schnittstelle testen**

  REST-URL aus dem Info-Block kopieren (z.B. `https://schule.de/wp-json/curriculr/v1/health`) und im Browser aufrufen.  
  Erwartete Ausgabe: `{"ok":true}` (nach Authentifizierung) oder 401 (ohne Auth — das ist korrekt).

---

## Task 5: Planner-Settings konfigurieren & Initiale Migration

**Voraussetzung:** Planner läuft auf `https://juwagn.github.io/curriculr-planner/` (nach PR-Merge + GitHub-Pages-Deploy).

- [ ] **Schritt 1: WP Application Password erstellen**

  WP-Admin → Benutzer → Profil → Anwendungspasswörter → neues Passwort für Anwendung „Curriculr Planner" generieren.  
  Passwort notieren (wird nur einmal angezeigt). Format: `XXXX XXXX XXXX XXXX XXXX XXXX`.

- [ ] **Schritt 2: Planner öffnen**

  `https://juwagn.github.io/curriculr-planner/` → das aktuelle Schuljahr-Dokument öffnen.

- [ ] **Schritt 3: WordPress-Tab in Einstellungen konfigurieren**

  Einstellungen → Tab „WordPress" öffnen:
  - **WordPress-URL**: `https://schule.de` (URL der WordPress-Installation, ohne Pfad)
  - **Benutzername**: WP-Benutzername (z.B. `admin`)
  - **Application Password**: das in Schritt 1 generierte Passwort
  - **Schuljahr-Schlüssel**: `sj_2026_27` (muss identisch zum Wert im WP-Admin aus Task 4 Schritt 3)
  - „Verbindung prüfen" klicken → grüner Status-Chip „Verbunden"

- [ ] **Schritt 4: Initialen PUT ausführen (Migration)**

  Im Editor: Stage-Chip → „Senden" → Entwurf auf WP hochladen.  
  Erwartete Ausgabe im Header: grüner Chip „Synchron ✓" oder Timestamp.

- [ ] **Schritt 5: Auf „Öffentlich" schalten**

  Stage-Chip → Popover „Veröffentlichen" → „Öffentlich schalten" bestätigen.  
  Erwartete Ausgabe: Stage-Chip wechselt zu „Öffentlich", WP-Profil wird aktualisiert, Terminplan-Anzeige frisch.

- [ ] **Schritt 6: Feed-URL aus Planner ablesen**

  WordPress-Tab → Feed-URL-Feld ablesen. Format:  
  `https://schule.de/wp-json/curriculr/v1/feed/sj_2026_27/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.ics`  
  Diese URL wird in Task 6 für IServ benötigt.

---

## Task 6: IServ-Kalender-Abo einrichten

- [ ] **Schritt 1: IServ-Admin öffnen**

  IServ-Admin → Kalender → Kalender-Abonnements (oder: Gruppen-Kalender → Externen Kalender hinzufügen).

- [ ] **Schritt 2: Kalender-Abo anlegen**

  - **URL**: Die Feed-URL aus Task 5 Schritt 6 einfügen
  - **Name**: z.B. „Curriculr Schuljahr 2026/27"
  - **Aktualisierungsintervall**: Bestehenden Standard übernehmen (IServ zieht normalerweise alle 1–24 h)
  - Speichern

- [ ] **Schritt 3: IServ-Kalender prüfen**

  Im IServ-Kalender prüfen, ob die Termine erscheinen. Falls nicht: Aktualisierung manuell anstoßen (IServ-Admin → Kalender → Jetzt synchronisieren).

- [ ] **Schritt 4: Endgerät prüfen**

  Auf einem Lehrer-Endgerät (Tablet/Laptop mit IServ-Kalender) prüfen, ob die Termine nach der nächsten Sync-Runde erscheinen.

---

## Task 7: E2E-Smoke-Test

Bestätigt den vollständigen Datenfluss: Planner-Änderung → WP → ICS-Feed → IServ.

- [ ] **Schritt 1: Test-Termin im Planner anlegen**

  Im Planner einen neuen Termin anlegen: Titel „E2E-Test 2026-06-05", Datum ein Datum in der Zukunft (z.B. Montag nächste Woche).

- [ ] **Schritt 2: Stage auf „Öffentlich" setzen**

  Stage-Chip → „Öffentlich schalten". Warten bis Header „Synchron" zeigt.

- [ ] **Schritt 3: WP-Terminplan-Anzeige prüfen**

  Die WordPress-Terminplan-Seite im Browser aufrufen und prüfen, ob der neue Termin in der Quartal-Ansicht erscheint.

- [ ] **Schritt 4: ICS-Feed direkt prüfen**

  Feed-URL aus Task 5 Schritt 6 im Browser aufrufen (oder mit `curl`):
  ```bash
  curl "https://schule.de/wp-json/curriculr/v1/feed/sj_2026_27/XXXXXXXX.ics" | grep "E2E-Test"
  ```
  Erwartete Ausgabe: `SUMMARY:E2E-Test 2026-06-05` erscheint im ICS-Body.

- [ ] **Schritt 5: Termin wieder löschen**

  Test-Termin im Planner löschen → „Öffentlich schalten" → WP-Anzeige prüfen → Termin verschwunden.

---

## Task 8: Runbook schreiben

Dokumentiert den Prozess für das nächste Schuljahr und für neue Teammitglieder.

**Files:**
- Create: `curriculr-terminplan/docs/sop-curriculr-sync.md`

- [ ] **Schritt 1: Runbook erstellen**

  Datei `curriculr-terminplan/docs/sop-curriculr-sync.md` anlegen mit diesem Inhalt:

  ```markdown
  # SOP: Curriculr-Sync — Schuljahreswechsel und Ersteinrichtung

  ## Voraussetzungen
  - WordPress-Plugin curriculr-terminplan ≥ v4.8.0 aktiv
  - Curriculr Planner unter https://juwagn.github.io/curriculr-planner/ erreichbar
  - WP Application Password für Planner-User generiert

  ## Neues Schuljahr einrichten

  1. **WP-Admin → Terminplan → Einstellungen → Schuljahr-Profile**:
     Neues Schuljahr-Profil anlegen (z.B. `sj_2027_28`), iCal-URL zunächst leer lassen.

  2. **WP-Admin → System-Tab → Profil-Zuordnung**:
     Schuljahr-Schlüssel `sj_2027_28` dem neuen Profil zuordnen. Speichern.

  3. **Planner → Einstellungen → WordPress-Tab**:
     Schuljahr-Schlüssel auf `sj_2027_28` setzen. Verbindung prüfen.

  4. **Planner → neues Schuljahr per Wizard anlegen** → Termine eingeben.

  5. **Stage → Öffentlich schalten**: WP-Profil erhält automatisch die Feed-URL.

  6. **IServ**: Neues Kalender-Abo mit der neuen Feed-URL anlegen.
     Die neue Feed-URL steht im Planner → Einstellungen → WordPress-Tab → Feed-URL.

  7. **E2E-Test**: Einen Testtermin einfügen → WP-Anzeige + IServ prüfen → löschen.

  ## Unterjährige Änderung

  1. Termin im Planner ändern.
  2. Automatischer debounced Sync (alle 2–5 s nach letzter Änderung, falls Stage = Öffentlich).
  3. WP-Anzeige aktualisiert sich automatisch. IServ beim nächsten Pull-Intervall.

  ## Stage-Workflow

  | Stage | Bedeutung | Wer sieht es |
  |---|---|---|
  | Entwurf | Lokal + WP gespeichert, aber nicht angezeigt | Nur Schulleitung (via Planner) |
  | Genehmigt | Intern geprüft, noch nicht öffentlich | Schulleitungsteam via Entwurf-Kiosk-Link |
  | Öffentlich | Anzeige + IServ-Feed aktiv | Alle |

  ## Troubleshooting

  **Anzeige aktualisiert sich nicht nach „Öffentlich schalten":**
  - WP-Admin → Terminplan → Synchronisierung → „Jetzt aktualisieren" für das betroffene Profil.
  - Prüfen: WP-Admin → System → Profil-Zuordnung korrekt gesetzt?

  **IServ zeigt keine neuen Termine:**
  - IServ-Admin → Kalender → Abo manuell synchronisieren.
  - Prüfen: Feed-URL im IServ-Abo identisch mit der URL im Planner-Tab?

  **Planner zeigt „Verbindungsfehler":**
  - WP-Admin → Einstellungen → Permanentlinks → Speichern (erneuert REST-Routen).
  - CORS: Erlaubte Planner-Adresse im System-Tab korrekt?
  - Application Password nicht abgelaufen/widerrufen?
  ```

- [ ] **Schritt 2: Commit**

  ```bash
  cd curriculr-terminplan
  git add docs/sop-curriculr-sync.md
  git commit -m "docs: SOP Curriculr-Sync — Schuljahreswechsel und Troubleshooting"
  git push
  ```
