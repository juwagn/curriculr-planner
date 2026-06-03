import { describe, it, expect } from 'vitest';
import { generatePrintHtml } from './print-window';
import type { PrintModel } from './print-model';

const MODEL: PrintModel = {
  schoolName: 'Testschule',
  schoolInfo: 'Musterstr. 1',
  docName: 'Testplan 2025/26',
  schoolyearLabel: '2025/26',
  sections: [
    {
      quarterIndex: 1,
      quarterLabel: '1. Quartal · Sep 2025 – Okt 2025',
      rows: [
        {
          type: 'week',
          swIndex: '00',
          dateRange: '01.09.–05.09.',
          cells: [
            { events: [{ title: 'Einschulung', time: '09:00' }] },
            { events: [] },
            { events: [] },
            { events: [] },
            { events: [] }
          ],
          annotation: 'Begrüßungswoche'
        },
        {
          type: 'holiday',
          label: 'Herbstferien',
          dateRange: '06.10.–17.10.'
        }
      ]
    }
  ],
  printedAt: '2026-06-03'
};

describe('generatePrintHtml', () => {
  it('contains school name', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('Testschule');
  });

  it('contains event title', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('Einschulung');
  });

  it('contains timed event time prefix', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('09:00');
  });

  it('sets A4 landscape in @page when orientation is landscape', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('size: A4 landscape');
  });

  it('sets A4 portrait in @page when orientation is portrait', () => {
    const html = generatePrintHtml(MODEL, 'portrait');
    expect(html).toContain('size: A4 portrait');
  });

  it('holiday row has colspan="8"', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('colspan="8"');
  });

  it('empty cell contains writeline spans', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('class="writeline"');
  });

  it('annotation text appears in output', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    expect(html).toContain('Begrüßungswoche');
  });

  it('event div has no inline color or background style', () => {
    const html = generatePrintHtml(MODEL, 'landscape');
    const match = html.match(/<div class="event"[^>]*>/);
    expect(match).not.toBeNull();
    expect(match![0]).not.toContain('color:');
    expect(match![0]).not.toContain('background');
  });

  it('escapes HTML special characters in school name', () => {
    const model = { ...MODEL, schoolName: '<b>Bad &amp; School</b>' };
    const html = generatePrintHtml(model, 'landscape');
    expect(html).not.toContain('<b>Bad &amp; School</b>');
  });
});
