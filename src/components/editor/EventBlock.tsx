import { useDraggable } from '@dnd-kit/core';
import { pastelize } from '@/lib/colors';
import type { Category, PlanEvent } from '@/types';

interface Props {
  event: PlanEvent;
  category: Category;
  onClick(e: React.MouseEvent): void;
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

export function EventBlock({ event, category, onClick }: Props) {
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
      className="w-full text-left rounded-[3px] px-2 py-1 leading-snug transition-all hover:shadow-sm hover:-translate-y-[0.5px] cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-900)]/30"
      style={{
        backgroundColor: bg === '#FFFFFF' ? baseBg : bg,
        borderLeft: `3px solid ${category.color}`,
        opacity: isDragging ? 0.4 : 1,
        fontSize: '12px',
        wordBreak: 'break-word'
      }}
      title={event.title}
    >
      {timeLabel && (
        <span className="font-bold tabular-nums mr-1">{timeLabel}</span>
      )}
      <span>{event.title}</span>
    </button>
  );
}
