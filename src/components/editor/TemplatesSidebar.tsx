import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';

interface RowProps {
  id: string;
  name: string;
  color?: string;
  armed: boolean;
  onArm(): void;
}

function TemplateRow({ id, name, color, armed, onArm }: RowProps) {
  // The drag handle is a dedicated grip; the rest of the row is a click-to-arm
  // button. Separating them keeps the click reliable (dnd-kit's pointer sensor
  // otherwise swallows the click on a draggable element).
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template:${id}`,
    data: { type: 'template', templateId: id }
  });
  return (
    <div
      data-armed={armed ? 'true' : 'false'}
      className={
        'flex w-full items-center gap-1 rounded-[var(--radius-default)] border border-[var(--color-ink-200)] text-sm text-[var(--color-ink-900)] transition-colors ' +
        (armed ? 'ring-2 ring-[var(--color-gelb-500)] ' : '') +
        (isDragging ? 'opacity-50' : '')
      }
      style={{ transitionDuration: 'var(--dur-state)' }}
    >
      <span
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="flex cursor-grab items-center self-stretch pl-1 text-[var(--color-ink-500)] active:cursor-grabbing"
        aria-label={`${name} ziehen`}
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <button onClick={onArm} className="flex flex-1 items-center gap-2 py-1 pr-2 text-left">
        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        {name}
      </button>
    </div>
  );
}

export function TemplatesSidebar() {
  const doc = usePlannerStore((s) => s.doc);
  const armedTemplateId = useUiStore((s) => s.armedTemplateId);
  const armTemplate = useUiStore((s) => s.armTemplate);
  if (!doc) return null;
  return (
    <aside className="w-56 shrink-0 border-r border-[var(--color-ink-200)] p-3">
      <h2 className="mb-2 text-sm font-semibold text-[var(--color-marine-800)]">Vorlagen</h2>
      {doc.templates.length === 0 && (
        <p className="text-xs text-[var(--color-ink-500)]">Noch keine Vorlagen. In den Einstellungen anlegen.</p>
      )}
      <div className="flex flex-col gap-1">
        {doc.templates.map((t) => (
          <TemplateRow
            key={t.id}
            id={t.id}
            name={t.name}
            color={doc.categories.find((c) => c.id === t.categoryId)?.color}
            armed={armedTemplateId === t.id}
            onArm={() => armTemplate(armedTemplateId === t.id ? null : t.id)}
          />
        ))}
      </div>
    </aside>
  );
}
