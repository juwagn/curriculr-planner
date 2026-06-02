import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { usePlannerStore } from '@/stores/planner';
import { toast } from 'sonner';

export function SchoolTab() {
  const doc = usePlannerStore((s) => s.doc);
  const updateMeta = usePlannerStore((s) => s.updateMeta);
  const [schoolName, setSchoolName] = useState(doc?.meta.schoolName ?? '');
  const [schoolInfo, setSchoolInfo] = useState(doc?.meta.schoolInfo ?? '');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSchoolName(doc?.meta.schoolName ?? '');
    setSchoolInfo(doc?.meta.schoolInfo ?? '');
  }, [doc?.meta.schoolName, doc?.meta.schoolInfo]);

  const save = () => {
    updateMeta({
      schoolName: schoolName.trim() || undefined,
      schoolInfo: schoolInfo.trim() || undefined
    });
    toast.success('Schuldaten gespeichert');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="school-name" className="text-[13px] font-semibold text-[var(--color-ink-900)]">Schulname</label>
        <p className="text-[12px] text-[var(--color-ink-500)]">Erscheint als Überschrift im PDF-Ausdruck.</p>
        <Input
          id="school-name"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="z. B. Grundschule Musterstadt"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="school-info" className="text-[13px] font-semibold text-[var(--color-ink-900)]">Schulinfos (optional)</label>
        <p className="text-[12px] text-[var(--color-ink-500)]">Adresse, Schulleitung o. Ä. — erscheint in der Fußzeile.</p>
        <Textarea
          id="school-info"
          value={schoolInfo}
          onChange={(e) => setSchoolInfo(e.target.value)}
          placeholder="z. B. Schulleitung: M. Müller · Dorfstr. 1 · 12345 Musterstadt"
          rows={3}
        />
      </div>
      <Button onClick={save}>Speichern</Button>
    </div>
  );
}
