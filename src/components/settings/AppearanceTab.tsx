import { useState, useEffect } from 'react';
import { useUiStore, type Density } from '@/stores/ui';
import { usePlannerStore } from '@/stores/planner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const OPTIONS: Array<{ value: Density; label: string; description: string }> = [
  { value: 'auto',     label: 'Automatisch', description: 'Zeilen füllen den verfügbaren Platz im aktiven Quartal' },
  { value: 'compact',  label: 'Kompakt',     description: 'Feste Zeilenhöhe ~70px, viele Wochen sichtbar' },
  { value: 'standard', label: 'Standard',    description: 'Feste Zeilenhöhe ~110px, ausgewogen' },
  { value: 'roomy',    label: 'Geräumig',    description: 'Feste Zeilenhöhe ~150px, viel Platz pro Termin' },
];

export function AppearanceTab() {
  const density    = useUiStore((s) => s.density);
  const setDensity = useUiStore((s) => s.setDensity);
  const doc        = usePlannerStore((s) => s.doc);
  const updateMeta = usePlannerStore((s) => s.updateMeta);

  const [schoolName, setSchoolName] = useState(doc?.meta.schoolName ?? '');
  const [schoolInfo, setSchoolInfo] = useState(doc?.meta.schoolInfo ?? '');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSchoolName(doc?.meta.schoolName ?? '');
    setSchoolInfo(doc?.meta.schoolInfo ?? '');
  }, [doc?.meta.schoolName, doc?.meta.schoolInfo]);

  const saveSchool = () => {
    updateMeta({
      schoolName: schoolName.trim() || undefined,
      schoolInfo: schoolInfo.trim() || undefined,
    });
    toast.success('Schuldaten gespeichert');
  };

  return (
    <div className="space-y-6">
      {/* Darstellung */}
      <div className="space-y-3">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Zeilen-Dichte (Tabellen-Ansicht)
        </h3>
        <p className="text-[12px] text-[var(--color-ink-500)]">
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

      {/* Ausdruck */}
      <div className="space-y-4 pt-2 border-t border-[var(--color-ink-200)]">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Ausdruck
        </h3>
        <div className="space-y-1.5">
          <label htmlFor="school-name" className="text-[13px] font-semibold text-[var(--color-ink-900)]">Schulname</label>
          <p className="text-[12px] text-[var(--color-ink-500)]">Erscheint als Überschrift im PDF-Ausdruck.</p>
          <Input
            id="school-name"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="z. B. Grundschule Musterstadt"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="school-info" className="text-[13px] font-semibold text-[var(--color-ink-900)]">Schulinfos (optional)</label>
          <p className="text-[12px] text-[var(--color-ink-500)]">Adresse, Schulleitung o. Ä. — erscheint in der Fußzeile.</p>
          <Textarea
            id="school-info"
            value={schoolInfo}
            onChange={(e) => setSchoolInfo(e.target.value)}
            placeholder="z. B. Schulleitung: M. Müller · Dorfstr. 1 · 12345 Musterstadt"
            rows={3}
          />
        </div>
        <Button onClick={saveSchool}>Speichern</Button>
      </div>
    </div>
  );
}
