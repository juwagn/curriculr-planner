import { useMemo } from 'react';
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

export function YearGrid() {
  const doc = usePlannerStore((s) => s.doc);
  const openCreateEvent = useUiStore((s) => s.openCreateEvent);
  const openEditEvent = useUiStore((s) => s.openEditEvent);

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
              <th key={d} scope="col" className="w-6 px-0 py-1 text-center text-[var(--color-ink-400)]">
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
                  if (d > dim) return <td key={d} className="bg-[var(--color-ink-50)]" aria-hidden="true" />;
                  const iso = `${row.year}-${pad(row.month + 1)}-${pad(d)}`;
                  const evs = eventsByDate.get(iso) ?? [];
                  const holiday = isHoliday(iso, doc.schoolyear.holidays);
                  const first = evs[0];
                  const bg = first ? doc.categories.find((c) => c.id === first.categoryId)?.color : undefined;
                  return (
                    <td
                      key={d}
                      aria-label={iso}
                      data-has-event={evs.length > 0 ? 'true' : 'false'}
                      title={evs.map((e) => e.title).join(', ') || holiday?.label || iso}
                      onClick={() => (first ? openEditEvent(first.id) : openCreateEvent(iso))}
                      className={
                        'h-6 w-6 cursor-pointer border border-[var(--color-ink-100)] text-center ' +
                        (holiday && evs.length === 0
                          ? 'bg-[repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9_3px,#e2e8f0_3px,#e2e8f0_6px)]'
                          : '')
                      }
                      style={bg ? { backgroundColor: bg } : undefined}
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
