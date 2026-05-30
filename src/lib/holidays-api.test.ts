import { describe, it, expect, vi, afterEach } from 'vitest';
import { mapHoliday, mergeFetchedHolidays, fetchHolidays, GERMAN_STATES } from './holidays-api';
import type { Holiday } from '@/types';

const schoolRaw = {
  id: 'x',
  startDate: '2026-10-12',
  endDate: '2026-10-24',
  type: 'School',
  name: [{ language: 'DE', text: 'Herbstferien' }]
};
const publicRaw = {
  id: 'y',
  startDate: '2026-10-03',
  endDate: '2026-10-03',
  type: 'Public',
  name: [{ language: 'EN', text: 'German Unity Day' }, { language: 'DE', text: 'Tag der Deutschen Einheit' }]
};

describe('mapHoliday', () => {
  it('maps a school-holiday range to a typed ferien Holiday', () => {
    const h = mapHoliday(schoolRaw, 'ferien');
    expect(h.label).toBe('Herbstferien');
    expect(h.start).toBe('2026-10-12');
    expect(h.end).toBe('2026-10-24');
    expect(h.type).toBe('ferien');
    expect(h.source).toBe('api');
    expect(h.id.length).toBeGreaterThan(0);
  });

  it('prefers the German name for feiertage', () => {
    const h = mapHoliday(publicRaw, 'feiertag');
    expect(h.label).toBe('Tag der Deutschen Einheit');
    expect(h.type).toBe('feiertag');
  });
});

describe('mergeFetchedHolidays', () => {
  it('keeps manual entries and replaces previous api entries', () => {
    const existing: Holiday[] = [
      { id: 'm1', label: 'Bewegliche Ferien', start: '2027-02-15', end: '2027-02-16', type: 'ferien' },
      { id: 'a1', label: 'Alt-API', start: '2026-10-12', end: '2026-10-24', type: 'ferien', source: 'api' }
    ];
    const fetched: Holiday[] = [
      { id: 'n1', label: 'Herbstferien', start: '2026-10-12', end: '2026-10-24', type: 'ferien', source: 'api' }
    ];
    const merged = mergeFetchedHolidays(existing, fetched);
    expect(merged).toHaveLength(2);
    expect(merged.find((h) => h.id === 'm1')).toBeTruthy();
    expect(merged.find((h) => h.id === 'a1')).toBeUndefined();
    expect(merged.find((h) => h.id === 'n1')).toBeTruthy();
  });

  it('drops empty manual placeholder rows (no start and no end)', () => {
    const existing: Holiday[] = [
      { id: 'p1', label: 'Herbstferien', start: '', end: '', type: 'ferien' },
      { id: 'p2', label: 'Sommerferien', start: '', end: '', type: 'ferien' },
      { id: 'm1', label: 'Bewegliche Ferien', start: '2027-02-15', end: '2027-02-16', type: 'ferien' }
    ];
    const fetched: Holiday[] = [
      { id: 'n1', label: 'Herbstferien', start: '2026-10-12', end: '2026-10-24', type: 'ferien', source: 'api' }
    ];
    const merged = mergeFetchedHolidays(existing, fetched);
    expect(merged.find((h) => h.id === 'p1')).toBeUndefined();
    expect(merged.find((h) => h.id === 'p2')).toBeUndefined();
    expect(merged.find((h) => h.id === 'm1')).toBeTruthy();
    expect(merged.find((h) => h.id === 'n1')).toBeTruthy();
    expect(merged).toHaveLength(2);
  });
});

describe('GERMAN_STATES', () => {
  it('lists all 16 Bundesländer with DE- codes', () => {
    expect(GERMAN_STATES).toHaveLength(16);
    expect(GERMAN_STATES.every((s) => s.code.startsWith('DE-'))).toBe(true);
  });
});

describe('fetchHolidays', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('queries both endpoints and combines ferien + feiertage', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('/SchoolHolidays') ? [schoolRaw] : [publicRaw])
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchHolidays('DE-NW', '2026-08-10', '2027-07-15');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.filter((h) => h.type === 'ferien')).toHaveLength(1);
    expect(result.filter((h) => h.type === 'feiertag')).toHaveLength(1);
    const calledUrls = fetchMock.mock.calls.map((c) => c[0] as string).join(' ');
    expect(calledUrls).toContain('subdivisionCode=DE-NW');
    expect(calledUrls).toContain('validFrom=2026-08-10');
    expect(calledUrls).toContain('validTo=2027-07-15');
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => [] })));
    await expect(fetchHolidays('DE-NW', '2026-08-10', '2027-07-15')).rejects.toThrow();
  });
});
