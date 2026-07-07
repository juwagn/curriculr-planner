const REPO_URL    = 'https://github.com/juwagn/curriculr-planner';
const APP_VERSION = '1.11.0';

type ChangelogEntry = { version: string; date: string; highlights: string[] };

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.11.0',
    date: '01.07.2026',
    highlights: [
      'Neue Navigationsstruktur: 7 Tabs in 3 Gruppen (Inhalt / Ausgabe / Info)',
      'StatusBar: Veröffentlichungs-Stufe und letzter Push immer sichtbar im Editor',
      'Veröffentlichen-Dialog mit Sichtbarkeits-Auswahl (Entwurf / Intern / Öffentlich)',
      'Veröffentlichung & Export: WordPress, Kalender-Einrichtung, Export und Import in einem Tab',
      'Stage-Begriff „Genehmigt" umbenannt in „Intern" (beschreibt Sichtbarkeit, nicht Prozess)',
    ],
  },
  {
    version: '1.10.0',
    date: '30.06.2026',
    highlights: [
      'Gruppen-Kalender einrichten: pro Gruppe eigener ICS-Feed-Link für IServ-Abo',
      'Kalender-Konfiguration nur bei angemeldeter WordPress-Verbindung sichtbar',
    ],
  },
  {
    version: '1.9.0',
    date: '20.06.2026',
    highlights: [
      'Willkommensseite neu gestaltet: BrandPanel mit Login, Zwei-Spalten-Auswahl (Neuer Plan / aus WordPress laden)',
      'Plan direkt von WordPress laden möglich, ohne vorherigen lokalen Plan',
      'Ganztägige Termine per Tages-Klick zeigen keine falsche Uhrzeit mehr',
    ],
  },
  {
    version: '1.8.0',
    date: '13.06.2026',
    highlights: [
      'Einstellungs-Modal hat feste Höhe — kein Größensprung mehr beim Tab-Wechsel',
      'Design-Tokens aufgeräumt: kanonische marine/ink/paper-Farben, Typo-Scale als CSS-Tokens',
    ],
  },
  {
    version: '1.7.0',
    date: '12.06.2026',
    highlights: [
      'IServ-SSO-Login ersetzt WordPress-Application-Passwort',
      'Mehrbenutzer-Modus: mehrere Schulleitungsmitglieder bearbeiten denselben Plan, Konfliktlösung via 409-Flow',
      'Automatischer Pull beim Start + manuelles Aktualisieren im Veröffentlichen-Popover',
      'Präsenz-Indikator im Editor-Header: „X hat vor N Min gespeichert"',
      'Datenschutz- & Transparenz-Tab: DSGVO-Hinweise + Vibecoding-Transparenzhinweis',
    ],
  },
  {
    version: '1.6.0',
    date: '11.06.2026',
    highlights: [
      'IServ-SSO-Anmeldung: Login über IServ, App-Token nur im RAM (kein localStorage)',
      'Alle WordPress-Aufrufe mit Bearer-Token gesichert — Application Password entfernt',
      'CSP-Header im Produktions-Build (kein unsafe-inline/eval)',
      'Datenschutz-Tab in den Einstellungen',
    ],
  },
  {
    version: '1.5.0',
    date: '01.06.2026',
    highlights: [
      'Eigene Kategorien anlegen und löschen (Einstellungen → Kategorien)',
      'Sicheres Löschen: genutzte Kategorien werden vor dem Entfernen umgehängt',
      'Neuer Farbwähler mit abgestimmter Palette plus freier Farbwahl',
      'Hover-Vorschau im Schuljahr-Grid (Titel + Kategorie-Badge)',
    ],
  },
  {
    version: '1.4.0',
    date: '01.06.2026',
    highlights: [
      'Geführte Tour (8 Schritte) durch die wichtigsten Editor-Funktionen',
      'Hilfe-Modal über den ?-Button mit 5 Referenz-Sektionen',
    ],
  },
  {
    version: '1.3.0',
    date: '30.05.2026',
    highlights: [
      'Ferien & Feiertage automatisch per Bundesland-Auswahl vorbefüllen',
      'Feiertage in Wochentabelle und Schuljahr-Grid markiert',
      'Datumsfelder wieder direkt eintippbar; Termine in Ferienwochen sichtbar',
    ],
  },
  {
    version: '1.2.0',
    date: '30.05.2026',
    highlights: [
      'Termin-Vorlagen: Sidebar (Drag & Drop / Klick) + Verwaltung in den Einstellungen',
      'Excel-Import von Konverter-Dateien (inkl. Excel-Datums- und Zeitwerten)',
      'Schuljahr-Grid: neue Jahresansicht (Monate × Tage)',
      'Rückgängig/Wiederholen mit Strg+Z / Strg+Umschalt+Z und Toolbar',
    ],
  },
];

const linkClass =
  'text-[var(--color-marine-700)] underline underline-offset-2 hover:text-[var(--color-marine-800)] transition-colors';

export function InfoTab() {
  return (
    <div className="space-y-6 text-[13px] text-[var(--color-ink-900)]">

      {/* Über */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[15px] font-semibold text-[var(--color-marine-800)]">Curriculr Planner</h3>
          <p>Version: <span className="tabular-nums">{APP_VERSION}</span></p>
          <p className="text-[var(--color-ink-500)]">Standalone-Tool zur Erstellung des Jahresterminplans.</p>
        </div>
        <div className="space-y-1">
          <p>
            Entwickelt von <span className="font-medium">Julian Wagner</span>{' '}
            <span className="text-[var(--color-ink-500)]">· Curricular</span>
          </p>
          <p>
            <a href={REPO_URL} className={linkClass}
               style={{ transitionDuration: 'var(--dur-state)' }} target="_blank" rel="noreferrer">
              Quellcode auf GitHub
            </a>
            {' · '}
            <a href={`${REPO_URL}/blob/main/CHANGELOG.md`} className={linkClass}
               style={{ transitionDuration: 'var(--dur-state)' }} target="_blank" rel="noreferrer">
              Vollständiger Changelog
            </a>
          </p>
          <p className="text-[12px] text-[var(--color-ink-500)]">MIT-Lizenz</p>
        </div>
        <div className="space-y-3">
          <h4 className="text-[13px] font-semibold text-[var(--color-marine-800)]">Änderungsverlauf</h4>
          <ul className="space-y-3">
            {CHANGELOG.map((entry) => (
              <li key={entry.version} className="space-y-1">
                <p className="font-medium">
                  Version <span className="tabular-nums">{entry.version}</span>{' '}
                  <span className="text-[12px] font-normal text-[var(--color-ink-500)]">– {entry.date}</span>
                </p>
                <ul className="ml-4 list-disc space-y-0.5 marker:text-[var(--color-ink-500)]">
                  {entry.highlights.map((h) => <li key={h}>{h}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Datenschutz — legally required, do NOT remove or abridge */}
      <div className="space-y-5 pt-2 border-t border-[var(--color-ink-200)]">
        <div className="space-y-1">
          <h3 className="text-[15px] font-semibold text-[var(--color-marine-800)]">Datenschutz &amp; Transparenz</h3>
          <p className="text-[var(--color-ink-500)]">
            Informationen zur Datenverarbeitung bei aktivierter IServ-Anmeldung.
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold">Verarbeitete Daten</h4>
          <p>
            Bei aktivierter IServ-Anmeldung werden folgende Daten verarbeitet: IServ-Kennung
            (<code className="text-[12px] font-mono bg-[var(--color-paper-bg)] px-1 rounded">sub</code>),
            Anzeigename und freigegebene Gruppen — sowie die Plandaten des Schuljahres.
          </p>
          <p>
            Das App-Token wird im{' '}
            <code className="text-[12px] font-mono bg-[var(--color-paper-bg)] px-1 rounded">sessionStorage</code>{' '}
            des Browsers gespeichert — nicht in{' '}
            <code className="text-[12px] font-mono bg-[var(--color-paper-bg)] px-1 rounded">localStorage</code>{' '}
            oder Cookies. Es wird beim Schließen des Browser-Tabs automatisch gelöscht.
            IServ-Zugangsdaten werden nicht gespeichert.
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold">Ferien-Abruf (OpenHolidays)</h4>
          <p>
            Beim manuellen Ferien-Abruf („Ferien laden") wird{' '}
            <strong>openholidaysapi.org</strong> (EU-Dienst) kontaktiert; übertragen werden
            dabei die IP-Adresse, das gewählte Bundesland und der Zeitraum. Der Abruf
            passiert nur auf Klick — nie automatisch.
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold">Speicherorte</h4>
          <p>Plandaten werden auf dem WordPress-Server (Hoster w3w.de, DE/EU) gespeichert.</p>
          <p>
            Die Planner-Oberfläche wird von <strong>GitHub Pages</strong> (GitHub/Microsoft, USA)
            geladen; dabei wird die IP-Adresse in ein Drittland übertragen. Dort werden{' '}
            <em>keine</em> Plandaten verarbeitet (nur statisches JavaScript/CSS). Zweck:
            gemeinsame Terminplanung. Rechtsgrundlage und Ansprechpartner: siehe schulisches
            Datenschutzkonzept.
          </p>
        </div>
        <div
          className="p-4 rounded-[var(--radius-default)] space-y-1"
          style={{ borderLeft: '4px solid var(--color-marine-800)', background: 'var(--color-paper-bg)' }}
        >
          <p className="font-semibold">Hinweis („Vibecoding")</p>
          <p className="text-[var(--color-ink-700)]">
            Diese Werkzeuge (Planner und WordPress-Plugin) wurden im Wege des „Vibecodings" —
            also KI-gestützter Softwareentwicklung — erstellt. Vor dem produktiven Einsatz
            mit personenbezogenen Daten sind die übliche Sorgfalt, Tests und eine
            datenschutzrechtliche Bewertung anzuwenden.
          </p>
        </div>
      </div>
    </div>
  );
}
