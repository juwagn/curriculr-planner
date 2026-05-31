import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GroupChipsInput } from './GroupChipsInput';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import type { PlanEvent } from '@/types';
import { toast } from 'sonner';

function newUuid() {
  return crypto.randomUUID();
}

function matchCategoryByKeywords(title: string, cats: { id: string; keywords: string[] }[]): string | null {
  const lower = title.toLowerCase();
  for (const c of cats) {
    for (const kw of c.keywords) {
      if (kw && lower.includes(kw.toLowerCase())) return c.id;
    }
  }
  return null;
}

export function EventModal() {
  const doc = usePlannerStore((s) => s.doc);
  const addEvent = usePlannerStore((s) => s.addEvent);
  const updateEvent = usePlannerStore((s) => s.updateEvent);
  const deleteEvent = usePlannerStore((s) => s.deleteEvent);
  const state = useUiStore((s) => s.eventModalState);
  const close = useUiStore((s) => s.closeEventModal);

  const editing = state.open && state.mode === 'edit'
    ? doc?.events.find((e) => e.id === state.eventId) ?? null
    : null;

  const [form, setForm] = useState<PlanEvent | null>(null);

  useEffect(() => {
    if (!state.open || !doc) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: clear the draft form when the modal closes or no doc is loaded
      setForm(null);
      return;
    }
    if (state.mode === 'edit' && editing) {
      setForm({ ...editing });
    } else {
      // Fall back to a date inside the schoolyear being planned: today if it
      // lies within the year, otherwise the first school day. Avoids defaulting
      // a future year's plan to the current (out-of-range) date.
      const today = new Date().toISOString().slice(0, 10);
      const { firstSchoolDay, lastSchoolDay } = doc.schoolyear;
      const inRange = today >= firstSchoolDay && today <= lastSchoolDay ? today : firstSchoolDay;
      const presetDate = (state.mode === 'create' && state.presetDate) || inRange;
      setForm({
        id: newUuid(),
        title: '',
        start: presetDate,
        end: presetDate,
        startTime: '08:00',
        endTime: '09:00',
        allDay: true,
        categoryId: doc.categories[0]?.id ?? '',
        notes: '',
        location: '',
        groups: []
      });
    }
  }, [state, doc, editing]);

  if (!doc || !form || !state.open) return null;

  const update = <K extends keyof PlanEvent>(k: K, v: PlanEvent[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };

  const handleTitle = (title: string) => {
    const matched = matchCategoryByKeywords(title, doc.categories);
    setForm((f) => (f ? { ...f, title, categoryId: matched ?? f.categoryId } : f));
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error('Titel erforderlich');
      return;
    }
    if (form.end < form.start) {
      toast.error('Endedatum muss ≥ Startdatum sein');
      return;
    }
    if (!form.allDay && (!form.startTime || !form.endTime)) {
      toast.error('Zeit erforderlich wenn nicht ganztägig');
      return;
    }
    if (state.mode === 'edit' && editing) {
      updateEvent(editing.id, form);
    } else {
      addEvent(form);
    }
    close();
  };

  const handleDelete = () => {
    if (state.mode === 'edit' && editing) {
      if (confirm(`Termin "${editing.title}" wirklich löschen?`)) {
        deleteEvent(editing.id);
        close();
      }
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg" onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave();
      }}>
        <DialogTitle>{state.mode === 'edit' ? 'Termin bearbeiten' : 'Neuer Termin'}</DialogTitle>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">
              Titel <span className="text-[var(--color-danger)]" aria-hidden="true">*</span>
            </Label>
            <Input
              id="title"
              required
              aria-required="true"
              autoFocus
              value={form.title}
              onChange={(e) => handleTitle(e.target.value)}
              placeholder="z.B. Zeugniskonferenz Jg 10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Startdatum</Label>
              <DateInput value={form.start} onValueChange={(v) => update('start', v)} />
            </div>
            <div>
              <Label>Endedatum</Label>
              <DateInput value={form.end} onValueChange={(v) => update('end', v)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink-900)] cursor-pointer">
            <Checkbox checked={form.allDay} onCheckedChange={(v) => update('allDay', v === true)} />
            Ganztägig
          </label>

          {!form.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Startzeit</Label>
                <Input
                  type="time"
                  value={form.startTime ?? ''}
                  onChange={(e) => update('startTime', e.target.value)}
                />
              </div>
              <div>
                <Label>Endzeit</Label>
                <Input
                  type="time"
                  value={form.endTime ?? ''}
                  onChange={(e) => update('endTime', e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <Label>Kategorie</Label>
            <Select value={form.categoryId} onValueChange={(v) => update('categoryId', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {doc.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-block w-3 h-3 rounded-[var(--radius-block)] mr-2" style={{ background: c.color }} />
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Standort</Label>
            <Input
              value={form.location ?? ''}
              onChange={(e) => update('location', e.target.value)}
              placeholder="z.B. Aula"
            />
          </div>

          <div>
            <Label>Bemerkung</Label>
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => update('notes', e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <div>
            <Label>Gruppen</Label>
            <GroupChipsInput
              available={doc.availableGroups}
              value={form.groups}
              onChange={(g) => update('groups', g)}
            />
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2">
          {state.mode === 'edit' && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto">
              Löschen
            </Button>
          )}
          <Button variant="ghost" onClick={close}>Abbrechen</Button>
          <Button onClick={handleSave}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
