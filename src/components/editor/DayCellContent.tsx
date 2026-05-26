import { format, getDay, parseISO } from 'date-fns';
import { findSchoolweek, type SchoolweekRange } from '@/lib/schoolweeks';
import type { WeekAnnotation } from '@/types';

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
    return <span className="text-sm">{dayNum}</span>;
  }

  const sw = findSchoolweek(iso, weeks);
  if (!sw) {
    return <span className="text-sm">{dayNum}</span>;
  }

  const annotation = annotations.find((a) => a.schoolweek === sw.index);
  const hasNote = !!annotation && annotation.text.trim().length > 0;

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
    <span className="flex items-center gap-1.5 text-sm">
      <span>{dayNum}</span>
      <button
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs cursor-pointer ${
          hasNote
            ? 'bg-[var(--color-accent-warning)] text-black'
            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
        }`}
        title={hasNote ? `SW ${sw.index}: ${annotation!.text.slice(0, 50)}` : `Anmerkung zu SW ${sw.index} hinzufügen`}
      >
        📝
      </button>
    </span>
  );
}
