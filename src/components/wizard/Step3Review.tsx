import { Button } from '@/components/ui/button';
import { computeSchoolweeks } from '@/lib/schoolweeks';
import type { PlannerDocument } from '@/types';

interface Props {
  doc: PlannerDocument;
  onBack(): void;
  onCreate(): void;
}

export function Step3Review({ doc, onBack, onCreate }: Props) {
  const weeks = computeSchoolweeks(doc.schoolyear);
  const sy = doc.schoolyear;

  return (
    <div className="space-y-6">
      <h3 className="text-[15px] font-semibold text-[var(--color-marine-800)]">Zusammenfassung</h3>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
        <dt className="text-[var(--color-ink-500)]">Schuljahr</dt>
        <dd className="font-semibold text-[var(--color-ink-900)]">{sy.label}</dd>

        <dt className="text-[var(--color-ink-500)]">Plan-Name</dt>
        <dd className="font-semibold text-[var(--color-ink-900)]">{doc.meta.name}</dd>

        <dt className="text-[var(--color-ink-500)]">Erster Schultag</dt>
        <dd className="tabular-nums">{sy.firstSchoolDay}</dd>

        <dt className="text-[var(--color-ink-500)]">Erster Unterrichtstag</dt>
        <dd className="tabular-nums">{sy.firstTeachingDay}</dd>

        <dt className="text-[var(--color-ink-500)]">Letzter Schultag</dt>
        <dd className="tabular-nums">{sy.lastSchoolDay}</dd>

        <dt className="text-[var(--color-ink-500)]">Ferien-Blöcke</dt>
        <dd className="tabular-nums">{sy.holidays.length}</dd>

        <dt className="text-[var(--color-ink-500)]">Quartal-Grenzen</dt>
        <dd className="tabular-nums">{sy.quarterBoundaries.join(' · ')}</dd>

        <dt className="text-[var(--color-ink-500)]">Schulwochen</dt>
        <dd className="font-semibold text-[var(--color-marine-700)] tabular-nums">
          {weeks.length} (SW 00 – SW {weeks.length - 1})
        </dd>

        <dt className="text-[var(--color-ink-500)]">Kategorien</dt>
        <dd className="tabular-nums">{doc.categories.length}</dd>

        <dt className="text-[var(--color-ink-500)]">Gruppen</dt>
        <dd className="tabular-nums">{doc.availableGroups.length}</dd>
      </dl>

      <div className="flex justify-between pt-4 border-t border-[var(--color-ink-200)]">
        <Button variant="ghost" onClick={onBack}>← Zurück</Button>
        <Button onClick={onCreate} size="lg">Plan erstellen →</Button>
      </div>
    </div>
  );
}
