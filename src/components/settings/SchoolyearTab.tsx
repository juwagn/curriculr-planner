import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { usePlannerStore } from '@/stores/planner';
import type { Holiday } from '@/types';
import { toast } from 'sonner';
import { HolidayFetchControl } from './HolidayFetchControl';
import { getQuarterRange, suggestQuarterBoundaries } from '@/lib/schoolweeks';

export function SchoolyearTab() {
  const doc = usePlannerStore((s) => s.doc);
  const updateSY = usePlannerStore((s) => s.updateSchoolyear);
  const [sy, setSy] = useState(() => doc?.schoolyear);

  if (!doc || !sy) return null;

  const qb: string[] = sy.quarterBoundaries.length === 3 ? [...sy.quarterBoundaries] : ['', '', ''];
  const setQB = (i: number, v: string) => {
    const next = [...qb];
    next[i] = v;
    setSy({ ...sy, quarterBoundaries: next });
  };
  const applySuggestion = () => {
    const sug = suggestQuarterBoundaries(doc);
    if (sug.every((s) => s === null)) {
      toast.error('Keine "Ende N. Quartal"-Anmerkungen im Plan gefunden');
      return;
    }
    const next = qb.map((cur, i) => sug[i] ?? cur);
    setSy({ ...sy, quarterBoundaries: next });
    toast.success('Quartalsgrenzen aus Plan übernommen – bitte prüfen und speichern');
  };
  const qbValid =
    qb.every(Boolean) &&
    qb[0] < qb[1] && qb[1] < qb[2] &&
    qb[0] > sy.firstSchoolDay && qb[2] < sy.lastSchoolDay;

  const save = () => {
    if (!qbValid) {
      toast.error('Quartalsgrenzen ungültig – bitte korrigieren');
      return;
    }
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
          <DateInput value={sy.firstSchoolDay} onValueChange={(v) => setSy({ ...sy, firstSchoolDay: v })} />
        </div>
        <div>
          <Label className="mb-1.5">Erster Unterrichtstag</Label>
          <DateInput value={sy.firstTeachingDay} onValueChange={(v) => setSy({ ...sy, firstTeachingDay: v })} />
        </div>
        <div>
          <Label className="mb-1.5">Letzter Schultag</Label>
          <DateInput value={sy.lastSchoolDay} onValueChange={(v) => setSy({ ...sy, lastSchoolDay: v })} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Quartalsgrenzen</Label>
          <Button variant="outline" size="sm" onClick={applySuggestion}>
            Aus Plan vorschlagen
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Label className="mb-1.5 text-[12px] text-[var(--color-ink-500)]">
                Ende {i + 1}. Quartal
              </Label>
              <DateInput value={qb[i] ?? ''} onValueChange={(v) => setQB(i, v)} />
            </div>
          ))}
        </div>
        <div className="mt-2 space-y-0.5 text-[12px] text-[var(--color-ink-500)] tabular-nums">
          {qbValid
            ? ([1, 2, 3, 4] as const).map((q) => {
                const r = getQuarterRange(q, { ...sy, quarterBoundaries: qb });
                return <div key={q}>Q{q}: {r.startDate} – {r.endDate}</div>;
              })
            : <div className="text-[var(--color-danger,#b91c1c)]">Grenzen müssen aufsteigend und innerhalb des Schuljahres liegen.</div>}
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
              <DateInput value={h.start} onValueChange={(v) => updateHol(h.id, { start: v })} />
              <DateInput value={h.end} onValueChange={(v) => updateHol(h.id, { end: v })} />
            </div>
          ))}
        </div>
      </div>

      <Button size="lg" onClick={save} className="px-5">Speichern + Schulwochen neu berechnen</Button>
    </div>
  );
}
