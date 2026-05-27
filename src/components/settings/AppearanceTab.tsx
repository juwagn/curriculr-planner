import { useUiStore, type Density } from '@/stores/ui';

const OPTIONS: Array<{ value: Density; label: string; description: string }> = [
  { value: 'auto', label: 'Automatisch', description: 'Zeilen füllen den verfügbaren Platz im aktiven Quartal' },
  { value: 'compact', label: 'Kompakt', description: 'Feste Zeilenhöhe ~70px, viele Wochen sichtbar' },
  { value: 'standard', label: 'Standard', description: 'Feste Zeilenhöhe ~110px, ausgewogen' },
  { value: 'roomy', label: 'Geräumig', description: 'Feste Zeilenhöhe ~150px, viel Platz pro Termin' }
];

export function AppearanceTab() {
  const density = useUiStore((s) => s.density);
  const setDensity = useUiStore((s) => s.setDensity);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em] mb-2">
          Zeilen-Dichte (Tabellen-Ansicht)
        </h3>
        <p className="text-[12px] text-[var(--color-ink-500)] mb-3">
          Bestimmt die Mindesthöhe der Wochen-Zeilen. Wird pro Browser gespeichert.
        </p>
        <div className="grid gap-2">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-[var(--radius-default)] border cursor-pointer transition-colors ${
                density === opt.value
                  ? 'border-[var(--color-marine-700)] bg-[var(--color-marine-100)]/40'
                  : 'border-[var(--color-ink-200)] hover:bg-[var(--color-paper-bg)]/60'
              }`}
              style={{ transitionDuration: 'var(--dur-state)' }}
            >
              <input
                type="radio"
                name="density"
                value={opt.value}
                checked={density === opt.value}
                onChange={() => setDensity(opt.value)}
                className="mt-1 accent-[var(--color-marine-800)]"
              />
              <div>
                <div className="text-[13px] font-semibold text-[var(--color-ink-900)]">{opt.label}</div>
                <div className="text-[12px] text-[var(--color-ink-500)]">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
