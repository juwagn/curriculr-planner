import { describe, it, expect } from 'vitest';
import { parseIcs, mapToEvents, shiftToSchoolyear, type ParsedEvent } from './ics-import';
import { PlanEventSchema } from './schemas';
import type { Category, Schoolyear } from '@/types';

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:1@x',
  'SUMMARY:Gesamtkonferenz',
  'DTSTART;VALUE=DATE:20250901',
  'DTEND;VALUE=DATE:20250902',
  'DESCRIPTION:Wichtig\\nGruppen: Kollegium',
  'CATEGORIES:Konferenz',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:2@x',
  'SUMMARY:Elternabend lange Zeile die ge',
  ' faltet wurde',
  'DTSTART:20250905T180000',
  'DTEND:20250905T200000',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');

describe('parseIcs', () => {
  it('parses an all-day event with exclusive DTEND -> inclusive', () => {
    const evs = parseIcs(ICS);
    const e = evs.find((x) => x.uid === '1@x') as ParsedEvent;
    expect(e.allDay).toBe(true);
    expect(e.start).toBe('2025-09-01');
    expect(e.end).toBe('2025-09-01');
    expect(e.categories).toContain('Konferenz');
    expect(e.description).toContain('Gruppen: Kollegium');
  });

  it('parses a timed event and unfolds folded lines', () => {
    const evs = parseIcs(ICS);
    const e = evs.find((x) => x.uid === '2@x') as ParsedEvent;
    expect(e.allDay).toBe(false);
    expect(e.start).toBe('2025-09-05');
    expect(e.startTime).toBe('18:00');
    expect(e.endTime).toBe('20:00');
    expect(e.summary).toBe('Elternabend lange Zeile die gefaltet wurde');
  });
});

const cats: Category[] = [
  { id: 'cK', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: ['konferenz', 'fk'] },
  { id: 'cE', label: 'Elternabend', color: '#0E9F6E', slug: 'elternabend', keywords: ['eltern'] },
  { id: 'cS', label: 'Sondertag', color: '#FFC857', slug: 'sondertag', keywords: [] }
];

describe('mapToEvents', () => {
  it('matches category by CATEGORIES label, then keyword, then fallback', () => {
    const parsed = [
      { uid: '1', summary: 'X', start: '2025-09-01', end: '2025-09-01', allDay: true, categories: ['Konferenz'] },
      { uid: '2', summary: 'Großer Elternabend', start: '2025-09-02', end: '2025-09-02', allDay: true, categories: [] },
      { uid: '3', summary: 'Irgendwas', start: '2025-09-03', end: '2025-09-03', allDay: true, categories: [] }
    ];
    const evs = mapToEvents(parsed, cats, 'cS');
    expect(evs[0].categoryId).toBe('cK');
    expect(evs[1].categoryId).toBe('cE');
    expect(evs[2].categoryId).toBe('cS');
  });

  it('extracts groups from a "Gruppen:" line in the description', () => {
    const parsed = [{ uid: '1', summary: 'X', start: '2025-09-01', end: '2025-09-01', allDay: true, categories: [], description: 'Info\nGruppen: Kollegium, Eltern' }];
    const evs = mapToEvents(parsed, cats, 'cS');
    expect(evs[0].groups).toEqual(['Kollegium', 'Eltern']);
  });

  it('produces only schema-valid events (empty title + timed-without-endTime)', () => {
    const parsed = [
      { uid: '1', summary: '', start: '2025-09-01', end: '2025-09-01', allDay: true, categories: [] },
      { uid: '2', summary: 'Timed ohne Ende', start: '2025-09-02', end: '2025-09-02', allDay: false, startTime: '09:00', endTime: undefined, categories: [] }
    ];
    const evs = mapToEvents(parsed, cats, 'cS');
    expect(evs[0].title).toBe('(ohne Titel)');
    expect(evs[1].allDay).toBe(true);
    expect(evs[1].startTime).toBeUndefined();
    expect(evs[1].endTime).toBeUndefined();
    for (const ev of evs) {
      expect(PlanEventSchema.safeParse(ev).success).toBe(true);
    }
  });
});

describe('shiftToSchoolyear', () => {
  const target: Schoolyear = {
    id: 's', label: '26/27', firstSchoolDay: '2026-08-10', firstTeachingDay: '2026-08-10',
    lastSchoolDay: '2027-06-25', holidays: [], quarterBoundaries: ['2026-10-31', '2027-01-31', '2027-04-15'],
    createdAt: '', updatedAt: ''
  };
  it('shifts by whole weeks and preserves weekday', () => {
    const evs = mapToEvents([{ uid: '1', summary: 'X', start: '2025-09-01', end: '2025-09-01', allDay: true, categories: [] }], cats, 'cS');
    const shifted = shiftToSchoolyear(evs, target);
    const day = new Date(shifted[0].start + 'T00:00:00').getDay();
    expect(day).toBe(1); // Monday
    expect(shifted[0].start >= target.firstSchoolDay).toBe(true);
  });

  it('never lands the earliest event before firstSchoolDay when weekdays differ', () => {
    // 2025-09-03 is a Wednesday; target firstSchoolDay 2026-08-10 is a Monday.
    const evs = mapToEvents([{ uid: '1', summary: 'X', start: '2025-09-03', end: '2025-09-03', allDay: true, categories: [] }], cats, 'cS');
    const shifted = shiftToSchoolyear(evs, target);
    expect(shifted[0].start >= target.firstSchoolDay).toBe(true);
    expect(new Date(shifted[0].start + 'T00:00:00').getDay()).toBe(3); // still Wednesday
  });
});
