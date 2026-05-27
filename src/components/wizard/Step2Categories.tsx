import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Step2Data } from './wizard-state';
import type { Category } from '@/types';

interface Props {
  initial: Step2Data;
  onBack(): void;
  onNext(data: Step2Data): void;
}

export function Step2Categories({ initial, onBack, onNext }: Props) {
  const [data, setData] = useState<Step2Data>(initial);
  const [groupInput, setGroupInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateCat = (id: string, patch: Partial<Category>) => {
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c))
    }));
  };

  const addCat = () => {
    setData((d) => ({
      ...d,
      categories: [
        ...d.categories,
        { id: crypto.randomUUID(), label: 'Neue Kategorie', color: '#0058A0', slug: `neu-${Date.now()}`, keywords: [] }
      ]
    }));
  };

  const removeCat = (id: string) => {
    setData((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }));
  };

  const addGroup = () => {
    const v = groupInput.trim();
    if (!v || data.availableGroups.includes(v)) return;
    setData((d) => ({ ...d, availableGroups: [...d.availableGroups, v] }));
    setGroupInput('');
  };

  const removeGroup = (g: string) => {
    setData((d) => ({ ...d, availableGroups: d.availableGroups.filter((x) => x !== g) }));
  };

  const updateQB = (i: 0 | 1 | 2, value: string) => {
    setData((d) => {
      const qb = [...d.quarterBoundaries] as [string, string, string];
      qb[i] = value;
      return { ...d, quarterBoundaries: qb };
    });
  };

  const handleNext = () => {
    if (data.quarterBoundaries.some((q) => !q)) return setError('Alle 3 Quartal-Grenzen erforderlich');
    if (data.quarterBoundaries[0] >= data.quarterBoundaries[1]) return setError('Q1-Ende < Q2-Ende');
    if (data.quarterBoundaries[1] >= data.quarterBoundaries[2]) return setError('Q2-Ende < Q3-Ende');
    if (data.categories.some((c) => !c.label.trim())) return setError('Kategorie-Labels erforderlich');
    setError(null);
    onNext(data);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Quartal-Grenzen
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Q1-Ende</Label>
            <Input type="date" value={data.quarterBoundaries[0]} onChange={(e) => updateQB(0, e.target.value)} />
          </div>
          <div>
            <Label>Q2-Ende</Label>
            <Input type="date" value={data.quarterBoundaries[1]} onChange={(e) => updateQB(1, e.target.value)} />
          </div>
          <div>
            <Label>Q3-Ende</Label>
            <Input type="date" value={data.quarterBoundaries[2]} onChange={(e) => updateQB(2, e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Kategorien
        </h3>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[12px] text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
              <th className="text-left py-2 font-semibold">Label</th>
              <th className="w-12 font-semibold">Farbe</th>
              <th className="text-left font-semibold">Stichwörter (kommasepariert)</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {data.categories.map((c) => (
              <tr key={c.id}>
                <td className="py-1 pr-2">
                  <Input
                    placeholder="Label"
                    value={c.label}
                    onChange={(e) => updateCat(c.id, { label: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="color"
                    value={c.color}
                    onChange={(e) => updateCat(c.id, { color: e.target.value })}
                    className="w-10 h-8 rounded-[var(--radius-input)] border border-[var(--color-ink-200)] cursor-pointer"
                  />
                </td>
                <td className="py-1 pr-2">
                  <Input
                    value={c.keywords.join(', ')}
                    onChange={(e) =>
                      updateCat(c.id, {
                        keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      })
                    }
                  />
                </td>
                <td className="py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCat(c.id)}
                    disabled={c.slug === 'sondertag'}
                    title={c.slug === 'sondertag' ? 'System-Kategorie (nicht löschbar)' : 'Löschen'}
                  >
                    &#x2715;
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button variant="outline" size="sm" onClick={addCat}>+ Kategorie</Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-[12px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
          Gruppen
        </h3>
        <div className="flex flex-wrap gap-2">
          {data.availableGroups.map((g) => (
            <span
              key={g}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-marine-100)] text-[var(--color-marine-700)] text-[13px]"
            >
              {g}
              <button
                onClick={() => removeGroup(g)}
                className="hover:text-[var(--color-status-red)] transition-colors"
                style={{ transitionDuration: 'var(--dur-state)' }}
                aria-label={`${g} entfernen`}
              >
                &#x2715;
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Neue Gruppe (Enter zum Hinzufügen)"
            value={groupInput}
            onChange={(e) => setGroupInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGroup())}
          />
          <Button variant="outline" onClick={addGroup}>Hinzufügen</Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-[var(--radius-default)] text-[13px]"
          style={{ background: '#FEE2E2', color: 'var(--color-status-red)' }}
        >
          {error}
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-[var(--color-ink-200)]">
        <Button variant="ghost" onClick={onBack}>&#x2190; Zurück</Button>
        <Button onClick={handleNext}>Weiter &#x2192;</Button>
      </div>
    </div>
  );
}
