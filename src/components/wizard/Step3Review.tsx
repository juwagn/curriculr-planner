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
      <h3 className="text-lg font-semibold">Zusammenfassung</h3>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <dt className="text-[var(--color-text-muted)]">Schuljahr</dt>
        <dd className="font-medium">{sy.label}</dd>

        <dt className="text-[var(--color-text-muted)]">Plan-Name</dt>
        <dd className="font-medium">{doc.meta.name}</dd>

        <dt className="text-[var(--color-text-muted)]">Erster Schultag</dt>
        <dd>{sy.firstSchoolDay}</dd>

        <dt className="text-[var(--color-text-muted)]">Erster Unterrichtstag</dt>
        <dd>{sy.firstTeachingDay}</dd>

        <dt className="text-[var(--color-text-muted)]">Letzter Schultag</dt>
        <dd>{sy.lastSchoolDay}</dd>

        <dt className="text-[var(--color-text-muted)]">Ferien-Blöcke</dt>
        <dd>{sy.holidays.length}</dd>

        <dt className="text-[var(--color-text-muted)]">Quartal-Grenzen</dt>
        <dd>{sy.quarterBoundaries.join(' · ')}</dd>

        <dt className="text-[var(--color-text-muted)]">Schulwochen</dt>
        <dd className="font-semibold text-[var(--color-primary-700)]">
          {weeks.length} (SW 00 – SW {weeks.length - 1})
        </dd>

        <dt className="text-[var(--color-text-muted)]">Kategorien</dt>
        <dd>{doc.categories.length}</dd>

        <dt className="text-[var(--color-text-muted)]">Gruppen</dt>
        <dd>{doc.availableGroups.length}</dd>
      </dl>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onBack}>← Zurück</Button>
        <Button onClick={onCreate} size="lg">Plan erstellen →</Button>
      </div>
    </div>
  );
}
