import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { isHoliday } from '@/lib/schoolweeks';
import type { PlanEvent } from '@/types';

const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

interface MonthRow {
  year: number;
  month: number; // 0-based
  label: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function monthRows(firstISO: string, lastISO: string): MonthRow[] {
  const [fy, fm] = firstISO.split('-').map(Number);
  const [ly, lm] = lastISO.split('-').map(Number);
  const rows: MonthRow[] = [];
  let y = fy;
  let m = fm - 1;
  while (y < ly || (y === ly && m <= lm - 1)) {
    rows.push({ year: y, month: m, label: `${MONTHS_DE[m]} ${y}` });
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return rows;
}

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

interface GridCellProps {
  iso: string;
  events: PlanEvent[];
  holiday: boolean;
  bg?: string;
  title: string;
}

function GridCell({ iso, events, holiday, bg, title }: GridCellProps) {
  const openCreateEvent = useUiStore((s) => s.openCreateEvent);
  const openEditEvent = useUiStore((s) => s.openEditEvent);
  const { isOver, setNodeRef } = useDroppable({ id: `cell:${iso}`, data: { type: 'cell', iso } });

  const handleClick = () => {
    const armed = useUiStore.getState().armedTemplateId;
    if (armed) {
      const newId = usePlannerStore.getState().createEventFromTemplate(armed, iso);
      if (newId) {
        openEditEvent(newId);
        useUiStore.getState().armTemplate(null);
      }
      return;
    }
    const first = events[0];
    if (first) openEditEvent(first.id);
    else openCreateEvent(iso);
  };

  return (
    <td
      ref={setNodeRef}
      aria-label={iso}
      data-has-event={events.length > 0 ? 'true' : 'false'}
      data-event-count={events.length}
      title={title}
      onClick={handleClick}
      className={
        'relative h-6 w-6 cursor-pointer border border-[var(--color-ink-200)] text-center ' +
        (isOver ? 'ring-2 ring-inset ring-[var(--color-marine-500)] ' : '') +
        (holiday && events.length === 0
          ? 'bg-[repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9_3px,#e2e8f0_3px,#e2e8f0_6px)]'
          : '')
      }
      style={bg ? { backgroundColor: bg } : undefined}
    >
      {events.length > 1 && (
        <span className="pointer-events-none absolute right-0 top-0 rounded-bl bg-[var(--color-marine-800)] px-[2px] text-[8px] font-semibold leading-none text-white">
          {events.length}
        </span>
      )}
    </td>
  );
}

export function YearGrid() {
  const doc = usePlannerStore((s) => s.doc);

  const rows = useMemo(
    () => (doc ? monthRows(doc.schoolyear.firstSchoolDay, doc.schoolyear.lastSchoolDay) : []),
    [doc]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PlanEvent[]>();
    if (!doc) return map;
    for (const e of doc.events) {
      const list = map.get(e.start) ?? [];
      list.push(e);
      map.set(e.start, list);
    }
    return map;
  }, [doc]);

  if (!doc) return null;

  const cols = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-[var(--color-paper-card)] px-2 py-1 text-left">Monat</th>
            {cols.map((d) => (
              <th key={d} scope="col" className="w-6 px-0 py-1 text-center text-[var(--color-ink-500)]">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const dim = daysInMonth(row.year, row.month);
            return (
              <tr key={`${row.year}-${row.month}`}>
                <th
                  scope="row"
                  className="sticky left-0 bg-[var(--color-paper-card)] px-2 py-1 text-left font-medium text-[var(--color-marine-800)]"
                >
                  {row.label}
                </th>
                {cols.map((d) => {
                  if (d > dim) return <td key={d} className="bg-[var(--color-paper-bg)]" aria-hidden="true" />;
                  const iso = `${row.year}-${pad(row.month + 1)}-${pad(d)}`;
                  const evs = eventsByDate.get(iso) ?? [];
                  const holiday = isHoliday(iso, doc.schoolyear.holidays);
                  const first = evs[0];
                  const bg = first ? doc.categories.find((c) => c.id === first.categoryId)?.color : undefined;
                  return (
                    <GridCell
                      key={d}
                      iso={iso}
                      events={evs}
                      holiday={!!holiday}
                      bg={bg}
                      title={evs.map((e) => e.title).join(', ') || holiday?.label || iso}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
