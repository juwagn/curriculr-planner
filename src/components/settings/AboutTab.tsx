const REPO_URL = 'https://github.com/juwagn/curriculr-planner';
const APP_VERSION = '1.6.0';

type ChangelogEntry = {
  version: string;
  date: string;
  highlights: string[];
};

/** Wichtigste Feature-Updates und Bugfixes je Version (neueste zuerst). */
const CHANGELOG: ChangelogEntry[] = [
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
      'FullCalendar-Ansicht entfernt – schlankeres Bundle',
    ],
  },
  {
    version: '1.0.3',
    date: '27.05.2026',
    highlights: [
      'Fix: Laden des Demo-Plans',
      'Fix: Excel-Export-Kopfzeilen entsprechen dem Konverter-Schema',
    ],
  },
  {
    version: '1.0.2',
    date: '26.05.2026',
    highlights: [
      'Tabellen-Layout mit Ansicht-Umschalter und Drag & Drop',
      'Marken-Feinschliff über die gesamte App',
    ],
  },
  {
    version: '1.0.0',
    date: '26.05.2026',
    highlights: ['Erste Veröffentlichung des Jahresterminplaners'],
  },
];

const linkClass =
  'text-[var(--color-marine-700)] underline underline-offset-2 hover:text-[var(--color-marine-800)] transition-colors';

export function AboutTab() {
  return (
    <div className="space-y-4 text-[13px] text-[var(--color-ink-900)]">
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold text-[var(--color-marine-800)]">
          Curriculr Planner
        </h3>
        <p>
          Version: <span className="tabular-nums">{APP_VERSION}</span>
        </p>
        <p className="text-[var(--color-ink-500)]">
          Standalone-Tool zur Erstellung des Jahresterminplans.
        </p>
      </div>

      <div className="space-y-1">
        <p>
          Entwickelt von <span className="font-medium">Julian Wagner</span>{' '}
          <span className="text-[var(--color-ink-500)]">· Curricular</span>
        </p>
        <p>
          <a
            href={REPO_URL}
            className={linkClass}
            style={{ transitionDuration: 'var(--dur-state)' }}
            target="_blank"
            rel="noreferrer"
          >
            Quellcode auf GitHub
          </a>
          {' · '}
          <a
            href={`${REPO_URL}/blob/main/CHANGELOG.md`}
            className={linkClass}
            style={{ transitionDuration: 'var(--dur-state)' }}
            target="_blank"
            rel="noreferrer"
          >
            Vollständiger Changelog
          </a>
        </p>
        <p className="text-[12px] text-[var(--color-ink-500)]">MIT-Lizenz</p>
      </div>

      <div className="space-y-3">
        <h4 className="text-[13px] font-semibold text-[var(--color-marine-800)]">
          Änderungsverlauf
        </h4>
        <ul className="space-y-3">
          {CHANGELOG.map((entry) => (
            <li key={entry.version} className="space-y-1">
              <p className="font-medium">
                Version <span className="tabular-nums">{entry.version}</span>{' '}
                <span className="text-[12px] font-normal text-[var(--color-ink-500)]">
                  – {entry.date}
                </span>
              </p>
              <ul className="ml-4 list-disc space-y-0.5 text-[var(--color-ink-900)] marker:text-[var(--color-ink-500)]">
                {entry.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
