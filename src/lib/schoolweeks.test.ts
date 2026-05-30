import { describe, it, expect } from 'vitest';
import { computeSchoolweeks, isHoliday, isWeekend, isWithinSchoolyear } from './schoolweeks';
import type { Schoolyear } from '@/types';

const sy: Schoolyear = {
  id: 'sy',
  label: '2026/27',
  firstSchoolDay: '2026-08-24',
  firstTeachingDay: '2026-08-31',
  lastSchoolDay: '2027-07-16',
  holidays: [
    { id: 'h1', label: 'Herbst', start: '2026-10-19', end: '2026-10-30', type: 'ferien' },
    { id: 'h2', label: 'Weihnachten', start: '2026-12-23', end: '2027-01-07', type: 'ferien' }
  ],
  quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-09'],
  createdAt: '',
  updatedAt: ''
};

describe('isWeekend', () => {
  it('detects Saturday', () => expect(isWeekend('2026-08-29')).toBe(true));
  it('detects Sunday', () => expect(isWeekend('2026-08-30')).toBe(true));
  it('rejects Monday', () => expect(isWeekend('2026-08-31')).toBe(false));
});

describe('isHoliday', () => {
  it('detects date inside Herbst', () =>
    expect(isHoliday('2026-10-25', sy.holidays)).toEqual({ id: 'h1', label: 'Herbst', start: '2026-10-19', end: '2026-10-30', type: 'ferien' }));
  it('returns null for non-holiday date', () =>
    expect(isHoliday('2026-09-15', sy.holidays)).toBeNull());
  it('includes start + end inclusively', () => {
    expect(isHoliday('2026-10-19', sy.holidays)).not.toBeNull();
    expect(isHoliday('2026-10-30', sy.holidays)).not.toBeNull();
  });
});

describe('computeSchoolweeks', () => {
  it('returns SW 00 starting at firstSchoolDay (Monday)', () => {
    const weeks = computeSchoolweeks(sy);
    expect(weeks[0]).toEqual({
      index: 0,
      startDate: '2026-08-24',
      endDate: '2026-08-28'
    });
  });

  it('skips weeks fully in holidays', () => {
    const weeks = computeSchoolweeks(sy);
    const dates = weeks.map((w) => w.startDate);
    expect(dates).not.toContain('2026-10-19');
  });

  it('emits sequential indices', () => {
    const weeks = computeSchoolweeks(sy);
    weeks.forEach((w, i) => expect(w.index).toBe(i));
  });

  it('stops at lastSchoolDay', () => {
    const weeks = computeSchoolweeks(sy);
    const last = weeks[weeks.length - 1];
    expect(last.startDate <= '2027-07-16').toBe(true);
  });

  it('produces 40+ weeks for full schoolyear', () => {
    const weeks = computeSchoolweeks(sy);
    expect(weeks.length).toBeGreaterThanOrEqual(38);
    expect(weeks.length).toBeLessThanOrEqual(45);
  });
});

const sy2: Schoolyear = {
  id: 's', label: '25/26',
  firstSchoolDay: '2025-08-11', firstTeachingDay: '2025-08-11', lastSchoolDay: '2026-06-26',
  holidays: [], quarterBoundaries: ['2025-10-31', '2026-01-31', '2026-04-15'],
  createdAt: '', updatedAt: ''
};

describe('isWithinSchoolyear', () => {
  it('true on boundaries', () => {
    expect(isWithinSchoolyear('2025-08-11', sy2)).toBe(true);
    expect(isWithinSchoolyear('2026-06-26', sy2)).toBe(true);
  });
  it('false outside', () => {
    expect(isWithinSchoolyear('2025-08-10', sy2)).toBe(false);
    expect(isWithinSchoolyear('2026-06-27', sy2)).toBe(false);
  });
});
