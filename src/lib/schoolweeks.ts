import { parseISO, format, addDays, startOfWeek, getDay, isWithinInterval } from 'date-fns';
import type { Schoolyear, Holiday, ISODate, PlannerDocument } from '@/types';

export interface SchoolweekRange {
  index: number;
  startDate: ISODate;
  endDate: ISODate;
}

export function isWeekend(iso: ISODate): boolean {
  const day = getDay(parseISO(iso));
  return day === 0 || day === 6;
}

export function isHoliday(iso: ISODate, holidays: Holiday[]): Holiday | null {
  const date = parseISO(iso);
  for (const h of holidays) {
    if (isWithinInterval(date, { start: parseISO(h.start), end: parseISO(h.end) })) {
      return h;
    }
  }
  return null;
}

function fmt(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd');
}

/** Snaps a boundary date to the Friday of its Monday-based ISO week. */
export function snapToFriday(iso: ISODate): ISODate {
  const monday = startOfWeek(parseISO(iso), { weekStartsOn: 1 });
  return fmt(addDays(monday, 4));
}

export function computeSchoolweeks(sy: Schoolyear): SchoolweekRange[] {
  const start = startOfWeek(parseISO(sy.firstSchoolDay), { weekStartsOn: 1 });
  const last = parseISO(sy.lastSchoolDay);
  const weeks: SchoolweekRange[] = [];
  let index = 0;
  let cursor = start;
  let isFirstWeek = true;
  while (cursor <= last) {
    const monday = cursor;
    const friday = addDays(cursor, 4);
    let holidayDays = 0;
    for (let i = 0; i < 5; i++) {
      if (isHoliday(fmt(addDays(cursor, i)), sy.holidays)) holidayDays++;
    }
    // The first school week (SW 00) is always included even if it falls entirely
    // within a holiday period (e.g. teacher preparation week inside Sommerferien).
    if (isFirstWeek || holidayDays < 5) {
      weeks.push({ index, startDate: fmt(monday), endDate: fmt(friday) });
      index++;
    }
    isFirstWeek = false;
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function findSchoolweek(
  iso: ISODate,
  weeks: SchoolweekRange[]
): SchoolweekRange | null {
  return weeks.find((w) => iso >= w.startDate && iso <= w.endDate) ?? null;
}

export function getQuarterForDate(
  iso: ISODate,
  sy: Schoolyear
): 1 | 2 | 3 | 4 {
  const [q1End, q2End, q3End] = sy.quarterBoundaries.map(snapToFriday);
  if (iso <= q1End) return 1;
  if (iso <= q2End) return 2;
  if (iso <= q3End) return 3;
  return 4;
}

export interface QuarterRange {
  startDate: ISODate;
  endDate: ISODate;
}

export function getQuarterRange(quarter: 1 | 2 | 3 | 4, sy: Schoolyear): QuarterRange {
  const snapped = sy.quarterBoundaries.map(snapToFriday);
  const dayAfter = (iso: ISODate) => fmt(addDays(parseISO(iso), 1));
  const starts: ISODate[] = [
    sy.firstSchoolDay,
    dayAfter(snapped[0]),
    dayAfter(snapped[1]),
    dayAfter(snapped[2])
  ];
  const ends: ISODate[] = [snapped[0], snapped[1], snapped[2], sy.lastSchoolDay];
  return {
    startDate: starts[quarter - 1] ?? sy.firstSchoolDay,
    endDate: ends[quarter - 1] ?? sy.lastSchoolDay
  };
}

export type WeekRow =
  | { kind: 'schoolweek'; index: number; startDate: ISODate; endDate: ISODate }
  | { kind: 'holiday'; label: string; startDate: ISODate; endDate: ISODate };

export function isWithinSchoolyear(iso: ISODate, sy: Schoolyear): boolean {
  return iso >= sy.firstSchoolDay && iso <= sy.lastSchoolDay;
}

export function computeWeekRows(sy: Schoolyear): WeekRow[] {
  const start = startOfWeek(parseISO(sy.firstSchoolDay), { weekStartsOn: 1 });
  const last = parseISO(sy.lastSchoolDay);
  const rows: WeekRow[] = [];
  let index = 0;
  let cursor = start;
  let isFirstWeek = true;
  while (cursor <= last) {
    const monday = cursor;
    const friday = addDays(cursor, 4);
    let holidayLabel: string | null = null;
    let holidayDays = 0;
    for (let i = 0; i < 5; i++) {
      const h = isHoliday(fmt(addDays(cursor, i)), sy.holidays);
      if (h) {
        holidayDays++;
        if (!holidayLabel) holidayLabel = h.label;
      }
    }
    // The first school week (SW 00) is always a schoolweek row even if it falls
    // entirely within a holiday period (e.g. teacher preparation week inside Sommerferien).
    if (!isFirstWeek && holidayDays === 5) {
      rows.push({ kind: 'holiday', label: holidayLabel ?? 'Ferien', startDate: fmt(monday), endDate: fmt(friday) });
    } else {
      rows.push({ kind: 'schoolweek', index, startDate: fmt(monday), endDate: fmt(friday) });
      index++;
    }
    isFirstWeek = false;
    cursor = addDays(cursor, 7);
  }
  return rows;
}

/**
 * Scans week annotations for "Ende N. Quartal" markers and returns the
 * endDate (Friday) of the annotated school week as the quarter boundary.
 * Returns array of length 3; null where no marker found.
 */
export function suggestQuarterBoundaries(doc: PlannerDocument): (ISODate | null)[] {
  const weeks = computeSchoolweeks(doc.schoolyear);
  const byIndex = new Map(weeks.map((w) => [w.index, w.endDate]));
  const result: (ISODate | null)[] = [null, null, null];
  const re = /ende\s*([1-3])\.?\s*quartal/i;
  for (const a of doc.annotations) {
    const m = a.text.match(re);
    if (!m) continue;
    const q = Number(m[1]);
    const end = byIndex.get(a.schoolweek);
    if (end) result[q - 1] = end;
  }
  return result;
}
