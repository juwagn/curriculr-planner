import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useUiStore, type SettingsTab } from '@/stores/ui';
import { SchoolyearTab } from './SchoolyearTab';
import { CategoriesTab } from './CategoriesTab';
import { GroupsTab } from './GroupsTab';
import { TemplatesTab } from './TemplatesTab';
import { ExportTab } from './ExportTab';
import { ImportTab } from './ImportTab';
import { AppearanceTab } from './AppearanceTab';
import { AboutTab } from './AboutTab';
import { SchoolTab } from './SchoolTab';
import { WordpressTab } from './WordpressTab';
import { PrivacyTab } from './PrivacyTab';

const NAV_GROUPS: { group: string; items: { value: SettingsTab; label: string }[] }[] = [
  {
    group: 'Schuljahr',
    items: [{ value: 'schoolyear', label: 'Schuljahr & Quartale' }],
  },
  {
    group: 'Inhalte',
    items: [
      { value: 'categories', label: 'Kategorien' },
      { value: 'groups', label: 'Gruppen' },
      { value: 'templates', label: 'Vorlagen' },
    ],
  },
  {
    group: 'Darstellung',
    items: [
      { value: 'appearance', label: 'Ansicht' },
      { value: 'school', label: 'Schule & Druck' },
    ],
  },
  {
    group: 'Daten',
    items: [
      { value: 'export', label: 'Export' },
      { value: 'import', label: 'Import' },
      { value: 'wordpress', label: 'WordPress' },
    ],
  },
  {
    group: 'System',
    items: [
      { value: 'about', label: 'Über' },
      { value: 'privacy', label: 'Datenschutz' },
    ],
  },
];

const CONTENT: Record<SettingsTab, React.ReactNode> = {
  schoolyear: <SchoolyearTab />,
  categories: <CategoriesTab />,
  groups: <GroupsTab />,
  templates: <TemplatesTab />,
  appearance: <AppearanceTab />,
  school: <SchoolTab />,
  export: <ExportTab />,
  import: <ImportTab />,
  about: <AboutTab />,
  wordpress: <WordpressTab />,
  privacy: <PrivacyTab />,
};

export function SettingsModal() {
  const open = useUiStore((s) => s.settingsModalOpen);
  const close = useUiStore((s) => s.closeSettings);
  const tab = useUiStore((s) => s.settingsTab);
  const setTab = useUiStore((s) => s.setSettingsTab);

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="!max-w-[min(1060px,calc(100vw-2rem))] !w-[min(1060px,calc(100vw-2rem))] !p-0 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Accessible hidden title */}
        <DialogTitle className="sr-only">Einstellungen</DialogTitle>

        {/* Body: sidebar + content */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-h-0">

          {/* ── Sidebar nav (desktop: left column; mobile: horizontal scroll row) ── */}
          <nav
            className="
              sm:w-[190px] sm:shrink-0 sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0
              flex flex-row overflow-x-auto
              border-b border-[var(--color-ink-200)]
              bg-[var(--color-paper-bg)]
              py-0 sm:py-3
            "
            aria-label="Einstellungs-Navigation"
          >
            {NAV_GROUPS.map(({ group, items }) => (
              <div
                key={group}
                className="
                  flex flex-row sm:flex-col sm:mb-1
                  shrink-0 sm:shrink
                "
              >
                {/* Group label — hidden on mobile (too cramped) */}
                <div
                  className="
                    hidden sm:block
                    px-4 py-1
                    text-[10px] font-bold uppercase tracking-[0.08em]
                    text-[var(--color-ink-500)]
                    select-none
                  "
                >
                  {group}
                </div>

                {/* Nav items */}
                {items.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setTab(value)}
                    aria-current={tab === value ? 'page' : undefined}
                    style={{
                      background: tab === value ? 'var(--color-marine-800)' : 'transparent',
                      color: tab === value ? 'var(--color-paper-card)' : 'var(--color-ink-500)',
                      fontWeight: tab === value ? 600 : 400,
                      transitionDuration: 'var(--dur-state)',
                      transitionTimingFunction: 'var(--ease-state)',
                    }}
                    className="
                      text-left text-[13px] whitespace-nowrap
                      transition-colors
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-marine-500)]

                      /* desktop */
                      sm:w-[calc(100%-8px)] sm:mx-1 sm:px-4 sm:py-1.5
                      sm:rounded-[var(--radius-default)]

                      /* mobile: compact horizontal pill */
                      px-3 py-2 my-1.5 mx-1
                      rounded-[var(--radius-default)]
                    "
                  >
                    {label}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {/* ── Content area ── */}
          <div className="flex-1 overflow-y-auto p-6 min-w-0 bg-[var(--color-paper-card)]">
            {CONTENT[tab]}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
