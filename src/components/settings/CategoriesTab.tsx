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
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-[var(--color-text-muted)]">
            <th className="text-left py-2">Label</th>
            <th className="w-12">Farbe</th>
            <th className="text-left">Stichwörter</th>
          </tr>
        </thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.id}>
              <td className="py-1 pr-2">
                <Input value={c.label} onChange={(e) => update(c.id, { label: e.target.value })} />
              </td>
              <td className="py-1 pr-2">
                <input type="color" value={c.color} onChange={(e) => update(c.id, { color: e.target.value })} className="w-10 h-9 rounded border" />
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
