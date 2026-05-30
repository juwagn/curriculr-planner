import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePlannerStore } from '@/stores/planner';
import type { Holiday } from '@/types';
import { toast } from 'sonner';
import { HolidayFetchControl } from './HolidayFetchControl';

export function SchoolyearTab() {
  const doc = usePlannerStore((s) => s.doc);
  const updateSY = usePlannerStore((s) => s.updateSchoolyear);
  const [sy, setSy] = useState(() => doc?.schoolyear);

  if (!doc || !sy) return null;

  const save = () => {
    updateSY(sy);
    toast.success('Schuljahr-Daten gespeichert');
  };

  const updateHol = (id: string, patch: Partial<Holiday>) => {
    setSy({ ...sy, holidays: sy.holidays.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-1.5">Schuljahr</Label>
        <Input
          className="max-w-xs"
          value={sy.label}
          onChange={(e) => setSy({ ...sy, label: e.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="mb-1.5">Erster Schultag</Label>
          <Input type="date" value={sy.firstSchoolDay} onChange={(e) => setSy({ ...sy, firstSchoolDay: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1.5">Erster Unterrichtstag</Label>
          <Input type="date" value={sy.firstTeachingDay} onChange={(e) => setSy({ ...sy, firstTeachingDay: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1.5">Letzter Schultag</Label>
          <Input type="date" value={sy.lastSchoolDay} onChange={(e) => setSy({ ...sy, lastSchoolDay: e.target.value })} />
        </div>
      </div>

      <HolidayFetchControl
        stateCode={sy.stateCode}
        from={sy.firstSchoolDay}
        to={sy.lastSchoolDay}
        holidays={sy.holidays}
        onApply={(holidays, stateCode) => setSy({ ...sy, holidays, stateCode })}
      />

      <div>
        <Label className="mb-2">Ferien</Label>
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-[1fr_minmax(140px,1fr)_minmax(140px,1fr)] gap-2 text-[12px] text-[var(--color-ink-500)] uppercase tracking-[0.05em] px-1">
            <span>Bezeichnung</span>
            <span>Von</span>
            <span>Bis</span>
          </div>
          {sy.holidays.map((h) => (
            <div
              key={h.id}
              className="grid gap-2 grid-cols-1 sm:grid-cols-[1fr_minmax(140px,1fr)_minmax(140px,1fr)]"
            >
              <Input value={h.label} onChange={(e) => updateHol(h.id, { label: e.target.value })} />
              <Input type="date" value={h.start} onChange={(e) => updateHol(h.id, { start: e.target.value })} />
              <Input type="date" value={h.end} onChange={(e) => updateHol(h.id, { end: e.target.value })} />
            </div>
          ))}
        </div>
      </div>

      <Button size="lg" onClick={save} className="px-5">Speichern + Schulwochen neu berechnen</Button>
    </div>
  );
}
