import { useMemo, type MouseEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { isHoliday } from '@/lib/schoolweeks';
import { pastelize } from '@/lib/colors';
import type { PlanEvent } from '@/types';

const FERIEN_HATCH =
  'repeating-linear-gradient(45deg, var(--color-ferien-a) 0 3px, var(--color-ferien-b) 3px 6px)';

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
  /** Category color of the first event on this day, if any. */
  color?: string;
  title: string;
}

function GridCell({ iso, events, holiday, color, title }: GridCellProps) {
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

  // Add a further event to a day that already holds one, without opening the
  // existing event. Honors an armed template, otherwise opens the create modal.
  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation();
    const armed = useUiStore.getState().armedTemplateId;
    if (armed) {
      const newId = usePlannerStore.getState().createEventFromTemplate(armed, iso);
      if (newId) {
        openEditEvent(newId);
        useUiStore.getState().armTemplate(null);
      }
      return;
    }
    openCreateEvent(iso);
  };

  const hasEvent = events.length > 0;
  const showHatch = holiday && !hasEvent;
  const cellStyle: React.CSSProperties = hasEvent && color
    ? { backgroundColor: pastelize(color) }
    : showHatch
      ? { backgroundImage: FERIEN_HATCH }
      : {};

  return (
    <td
      ref={setNodeRef}
      aria-label={iso}
      data-has-event={hasEvent ? 'true' : 'false'}
      data-event-count={events.length}
      title={title}
      onClick={handleClick}
      className={
        'group relative min-w-6 cursor-pointer border border-[var(--color-ink-200)] text-center ' +
        (isOver ? 'ring-2 ring-inset ring-[var(--color-marine-500)] ' : '')
      }
      style={cellStyle}
    >
      {hasEvent && (
        <span
          className="pointer-events-none mx-auto block h-2 w-2 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
      {events.length > 1 && (
        <span className="pointer-events-none absolute left-0 top-0 rounded-br bg-[var(--color-marine-800)] px-[3px] text-[10px] font-semibold leading-tight text-[var(--color-paper-card)]">
          {events.length}
        </span>
      )}
      {hasEvent && (
        <button
          type="button"
          onClick={handleAdd}
          aria-label={`Weiteren Termin am ${iso} hinzufügen`}
          title="Weiteren Termin hinzufügen"
          className="absolute bottom-0.5 right-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-[var(--color-marine-800)] text-[var(--color-paper-card)] shadow-sm hover:opacity-90 group-hover:flex"
        >
          <Plus className="h-3 w-3" strokeWidth={3} />
        </button>
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
    <div className="h-full w-full overflow-auto">
      <table className="h-full w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-24 bg-[var(--color-paper-card)] px-2 py-1 text-left">Monat</th>
            {cols.map((d) => (
              <th key={d} scope="col" className="px-0 py-1 text-center text-[var(--color-ink-500)]">
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
                  className="sticky left-0 z-10 w-24 whitespace-nowrap bg-[var(--color-paper-card)] px-2 py-1 text-left font-medium text-[var(--color-marine-800)]"
                >
                  {row.label}
                </th>
                {cols.map((d) => {
                  if (d > dim) return <td key={d} className="bg-[var(--color-paper-bg)]" aria-hidden="true" />;
                  const iso = `${row.year}-${pad(row.month + 1)}-${pad(d)}`;
                  const evs = eventsByDate.get(iso) ?? [];
                  const holiday = isHoliday(iso, doc.schoolyear.holidays);
                  const first = evs[0];
                  const color = first ? doc.categories.find((c) => c.id === first.categoryId)?.color : undefined;
                  return (
                    <GridCell
                      key={d}
                      iso={iso}
                      events={evs}
                      holiday={!!holiday}
                      color={color}
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
