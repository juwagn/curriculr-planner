import type { PlannerDocument, PlanEvent } from '@/types';

function uid(): string {
  return crypto.randomUUID();
}

const CATEGORIES = [
  { id: 'demo-konferenz', label: 'Konferenz', color: '#0058A0', slug: 'konferenz', keywords: ['konferenz', 'fk'] },
  { id: 'demo-elternabend', label: 'Elternabend', color: '#0E9F6E', slug: 'elternabend', keywords: ['eltern'] },
  { id: 'demo-wandertag', label: 'Wandertag', color: '#FFC857', slug: 'wandertag', keywords: ['wandertag', 'ausflug'] },
  { id: 'demo-pruefung', label: 'Prüfung', color: '#E02424', slug: 'pruefung', keywords: ['prüfung', 'klausur', 'abitur'] },
  { id: 'demo-sonder', label: 'Sonderveranstaltung', color: '#7C3AED', slug: 'sonder', keywords: ['fest', 'feier'] },
  { id: 'demo-schliesstag', label: 'Schließtag', color: '#6B7280', slug: 'schliesstag', keywords: ['schließ', 'frei'] },
  { id: 'demo-sondertag', label: 'Sondertag', color: '#FFC857', slug: 'sondertag', keywords: [] }
];

function allDay(title: string, start: string, end: string, categoryId: string, groups: string[] = [], notes?: string): PlanEvent {
  return { id: uid(), title, start, end, allDay: true, categoryId, groups, notes };
}

function timed(title: string, date: string, startTime: string, endTime: string, categoryId: string, groups: string[] = []): PlanEvent {
  return { id: uid(), title, start: date, end: date, allDay: false, startTime, endTime, categoryId, groups };
}

export function createDemoDoc(): PlannerDocument {
  const now = new Date().toISOString();
  const events: PlanEvent[] = [
    timed('Erste Gesamtkonferenz', '2026-08-13', '14:00', '16:00', 'demo-konferenz', ['Kollegium']),
    allDay('Wandertag Klassen 5-7', '2026-09-17', '2026-09-17', 'demo-wandertag', ['Klassen 5-7']),
    timed('Elternabend Jg. 5', '2026-09-22', '18:00', '20:00', 'demo-elternabend', ['Eltern']),
    allDay('Schulfest', '2026-09-26', '2026-09-26', 'demo-sonder', ['Kollegium', 'Eltern'], 'Großes Sommerfest auf dem Schulhof'),
    allDay('Tag der offenen Tür', '2026-11-21', '2026-11-21', 'demo-sonder', ['Eltern']),
    timed('Zeugniskonferenz', '2027-01-21', '15:00', '18:00', 'demo-konferenz', ['Kollegium']),
    allDay('Halbjahreszeugnisse', '2027-01-29', '2027-01-29', 'demo-sondertag', ['Klassen 5-7', 'Klassen 8-10']),
    allDay('Beweglicher Ferientag', '2027-02-12', '2027-02-12', 'demo-schliesstag'),
    allDay('Projektwoche', '2027-03-15', '2027-03-19', 'demo-sonder', ['Sek I'], 'Mehrtägige Veranstaltung'),
    timed('Elternsprechtag', '2027-04-21', '15:00', '19:00', 'demo-elternabend', ['Eltern']),
    allDay('Abiturprüfungen Beginn', '2027-05-03', '2027-05-03', 'demo-pruefung', ['Sek II']),
    allDay('Sportfest', '2027-06-18', '2027-06-18', 'demo-sonder', ['Klassen 5-7', 'Klassen 8-10']),
    // --- Intentional conflicts to showcase detection ---
    allDay('Notfall-Begehung (Samstag)', '2026-09-19', '2026-09-19', 'demo-sondertag'),
    allDay('Nachschreibklausur', '2026-10-15', '2026-10-15', 'demo-pruefung', ['Sek II'])
  ];

  return {
    version: 2,
    schoolyear: {
      id: 'demo-2026-27',
      label: '2026/27',
      firstSchoolDay: '2026-08-12',
      firstTeachingDay: '2026-08-12',
      lastSchoolDay: '2027-07-02',
      holidays: [
        { id: uid(), label: 'Herbstferien', start: '2026-10-12', end: '2026-10-24' },
        { id: uid(), label: 'Weihnachtsferien', start: '2026-12-23', end: '2027-01-06' },
        { id: uid(), label: 'Osterferien', start: '2027-03-29', end: '2027-04-10' },
        { id: uid(), label: 'Pfingstferien', start: '2027-05-18', end: '2027-05-21' }
      ],
      quarterBoundaries: ['2026-10-31', '2027-01-31', '2027-04-15'],
      createdAt: now,
      updatedAt: now
    },
    categories: CATEGORIES,
    events,
    annotations: [
      { schoolweek: 0, text: 'Schuljahresbeginn – Klassenleitungen organisieren', updatedAt: now },
      { schoolweek: 5, text: 'Elternabende laufen', updatedAt: now }
    ],
    availableGroups: ['Kollegium', 'Eltern', 'Klassen 5-7', 'Klassen 8-10', 'Sek I', 'Sek II'],
    ignoredConflicts: [],
    meta: { name: 'Demo: Schuljahr 2026/27', lastSaved: now }
  };
}
