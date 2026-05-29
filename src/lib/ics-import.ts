import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Category, PlanEvent, Schoolyear, UUID } from '@/types';

export interface ParsedEvent {
  uid: string;
  summary: string;
  start: string;        // YYYY-MM-DD
  end: string;          // YYYY-MM-DD (inclusive)
  allDay: boolean;
  startTime?: string;   // HH:mm
  endTime?: string;
  location?: string;
  description?: string;
  categories: string[];
}

function unfold(text: string): string[] {
  const rawLines = text.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function unescape(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function parseLine(line: string): { name: string; params: string; value: string } | null {
  const colon = line.indexOf(':');
  if (colon === -1) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const semi = left.indexOf(';');
  return semi === -1
    ? { name: left, params: '', value }
    : { name: left.slice(0, semi), params: left.slice(semi + 1), value };
}

function toIsoDate(raw: string): string {
  const d = raw.slice(0, 8);
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function toTime(raw: string): string | undefined {
  const t = raw.indexOf('T');
  if (t === -1) return undefined;
  const hh = raw.slice(t + 1, t + 3);
  const mm = raw.slice(t + 3, t + 5);
  return `${hh}:${mm}`;
}

export function parseIcs(text: string): ParsedEvent[] {
  const lines = unfold(text);
  const events: ParsedEvent[] = [];
  let cur: Partial<ParsedEvent> & { _dtendRaw?: string; _allDay?: boolean } = {};
  let inEvent = false;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; cur = { categories: [] }; continue; }
    if (line === 'END:VEVENT') {
      inEvent = false;
      if (cur.start) {
        let end = cur.end ?? cur.start;
        if (cur._allDay && cur._dtendRaw) {
          end = format(addDays(parseISO(toIsoDate(cur._dtendRaw)), -1), 'yyyy-MM-dd');
        }
        events.push({
          uid: cur.uid ?? crypto.randomUUID(),
          summary: cur.summary ?? '(ohne Titel)',
          start: cur.start,
          end,
          allDay: !!cur._allDay,
          startTime: cur.startTime,
          endTime: cur.endTime,
          location: cur.location,
          description: cur.description,
          categories: cur.categories ?? []
        });
      }
      continue;
    }
    if (!inEvent) continue;
    const p = parseLine(line);
    if (!p) continue;
    switch (p.name) {
      case 'UID': cur.uid = p.value; break;
      case 'SUMMARY': cur.summary = unescape(p.value); break;
      case 'LOCATION': cur.location = unescape(p.value); break;
      case 'DESCRIPTION': cur.description = unescape(p.value); break;
      case 'CATEGORIES': cur.categories = unescape(p.value).split(',').map((s) => s.trim()).filter(Boolean); break;
      case 'DTSTART':
        cur.start = toIsoDate(p.value);
        cur._allDay = !p.value.includes('T');
        if (!cur._allDay) cur.startTime = toTime(p.value);
        break;
      case 'DTEND':
        cur.end = toIsoDate(p.value);
        cur._dtendRaw = p.value;
        if (p.value.includes('T')) cur.endTime = toTime(p.value);
        break;
    }
  }
  return events;
}

// ─── mapToEvents + shiftToSchoolyear ──────────────────────────────────────────

function groupsFromDescription(desc?: string): string[] {
  if (!desc) return [];
  const line = desc.split('\n').find((l) => l.toLowerCase().startsWith('gruppen:'));
  if (!line) return [];
  return line.slice(line.indexOf(':') + 1).split(',').map((s) => s.trim()).filter(Boolean);
}

function matchCategory(p: ParsedEvent, categories: Category[], fallbackId: UUID): UUID {
  for (const label of p.categories) {
    const hit = categories.find((c) => c.label.toLowerCase() === label.toLowerCase());
    if (hit) return hit.id;
  }
  const hay = `${p.summary} ${p.description ?? ''}`.toLowerCase();
  for (const c of categories) {
    if (c.keywords.some((k) => k && hay.includes(k.toLowerCase()))) return c.id;
  }
  return fallbackId;
}

export function mapToEvents(parsed: ParsedEvent[], categories: Category[], fallbackCategoryId: UUID): PlanEvent[] {
  return parsed.map((p) => {
    const title = p.summary.trim() || '(ohne Titel)';
    // A timed event needs BOTH times; otherwise degrade to all-day so the result
    // stays valid against PlanEventSchema (which rejects timed events missing a time).
    const hasBothTimes = !p.allDay && !!p.startTime && !!p.endTime;
    const allDay = p.allDay || !hasBothTimes;
    return {
      id: crypto.randomUUID(),
      title,
      start: p.start,
      end: p.end,
      allDay,
      startTime: allDay ? undefined : p.startTime,
      endTime: allDay ? undefined : p.endTime,
      categoryId: matchCategory(p, categories, fallbackCategoryId),
      location: p.location,
      notes: p.description,
      groups: groupsFromDescription(p.description)
    };
  });
}

/**
 * Shift every event by a whole number of weeks so the earliest event lands on or
 * after the target's firstSchoolDay while keeping its weekday. Relative spacing is
 * preserved (all events move by the same delta).
 */
export function shiftToSchoolyear(events: PlanEvent[], target: Schoolyear): PlanEvent[] {
  if (events.length === 0) return events;
  const minStart = events.reduce((m, e) => (e.start < m ? e.start : m), events[0].start);
  const rawDelta = differenceInCalendarDays(parseISO(target.firstSchoolDay), parseISO(minStart));
  const weekDelta = Math.ceil(rawDelta / 7) * 7;
  const shift = (iso: string) => format(addDays(parseISO(iso), weekDelta), 'yyyy-MM-dd');
  return events.map((e) => ({ ...e, start: shift(e.start), end: shift(e.end) }));
}
