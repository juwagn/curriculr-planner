import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlannerStore } from '@/stores/planner';
import { toast } from 'sonner';

const SUGGESTED_GROUPS = [
  'Lehrkräfte',
  'Eltern',
  'Schülerinnen und Schüler',
  'Schulleitung',
  'Sekretariat',
  'Hausmeister',
  'Kollegium',
  'Förderverein',
  'Klassenlehrkräfte',
  'Fachschaften',
];

export function GroupsTab() {
  const doc = usePlannerStore((s) => s.doc);
  const updateGroups = usePlannerStore((s) => s.updateGroups);
  const [groups, setGroups] = useState<string[]>(() => doc?.availableGroups ?? []);
  const [input, setInput] = useState('');

  const add = (value?: string) => {
    const v = (value ?? input).trim();
    if (!v || groups.includes(v)) return;
    setGroups([...groups, v]);
    if (value === undefined) setInput('');
  };

  const suggestions = SUGGESTED_GROUPS.filter((g) => !groups.includes(g));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <span
            key={g}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-marine-100)] text-[var(--color-marine-700)] text-[13px]"
          >
            {g}
            <button
              onClick={() => setGroups(groups.filter((x) => x !== g))}
              className="hover:text-[var(--color-status-red)] transition-colors"
              style={{ transitionDuration: 'var(--dur-state)' }}
              aria-label={`${g} entfernen`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Neue Gruppe"
        />
        <Button onClick={() => add()}>+ Hinzufügen</Button>
      </div>
      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--color-ink-400)]">Vorschläge</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((g) => (
              <button
                key={g}
                onClick={() => add(g)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-[var(--radius-pill)] border border-dashed border-[var(--color-marine-300)] text-[var(--color-marine-600)] text-[13px] hover:bg-[var(--color-marine-100)] transition-colors"
                style={{ transitionDuration: 'var(--dur-state)' }}
              >
                + {g}
              </button>
            ))}
          </div>
        </div>
      )}
      <Button onClick={() => { updateGroups(groups); toast.success('Gruppen gespeichert'); }}>
        Speichern
      </Button>
    </div>
  );
}
