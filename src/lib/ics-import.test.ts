import { describe, it, expect } from 'vitest';
import { parseIcs, type ParsedEvent } from './ics-import';

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
