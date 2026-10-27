import { useMemo } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { computeWeekRows, getQuarterForDate, type WeekRow } from '@/lib/schoolweeks';
import { useConflicts, conflictsByEvent } from '@/hooks/useConflicts';
import type { Category, PlanEvent } from '@/types';

export function dayIso(mondayIso: string, dayIdx: number): string {
  return format(addDays(parseISO(mondayIso), dayIdx), 'yyyy-MM-dd');
}

export function fmtDot(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

/** Shared derived data for the week table (desktop) and the week agenda (narrow viewports). */
export function useWeekData() {
  const doc = usePlannerStore((s) => s.doc);
  const currentQuarter = useUiStore((s) => s.currentQuarter);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-memo only when the schoolyear slice changes, not the whole doc
  const rows = useMemo(() => (doc ? computeWeekRows(doc.schoolyear) : []), [doc?.schoolyear]);
  const filteredRows = useMemo(() => {
    if (!doc) return [] as WeekRow[];
    return rows.filter((r) => getQuarterForDate(r.startDate, doc.schoolyear) === currentQuarter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-memo only when schoolyear / quarter changes
  }, [rows, doc?.schoolyear, currentQuarter]);

  const categoryById = useMemo(() => {
    const m = new Map<string, Category>();
    if (doc) for (const c of doc.categories) m.set(c.id, c);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-memo only when categories change
  }, [doc?.categories]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, PlanEvent[]>();
    if (!doc) return m;
    for (const ev of doc.events) {
      const span = Math.max(0, differenceInCalendarDays(parseISO(ev.end), parseISO(ev.start)));
      for (let i = 0; i <= span; i++) {
        const iso = format(addDays(parseISO(ev.start), i), 'yyyy-MM-dd');
        const arr = m.get(iso) ?? [];
        arr.push(ev);
        m.set(iso, arr);
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-memo only when events change
  }, [doc?.events]);

  const conflicts = useConflicts();
  const conflictMap = useMemo(() => conflictsByEvent(conflicts), [conflicts]);

  // Mo–So: weekend events also keep a holiday week expanded.
  const rowHasEvents = (row: WeekRow) =>
    [0, 1, 2, 3, 4, 5, 6].some((dayIdx) => (eventsByDate.get(dayIso(row.startDate, dayIdx)) ?? []).length > 0);

  return { doc, rows, filteredRows, categoryById, eventsByDate, conflictMap, rowHasEvents };
}
