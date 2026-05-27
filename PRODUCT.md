# Product

## Register

product

## Users

**Schulleitung** (Schul-Direktorinnen, Konrektorinnen, Stundenplaner) an deutschen weiterführenden Schulen. Typisch 45–60 Jahre alt, langjährige Berufserfahrung, IT-Affinität *durchschnittlich* (Office, Browser, IServ). Pro Schuljahr eine Person verantwortlich, plant einmalig im Frühjahr/Sommer den kompletten Jahresterminplan, pflegt unterjährig Änderungen.

**Kontext:** Büro in der Schule, häufig zwischen Konferenzen, Sprechstunden, Stundenplan-Arbeit. Bildschirm 22–27", oft schlechtes Licht. Selten am Smartphone. Häufig mit anderen Browser-Tabs (IServ, Schulverwaltungs-Software, E-Mail) parallel. Konzentration unterbrochen.

**Job to be done:** Den Halbjahres-/Jahresterminplan der Schule strukturiert erfassen und an das Kollegium kommunizieren. Heute meist als Word-Tabelle mit Schulwochen als Zeilen und Mo-Fr als Spalten gepflegt. Ausgabe muss in IServ-Kalender und ins schulinterne WordPress-Plugin importierbar sein.

## Product Purpose

Curriculr Planner ersetzt das traditionelle Word-Halbjahresplan-Dokument durch ein digitales Tool, das Schulwochen, Quartale, Ferien und Termin-Kategorien als erste Bürger versteht. Es exportiert nach ICS (Standard-Kalender, Curriculr-WP-Plugin) und Excel (Rundtrip mit bestehendem Konverter).

**Erfolg sieht so aus:**
- Schulleitung erstellt in unter 30 Minuten einen leeren Jahresplan inkl. Ferien, Quartale und Kategorien.
- 100+ Termine pro Schuljahr werden ohne Frust gepflegt (Drag-Drop, Kategorie-Auto-Match, Anmerkungen pro Schulwoche).
- ICS-Export landet ohne Nachbearbeitung im IServ und im WP-Plugin.
- Kein Datenverlust bei Browser-Crash oder Geräte-Wechsel (LocalStorage + JSON-Backup, später Cloud-Sync).
- Schulleitung empfiehlt das Tool an andere Schulen weiter, weil es "endlich für Schule gemacht" ist.

## Brand Personality

**Souverän, sachlich, verbindlich.**

Stimme wie ein erfahrener Konrektor: ruhig, kompetent, niemand muss raten was gemeint ist. Keine Marketing-Begeisterung ("Awesome!", "Let's go!"), keine Emojis als Schmuck, keine Casual-Anreden. Deutsch, formell-höflich, klar formulierte Aktionen ("Termin speichern", nicht "Save"). Fehler werden direkt benannt, ohne zu beschönigen ("Endedatum muss nach Startdatum liegen", nicht "Hoppla, da stimmt was nicht").

Emotionaler Ton: gleichzeitig **Kontrolle + Überblick** (Schulleitung sieht sofort, wo Termine sich häufen oder fehlen) und **Effizienz** (in 30 Minuten ist das Schuljahr durchgeplant). Nicht Tresor-Ruhe, nicht Tech-Hype.

Erste Begegnung soll vermitteln: *"Endlich ein Tool, das für Schule gemacht ist."* Sichtbare Sorgfalt im Detail, deutsche Schul-Sprache, strukturierte Logik. Nicht generisch.

## Anti-references

**Was Curriculr Planner explizit NICHT sein soll:**

- **Google Calendar / Outlook** (generischer Termin-Kalender). Schul-Kontext ist anders: Schulwochen sind das primäre Ordnungsprinzip, nicht Kalenderwochen oder Monate. Ferien sind nicht "leere Tage", sondern strukturelle Marker. Kategorien sind schul-spezifisch (Konferenz, Elternabend, Wandertag, KAoA), nicht Free-Text-Labels.

- **SAP / IServ / Logineo** (bürokratische Verwaltungs-Software). Kein Behörden-Look, keine 90er-Jahre-Borders, keine grauen Tabellen mit 11px Text, kein Information-Overload, kein "Speichern unter ID 234567"-Verhalten. Schulleitung kennt diese Tools und mag sie nicht.

- **Word-Halbjahresplan / Excel-Tabelle** (Status quo). Tool muss spürbaren Mehrwert ab erster Sekunde liefern: Schulwochen werden automatisch berechnet (nicht manuell durchnummeriert), Termine sind verschiebbar (nicht ausschneiden/einfügen), Kategorie-Farben sind konsistent (nicht jedes Mal neu eingefärbt), Export ist Ein-Klick (nicht Copy-Paste in andere Tools).

**Sekundäre Anti-References:**
- Trello/Kanban-Spielzeug-Ästhetik (Schul-Terminplanung ist ernst, keine Drag-Card-Fröhlichkeit).
- Notion/Linear-Aesthetics als Selbstzweck (Slash-Commands, Hover-Magie, Hidden-Power-User-Features würden Schulleitung intimidieren).

## Design Principles

1. **Schul-DNA, nicht Kalender-DNA.** Schulwochen, Quartale, Ferien sind die primäre Struktur, nicht aufgepfropft auf einen generischen Kalender. Wenn eine Standard-Kalender-Konvention der Schul-Realität widerspricht, gewinnt die Schul-Realität (Beispiel: Wochenenden ausgeblendet, weil schulisch irrelevant).

2. **Sichtbarer Mehrwert ab erster Sekunde.** Jedes Detail, das Word/Excel nicht kann, ist offensichtlich: SW-Nummern in der linken Spalte, Ferien als Schraffur, Drag-Drop-Cursor beim Hover, Kategorie-Farben im Termin-Block, "Gespeichert"-Status im Header. Kein verstecktes Feature, das man erst entdecken muss.

3. **Lesbarkeit vor Dichte.** Schulleitung liest am 22" Monitor mit Lesebrille zwischen zwei Konferenzen. Großzügige Typografie (Inter 13px+ für Body), hohe Kontraste (Curriculr-900 auf Weiß ≈ 12:1), klickbare Flächen min 36px. Lieber zwei Screens scrollen als Mini-Text in einen Screen quetschen.

4. **Sachlich-souveräne Sprache.** Deutsch, formell-höflich, präzise Verben. Aktionen heißen wie sie wirken ("Plan erstellen", "Termin löschen", "Schulwochen neu berechnen"). Fehler werden direkt benannt, ohne Beschönigung oder Schuldzuweisung. Keine Marketing-Adjektive ("smart", "intuitive", "powerful"). Keine Emojis im UI-Chrome (📝 für Notiz-Icon erlaubt, weil semantisch und etabliert).

5. **Verlässlichkeit demonstrieren.** Schulleitung gibt 100+ Termine ein, davon hängt das Schul-Jahr ab. Tool zeigt aktiv: Auto-Save-Status (Header-Indikator), JSON-Backup als Selbstschutz, explizite Bestätigung vor destruktiven Aktionen (Termin löschen, Plan löschen). Nichts darf unbemerkt verloren gehen, und das Tool macht das sichtbar.

## Accessibility & Inclusion

**Pragmatischer Ansatz** — kein formaler WCAG-Audit, kein BITV-2.0-Zertifikat angestrebt. Fokus auf reale Nutzbarkeit für die Zielgruppe (45–60 Jahre, durchschnittliche IT-Erfahrung, gemischte Sehfähigkeit).

**Konkrete Anforderungen:**
- Text-Kontrast min 4.5:1 (WCAG AA Body), bei UI-Chrome 3:1
- Schrift min 13px für Body, 11px nur für Sekundär-Labels (Datum-Ranges, Hilftexte)
- Alle interaktiven Elemente per Tab-Tastatur erreichbar, sichtbarer Focus-Ring (`--shadow-focus`)
- Maus + Tastatur als gleichwertige Eingabe-Pfade (Drag-Drop hat Tastatur-Alternative via Modal-Edit)
- `prefers-reduced-motion` respektieren (Hover-Lift-Animationen abschalten)
- Keine reine Farb-Information (Kategorie-Farben immer mit Label kombiniert, Highlight-Termine immer mit zusätzlichem visuellem Marker wie Border + BG)

**Nicht im Scope:** Screen-Reader-Tuning (ARIA-Live-Regions, Landmark-Roles über shadcn-Defaults hinaus), High-Contrast-Mode, RTL-Sprachen.
