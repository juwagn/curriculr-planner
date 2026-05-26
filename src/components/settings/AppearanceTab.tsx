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
        <h3 className="text-sm font-semibold mb-2">Zeilen-Dichte (Tabellen-Ansicht)</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Bestimmt die Mindesthöhe der Wochen-Zeilen. Wird pro Browser gespeichert.
        </p>
        <div className="grid gap-2">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                density === opt.value
                  ? 'border-[var(--color-primary-700)] bg-[var(--color-primary-100)]/40'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="density"
                value={opt.value}
                checked={density === opt.value}
                onChange={() => setDensity(opt.value)}
                className="mt-1 accent-[var(--color-primary-900)]"
              />
              <div>
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
