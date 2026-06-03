import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useUiStore } from '@/stores/ui';

type Section = 'start' | 'events' | 'views' | 'templates' | 'export';

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'start', label: '🚀 Erste Schritte' },
  { id: 'events', label: '📅 Termine & Kategorien' },
  { id: 'views', label: '👁 Ansichten' },
  { id: 'templates', label: '📋 Vorlagen' },
  { id: 'export', label: '📤 Export & Backup' },
];

export function HelpModal() {
  const helpOpen = useUiStore((s) => s.helpOpen);
  const closeHelp = useUiStore((s) => s.closeHelp);
  const setTourPending = useUiStore((s) => s.setTourPending);
  const [activeSection, setActiveSection] = useState<Section>('start');

  // Reset to first section each time the modal opens.
  // HelpModal stays mounted (returns null when closed), so useState persists —
  // useEffect is the correct reset mechanism here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (helpOpen) setActiveSection('start');
  }, [helpOpen]);

  if (!helpOpen) return null;

  const handleStartTour = () => {
    closeHelp();
    setTourPending(true);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && closeHelp()}>
      <DialogContent className="!max-w-[min(960px,calc(100vw-2rem))] !w-[min(960px,calc(100vw-2rem))] max-h-[80vh] overflow-hidden p-0">
        <DialogDescription className="sr-only">
          Hilfe mit Navigation zu Erste Schritte, Termine, Ansichten, Vorlagen sowie Export und Backup.
        </DialogDescription>
        <div className="flex h-full" style={{ minHeight: 480 }}>
          {/* Left navigation */}
          <div
            className="flex flex-col border-r border-[var(--color-ink-200)] bg-[var(--color-paper-bg)] flex-shrink-0"
            style={{ width: 200 }}
          >
            <DialogTitle className="px-4 pt-5 pb-3 text-[13px] font-bold text-[var(--color-marine-800)]">
              Hilfe
            </DialogTitle>
            <nav className="flex-1 px-2 space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full text-left px-3 py-2 rounded-[var(--radius-default)] text-[12px] font-medium transition-colors"
                  style={{
                    background: activeSection === item.id ? 'var(--color-marine-800)' : 'transparent',
                    color: activeSection === item.id ? 'var(--color-paper-card)' : 'var(--color-ink-500)',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            {/* Tour CTA */}
            <div className="p-3 border-t border-[var(--color-ink-200)]">
              <button
                onClick={handleStartTour}
                className="w-full rounded-[var(--radius-default)] py-2 text-[12px] font-bold text-center"
                style={{ background: 'var(--color-gelb-500)', color: 'var(--color-ink-900)' }}
              >
                ▶ Geführte Tour starten
              </button>
              <p className="text-center text-[10px] text-[var(--color-ink-400)] mt-1">~2 Minuten</p>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeSection === 'start' && <SectionStart />}
            {activeSection === 'events' && <SectionEvents />}
            {activeSection === 'views' && <SectionViews />}
            {activeSection === 'templates' && <SectionTemplates />}
            {activeSection === 'export' && <SectionExport />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-[12px] font-semibold text-[var(--color-ink-900)] mb-1">{title}</h3>
      <p className="text-[12px] text-[var(--color-ink-500)] leading-relaxed">{children}</p>
    </div>
  );
}

function HelpTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-[var(--color-paper-bg)] border border-[var(--color-ink-200)] rounded px-1 font-mono text-[10px] text-[var(--color-ink-700)]">
      {children}
    </span>
  );
}

function SectionStart() {
  return (
    <div data-testid="section-start">
      <h2 className="text-[16px] font-bold text-[var(--color-marine-800)] mb-1">🚀 Erste Schritte</h2>
      <p className="text-[12px] text-[var(--color-ink-400)] mb-5">Wie du deinen ersten Jahresplan anlegst und loslegst.</p>

      <HelpSection title="1. Schuljahr einrichten">
        Beim ersten Start führt dich der Einrichtungs-Assistent durch Schuljahrbeginn, Ferienzeiten und Kategorien.
        Du kannst diese Angaben jederzeit unter <HelpTag>Einstellungen → Schuljahr</HelpTag> ändern.
      </HelpSection>

      <HelpSection title="2. Ersten Termin anlegen">
        Klicke auf <HelpTag>+ Termin</HelpTag> in der Werkzeugleiste.
        Vergib einen Titel, wähle Kategorie und Datum. Mehrtägige Termine: Enddatum setzen.
        Klick auf einen bestehenden Termin öffnet ihn zum Bearbeiten.
      </HelpSection>

      <HelpSection title="3. Termin verschieben">
        Termine lassen sich per <strong>Drag & Drop</strong> in der Wochentabelle verschieben.
        Ziehe am rechten Rand eines Termins, um die Dauer zu verlängern oder zu kürzen.
      </HelpSection>

      <HelpSection title="4. Plan exportieren">
        Über <HelpTag>Export ↓</HelpTag> oben rechts:
        <strong> ICS</strong> für Outlook/Google Kalender,
        <strong> Excel</strong> für das Schulwebsite-Plugin,
        <strong> JSON</strong> als Backup.
      </HelpSection>

      <div className="mt-5 bg-[var(--color-paper-bg)] border border-[var(--color-ink-200)] rounded-[var(--radius-default)] p-3">
        <p className="text-[11px] font-semibold text-[var(--color-ink-500)] mb-2">⌨ Tastaturkürzel</p>
        <div className="flex flex-wrap gap-4">
          <span className="text-[11px] text-[var(--color-ink-400)]">
            <kbd className="bg-white border border-[var(--color-ink-200)] rounded px-1 font-mono text-[10px]">Strg+Z</kbd> Rückgängig
          </span>
          <span className="text-[11px] text-[var(--color-ink-400)]">
            <kbd className="bg-white border border-[var(--color-ink-200)] rounded px-1 font-mono text-[10px]">Strg+⇧+Z</kbd> Wiederholen
          </span>
          <span className="text-[11px] text-[var(--color-ink-400)]">
            <kbd className="bg-white border border-[var(--color-ink-200)] rounded px-1 font-mono text-[10px]">Esc</kbd> Dialog schließen
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionEvents() {
  return (
    <div data-testid="section-events">
      <h2 className="text-[16px] font-bold text-[var(--color-marine-800)] mb-1">📅 Termine & Kategorien</h2>
      <p className="text-[12px] text-[var(--color-ink-400)] mb-5">Termine anlegen, bearbeiten und strukturieren.</p>

      <HelpSection title="Termin-Formular">
        <strong>Titel:</strong> Kurzbezeichnung des Termins.<br />
        <strong>Kategorie:</strong> Farbkodierung (z. B. Schulveranstaltung, Sondertag). Kategorien anpassbar unter <HelpTag>Einstellungen → Kategorien</HelpTag>.<br />
        <strong>Datum:</strong> Einzeltermin oder mehrtägiger Zeitraum (Enddatum setzen).<br />
        <strong>Gruppen:</strong> Betroffene Klassen oder Gruppen (optional). Gruppen verwalten unter <HelpTag>Einstellungen → Gruppen</HelpTag>.<br />
        <strong>Notiz:</strong> Freitext, erscheint in der Notizen-Sidebar.
      </HelpSection>

      <HelpSection title="Kategorien">
        Kategorien bestimmen Farbe und Typ eines Termins. Standard-Kategorien (Schulveranstaltung, Sondertag, Prüfung, Ferien) sind vorkonfiguriert.
        Eigene Kategorien: <HelpTag>Einstellungen → Kategorien → + Kategorie</HelpTag>.
      </HelpSection>

      <HelpSection title="Gruppen">
        Gruppen (z. B. „Klasse 5a", „Lehrerkollegium") weisen Termine bestimmten Adressaten zu.
        Im Export werden Gruppenfilter unterstützt.
        Gruppen anlegen unter <HelpTag>Einstellungen → Gruppen</HelpTag>.
      </HelpSection>

      <HelpSection title="Konflikte">
        Das orangefarbene Badge im Header zeigt Terminüberschneidungen. Klick öffnet das Konflikt-Panel mit Details.
        Fehler (rot) = Überschneidung innerhalb derselben Gruppe. Warnungen (gelb) = Überlappung über Gruppen hinweg.
      </HelpSection>
    </div>
  );
}

function SectionViews() {
  return (
    <div data-testid="section-views">
      <h2 className="text-[16px] font-bold text-[var(--color-marine-800)] mb-1">👁 Ansichten</h2>
      <p className="text-[12px] text-[var(--color-ink-400)] mb-5">Zwei Wege, deinen Plan zu sehen.</p>

      <HelpSection title="Wochen-Tabelle (Standard)">
        Zeigt ein Quartal als Tabelle: Zeilen = Schulwochen, Spalten = Montag bis Freitag.
        Ferienwochen erscheinen als eigene Zeile ohne Schulwochennummer.
        Wechsel zwischen Q1–Q4 über die Quartals-Tabs in der Werkzeugleiste.
      </HelpSection>

      <HelpSection title="Jahresübersicht">
        Zeigt das gesamte Schuljahr als Monats-Raster.
        Termine erscheinen als farbige Balken — gut für einen schnellen Gesamtüberblick.
        Wechsel über den Toggle <HelpTag>Schuljahr</HelpTag> im Header.
      </HelpSection>

      <HelpSection title="Quartale anpassen">
        Die Quartals-Grenzen (Q1–Q4) sind im Schuljahr hinterlegt.
        Ändern unter <HelpTag>Einstellungen → Schuljahr → Quartale</HelpTag>.
      </HelpSection>
    </div>
  );
}

function SectionTemplates() {
  return (
    <div data-testid="section-templates">
      <h2 className="text-[16px] font-bold text-[var(--color-marine-800)] mb-1">📋 Vorlagen</h2>
      <p className="text-[12px] text-[var(--color-ink-400)] mb-5">Wiederkehrende Termine als Vorlage speichern und schnell platzieren.</p>

      <HelpSection title="Vorlage erstellen">
        Unter <HelpTag>Einstellungen → Vorlagen → + Vorlage</HelpTag> eine neue Vorlage anlegen.
        Vorlage enthält Titel, Kategorie, Dauer und optional Gruppen — aber kein festes Datum.
      </HelpSection>

      <HelpSection title="Vorlage per Drag & Drop platzieren">
        Öffne die Vorlagen-Sidebar über <HelpTag>Vorlagen</HelpTag> in der Werkzeugleiste.
        Ziehe eine Vorlage auf die gewünschte Zelle in der Wochentabelle — Termin wird mit dem Datum der Zelle angelegt.
      </HelpSection>

      <HelpSection title="Vorlage per Klick platzieren">
        Klick auf eine Vorlage in der Sidebar wählt sie aus (Rahmen erscheint).
        Danach Klick auf eine Zelle in der Tabelle — Termin wird dort angelegt.
        Erneuter Klick auf die Vorlage oder ESC hebt die Auswahl auf.
      </HelpSection>

      <HelpSection title="Vorlage bearbeiten oder löschen">
        Unter <HelpTag>Einstellungen → Vorlagen</HelpTag>: Vorlage anklicken zum Bearbeiten,
        Papierkorb-Symbol zum Löschen.
      </HelpSection>
    </div>
  );
}

function SectionExport() {
  return (
    <div data-testid="section-export">
      <h2 className="text-[16px] font-bold text-[var(--color-marine-800)] mb-1">📤 Export & Backup</h2>
      <p className="text-[12px] text-[var(--color-ink-400)] mb-5">Plan in verschiedene Formate exportieren und sichern.</p>

      <HelpSection title="ICS — Kalender-Export">
        Öffnet die ICS-Datei in Outlook, Google Kalender oder Apple Kalender.
        <strong> Einzelne Kategorie</strong> oder <strong>Gesamtplan</strong> wählbar beim Export.
        Klick: <HelpTag>Export ↓ → ICS-Datei (.ics)</HelpTag>.
      </HelpSection>

      <HelpSection title="Excel — Schulwebsite-Plugin">
        Erzeugt eine XLSX-Datei im Format des Terminplaner WordPress-Plugins.
        Diese Datei wird direkt in das Plugin auf der Schulwebsite hochgeladen.
        Klick: <HelpTag>Export ↓ → Excel-Konverter-Format (.xlsx)</HelpTag>.
      </HelpSection>

      <HelpSection title="JSON-Backup">
        Sichert den gesamten Plan als Datei. Wiederherstellen über <HelpTag>JSON-Backup laden</HelpTag> auf dem Startbildschirm.
        Nützlich für Übertragung auf einen anderen Rechner.
        Klick: <HelpTag>Export ↓ → JSON-Backup (.json)</HelpTag>.
      </HelpSection>

      <HelpSection title="Import">
        Auf dem Startbildschirm stehen vier Import-Optionen zur Verfügung:
        <strong> JSON-Backup laden</strong>, <strong>Aus ICS-Datei erstellen</strong>,
        <strong>Aus Excel-Datei erstellen</strong> (Konverter-Format), sowie <strong>Demo ausprobieren</strong>.
      </HelpSection>
    </div>
  );
}
