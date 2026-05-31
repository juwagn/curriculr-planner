import { addDays, format, parseISO } from 'date-fns';
import { read, utils, SSF } from 'xlsx';
import type { Holiday, Schoolyear } from '@/types';
import type { ParsedEvent } from './ics-import';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Mon–Fri → day offset from the school week's Monday (Konverter convention). */
const WEEKDAY_OFFSET: Record<string, number> = { Mo: 0, Di: 1, Mi: 2, Do: 3, Fr: 4 };

function uid(): string {
  return crypto.randomUUID();
}

function addDaysIso(iso: string, days: number): string {
  return format(addDays(parseISO(iso), days), 'yyyy-MM-dd');
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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Coerces a cell to an HH:MM time string, mirroring toIsoDate for the date
 * columns. Excel-resaved files may store times as fractional day serials
 * (0.5833 = 14:00) or Date objects rather than the "HH:MM" strings the
 * Konverter export writes.
 */
function toTime(v: unknown): string | undefined {
  if (v instanceof Date) {
    return `${pad2(v.getUTCHours())}:${pad2(v.getUTCMinutes())}`;
  }
  if (typeof v === 'number') {
    const p = SSF.parse_date_code(v);
    if (!p) return undefined;
    return `${pad2(p.H)}:${pad2(p.M)}`;
  }
  const s = String(v ?? '').trim();
  return s || undefined;
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
        holidays.push({ id: uid(), label, start, end, type: 'ferien' });
      }
    }
    if (holidays.length > 0) result.schoolyear = { holidays };
  }

  const planRows = utils.sheet_to_json<(string | number)[]>(planSheet, { header: 1 });
  const isSwFormat = String(planRows[0]?.[0] ?? '').trim() === 'SW-Key';
  result.parsed = isSwFormat ? parseSwFormat(planRows) : parseExportFormat(planRows);

  return result;
}

/**
 * Parses this tool's own Excel export, where column A holds the per-event ISO
 * date. Columns: Datum | Startzeit | Endzeit | Ganztägig | Titel | Kategorie |
 * Standort | Gruppen | Bemerkung | SW | Anmerkung SW.
 */
function parseExportFormat(planRows: (string | number)[][]): ParsedEvent[] {
  const parsed: ParsedEvent[] = [];
  for (const row of planRows.slice(1)) {
    const datum = toIsoDate(row[0]);
    if (!ISO_DATE.test(datum)) continue; // skip SW-divider + blank rows
    const allDay = String(row[3] ?? '').trim().toLowerCase() === 'ja';
    const startTime = toTime(row[1]);
    const endTime = toTime(row[2]);
    const location = String(row[6] ?? '').trim() || undefined;
    const description = String(row[8] ?? '').trim() || undefined;
    const category = String(row[5] ?? '').trim();
    parsed.push({
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
  return parsed;
}

/**
 * Parses the real Konverter "Schulwochen-Vorlage" (header row starts with
 * "SW-Key"). Each row carries the school week's Monday in column B (Montag-ISO)
 * and a weekday abbreviation in column E; the event date is derived from the two.
 * Columns: SW-Key | Montag-ISO | SW | Schulwoche | Wochentag | Uhrzeit | Endzeit
 * | Titel | Kategorie | Ganztaegig | Anmerkung.
 *
 * SW-header rows (no title) only set the carry-forward Monday for following data
 * rows whose Montag-ISO is blank. An empty/"Ganze Woche" weekday yields a Mon–Fri
 * whole-week event.
 */
function parseSwFormat(planRows: (string | number)[][]): ParsedEvent[] {
  const parsed: ParsedEvent[] = [];
  let currentMonday = '';
  for (const row of planRows.slice(1)) {
    const title = String(row[7] ?? '').trim();
    const mondayCell = toIsoDate(row[1]);
    const rowMonday = ISO_DATE.test(mondayCell) ? mondayCell : '';

    // Header/divider rows have no title; they just refresh the carry-forward Monday.
    if (!title) {
      if (rowMonday) currentMonday = rowMonday;
      continue;
    }

    const monday = rowMonday || currentMonday;
    if (!monday) continue; // no anchor date → cannot place the event
    if (rowMonday) currentMonday = rowMonday;

    const weekday = String(row[4] ?? '').trim();
    const startTime = toTime(row[5]);
    const endTime = toTime(row[6]);
    const category = String(row[8] ?? '').trim();
    const description = String(row[10] ?? '').trim() || undefined;
    const allDay =
      String(row[9] ?? '').trim().toLowerCase() === 'ja' || (!startTime && !endTime);

    const offset = WEEKDAY_OFFSET[weekday];
    const isWholeWeek = !weekday || weekday === 'Ganze Woche';
    const start = offset !== undefined ? addDaysIso(monday, offset) : monday;
    const end = isWholeWeek ? addDaysIso(monday, 4) : start;

    parsed.push({
      uid: uid(),
      summary: title,
      start,
      end,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      location: undefined,
      description,
      categories: category ? [category] : []
    });
  }
  return parsed;
}
