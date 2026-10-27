import { useDraggable } from '@dnd-kit/core';
import { pastelize } from '@/lib/colors';
import { TriangleAlert } from 'lucide-react';
import type { Category, PlanEvent } from '@/types';

interface Props {
  event: PlanEvent;
  category: Category;
  onClick(e: React.MouseEvent): void;
  conflictSeverity?: 'error' | 'warning';
  segmentPosition?: 'start' | 'middle' | 'end' | 'single';
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

export function EventBlock({ event, category, onClick, conflictSeverity, segmentPosition }: Props) {
  const pos = segmentPosition ?? 'single';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event:${event.id}`,
    data: { type: 'event', eventId: event.id }
  });
  const {
    listeners: resizeListeners,
    setNodeRef: setResizeNodeRef
  } = useDraggable({
    id: `resize:${event.id}`,
    data: { type: 'resize-end', eventId: event.id }
  });

  const roundLeft = pos === 'start' || pos === 'single';
  const roundRight = pos === 'end' || pos === 'single';
  const showLeftBorder = pos === 'start' || pos === 'single';
  const showContent = pos === 'start' || pos === 'single';

  const baseBg = hexToRgba(category.color, 0.25);
  const bg = pastelize(category.color);
  const timeLabel = event.allDay
    ? ''
    : event.startTime
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
      className="relative w-full text-left rounded-[var(--radius-block)] pl-2 pr-3 py-1 leading-snug transition-all cursor-grab active:cursor-grabbing focus:outline-none focus-visible:shadow-[var(--cl-focus-ring)]"
      style={{
        backgroundColor: bg === '#FFFFFF' ? baseBg : bg,
        borderLeft: showLeftBorder ? `3px solid ${category.color}` : 'none',
        borderTopLeftRadius: roundLeft ? undefined : 0,
        borderBottomLeftRadius: roundLeft ? undefined : 0,
        borderTopRightRadius: roundRight ? undefined : 0,
        borderBottomRightRadius: roundRight ? undefined : 0,
        opacity: isDragging ? 0.4 : 1,
        fontSize: '15px',
        color: 'var(--cl-on-gold)',
        overflowWrap: 'break-word',
        hyphens: 'auto',
        transitionDuration: 'var(--dur-state)',
        transitionTimingFunction: 'var(--ease-state)'
      }}
      title={event.title}
    >
      {showContent ? (
        <>
          {conflictSeverity && (
            <TriangleAlert
              role="img"
              aria-label={conflictSeverity === 'error' ? 'Konflikt' : 'Warnung'}
              className="mr-1 inline h-3.5 w-3.5 align-text-bottom"
              style={{ color: conflictSeverity === 'error' ? 'var(--color-danger)' : 'var(--color-warning)' }}
            />
          )}
          {timeLabel && (
            <span className="font-bold tabular-nums mr-1">{timeLabel}</span>
          )}
          <span>{event.title}</span>
        </>
      ) : (
        <span className="opacity-0">·</span>
      )}
      {(pos === 'end' || pos === 'single') && (
        <span
          ref={setResizeNodeRef}
          {...resizeListeners}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
          aria-label="Dauer ändern"
        />
      )}
    </button>
  );
}
