import { read, utils } from 'xlsx';
import type { Holiday, Schoolyear } from '@/types';
import type { ParsedEvent } from './ics-import';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function uid(): string {
  return crypto.randomUUID();
}

export interface KonverterParseResult {
  schoolyear?: Partial<Schoolyear>;
  parsed: ParsedEvent[];
}

export function parseKonverterXlsx(buffer: ArrayBuffer): KonverterParseResult {
  const wb = read(buffer, { type: 'array' });

  const planSheet = wb.Sheets['Terminplan'];
  if (!planSheet) throw new Error('Excel-Datei enthält kein "Terminplan"-Blatt.');

  const result: KonverterParseResult = { parsed: [] };

  const ferienSheet = wb.Sheets['Ferien'];
  if (ferienSheet) {
    const ferienRows = utils.sheet_to_json<(string | number)[]>(ferienSheet, { header: 1 });
    const holidays: Holiday[] = [];
    for (const row of ferienRows.slice(1)) {
      const label = String(row[0] ?? '').trim();
      const start = String(row[1] ?? '').trim();
      const end = String(row[2] ?? '').trim();
      if (label && ISO_DATE.test(start) && ISO_DATE.test(end)) {
        holidays.push({ id: uid(), label, start, end });
      }
    }
    if (holidays.length > 0) result.schoolyear = { holidays };
  }

  const planRows = utils.sheet_to_json<(string | number)[]>(planSheet, { header: 1 });
  for (const row of planRows.slice(1)) {
    const datum = String(row[0] ?? '').trim();
    if (!ISO_DATE.test(datum)) continue; // skip SW-divider + blank rows
    const allDay = String(row[3] ?? '').trim().toLowerCase() === 'ja';
    const startTime = String(row[1] ?? '').trim() || undefined;
    const endTime = String(row[2] ?? '').trim() || undefined;
    const location = String(row[6] ?? '').trim() || undefined;
    const description = String(row[8] ?? '').trim() || undefined;
    const category = String(row[5] ?? '').trim();
    result.parsed.push({
      uid: uid(),
      summary: String(row[4] ?? '').trim(),
      start: datum,
      end: datum,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      location,
      description,
      categories: category ? [category] : []
    });
  }

  return result;
}
