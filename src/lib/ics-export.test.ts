import { describe, it, expect } from 'vitest';
import { buildIcs } from './ics-export';
import { createEmptyDoc } from '@/stores/planner';

describe('buildIcs', () => {
  it('produces valid VCALENDAR header + footer', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    const ics = buildIcs(doc);
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics).toMatch(/PRODID:-\/\/Curriculr Planner\/\/DE/);
    expect(ics).toMatch(/END:VCALENDAR\s*$/);
  });

  it('outputs all-day event as DATE value', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e1',
      title: 'Wandertag',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: []
    });
    const ics = buildIcs(doc);
    expect(ics).toMatch(/DTSTART;VALUE=DATE:20260915/);
    expect(ics).toMatch(/SUMMARY:Wandertag/);
  });

  it('outputs timed event with HHMMSS', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e2',
      title: 'FK',
      start: '2026-09-15',
      end: '2026-09-15',
      startTime: '14:00',
      endTime: '16:00',
      allDay: false,
      categoryId: doc.categories[0].id,
      groups: []
    });
    const ics = buildIcs(doc);
    expect(ics).toMatch(/DTSTART:20260915T140000/);
    expect(ics).toMatch(/DTEND:20260915T160000/);
  });

  it('includes LOCATION when provided', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e3',
      title: 'X',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: [],
      location: 'Aula'
    });
    expect(buildIcs(doc)).toMatch(/LOCATION:Aula/);
  });

  it('escapes commas + newlines in DESCRIPTION', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e4',
      title: 'X',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: ['A', 'B'],
      notes: 'Line 1\nLine 2, with comma'
    });
    const ics = buildIcs(doc);
    expect(ics).toMatch(/DESCRIPTION:Line 1\\nLine 2\\, with comma\\nGruppen: A\\, B/);
  });

  it('strips CR characters and escapes CRLF as a single \\n', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events.push({
      id: 'e5',
      title: 'a\r\nb',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: []
    });
    const ics = buildIcs(doc);
    const summaryLine = ics.split('\r\n').find((l) => l.startsWith('SUMMARY:'));
    expect(summaryLine).toBe('SUMMARY:a\\nb');
    expect(summaryLine).not.toContain('\r');
  });

  it('folds long lines to max 75 octets without splitting UTF-8 sequences', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    const title = 'ü'.repeat(80); // 160 bytes in UTF-8
    doc.events.push({
      id: 'e6',
      title,
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: doc.categories[0].id,
      groups: []
    });
    const ics = buildIcs(doc);
    const encoder = new TextEncoder();
    for (const physicalLine of ics.split('\r\n')) {
      expect(encoder.encode(physicalLine).length).toBeLessThanOrEqual(75);
    }
    // Unfolding (removing CRLF + leading space) restores the original line.
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain(`SUMMARY:${title}`);
  });
});
