import { addDays, format, parseISO, differenceInCalendarDays } from 'date-fns';
import type { ISODate, PlannerDocument, PlanEvent, UUID } from '@/types';
import { isHoliday, isWeekend, isWithinSchoolyear } from './schoolweeks';

export type ConflictType =
  | 'ferien'
  | 'category-in-ferien'
  | 'outside-schoolyear'
  | 'weekend'
  | 'duplicate-allday'
  | 'overload-day';

export interface Conflict {
  key: string;
  type: ConflictType;
  severity: 'error' | 'warning';
  eventIds: UUID[];
  message: string;
}

/** Category slugs that must never fall into the holidays. */
const STRICT_HOLIDAY_SLUGS = ['pruefung', 'elternabend'];
const OVERLOAD_THRESHOLD = 3;

function coveredDays(e: PlanEvent): ISODate[] {
  const days: ISODate[] = [];
  const span = Math.max(0, differenceInCalendarDays(parseISO(e.end), parseISO(e.start)));
  for (let i = 0; i <= span; i++) days.push(format(addDays(parseISO(e.start), i), 'yyyy-MM-dd'));
  return days;
}

function makeKey(type: ConflictType, eventIds: UUID[], date: string): string {
  return `${type}|${[...eventIds].sort().join(',')}|${date}`;
}

export function detectConflicts(doc: PlannerDocument): Conflict[] {
  const { schoolyear: sy, categories } = doc;
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));
  const out: Conflict[] = [];

  for (const e of doc.events) {
    const days = coveredDays(e);
    const slug = slugById.get(e.categoryId);

    const holidayHit = days.map((d) => isHoliday(d, sy.holidays)).find((h) => h !== null) ?? null;
    if (holidayHit) {
      if (slug && STRICT_HOLIDAY_SLUGS.includes(slug)) {
        out.push({
          key: makeKey('category-in-ferien', [e.id], e.start),
          type: 'category-in-ferien', severity: 'error', eventIds: [e.id],
          message: `„${e.title}" liegt in den Ferien (${holidayHit.label}) – diese Kategorie sollte nicht in Ferien fallen.`
        });
      } else {
        out.push({
          key: makeKey('ferien', [e.id], e.start),
          type: 'ferien', severity: 'warning', eventIds: [e.id],
          message: `„${e.title}" liegt in den Ferien (${holidayHit.label}).`
        });
      }
    }

    if (!isWithinSchoolyear(e.start, sy) || !isWithinSchoolyear(e.end, sy)) {
      out.push({
        key: makeKey('outside-schoolyear', [e.id], e.start),
        type: 'outside-schoolyear', severity: 'error', eventIds: [e.id],
        message: `„${e.title}" liegt außerhalb des Schuljahres.`
      });
    }

    if (days.some((d) => isWeekend(d))) {
      out.push({
        key: makeKey('weekend', [e.id], e.start),
        type: 'weekend', severity: 'warning', eventIds: [e.id],
        message: `„${e.title}" liegt (teilweise) am Wochenende.`
      });
    }
  }

  const byDay = new Map<ISODate, PlanEvent[]>();
  for (const e of doc.events) {
    for (const d of coveredDays(e)) {
      const arr = byDay.get(d) ?? [];
      arr.push(e);
      byDay.set(d, arr);
    }
  }
  for (const [date, evs] of byDay) {
    const allDay = evs.filter((e) => e.allDay);
    if (allDay.length > 1) {
      const ids = allDay.map((e) => e.id);
      out.push({
        key: makeKey('duplicate-allday', ids, date),
        type: 'duplicate-allday', severity: 'warning', eventIds: ids,
        message: `${allDay.length} ganztägige Termine am ${date}.`
      });
    }
    if (evs.length > OVERLOAD_THRESHOLD) {
      const ids = evs.map((e) => e.id);
      out.push({
        key: makeKey('overload-day', ids, date),
        type: 'overload-day', severity: 'warning', eventIds: ids,
        message: `${evs.length} Termine am ${date} – mögliche Überlast.`
      });
    }
  }

  return out;
}
