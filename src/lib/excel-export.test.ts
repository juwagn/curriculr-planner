import { describe, it, expect } from 'vitest';
import { read, utils } from 'xlsx';
import { buildExcel } from './excel-export';
import { createEmptyDoc } from '@/stores/planner';

describe('buildExcel', () => {
  it('produces workbook with Ferien + Terminplan sheets', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.schoolyear.holidays = [
      { id: 'h1', label: 'Herbstferien', start: '2026-10-19', end: '2026-10-30', type: 'ferien' }
    ];
    doc.schoolyear.quarterBoundaries = ['2026-10-30', '2027-01-29', '2027-04-09'];
    const buf = buildExcel(doc);
    const wb = read(buf, { type: 'array' });
    expect(wb.SheetNames).toContain('Ferien');
    expect(wb.SheetNames).toContain('Terminplan');
  });

  it('Ferien sheet contains holiday rows', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.schoolyear.holidays = [
      { id: 'h1', label: 'Herbstferien', start: '2026-10-19', end: '2026-10-30', type: 'ferien' }
    ];
    doc.schoolyear.quarterBoundaries = ['2026-10-30', '2027-01-29', '2027-04-09'];
    const buf = buildExcel(doc);
    const wb = read(buf, { type: 'array' });
    const rows = utils.sheet_to_json(wb.Sheets['Ferien'], { header: 1 }) as unknown[][];
    expect(rows.some((r) => r.includes('Herbstferien'))).toBe(true);
  });
});
