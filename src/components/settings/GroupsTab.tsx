import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlannerStore } from '@/stores/planner';
import { toast } from 'sonner';

export function GroupsTab() {
  const doc = usePlannerStore((s) => s.doc);
  const updateGroups = usePlannerStore((s) => s.updateGroups);
  const [groups, setGroups] = useState<string[]>(() => doc?.availableGroups ?? []);
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (!v || groups.includes(v)) return;
    setGroups([...groups, v]);
    setInput('');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <span key={g} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)] text-sm">
            {g}
            <button onClick={() => setGroups(groups.filter((x) => x !== g))} className="hover:text-red-600">✕</button>
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
        <Button onClick={add}>+ Hinzufügen</Button>
      </div>
      <Button onClick={() => { updateGroups(groups); toast.success('Gruppen gespeichert'); }}>
        Speichern
      </Button>
    </div>
  );
}
