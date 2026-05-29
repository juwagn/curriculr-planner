import { read, utils, SSF } from 'xlsx';
import type { Holiday, Schoolyear } from '@/types';
import type { ParsedEvent } from './ics-import';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function uid(): string {
  return crypto.randomUUID();
}

/**
 * Coerces a cell value to an ISO date string (YYYY-MM-DD).
 *
 * When a Konverter .xlsx is opened and re-saved in Excel, date cells that were
 * originally ISO strings get converted to real date cells.  The xlsx `read()`
 * call (with default `cellDates: false`) then returns those cells as OLE serial
 * numbers instead of strings.  With `cellDates: true` they would come back as
 * JS Date objects.  This helper handles all three forms so import is stable
 * regardless of how the file was last saved.
 *
 * For numeric serials we use `SSF.parse_date_code` from the xlsx package — it
 * is already loaded, is timezone-free, and correctly handles the Excel
 * 1900-leap-year quirk.  For Date objects we use UTC getters to avoid TZ
 * off-by-one issues.
 */
function toIsoDate(v: unknown): string {
  if (v instanceof Date) {
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, '0');
    const d = String(v.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof v === 'number') {
    const parts = SSF.parse_date_code(v);
    // SSF returns { y, m, d } with 1-indexed month
    const m = String(parts.m).padStart(2, '0');
    const d = String(parts.d).padStart(2, '0');
    return `${parts.y}-${m}-${d}`;
  }
  return String(v ?? '').trim();
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
      const start = toIsoDate(row[1]);
      const end = toIsoDate(row[2]);
      if (label && ISO_DATE.test(start) && ISO_DATE.test(end)) {
        holidays.push({ id: uid(), label, start, end });
      }
    }
    if (holidays.length > 0) result.schoolyear = { holidays };
  }

  const planRows = utils.sheet_to_json<(string | number)[]>(planSheet, { header: 1 });
  for (const row of planRows.slice(1)) {
    const datum = toIsoDate(row[0]);
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
