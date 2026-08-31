import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { computeWeekRows, getQuarterRange, getQuarterForDate, isHoliday } from './schoolweeks';
import type { PlannerDocument } from '@/types';
import type { WeekRow } from './schoolweeks';
import { annotationsForWeek } from './annotations';

export type PrintScope = 'currentQuarter' | 'allQuarters';

export interface PrintEvent {
  title: string;
  time?: string;
  color: string;
}

export interface PrintCell {
  events: PrintEvent[];
  ferien?: boolean;
}

export interface PrintWeekRow {
  type: 'week';
  swIndex: string;
  dateRange: string;
  cells: [PrintCell, PrintCell, PrintCell, PrintCell, PrintCell];
  annotation?: string;
}

export interface PrintHolidayRow {
  type: 'holiday';
  label: string;
  dateRange: string;
}

export interface PrintSection {
  quarterIndex: 1 | 2 | 3 | 4;
  quarterLabel: string;
  rows: (PrintWeekRow | PrintHolidayRow)[];
}

export interface PrintModel {
  schoolName: string;
  schoolInfo?: string;
  docName: string;
  schoolyearLabel: string;
  sections: PrintSection[];
  printedAt: string;
}

function fmtDot(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

function buildSection(
  doc: PlannerDocument,
  quarter: 1 | 2 | 3 | 4,
  allWeekRows: WeekRow[]
): PrintSection {
  const range = getQuarterRange(quarter, doc.schoolyear);

  const quarterRows = allWeekRows.filter(
    (r) => getQuarterForDate(r.startDate, doc.schoolyear) === quarter
  );

  const eventsByDate = new Map<string, PlannerDocument['events']>();
  for (const ev of doc.events) {
    const spanDays = Math.max(0, differenceInCalendarDays(parseISO(ev.end), parseISO(ev.start)));
    for (let i = 0; i <= spanDays; i++) {
      const iso = format(addDays(parseISO(ev.start), i), 'yyyy-MM-dd');
      const arr = eventsByDate.get(iso) ?? [];
      arr.push(ev);
      eventsByDate.set(iso, arr);
    }
  }

  const rows: (PrintWeekRow | PrintHolidayRow)[] = quarterRows.map((row) => {
    if (row.kind === 'holiday') {
      return {
        type: 'holiday',
        label: row.label,
        dateRange: `${fmtDot(row.startDate)}–${fmtDot(row.endDate)}`
      } satisfies PrintHolidayRow;
    }

    const cells: [PrintCell, PrintCell, PrintCell, PrintCell, PrintCell] = [
      { events: [] }, { events: [] }, { events: [] }, { events: [] }, { events: [] }
    ];

    for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
      const iso = format(addDays(parseISO(row.startDate), dayIdx), 'yyyy-MM-dd');
      const dayEvents = eventsByDate.get(iso) ?? [];
      cells[dayIdx].events = dayEvents.map((ev) => {
        const cat = doc.categories.find((c) => c.id === ev.categoryId);
        return {
          title: ev.title,
          time: ev.allDay ? undefined : ev.startTime,
          color: cat?.color ?? '#888888'
        };
      });
      const hol = isHoliday(iso, doc.schoolyear.holidays);
      cells[dayIdx].ferien = hol?.type === 'ferien';
    }

    const annotation = annotationsForWeek(doc.annotations, row.startDate)
      .map((item) => item.text)
      .filter((text) => text.trim().length > 0)
      .join('\n');

    return {
      type: 'week',
      swIndex: row.index.toString().padStart(2, '0'),
      dateRange: `${fmtDot(row.startDate)}–${fmtDot(row.endDate)}`,
      cells,
      annotation: annotation || undefined
    } satisfies PrintWeekRow;
  });

  const startFmt = format(parseISO(range.startDate), 'MMM yyyy', { locale: de });
  const endFmt = format(parseISO(range.endDate), 'MMM yyyy', { locale: de });
  const quarterLabel = `${quarter}. Quartal · ${startFmt} – ${endFmt}`;

  return { quarterIndex: quarter, quarterLabel, rows };
}

export function buildPrintModel(
  doc: PlannerDocument,
  scope: PrintScope,
  currentQuarter: 1 | 2 | 3 | 4
): PrintModel {
  const allWeekRows = computeWeekRows(doc.schoolyear);
  const quarters: (1 | 2 | 3 | 4)[] =
    scope === 'allQuarters' ? [1, 2, 3, 4] : [currentQuarter];

  const sections = quarters.map((q) => buildSection(doc, q, allWeekRows));

  return {
    schoolName: doc.meta.schoolName ?? doc.meta.name,
    schoolInfo: doc.meta.schoolInfo,
    docName: doc.meta.name,
    schoolyearLabel: doc.schoolyear.label,
    sections,
    printedAt: new Date().toISOString().slice(0, 10)
  };
}
