import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface Props {
  available: string[];
  value: string[];
  onChange(next: string[]): void;
}

export function GroupChipsInput({ available, value, onChange }: Props) {
  const [input, setInput] = useState('');

  const toggle = (g: string) => {
    if (value.includes(g)) onChange(value.filter((x) => x !== g));
    else onChange([...value, g]);
  };

  const addCustom = () => {
    const v = input.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
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
            className={`px-3 py-1 rounded-full text-sm transition ${
              value.includes(g)
                ? 'bg-[var(--color-primary-700)] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
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
          className="text-sm"
        />
      </div>
    </div>
  );
}
