import { useDraggable } from '@dnd-kit/core';
import { pastelize } from '@/lib/colors';
import type { Category, PlanEvent } from '@/types';

interface Props {
  event: PlanEvent;
  category: Category;
  onClick(e: React.MouseEvent): void;
  conflictSeverity?: 'error' | 'warning';
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fmtTime(t?: string): string {
  if (!t) return '';
  return t.replace(':', '.');
}

export function EventBlock({ event, category, onClick, conflictSeverity }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event:${event.id}`,
    data: { type: 'event', eventId: event.id }
  });

  const baseBg = hexToRgba(category.color, 0.1);
  const bg = pastelize(category.color);
  const timeLabel = event.startTime
    ? event.endTime
      ? `${fmtTime(event.startTime)}-${fmtTime(event.endTime)}`
      : fmtTime(event.startTime)
    : '';

  return (
    <button
      ref={setNodeRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      {...listeners}
      {...attributes}
      className="w-full text-left rounded-[var(--radius-block)] px-2 py-1 leading-snug transition-all hover:shadow-[var(--shadow-card)] hover:-translate-y-[0.5px] cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-marine-800)]/50"
      style={{
        backgroundColor: bg === '#FFFFFF' ? baseBg : bg,
        borderLeft: `3px solid ${category.color}`,
        opacity: isDragging ? 0.4 : 1,
        fontSize: '13px',
        wordBreak: 'break-word',
        transitionDuration: 'var(--dur-state)',
        transitionTimingFunction: 'var(--ease-state)'
      }}
      title={event.title}
    >
      {conflictSeverity && (
        <span
          aria-label={conflictSeverity === 'error' ? 'Konflikt' : 'Warnung'}
          className="mr-1 align-middle"
          style={{ color: conflictSeverity === 'error' ? '#E02424' : '#B45309' }}
        >
          ⚠
        </span>
      )}
      {timeLabel && (
        <span className="font-bold tabular-nums mr-1">{timeLabel}</span>
      )}
      <span>{event.title}</span>
    </button>
  );
}
