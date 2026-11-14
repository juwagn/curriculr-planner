import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { addGroup, hasGroup, removeGroup } from '@/lib/groups';

interface Props {
  available: string[];
  value: string[];
  onChange(next: string[]): void;
}

export function GroupChipsInput({ available, value, onChange }: Props) {
  const [input, setInput] = useState('');

  const toggle = (g: string) => {
    onChange(hasGroup(value, g) ? removeGroup(value, g) : addGroup(value, g));
  };

  const addCustom = () => {
    onChange(addGroup(value, input));
    setInput('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {available.map((g) => (
          <button
            type="button"
            key={g}
            onClick={() => toggle(g)}
            className={`min-h-9 pointer-coarse:min-h-11 px-3 py-1 rounded-[var(--radius-pill)] text-[13px] transition-colors ${
              hasGroup(value, g)
                ? 'bg-[var(--color-marine-700)] text-[var(--color-paper-card)]'
                : 'bg-[var(--color-paper-bg)] text-[var(--color-ink-900)] hover:bg-[var(--color-paper-bg)]/60'
            }`}
            style={{ transitionDuration: 'var(--dur-state)' }}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          placeholder="Eigene Gruppe (Enter)"
          className="text-[13px]"
        />
      </div>
    </div>
  );
}
