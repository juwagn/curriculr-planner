import type { Holiday, ISODate } from '@/types';

const BASE_URL = 'https://openholidaysapi.org';

export interface OpenHolidayName {
  language: string;
  text: string;
}

export interface OpenHolidayItem {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  name: OpenHolidayName[];
}

export interface GermanState {
  code: string;
  name: string;
}

export const GERMAN_STATES: GermanState[] = [
  { code: 'DE-BW', name: 'Baden-Württemberg' },
  { code: 'DE-BY', name: 'Bayern' },
  { code: 'DE-BE', name: 'Berlin' },
  { code: 'DE-BB', name: 'Brandenburg' },
  { code: 'DE-HB', name: 'Bremen' },
  { code: 'DE-HH', name: 'Hamburg' },
  { code: 'DE-HE', name: 'Hessen' },
  { code: 'DE-MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'DE-NI', name: 'Niedersachsen' },
  { code: 'DE-NW', name: 'Nordrhein-Westfalen' },
  { code: 'DE-RP', name: 'Rheinland-Pfalz' },
  { code: 'DE-SL', name: 'Saarland' },
  { code: 'DE-SN', name: 'Sachsen' },
  { code: 'DE-ST', name: 'Sachsen-Anhalt' },
  { code: 'DE-SH', name: 'Schleswig-Holstein' },
  { code: 'DE-TH', name: 'Thüringen' }
];

function germanLabel(name: OpenHolidayName[]): string {
  const de = name.find((n) => n.language === 'DE');
  return (de ?? name[0])?.text ?? 'Termin';
}

export function mapHoliday(item: OpenHolidayItem, type: Holiday['type']): Holiday {
  return {
    id: crypto.randomUUID(),
    label: germanLabel(item.name),
    start: item.startDate,
    end: item.endDate,
    type,
    source: 'api'
  };
}

/**
 * Manuelle Einträge bleiben, alte API-Einträge werden durch die neuen ersetzt.
 * Leere Platzhalter-Zeilen (ohne Start und Ende) werden verworfen.
 */
export function mergeFetchedHolidays(existing: Holiday[], fetched: Holiday[]): Holiday[] {
  const manual = existing.filter((h) => h.source !== 'api' && (h.start || h.end));
  return [...manual, ...fetched];
}

async function fetchJson(url: string): Promise<OpenHolidayItem[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenHolidays-Abruf fehlgeschlagen (${res.status})`);
  return (await res.json()) as OpenHolidayItem[];
}

export async function fetchHolidays(
  stateCode: string,
  from: ISODate,
  to: ISODate
): Promise<Holiday[]> {
  const query =
    `countryIsoCode=DE&subdivisionCode=${encodeURIComponent(stateCode)}` +
    `&languageIsoCode=DE&validFrom=${encodeURIComponent(from)}&validTo=${encodeURIComponent(to)}`;
  const [school, pub] = await Promise.all([
    fetchJson(`${BASE_URL}/SchoolHolidays?${query}`),
    fetchJson(`${BASE_URL}/PublicHolidays?${query}`)
  ]);
  return [
    ...school.map((item) => mapHoliday(item, 'ferien')),
    ...pub.map((item) => mapHoliday(item, 'feiertag'))
  ];
}
