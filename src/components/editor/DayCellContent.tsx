import { format, getDay, parseISO } from 'date-fns';
import { findSchoolweek, type SchoolweekRange } from '@/lib/schoolweeks';
import type { WeekAnnotation } from '@/types';
import { annotationsForWeek } from '@/lib/annotations';

interface Props {
  date: Date;
  weeks: SchoolweekRange[];
  annotations: WeekAnnotation[];
  onNoteClick(schoolweek: number): void;
}

export function DayCellContent({ date, weeks, annotations, onNoteClick }: Props) {
  const iso = format(date, 'yyyy-MM-dd');
  const isMonday = getDay(date) === 1;
  const dayNum = parseISO(iso).getDate();

  if (!isMonday) {
    return <span className="text-[13px] tabular-nums">{dayNum}</span>;
  }

  const sw = findSchoolweek(iso, weeks);
  if (!sw) {
    return <span className="text-[13px] tabular-nums">{dayNum}</span>;
  }

  const notes = annotationsForWeek(annotations, sw.startDate).filter((annotation) => annotation.text.trim().length > 0);
  const hasNote = notes.length > 0;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    onNoteClick(sw.index);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  return (
    <span className="flex items-center gap-1.5 text-[13px]">
      <span className="tabular-nums">{dayNum}</span>
      <button
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-[var(--radius-block)] text-[11px] cursor-pointer transition-colors ${
          hasNote
            ? 'bg-[var(--color-gelb-500)] text-[var(--color-ink-900)]'
            : 'bg-[var(--color-paper-bg)] text-[var(--color-ink-500)] hover:bg-[var(--color-paper-bg)]/60'
        }`}
        style={{ transitionDuration: 'var(--dur-state)' }}
        title={hasNote ? `SW ${sw.index}: ${notes.length} Anmerkung${notes.length === 1 ? '' : 'en'}` : `Anmerkung zu SW ${sw.index} hinzufügen`}
      >
        {hasNote ? notes.length : '📝'}
      </button>
    </span>
  );
}
