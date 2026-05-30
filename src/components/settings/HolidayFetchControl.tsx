import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { fetchHolidays, mergeFetchedHolidays, GERMAN_STATES } from '@/lib/holidays-api';
import type { Holiday, ISODate } from '@/types';

interface Props {
  stateCode?: string;
  from: ISODate;
  to: ISODate;
  holidays: Holiday[];
  onApply(holidays: Holiday[], stateCode: string): void;
}

interface Pending {
  merged: Holiday[];
  ferien: number;
  feiertage: number;
}

export function HolidayFetchControl({ stateCode, from, to, holidays, onApply }: Props) {
  const [selected, setSelected] = useState(stateCode ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const canFetch = !!selected && !!from && !!to && !loading;

  const handleFetch = async () => {
    setError(null);
    setPending(null);
    if (!from || !to) {
      setError('Bitte zuerst Erster Schultag und Letzter Schultag ausfüllen.');
      return;
    }
    setLoading(true);
    try {
      const fetched = await fetchHolidays(selected, from, to);
      const merged = mergeFetchedHolidays(holidays, fetched);
      setPending({
        merged,
        ferien: fetched.filter((h) => h.type === 'ferien').length,
        feiertage: fetched.filter((h) => h.type === 'feiertag').length
      });
    } catch (err) {
      console.error('Ferien/Feiertage-Abruf fehlgeschlagen:', err);
      const reason =
        err instanceof TypeError
          ? 'Keine Verbindung zu openholidaysapi.org (evtl. Firewall/Proxy im Schulnetz).'
          : err instanceof Error
            ? err.message
            : String(err);
      setError(`Abruf fehlgeschlagen: ${reason} — bitte manuell eintragen.`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!pending) return;
    onApply(pending.merged, selected);
    setPending(null);
  };

  return (
    <div className="space-y-3 rounded-[var(--radius-default)] border border-[var(--color-ink-200)] bg-[var(--color-paper-bg)]/40 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="mb-1.5">Bundesland</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Bundesland wählen" />
            </SelectTrigger>
            <SelectContent>
              {GERMAN_STATES.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" disabled={!canFetch} onClick={handleFetch}>
          {loading ? 'Wird abgerufen …' : 'Ferien & Feiertage abrufen'}
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-[var(--radius-default)] p-2 text-[13px]"
          style={{ background: '#FEE2E2', color: 'var(--color-status-red)' }}
        >
          {error}
        </div>
      )}

      {pending && (
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--color-ink-900)]">
          <span>
            {pending.ferien} Ferien und {pending.feiertage} Feiertage gefunden — vorhandene
            API-Einträge ersetzen?
          </span>
          <Button size="sm" onClick={handleConfirm}>
            Übernehmen
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
            Abbrechen
          </Button>
        </div>
      )}
    </div>
  );
}
