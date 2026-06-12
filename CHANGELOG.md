# Changelog

Alle nennenswerten Änderungen am **Curriculr Planner** werden hier dokumentiert.

Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/).

## [1.7.0] – 2026-06-12 — „Mehrbenutzer & IServ-SSO"

### Hinzugefügt
- **IServ-SSO-Login** in Einstellungen → WordPress: Anmeldung per IServ-OIDC-Code-Flow; App-Token wird nur im RAM gehalten (kein localStorage).
- **Mehrbenutzer-Modus**: mehrere Schulleitungsmitglieder bearbeiten denselben Plan; sequentielle Konfliktlösung via 409-Flow.
- **Automatischer Pull beim Start**: beim App-Start wird der aktuelle WP-Stand automatisch geladen, wenn die Verbindung konfiguriert ist.
- **Aktualisieren-Schaltfläche** im Veröffentlichen-Popover: manueller Pull des WP-Stands.
- **Konflikt-Dialog mit Autorenangabe**: 409-Konflikt zeigt „Gespeichert von X am TT.MM.JJJJ um HH:MM Uhr".
- **Präsenz-Indikator** im Editor-Header: „X hat vor N Min gespeichert" (60-Sekunden-Polling, filtert eigene Speichervorgänge, blendet sich nach 24 h aus).
- **Datenschutz- & Transparenz-Tab** in Einstellungen: DSGVO-Hinweise zur Datenverarbeitung + Vibecoding-Transparenzhinweis.
- **Content-Security-Policy** (CSP-Meta-Tag) im Produktions-Build.

### Geändert
- Application-Password-Authentifizierung durch IServ-SSO-Bearer-Token ersetzt. WP-App-Passwort in Einstellungen entfernt.

### Behoben
- `pull()` unterscheidet 401/403 (Fehler-Toast) von 404 (kein Plan vorhanden — kein Toast).

---

## [1.6.0] – 2026-06-03 — „PDF-Export"

### Hinzugefügt
- **PDF-Export** über neuen Menüpunkt „Als PDF drucken" (Export-Dropdown):
  Öffnet einen Dialog zur Wahl von Umfang (aktuelles Quartal / ganzes Schuljahr)
  und Format (Hoch-/Querformat). Standard: Querformat A4.
- **Professionelles Drucklayout** – iframe-basierte Generierung (kein
  Popup-Blocker-Problem, Fallback auf `window.open`). Vollständiges HTML-Dokument
  mit eigenem CSS; keine Abhängigkeit von App-Shell oder CSS-Variablen.
- **Kategorie-Farbbalken** pro Termin: schmaler linker Balken in der Kategoriefarbe
  (druckt in S/W als Grauton – bleibt lesbar).
- **Fester Footer** auf jeder PDF-Seite: Stand-Datum + Schulinfo.
- **Schulname & Schulinformation** in Einstellungen → Schule & Druck konfigurierbar;
  erscheinen im PDF-Header.
- Layout nach professionellem Vorbild: feine Tabellenlinien (0,1 pt), dedizierte
  Schreiblinien in leeren Tageszellen für handschriftliche Notizen.

### Behoben
- Seitennummer zeigte „0" (CSS-Counter funktioniert nicht zuverlässig cross-browser) →
  Footer zeigt jetzt statisch das Quartal-Label.
- Anmerkungen-Spalte lief über den Zellenrand → `word-break: break-word` + feste Breite.

## [1.5.1] – 2026-06-01

### Hinzugefügt
- **Gruppen-Vorschläge** in Einstellungen → Gruppen: vorgefertigte Chips
  (Lehrkräfte, Eltern, Schülerinnen und Schüler, Schulleitung, Sekretariat,
  Hausmeister, Kollegium, Förderverein, Klassenlehrkräfte, Fachschaften) zum
  Hinzufügen per Klick. Bereits angelegte Gruppen werden ausgeblendet; eigene
  Gruppen bleiben frei eingebbar.

## [1.5.0] – 2026-06-01 — „Eigene Kategorien"

### Hinzugefügt
- **Kategorien anlegen & löschen** in Einstellungen → Kategorien (zuvor nur
  Bearbeiten möglich). Mindestens eine Kategorie bleibt erhalten.
- **Sicheres Löschen mit Umhängen:** Wird eine Kategorie noch von Terminen oder
  Vorlagen genutzt, fragt ein Dialog nach der Ziel-Kategorie und hängt alle
  Verweise um (`reassignCategory`), bevor sie entfernt wird.
- **Farbwähler** (`ColorPicker`): abgestimmte Paletten-Swatches (`CATEGORY_PALETTE`,
  gedämpfte markennahe Töne) plus freie Farbwahl.
- **Deep-Link in Einstellungen:** `openSettings(tab)` öffnet direkt den passenden
  Reiter; im Termin-Dialog führt „⚙ Kategorien verwalten" dorthin.
- **Hover-Vorschau im Schuljahr-Grid:** Titel und Kategorie-Badge erscheinen beim
  Überfahren einer Termin-Zelle (nativer Tooltip unterdrückt).

### Geändert
- Standard-Kategorien nutzen die neue, gedämpfte Farbpalette (nur neue Pläne;
  bestehende Dokumente bleiben unverändert). Schema bleibt v4, keine Migration.
- Slugs werden beim Speichern aus dem Label abgeleitet (`slugify`).

## [1.4.0] – 2026-06-01 — „Onboarding & Hilfe"

### Hinzugefügt
- **Geführte Tour** (driver.js, 8 Schritte, opt-in): Spotlight-Tour durch die wichtigsten Editor-Funktionen. Auslöser auf dem Welcome-Screen sowie im Hilfe-Modal.
- **Hilfe-Modal** (`?`-Button im Editor-Header): Zweigeteiltes Referenz-Modal mit 5 Sektionen (Erste Schritte, Termine & Kategorien, Ansichten, Vorlagen, Export & Backup) und CTA zum Starten der geführten Tour.
- Tour lädt automatisch ein Demo-Dokument, sodass alle UI-Elemente beim ersten Aufruf sichtbar sind.

## [1.3.2] – 2026-06-01

### Behoben
- Datums-Parameter im Ferien-Abruf werden korrekt URL-kodiert (verhindert Query-Parameter-Injektion).
- `listDocs` validiert gespeicherte Dokumente jetzt vollständig über das Zod-Schema inkl. Migration (gleiche Vertrauensgrenze wie `loadDoc`).

## [1.3.1] – 2026-06-01

### Behoben
- Datumsfelder lassen sich wieder direkt tippen (neue `DateInput`-Komponente
  statt unbedienbarer nativer Felder).
- Termine in Ferienwochen werden angezeigt (z. B. Lehrer-Termine in den Ferien).
- Drag-&-Drop zeigt jetzt eine Vorschau beim Verschieben von Terminen.
- Excel-Import liest das echte Konverter-`SW-Key`-Template korrekt ein.
- Logos werden auf GitHub Pages korrekt geladen (Pfad mit `BASE_URL`).
- Leere Platzhalterzeilen werden beim Ferien-Abruf entfernt; Pflichtfelder
  werden markiert.
- Dev-Server stürzt nicht mehr ab (`.claude/` wird nicht mehr beobachtet —
  FSWatcher-Crash auf Netzlaufwerk).

## [1.3.0] – 2026-05-30 — „Ferien-Import"

### Hinzugefügt
- **Ferien-/Feiertags-Abruf:** Bundesland wählen und Ferien sowie gesetzliche
  Feiertage per OpenHolidays-API vorbefüllen — im Assistenten (Schritt 1) und in
  Einstellungen → Schuljahr. Manuelle Einträge bleiben beim erneuten Abruf
  erhalten.
- Einzelne gesetzliche Feiertage werden in der Wochentabelle und im Schuljahr-Grid
  markiert (Tönung + Bezeichnung).

### Geändert
- Dokumentformat auf Schema **v4** angehoben (Ferien tragen jetzt einen Typ
  `ferien`/`feiertag` sowie eine Quelle), inklusive Migration v3 → v4.

## [1.2.0] – 2026-05-30 — „Komfort"

### Hinzugefügt
- **Termin-Vorlagen:** Vorlagen-Sidebar mit Drag-&-Drop und Klick-zum-Platzieren
  sowie Verwaltung (Anlegen/Bearbeiten/Löschen) im Reiter „Vorlagen" der
  Einstellungen.
- **Excel-Import:** Konverter-`.xlsx`-Dateien lassen sich wieder einlesen
  (Einstiegspunkte auf der Startseite und unter „Import"); Excel-Serial- und
  Datums-Zellen werden korrekt erkannt.
- **Schuljahr-Grid:** Neue Jahresansicht (Monate × Tage) als Gesamtüberblick,
  responsiv, mit Drag-Overlay und „Mehr anzeigen"-Schaltfläche pro Tag.
- **Rückgängig/Wiederholen:** Tastenkürzel (Strg+Z / Strg+Umschalt+Z) und
  Toolbar-Schaltflächen, gestützt auf einen Snapshot-Verlauf.
- Über-Reiter mit Versionsverlauf und Entwicklerhinweis.

### Geändert
- Dokumentformat auf Schema **v3** angehoben (Vorlagen integriert), inklusive
  automatischer Migration v2 → v3.
- FullCalendar-„Kalender"-Ansicht entfernt; Wochentabelle und Schuljahr-Grid
  decken Quartals- bzw. Jahresebene ab (kleineres Bundle).

### Behoben
- Rückgängig funktioniert jetzt auch nach einem Stapel-Import.
- Jahresansicht: Mehrfach-Termin-Badge und Lesbarkeit korrigiert.
- Excel-Zeitangaben (Serial-Werte) werden beim Import richtig interpretiert.
- Bestehende ESLint-Warnungen (react-hooks / react-refresh) bereinigt.

## [1.0.3] – 2026-05-27

### Behoben
- Laden des Demo-Plans korrigiert.
- Excel-Export: Kopfzeilen entsprechen wieder dem Konverter-Schema.
- Restliche Design-Spec-Lücken in der App geschlossen.

## [1.0.2] – 2026-05-26

### Hinzugefügt
- Tabellen-Layout mit Ansicht-Umschalter und Drag-&-Drop.

### Geändert
- Marken-Tokens und „Konrektor-Notizbuch"-Feinschliff über die App hinweg.

## [1.0.0] – 2026-05-26

### Hinzugefügt
- Erste Veröffentlichung: Assistent zur Erstellung des Jahresterminplans,
  Wochentabelle, Kategorien/Gruppen, Notizen, Export als ICS / JSON / Excel.
- MIT-Lizenz.

[1.7.0]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.7.0
[1.6.0]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.6.0
[1.5.1]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.5.1
[1.5.0]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.5.0
[1.4.0]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.4.0
[1.3.2]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.3.2
[1.3.1]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.3.1
[1.3.0]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.3.0
[1.2.0]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.2.0
[1.0.3]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.0.3
[1.0.2]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.0.2
[1.0.0]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.0.0
