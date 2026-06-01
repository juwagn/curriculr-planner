import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlannerStore } from '@/stores/planner';
import { CATEGORY_PALETTE } from '@/lib/colors';
import { slugify as deriveSlug } from '@/lib/slugify';
import type { Category } from '@/types';
import { toast } from 'sonner';

function nextPaletteColor(used: string[]): string {
  const taken = new Set(used.map((c) => c.toUpperCase()));
  return CATEGORY_PALETTE.find((c) => !taken.has(c.toUpperCase())) ?? CATEGORY_PALETTE[0];
}

export function CategoriesTab() {
  const doc = usePlannerStore((s) => s.doc);
  const updateCategories = usePlannerStore((s) => s.updateCategories);
  const reassignCategory = usePlannerStore((s) => s.reassignCategory);
  const [cats, setCats] = useState<Category[]>(() => doc?.categories ?? []);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [reassignTo, setReassignTo] = useState<string>('');

  const update = (id: string, patch: Partial<Category>) => {
    setCats(cats.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const usageCount = (categoryId: string) => {
    const events = doc?.events.filter((e) => e.categoryId === categoryId).length ?? 0;
    const templates = doc?.templates.filter((t) => t.categoryId === categoryId).length ?? 0;
    return { events, templates, total: events + templates };
  };

  const addCategory = () => {
    setCats([
      ...cats,
      {
        id: crypto.randomUUID(),
        label: '',
        color: nextPaletteColor(cats.map((c) => c.color)),
        slug: '',
        keywords: []
      }
    ]);
  };

  const requestDelete = (cat: Category) => {
    if (cats.length <= 1) {
      toast.error('Mindestens eine Kategorie muss bestehen bleiben');
      return;
    }
    if (usageCount(cat.id).total === 0) {
      setCats(cats.filter((c) => c.id !== cat.id));
      return;
    }
    const fallback = cats.find((c) => c.id !== cat.id);
    setReassignTo(fallback?.id ?? '');
    setPendingDelete(cat);
  };

  const confirmReassignDelete = () => {
    if (!pendingDelete || !reassignTo) return;
    reassignCategory(pendingDelete.id, reassignTo);
    const next = cats.filter((c) => c.id !== pendingDelete.id);
    setCats(next);
    updateCategories(withSlugs(next));
    setPendingDelete(null);
    toast.success('Kategorie gelöscht, Termine umgehängt');
  };

  const withSlugs = (list: Category[]) =>
    list.map((c) => ({ ...c, slug: c.slug || deriveSlug(c.label) }));

  const save = () => {
    if (cats.some((c) => !c.label.trim())) {
      toast.error('Jede Kategorie braucht einen Namen');
      return;
    }
    updateCategories(withSlugs(cats));
    toast.success('Kategorien gespeichert');
  };

  return (
    <div className="space-y-3">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[12px] text-[var(--color-ink-500)] uppercase tracking-[0.05em]">
            <th className="text-left py-2 font-semibold">Label</th>
            <th className="text-left font-semibold pl-2">Farbe</th>
            <th className="text-left font-semibold pl-2">Stichwörter</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.id}>
              <td className="py-1 pr-2 align-top">
                <Input value={c.label} onChange={(e) => update(c.id, { label: e.target.value })} placeholder="Name" />
              </td>
              <td className="py-1 pl-2 pr-2 align-middle">
                <ColorPicker value={c.color} onChange={(color) => update(c.id, { color })} aria-label={`Farbe für ${c.label || 'Kategorie'}`} />
              </td>
              <td className="py-1 pl-2 pr-2 align-top">
                <Input
                  value={c.keywords.join(', ')}
                  onChange={(e) =>
                    update(c.id, {
                      keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    })
                  }
                  placeholder="z.B. konferenz, fk"
                />
              </td>
              <td className="py-1 align-middle text-center">
                <button
                  type="button"
                  onClick={() => requestDelete(c)}
                  aria-label={`${c.label || 'Kategorie'} löschen`}
                  className="text-[var(--color-ink-500)] hover:text-[var(--color-status-red)] transition-colors px-1"
                  style={{ transitionDuration: 'var(--dur-state)' }}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={addCategory}>+ Neue Kategorie</Button>
        <Button onClick={save}>Speichern</Button>
      </div>

      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Kategorie löschen</DialogTitle>
          {pendingDelete && (
            <>
              <DialogDescription>
                „{pendingDelete.label || 'Unbenannt'}" wird in{' '}
                {usageCount(pendingDelete.id).events} Termin(en) und{' '}
                {usageCount(pendingDelete.id).templates} Vorlage(n) verwendet. Diese auf eine andere
                Kategorie umhängen:
              </DialogDescription>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cats
                    .filter((c) => c.id !== pendingDelete.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="inline-block w-3 h-3 rounded-[var(--radius-block)] mr-2" style={{ background: c.color }} />
                        {c.label || 'Unbenannt'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <DialogFooter className="mt-4 gap-2">
                <Button variant="ghost" onClick={() => setPendingDelete(null)}>Abbrechen</Button>
                <Button variant="destructive" onClick={confirmReassignDelete} disabled={!reassignTo}>
                  Umhängen & löschen
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
