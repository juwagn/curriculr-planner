import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
                style={{ background: 'var(--color-gelb-400)', color: 'var(--color-ink-900)' }}
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

function SectionStart() {
  return <div data-testid="section-start"><p>Erste Schritte</p></div>;
}
function SectionEvents() {
  return <div data-testid="section-events"><p>Termine & Kategorien</p></div>;
}
function SectionViews() {
  return <div data-testid="section-views"><p>Ansichten</p></div>;
}
function SectionTemplates() {
  return <div data-testid="section-templates"><p>Vorlagen</p></div>;
}
function SectionExport() {
  return <div data-testid="section-export"><p>Export & Backup</p></div>;
}
