import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Step1Data } from './wizard-state';
import type { Holiday } from '@/types';
import { HolidayFetchControl } from '@/components/settings/HolidayFetchControl';

const DEFAULT_HOLIDAYS = (): Holiday[] => [
  { id: crypto.randomUUID(), label: 'Herbstferien', start: '', end: '', type: 'ferien' },
  { id: crypto.randomUUID(), label: 'Weihnachtsferien', start: '', end: '', type: 'ferien' },
  { id: crypto.randomUUID(), label: 'Osterferien', start: '', end: '', type: 'ferien' },
  { id: crypto.randomUUID(), label: 'Pfingstferien', start: '', end: '', type: 'ferien' },
  { id: crypto.randomUUID(), label: 'Sommerferien', start: '', end: '', type: 'ferien' }
];

interface Props {
  initial: Step1Data;
  onCancel(): void;
  onNext(data: Step1Data): void;
}

export function Step1Schoolyear({ initial, onCancel, onNext }: Props) {
  const [data, setData] = useState<Step1Data>(initial);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof Step1Data>(key: K, value: Step1Data[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const updateHoliday = (id: string, patch: Partial<Holiday>) => {
    setData((d) => ({
      ...d,
      holidays: d.holidays.map((h) => (h.id === id ? { ...h, ...patch } : h))
    }));
  };

  const addHoliday = () => {
    setData((d) => ({
      ...d,
      holidays: [...d.holidays, { id: crypto.randomUUID(), label: 'Ferien', start: '', end: '', type: 'ferien' }]
    }));
  };

  const removeHoliday = (id: string) => {
    setData((d) => ({ ...d, holidays: d.holidays.filter((h) => h.id !== id) }));
  };

  const handleNext = () => {
    if (!data.label.trim()) return setError('Schuljahr-Label erforderlich');
    if (!data.name.trim()) return setError('Plan-Name erforderlich');
    if (!data.firstSchoolDay || !data.firstTeachingDay || !data.lastSchoolDay)
      return setError('Alle Datums-Felder ausfüllen');
    if (data.firstTeachingDay < data.firstSchoolDay)
      return setError('Erster Unterrichtstag muss ≥ Erster Schultag sein');
    if (data.lastSchoolDay <= data.firstSchoolDay)
      return setError('Letzter Schultag muss > Erster Schultag sein');
    for (const h of data.holidays) {
      if ((h.start && !h.end) || (!h.start && h.end))
        return setError(`Ferien "${h.label}": beide Daten oder keines`);
      if (h.start && h.end && h.start > h.end)
        return setError(`Ferien "${h.label}": Ende muss ≥ Start sein`);
    }
    setError(null);
    onNext({
      ...data,
      holidays: data.holidays.filter((h) => h.start && h.end)
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="label">Schuljahr</Label>
          <Input id="label" value={data.label} onChange={(e) => update('label', e.target.value)} placeholder="2026/27" />
        </div>
        <div>
          <Label htmlFor="name">Plan-Name</Label>
          <Input id="name" value={data.name} onChange={(e) => update('name', e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Eckdaten
        </h3>
        <div className="grid grid-cols-[260px_200px] gap-3 items-center">
          <Label>
            Erster Schultag (SW 00){' '}
            {!data.firstSchoolDay && (
              <span className="text-[var(--color-status-red)]" aria-hidden>
                *
              </span>
            )}
          </Label>
          <Input
            type="date"
            className="min-w-[180px]"
            aria-required
            data-invalid={!data.firstSchoolDay || undefined}
            style={!data.firstSchoolDay ? { borderColor: 'var(--color-status-red)' } : undefined}
            value={data.firstSchoolDay}
            onChange={(e) => update('firstSchoolDay', e.target.value)}
          />
          <Label>Erster Unterrichtstag (SW 01)</Label>
          <Input
            type="date"
            className="min-w-[180px]"
            value={data.firstTeachingDay}
            onChange={(e) => update('firstTeachingDay', e.target.value)}
          />
          <Label>
            Letzter Schultag{' '}
            {!data.lastSchoolDay && (
              <span className="text-[var(--color-status-red)]" aria-hidden>
                *
              </span>
            )}
          </Label>
          <Input
            type="date"
            className="min-w-[180px]"
            aria-required
            data-invalid={!data.lastSchoolDay || undefined}
            style={!data.lastSchoolDay ? { borderColor: 'var(--color-status-red)' } : undefined}
            value={data.lastSchoolDay}
            onChange={(e) => update('lastSchoolDay', e.target.value)}
          />
        </div>
        {(!data.firstSchoolDay || !data.lastSchoolDay) && (
          <p className="text-[13px] text-[var(--color-status-red)]">
            * Pflichtfeld — Erster und Letzter Schultag werden für den Ferien-Abruf benötigt.
          </p>
        )}
      </div>

      <HolidayFetchControl
        stateCode={data.stateCode}
        from={data.firstSchoolDay}
        to={data.lastSchoolDay}
        holidays={data.holidays}
        onApply={(holidays, stateCode) => setData((d) => ({ ...d, holidays, stateCode }))}
      />

      <div className="space-y-3">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Ferien
        </h3>
        {data.holidays.map((h) => (
          <div key={h.id} className="grid grid-cols-[160px_180px_180px_auto] gap-2 items-center">
            <Input
              value={h.label}
              onChange={(e) => updateHoliday(h.id, { label: e.target.value })}
              placeholder="Label"
            />
            <Input type="date" className="min-w-[170px]" value={h.start} onChange={(e) => updateHoliday(h.id, { start: e.target.value })} />
            <Input type="date" className="min-w-[170px]" value={h.end} onChange={(e) => updateHoliday(h.id, { end: e.target.value })} />
            <Button variant="ghost" size="icon" onClick={() => removeHoliday(h.id)} title="Entfernen">
              ✕
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addHoliday}>
          + Ferien-Block
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-[var(--radius-default)] text-[13px]"
          style={{
            background: '#FEE2E2',
            color: 'var(--color-status-red)'
          }}
        >
          {error}
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-[var(--color-ink-200)]">
        <Button variant="ghost" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button onClick={handleNext}>Weiter →</Button>
      </div>
    </div>
  );
}

export { DEFAULT_HOLIDAYS };
