import { describe, it, expect } from 'vitest';
import { utils, write } from 'xlsx';
import { parseKonverterXlsx } from './excel-import';

type Cell = string | number | null;

function buildWorkbook(ferien: Cell[][], plan: Cell[][]): ArrayBuffer {
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
      { id: expect.any(String), label: 'Herbst', start: '2026-10-19', end: '2026-10-30', type: 'ferien' }
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

  it('parses time cells stored as numeric serials (Excel-resaved)', () => {
    const buf = buildWorkbook(
      [['Label', 'Start', 'Ende']],
      [PLAN_HEADER, ['2026-09-16', 14 / 24, 16 / 24, 'nein', 'FK', 'Konferenz', '', 'Kollegium', '', 1, '']]
    );
    const { parsed } = parseKonverterXlsx(buf);
    expect(parsed[0]).toMatchObject({ allDay: false, startTime: '14:00', endTime: '16:00' });
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

  describe('SW-Key format (real Konverter template)', () => {
    const SW_HEADER = [
      'SW-Key', 'Montag-ISO', 'SW', 'Schulwoche', 'Wochentag',
      'Uhrzeit', 'Endzeit', 'Titel / Veranstaltung', 'Kategorie', 'Ganztaegig', 'Anmerkung'
    ];

    it('derives the event date from Montag-ISO + Wochentag offset', () => {
      const buf = buildWorkbook(
        [['Label', 'Start', 'Ende']],
        [
          SW_HEADER,
          ['SW 00', '2026-08-24', 'SW 00', '24.08. - 28.08.2026', 'Mi', '09:00', '', 'Schulleitung', '', 'Nein', ''],
          [null, '2026-08-24', 'SW 00', '', 'Do', '11:00', '', 'Übergabe', '', 'Nein', '']
        ]
      );
      const { parsed } = parseKonverterXlsx(buf);
      expect(parsed).toHaveLength(2);
      // Mi = Monday + 2 days
      expect(parsed[0]).toMatchObject({ summary: 'Schulleitung', start: '2026-08-26', allDay: false, startTime: '09:00' });
      // Do = Monday + 3 days
      expect(parsed[1]).toMatchObject({ summary: 'Übergabe', start: '2026-08-27' });
    });

    it('marks rows with Ganztaegig=Ja as all-day and reads the category', () => {
      const buf = buildWorkbook(
        [['Label', 'Start', 'Ende']],
        [
          SW_HEADER,
          [null, '2026-08-24', '', '', 'Fr', '', '', 'Sommerfest', 'Jahrgang 5/6', 'Ja', 'Turnhalle']
        ]
      );
      const { parsed } = parseKonverterXlsx(buf);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        summary: 'Sommerfest',
        start: '2026-08-28', // Fr = Monday + 4
        end: '2026-08-28',
        allDay: true,
        categories: ['Jahrgang 5/6'],
        description: 'Turnhalle'
      });
    });

    it('carries forward the Monday from SW-header rows when a data row lacks Montag-ISO', () => {
      const buf = buildWorkbook(
        [['Label', 'Start', 'Ende']],
        [
          SW_HEADER,
          ['SW 01', '2026-08-31', 'SW 01', '', '', '', '', '', '', '', ''], // header divider, no title
          [null, '', '', '', 'Mo', '', '', 'Erster Schultag', '', 'Ja', '']
        ]
      );
      const { parsed } = parseKonverterXlsx(buf);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({ summary: 'Erster Schultag', start: '2026-08-31', allDay: true });
    });

    it('treats an empty Wochentag as a whole-week event (Mon–Fri)', () => {
      const buf = buildWorkbook(
        [['Label', 'Start', 'Ende']],
        [
          SW_HEADER,
          [null, '2026-08-24', '', '', '', '', '', 'Projektwoche', '', 'Ja', '']
        ]
      );
      const { parsed } = parseKonverterXlsx(buf);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({ summary: 'Projektwoche', start: '2026-08-24', end: '2026-08-28', allDay: true });
    });

    it('reads Montag-ISO stored as a numeric Excel serial', () => {
      // 2026-08-24 → OLE serial 46258
      const buf = buildWorkbook(
        [['Label', 'Start', 'Ende']],
        [
          SW_HEADER,
          [null, 46258, '', '', 'Mi', '09:00', '', 'Schulleitung', '', 'Nein', '']
        ]
      );
      const { parsed } = parseKonverterXlsx(buf);
      expect(parsed[0]).toMatchObject({ summary: 'Schulleitung', start: '2026-08-26' });
    });
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
      { id: expect.any(String), label: 'Herbstferien', start: '2026-10-19', end: '2026-10-30', type: 'ferien' },
    ]);

    // Event: OLE serial roundtrips to correct calendar day
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ start: '2026-09-15', end: '2026-09-15', allDay: true });
  });
});
