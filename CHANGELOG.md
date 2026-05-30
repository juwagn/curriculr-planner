# Changelog

Alle nennenswerten Änderungen am **Curriculr Planner** werden hier dokumentiert.

Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/).

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

[1.3.0]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.3.0
[1.2.0]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.2.0
[1.0.3]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.0.3
[1.0.2]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.0.2
[1.0.0]: https://github.com/juwagn/curriculr-planner/releases/tag/v1.0.0
