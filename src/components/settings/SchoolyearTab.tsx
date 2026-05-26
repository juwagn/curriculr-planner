import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePlannerStore } from '@/stores/planner';
import type { Holiday } from '@/types';
import { toast } from 'sonner';

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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Schuljahr</Label>
          <Input value={sy.label} onChange={(e) => setSy({ ...sy, label: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Erster Schultag</Label>
          <Input type="date" value={sy.firstSchoolDay} onChange={(e) => setSy({ ...sy, firstSchoolDay: e.target.value })} />
        </div>
        <div>
          <Label>Erster Unterrichtstag</Label>
          <Input type="date" value={sy.firstTeachingDay} onChange={(e) => setSy({ ...sy, firstTeachingDay: e.target.value })} />
        </div>
        <div>
          <Label>Letzter Schultag</Label>
          <Input type="date" value={sy.lastSchoolDay} onChange={(e) => setSy({ ...sy, lastSchoolDay: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Ferien</Label>
        <div className="space-y-2 mt-2">
          {sy.holidays.map((h) => (
            <div key={h.id} className="grid grid-cols-[160px_1fr_1fr] gap-2">
              <Input value={h.label} onChange={(e) => updateHol(h.id, { label: e.target.value })} />
              <Input type="date" value={h.start} onChange={(e) => updateHol(h.id, { start: e.target.value })} />
              <Input type="date" value={h.end} onChange={(e) => updateHol(h.id, { end: e.target.value })} />
            </div>
          ))}
        </div>
      </div>
      <Button onClick={save}>Speichern + Schulwochen neu berechnen</Button>
    </div>
  );
}
