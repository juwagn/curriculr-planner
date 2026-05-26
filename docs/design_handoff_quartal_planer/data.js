// Curriculr Planner — Schuljahr 2026/27, 1. Halbjahr
// Daten aus dem Screenshot (Gesamtschule Horst) plus weitere realistische Ergänzungen.

(function () {
const CATEGORIES = {
  konferenz:        { id: 'konferenz',        label: 'Konferenz',          color: '#3B82F6' }, // blau
  elternabend:      { id: 'elternabend',      label: 'Elternabend',        color: '#22C55E' }, // grün
  potenzial:        { id: 'potenzial',        label: 'Potenzialanalyse',   color: '#FFC857' }, // brand-akzent gelb
  prowo:            { id: 'prowo',            label: 'Praktikum / ProWo',  color: '#06B6D4' }, // cyan
  kaoa:             { id: 'kaoa',             label: 'KAoA / Berufsorient.', color: '#8B5CF6' }, // violett
  schulleitung:     { id: 'schulleitung',     label: 'Schulleitung',       color: '#0F4C81' }, // dunkelblau
  klausur:          { id: 'klausur',          label: 'Klausur / Prüfung',  color: '#EF4444' }, // rot
  unterricht:       { id: 'unterricht',       label: 'Unterricht / Org.',  color: '#64748B' }, // slate
  veranstaltung:    { id: 'veranstaltung',    label: 'Veranstaltung',      color: '#F97316' }, // orange
  fortbildung:      { id: 'fortbildung',      label: 'Fortbildung',        color: '#14B8A6' }, // teal
};

// 1. Halbjahr Schuljahr 2026/27 — Wochen (Mo-Fr)
// Wir nutzen index als id; Datum ist die Mo-Fr-Range.
const SCHOOLWEEKS_HJ1 = [
  { index: 0, label: '00', startDate: '2026-08-24', endDate: '2026-08-28' },
  { index: 1, label: '01', startDate: '2026-08-31', endDate: '2026-09-04' },
  { index: 2, label: '02', startDate: '2026-09-07', endDate: '2026-09-11' },
  { index: 3, label: '03', startDate: '2026-09-14', endDate: '2026-09-18' },
  { index: 4, label: '04', startDate: '2026-09-21', endDate: '2026-09-25' },
  { index: 5, label: '05', startDate: '2026-09-28', endDate: '2026-10-02' },
  { index: 6, label: '06', startDate: '2026-10-05', endDate: '2026-10-09' },
  { index: 7, label: '07', startDate: '2026-10-12', endDate: '2026-10-16' },
  // Herbstferien
  { holiday: 'Herbstferien', startDate: '2026-10-19', endDate: '2026-10-23' },
  { holiday: 'Herbstferien', startDate: '2026-10-26', endDate: '2026-10-30' },
  { index: 8,  label: '08', startDate: '2026-11-02', endDate: '2026-11-06' },
  { index: 9,  label: '09', startDate: '2026-11-09', endDate: '2026-11-13' },
  { index: 10, label: '10', startDate: '2026-11-16', endDate: '2026-11-20' },
  { index: 11, label: '11', startDate: '2026-11-23', endDate: '2026-11-27' },
  { index: 12, label: '12', startDate: '2026-11-30', endDate: '2026-12-04' },
  { index: 13, label: '13', startDate: '2026-12-07', endDate: '2026-12-11' },
  { index: 14, label: '14', startDate: '2026-12-14', endDate: '2026-12-18' },
  // Weihnachtsferien
  { holiday: 'Weihnachtsferien', startDate: '2026-12-21', endDate: '2026-12-25' },
  { holiday: 'Weihnachtsferien', startDate: '2026-12-28', endDate: '2027-01-01' },
  { index: 15, label: '15', startDate: '2027-01-04', endDate: '2027-01-08' },
  { index: 16, label: '16', startDate: '2027-01-11', endDate: '2027-01-15' },
  { index: 17, label: '17', startDate: '2027-01-18', endDate: '2027-01-22' },
  { index: 18, label: '18', startDate: '2027-01-25', endDate: '2027-01-29' },
];

// Quartals-Definition (für Tab-Filter)
const QUARTERS = [
  { id: 'Q1', label: 'Q1', subtitle: 'Aug – Okt 2026',  hj: 1, weekRange: [0, 7]   },
  { id: 'Q2', label: 'Q2', subtitle: 'Nov 2026 – Jan 2027', hj: 1, weekRange: [8, 18] },
  { id: 'Q3', label: 'Q3', subtitle: 'Feb – Apr 2027',  hj: 2, weekRange: [19, 26] },
  { id: 'Q4', label: 'Q4', subtitle: 'Mai – Jul 2027',  hj: 2, weekRange: [27, 38] },
];

// Termine — direkt aus dem Screenshot abgeleitet.
// day-of-week: 1=Mo … 5=Fr; sw = Schulwochen-Index
let _id = 0;
const E = (sw, day, fields) => ({ id: 'e' + (++_id), sw, day, ...fields });

const EVENTS = [
  // SW 00 — 24.08.–28.08.
  E(0, 3, { time: '09.00', title: 'Schulleitung', cat: 'schulleitung' }),
  E(0, 4, { time: '09.00', title: 'Übergabe Beratungsteams AL 1 ⇒ AL 2', cat: 'schulleitung' }),
  E(0, 4, { time: '11.00', title: 'Übergabe Beratungsteams AL 2 ⇒ AL 3', cat: 'schulleitung' }),
  E(0, 4, { time: '13.00', title: 'Übergabe Beratungsteams AL 3 ⇒ EF', cat: 'schulleitung' }),
  E(0, 5, { time: '09.00', title: 'Stehkaffee für alle', cat: 'veranstaltung' }),
  E(0, 5, { time: '09.30', title: 'LK 1', cat: 'konferenz' }),
  E(0, 5, { time: '12.30', title: 'TBS: Aufräumen und Umzug', cat: 'unterricht' }),
  E(0, 5, { time: '13.30', title: 'Teamsitzung mit AL Jahresplanung', endTime: '15.30', cat: 'konferenz' }),

  // SW 01 — 31.08.–04.09.
  E(1, 1, { title: 'Nachprüfungen ab 8.00', cat: 'klausur' }),
  E(1, 1, { title: 'FaKo-Tag', cat: 'konferenz', bold: true }),
  E(1, 1, { time: '8.00', endTime: '10.00', title: '1. Schiene a)', cat: 'konferenz' }),
  E(1, 1, { time: '10.00', endTime: '12.00', title: '1. Schiene b)', cat: 'konferenz' }),
  E(1, 1, { time: '12.00', endTime: '14.00', title: '2. Schiene', cat: 'konferenz' }),
  E(1, 1, { time: '14.00', endTime: '16.00', title: '3. Schiene', cat: 'konferenz' }),

  E(1, 2, { title: 'Nachprüfungen ab 8.00', cat: 'klausur' }),
  E(1, 2, { time: '09.00', title: 'Teamsitzung Vorbereitung Schuljahr', cat: 'konferenz' }),
  E(1, 2, { time: '11.00', title: 'TBS 5 (Sprachförderung)', cat: 'konferenz' }),
  E(1, 2, { time: '12.00', title: 'Neue Kollegen/innen — Accounts, IServ, Untis', cat: 'fortbildung' }),
  E(1, 2, { time: '13.00', title: 'Neu in der Inklusion — Info für Inkl-LuL', cat: 'fortbildung' }),

  E(1, 3, { title: '1.–4. Std KL-Unterricht (Bücherausgabe, Stundenplan etc.)', cat: 'unterricht' }),
  E(1, 3, { time: '13.30', title: '„KAoA 8" mit KL 8, WW-FLuL', cat: 'kaoa' }),
  E(1, 3, { time: '13.30', title: 'DB 9/10 M, D, E, WP, Spa + neue FLuL in Jg 9+10', cat: 'konferenz' }),
  E(1, 3, { time: '13.30', title: 'ProWo Team', cat: 'prowo' }),
  E(1, 3, { time: '14.30', title: 'DB Sek II', cat: 'konferenz' }),

  E(1, 4, { title: '1.–5. Jg 5 KL-Unterricht', cat: 'unterricht' }),
  E(1, 5, { title: 'Sportspektakel', cat: 'veranstaltung' }),

  // SW 02 — 07.09.–11.09.
  E(2, 1, { title: 'Jg 5 KL-Unterricht ganztägig (WPM-Test)', cat: 'unterricht' }),
  E(2, 2, { title: '1.-2. Sprachstandstest DST 5 +6 Auswertung bis Donnerstag', cat: 'klausur' }),
  E(2, 2, { title: 'konferenzfrei', cat: 'unterricht', bold: true }),
  E(2, 5, { title: '1.-2. Std DST 5 + 6 Nachschreibtermin', cat: 'klausur' }),
  E(2, 5, { title: 'Ergebnisse DST 5 an AL', cat: 'klausur' }),

  // SW 03 — 14.09.–18.09.
  E(3, 2, { time: '09.1', title: '09.6: Berufeparcours', cat: 'kaoa' }),
  E(3, 2, { time: '13.13', title: 'Unterrichtsschluss Jg 5', cat: 'unterricht' }),
  E(3, 2, { time: '13.30', title: 'TBS 5: Ergebnisse Sprachstand, Diagnose benennen, Zuweisung Förderkurse', cat: 'konferenz' }),
  E(3, 2, { time: '17.00', title: 'Info Potentialanalyse 8', cat: 'potenzial' }),
  E(3, 2, { time: '18.00', title: 'Pflegschaften 5-8', cat: 'elternabend' }),

  E(3, 3, { time: '17.00', title: 'Info-Abend 9: Abschlüsse', cat: 'elternabend' }),
  E(3, 3, { time: '18.00', title: 'Pflegschaften 9', cat: 'elternabend' }),
  E(3, 3, { time: '18:00', title: 'Info-Abend 10: ZP 10', cat: 'elternabend' }),
  E(3, 3, { time: '19.00', title: 'Pflegschaft 10', cat: 'elternabend' }),
  E(3, 3, { time: '18.30', title: 'Pflegschaften SII', cat: 'elternabend' }),

  E(3, 4, { title: '6.-7. Std 1. Schülerratssitzung', cat: 'konferenz' }),

  // SW 04 — 21.09.–25.09.
  E(4, 2, { title: 'Brandschutzübungen', cat: 'veranstaltung' }),
  E(4, 2, { title: 'EF: ProWo-Auftakt', cat: 'prowo' }),
  E(4, 2, { time: '14.15', title: 'Projektgruppen', cat: 'konferenz' }),
  E(4, 3, { title: 'SchiLF', cat: 'fortbildung', bold: true }),
  E(4, 4, { title: 'SV-Fahrt (keine Klausuren und Klassenarbeiten)', cat: 'veranstaltung' }),
  E(4, 5, { title: 'SV-Fahrt (keine Klausuren und Klassenarbeiten)', cat: 'veranstaltung' }),

  // SW 05 — 28.09.–02.10.
  E(5, 1, { time: '17:00', title: 'Schulpflegschaft', cat: 'elternabend' }),
  E(5, 1, { time: '19:00', title: 'Schulkonferenz', cat: 'konferenz' }),
  E(5, 2, { time: '14.15', title: 'Teamnachmittag: Kandidaten „Mini-Prowo" Vorbereitung Förderplankonferenz', cat: 'konferenz' }),

  // SW 06 — 05.10.–09.10.
  E(6, 1, { title: 'Potenzialanalyse 8.1', cat: 'potenzial', highlight: true }),
  E(6, 1, { time: '14.15', title: 'Kollegiale Fallberatung', cat: 'konferenz' }),
  E(6, 2, { title: 'Potenzialanalyse 8.2', cat: 'potenzial', highlight: true }),
  E(6, 2, { time: '14.15', title: '1. Förderplankonferenz Jg 5', cat: 'konferenz' }),
  E(6, 2, { time: '14.15', title: 'ProWo-Team', cat: 'prowo' }),
  E(6, 3, { title: 'Potenzialanalyse 8.3', cat: 'potenzial', highlight: true }),
  E(6, 3, { time: '10.50', title: 'Kick-Off „Horst forscht"', cat: 'veranstaltung' }),
  E(6, 4, { title: 'Potenzialanalyse 8.4', cat: 'potenzial', highlight: true }),

  // SW 07 — 12.10.–16.10.
  E(7, 1, { title: 'Potenzialanalyse Jg 8.5', cat: 'potenzial', highlight: true }),
  E(7, 1, { title: 'Betriebspraktikum Q1', cat: 'prowo' }),
  E(7, 1, { title: 'ProWo EF', cat: 'prowo' }),
  E(7, 2, { title: 'Potenzialanalyse 8.6', cat: 'potenzial', highlight: true }),
  E(7, 2, { title: 'Betriebspraktikum Q1', cat: 'prowo' }),
  E(7, 2, { title: 'ProWo EF', cat: 'prowo' }),
  E(7, 2, { time: '14.15', title: 'Projektgruppen', cat: 'konferenz' }),
  E(7, 3, { title: 'Rückmeldung Schüler-AGs', cat: 'unterricht' }),
  E(7, 3, { title: 'Betriebspraktikum Q1', cat: 'prowo' }),
  E(7, 3, { title: 'ProWo EF', cat: 'prowo' }),
  E(7, 4, { title: 'Betriebspraktikum Q1', cat: 'prowo' }),
  E(7, 4, { title: 'ProWo EF', cat: 'prowo' }),
  E(7, 4, { title: 'Prowo-Präsentation', cat: 'prowo' }),
  E(7, 5, { title: 'Betriebspraktikum Q1', cat: 'prowo' }),
  E(7, 5, { title: 'ProWo EF', cat: 'prowo' }),
  E(7, 5, { title: 'Sponsorenlauf Jg 8', cat: 'veranstaltung' }),

  // SW 08 — 02.11.–06.11.
  E(8, 2, { time: '14.15', title: 'Projektgruppen', cat: 'konferenz' }),

  // weiteres Halbjahr — ein paar Beispiele für Q2-Tab
  E(9, 1, { time: '14.15', title: 'Lehrerkonferenz', cat: 'konferenz' }),
  E(9, 3, { time: '18.00', title: 'Tag der offenen Tür Vorbereitung', cat: 'veranstaltung' }),
  E(10, 5, { title: 'Tag der offenen Tür', cat: 'veranstaltung', bold: true }),
  E(11, 2, { time: '08.00', title: 'ZP 10 Deutsch — Vorklausur', cat: 'klausur' }),
  E(12, 3, { time: '17.00', title: 'Pädagogische Konferenz', cat: 'konferenz' }),
  E(13, 1, { title: 'Adventsfeier Jg 5/6', cat: 'veranstaltung' }),
  E(14, 5, { time: '11.00', title: 'Weihnachtsgottesdienst', cat: 'veranstaltung' }),
  E(15, 2, { time: '14.15', title: 'Zeugniskonferenz Sek I', cat: 'konferenz', bold: true }),
  E(16, 3, { time: '14.15', title: 'Zeugniskonferenz Sek II', cat: 'konferenz', bold: true }),
  E(17, 5, { title: 'Zeugnisausgabe — Unterrichtsende 11.00', cat: 'unterricht', bold: true }),
];

// Anmerkungen pro Schulwoche
const ANNOTATIONS = {
  1: 'Jg 5+6 ganze Woche 1.-5. Std Unterricht\nMittagessen ab Donnerstag',
  2: { bold: 'Letzter Termin:\nKlassensprecherwahl', highlight: '12.-13.09. Rosch Haschana (jüd. Feiertag)' },
  3: '',
  4: 'Start Förderkurse 5/6',
  5: { text: 'Nicht-Schwimmertestung Jg 5', highlight: '03.10. Tag der Deutschen Einheit' },
  7: 'Studienfahrt Q2\nkeine Arbeiten in Jg 10',
  8: 'Noten eintragen!',
  10: 'Anmeldungen Jg 5 Eingang',
  14: 'Lehrer-Wunschzettel an SL',
  17: 'Halbjahreszeugnisse drucken',
};

window.PLANNER_DATA = {
  CATEGORIES,
  SCHOOLWEEKS_HJ1,
  QUARTERS,
  EVENTS,
  ANNOTATIONS,
};
})();
