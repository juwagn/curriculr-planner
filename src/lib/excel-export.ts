import { utils, write } from 'xlsx';
import type { PlannerDocument } from '@/types';
import { computeSchoolweeks } from './schoolweeks';

export function buildExcel(doc: PlannerDocument): ArrayBuffer {
  const wb = utils.book_new();

  const ferienRows: (string | number)[][] = [
    ['Label', 'Start', 'Ende']
  ];
  for (const h of doc.schoolyear.holidays) {
    ferienRows.push([h.label, h.start, h.end]);
  }
  const ferienSheet = utils.aoa_to_sheet(ferienRows);
  utils.book_append_sheet(wb, ferienSheet, 'Ferien');

  const weeks = computeSchoolweeks(doc.schoolyear);
  const planRows: (string | number)[][] = [
    ['Datum', 'Startzeit', 'Endzeit', 'Ganztägig', 'Titel', 'Kategorie', 'Standort', 'Gruppen', 'Bemerkung', 'SW', 'Anmerkung SW']
  ];

  for (const w of weeks) {
    const swEvents = doc.events
      .filter((e) => e.start >= w.startDate && e.start <= w.endDate)
      .sort((a, b) => a.start.localeCompare(b.start));
    const annotation = doc.annotations.find((a) => a.schoolweek === w.index);
    const swLabel = `SW ${w.index.toString().padStart(2, '0')} · ${w.startDate} – ${w.endDate}`;
    planRows.push([swLabel, '', '', '', '', '', '', '', '', '', annotation?.text ?? '']);
    for (const e of swEvents) {
      const cat = doc.categories.find((c) => c.id === e.categoryId);
      planRows.push([
        e.start,
        e.allDay ? '' : e.startTime ?? '',
        e.allDay ? '' : e.endTime ?? '',
        e.allDay ? 'ja' : 'nein',
        e.title,
        cat?.label ?? '',
        e.location ?? '',
        e.groups.join(', '),
        e.notes ?? '',
        w.index,
        ''
      ]);
    }
  }
  const planSheet = utils.aoa_to_sheet(planRows);
  utils.book_append_sheet(wb, planSheet, 'Terminplan');

  return write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
