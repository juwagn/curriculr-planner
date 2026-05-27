import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlannerStore } from '@/stores/planner';
import type { Category } from '@/types';
import { toast } from 'sonner';

export function CategoriesTab() {
  const doc = usePlannerStore((s) => s.doc);
  const updateCategories = usePlannerStore((s) => s.updateCategories);
  const [cats, setCats] = useState<Category[]>(() => doc?.categories ?? []);

  const update = (id: string, patch: Partial<Category>) => {
    setCats(cats.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const save = () => {
    updateCategories(cats);
    toast.success('Kategorien gespeichert');
  };

  return (
    <div className="space-y-3">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[12px] text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
            <th className="text-left py-2 font-semibold">Label</th>
            <th className="w-12 font-semibold">Farbe</th>
            <th className="text-left font-semibold">Stichwörter</th>
          </tr>
        </thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.id}>
              <td className="py-1 pr-2">
                <Input value={c.label} onChange={(e) => update(c.id, { label: e.target.value })} />
              </td>
              <td className="py-1 pr-2">
                <input
                  type="color"
                  value={c.color}
                  onChange={(e) => update(c.id, { color: e.target.value })}
                  className="w-10 h-8 rounded-[var(--radius-input)] border border-[var(--color-ink-200)] cursor-pointer"
                />
              </td>
              <td className="py-1 pr-2">
                <Input
                  value={c.keywords.join(', ')}
                  onChange={(e) =>
                    update(c.id, {
                      keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button onClick={save}>Speichern</Button>
    </div>
  );
}
