import { describe, it, expect } from 'vitest';
import { utils, write } from 'xlsx';
import { parseKonverterXlsx } from './excel-import';

function buildWorkbook(ferien: (string | number)[][], plan: (string | number)[][]): ArrayBuffer {
  const wb = utils.book_new();
  utils.book_append_sheet(wb, utils.aoa_to_sheet(ferien), 'Ferien');
  utils.book_append_sheet(wb, utils.aoa_to_sheet(plan), 'Terminplan');
  return write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

const PLAN_HEADER = ['Datum', 'Startzeit', 'Endzeit', 'Ganztägig', 'Titel', 'Kategorie', 'Standort', 'Gruppen', 'Bemerkung', 'SW', 'Anmerkung SW'];

describe('parseKonverterXlsx', () => {
  it('reads holidays from the Ferien sheet', () => {
    const buf = buildWorkbook(
      [['Label', 'Start', 'Ende'], ['Herbst', '2026-10-19', '2026-10-30']],
      [PLAN_HEADER]
    );
    const { schoolyear } = parseKonverterXlsx(buf);
    expect(schoolyear?.holidays).toEqual([
      { id: expect.any(String), label: 'Herbst', start: '2026-10-19', end: '2026-10-30' }
    ]);
  });

  it('parses an all-day event row, skipping SW divider rows', () => {
    const buf = buildWorkbook(
      [['Label', 'Start', 'Ende']],
      [
        PLAN_HEADER,
        ['SW 00 · 2026-08-24 – 2026-08-28', '', '', '', '', '', '', '', '', '', ''],
        ['2026-09-15', '', '', 'ja', 'Wandertag', 'Wandertag', 'Wald', 'Klassen 5-7', 'mitbringen', 0, '']
      ]
    );
    const { parsed } = parseKonverterXlsx(buf);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      summary: 'Wandertag',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      location: 'Wald',
      categories: ['Wandertag']
    });
  });

  it('parses a timed event row', () => {
    const buf = buildWorkbook(
      [['Label', 'Start', 'Ende']],
      [PLAN_HEADER, ['2026-09-16', '14:00', '16:00', 'nein', 'FK', 'Konferenz', '', 'Kollegium', '', 1, '']]
    );
    const { parsed } = parseKonverterXlsx(buf);
    expect(parsed[0]).toMatchObject({ start: '2026-09-16', allDay: false, startTime: '14:00', endTime: '16:00' });
  });

  it('returns empty events when only headers present', () => {
    const buf = buildWorkbook([['Label', 'Start', 'Ende']], [PLAN_HEADER]);
    const { parsed } = parseKonverterXlsx(buf);
    expect(parsed).toEqual([]);
  });

  it('throws a clear error when the Terminplan sheet is missing', () => {
    const wb = utils.book_new();
    utils.book_append_sheet(wb, utils.aoa_to_sheet([['x']]), 'Sonstiges');
    const buf = write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    expect(() => parseKonverterXlsx(buf)).toThrow(/Terminplan/);
  });

  it('parses Excel-native date cells (OLE serial / Date objects) for Ferien and events', () => {
    // Simulate what xlsx returns when the file was re-saved in Excel:
    // date cells come back as numeric OLE serials (cellDates: false, the default).
    // OLE serial = days since 1899-12-30 (Excel epoch, with 1900 leap-year quirk).
    // 2026-10-19 → serial 46314, 2026-10-30 → serial 46325
    // 2026-09-15 → serial 46289
    const oleFor = (y: number, mo: number, d: number): number => {
      const epoch = new Date(1899, 11, 30); // 1899-12-30 local
      return Math.round((new Date(y, mo - 1, d).getTime() - epoch.getTime()) / 86400000);
    };

    const ferienSerial = [oleFor(2026, 10, 19), oleFor(2026, 10, 30)]; // Herbstferien
    const eventSerial  = oleFor(2026, 9, 15);                           // Wandertag

    // Build the workbook with raw numeric values in the date columns.
    // aoa_to_sheet treats numbers as-is; xlsx read() returns them the same way.
    const wb = utils.book_new();
    utils.book_append_sheet(
      wb,
      utils.aoa_to_sheet([
        ['Label', 'Start', 'Ende'],
        ['Herbstferien', ferienSerial[0], ferienSerial[1]],
      ]),
      'Ferien'
    );
    utils.book_append_sheet(
      wb,
      utils.aoa_to_sheet([
        PLAN_HEADER,
        [eventSerial, '', '', 'ja', 'Wandertag', 'Wandertag', '', '', '', 0, ''],
      ]),
      'Terminplan'
    );
    const buf = write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const { schoolyear, parsed } = parseKonverterXlsx(buf);

    // Ferien: OLE serial roundtrips to correct calendar day
    expect(schoolyear?.holidays).toEqual([
      { id: expect.any(String), label: 'Herbstferien', start: '2026-10-19', end: '2026-10-30' },
    ]);

    // Event: OLE serial roundtrips to correct calendar day
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ start: '2026-09-15', end: '2026-09-15', allDay: true });
  });
});
