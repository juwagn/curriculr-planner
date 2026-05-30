import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GroupChipsInput } from '@/components/event-modal/GroupChipsInput';
import { usePlannerStore } from '@/stores/planner';
import type { EventTemplate } from '@/types';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface DraftForm {
  name: string;
  categoryId: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  defaultGroups: string[];
}

function emptyDraft(categoryId: string): DraftForm {
  return { name: '', categoryId, allDay: true, startTime: '08:00', endTime: '09:00', defaultGroups: [] };
}

export function TemplatesTab() {
  const doc = usePlannerStore((s) => s.doc);
  const addTemplate = usePlannerStore((s) => s.addTemplate);
  const updateTemplate = usePlannerStore((s) => s.updateTemplate);
  const deleteTemplate = usePlannerStore((s) => s.deleteTemplate);
  const [draft, setDraft] = useState<DraftForm>(() => emptyDraft(doc?.categories[0]?.id ?? ''));

  if (!doc) return null;

  const update = <K extends keyof DraftForm>(k: K, v: DraftForm[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  };

  const handleAdd = () => {
    const name = draft.name.trim();
    if (!name) {
      toast.error('Name erforderlich');
      return;
    }
    if (!draft.allDay && (!draft.startTime || !draft.endTime)) {
      toast.error('Zeit erforderlich wenn nicht ganztägig');
      return;
    }
    const template: EventTemplate = {
      id: crypto.randomUUID(),
      name,
      categoryId: draft.categoryId,
      allDay: draft.allDay,
      startTime: draft.allDay ? undefined : draft.startTime,
      endTime: draft.allDay ? undefined : draft.endTime,
      defaultGroups: [...draft.defaultGroups]
    };
    addTemplate(template);
    setDraft(emptyDraft(doc.categories[0]?.id ?? ''));
    toast.success('Vorlage hinzugefügt');
  };

  const catColor = (id: string) => doc.categories.find((c) => c.id === id)?.color;
  const catLabel = (id: string) => doc.categories.find((c) => c.id === id)?.label ?? '—';

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {doc.templates.length === 0 && (
          <p className="text-[13px] text-[var(--color-ink-500)]">Noch keine Vorlagen angelegt.</p>
        )}
        {doc.templates.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center gap-3 rounded-[var(--radius-default)] border border-[var(--color-ink-200)] p-3"
          >
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: catColor(t.categoryId) }} />
            <Input
              value={t.name}
              onChange={(e) => updateTemplate(t.id, { name: e.target.value })}
              className="w-48"
            />
            <Select value={t.categoryId} onValueChange={(v) => updateTemplate(t.id, { categoryId: v })}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {doc.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="mr-2 inline-block h-3 w-3 rounded-[var(--radius-block)]" style={{ background: c.color }} />
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink-900)]">
              <Checkbox
                checked={t.allDay}
                onCheckedChange={(v) =>
                  updateTemplate(t.id, {
                    allDay: v === true,
                    startTime: v === true ? undefined : (t.startTime ?? '08:00'),
                    endTime: v === true ? undefined : (t.endTime ?? '09:00')
                  })
                }
              />
              Ganztägig
            </label>
            {!t.allDay && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={t.startTime ?? ''}
                  onChange={(e) => updateTemplate(t.id, { startTime: e.target.value })}
                  className="w-28"
                />
                <span className="text-[var(--color-ink-500)]">–</span>
                <Input
                  type="time"
                  value={t.endTime ?? ''}
                  onChange={(e) => updateTemplate(t.id, { endTime: e.target.value })}
                  className="w-28"
                />
              </div>
            )}
            <span className="text-[12px] text-[var(--color-ink-500)]">
              {t.defaultGroups.length > 0 ? t.defaultGroups.join(', ') : `Kategorie: ${catLabel(t.categoryId)}`}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto"
              onClick={() => deleteTemplate(t.id)}
              aria-label={`Vorlage "${t.name}" löschen`}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-[var(--radius-default)] border border-[var(--color-ink-200)] bg-[var(--color-paper-bg)] p-4">
        <h4 className="text-[13px] font-semibold text-[var(--color-marine-800)]">Neue Vorlage</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input value={draft.name} onChange={(e) => update('name', e.target.value)} placeholder="z.B. Gesamtkonferenz" />
          </div>
          <div>
            <Label>Kategorie</Label>
            <Select value={draft.categoryId} onValueChange={(v) => update('categoryId', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {doc.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="mr-2 inline-block h-3 w-3 rounded-[var(--radius-block)]" style={{ background: c.color }} />
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink-900)] cursor-pointer">
          <Checkbox checked={draft.allDay} onCheckedChange={(v) => update('allDay', v === true)} />
          Ganztägig
        </label>

        {!draft.allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Startzeit</Label>
              <Input type="time" value={draft.startTime} onChange={(e) => update('startTime', e.target.value)} />
            </div>
            <div>
              <Label>Endzeit</Label>
              <Input type="time" value={draft.endTime} onChange={(e) => update('endTime', e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <Label>Gruppen</Label>
          <GroupChipsInput
            available={doc.availableGroups}
            value={draft.defaultGroups}
            onChange={(g) => update('defaultGroups', g)}
          />
        </div>

        <Button onClick={handleAdd}>+ Vorlage hinzufügen</Button>
      </div>
    </div>
  );
}
