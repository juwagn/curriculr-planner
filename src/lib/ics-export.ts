import type { PlannerDocument, PlanEvent } from '@/types';
import { addDays, format, parseISO } from 'date-fns';

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function fmtDate(iso: string): string {
  return iso.replace(/-/g, '');
}

function fmtDateTime(iso: string, time: string): string {
  return `${fmtDate(iso)}T${time.replace(':', '')}00`;
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  for (let i = 0; i < line.length; i += 73) {
    out.push((i === 0 ? '' : ' ') + line.slice(i, i + 73));
  }
  return out.join('\r\n');
}

function buildEvent(e: PlanEvent, doc: PlannerDocument): string[] {
  const lines: string[] = ['BEGIN:VEVENT'];
  lines.push(`UID:${e.id}@curriculr-planner`);
  lines.push(`DTSTAMP:${nowStamp()}`);
  lines.push(`SUMMARY:${escapeText(e.title)}`);

  if (e.allDay) {
    const endExclusive = format(addDays(parseISO(e.end), 1), 'yyyyMMdd');
    lines.push(`DTSTART;VALUE=DATE:${fmtDate(e.start)}`);
    lines.push(`DTEND;VALUE=DATE:${endExclusive}`);
  } else {
    lines.push(`DTSTART:${fmtDateTime(e.start, e.startTime ?? '00:00')}`);
    lines.push(`DTEND:${fmtDateTime(e.end, e.endTime ?? '23:59')}`);
  }

  if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);

  const descParts: string[] = [];
  if (e.notes) descParts.push(e.notes);
  if (e.groups.length) descParts.push(`Gruppen: ${e.groups.join(', ')}`);
  if (descParts.length) lines.push(`DESCRIPTION:${escapeText(descParts.join('\n'))}`);

  const cat = doc.categories.find((c) => c.id === e.categoryId);
  if (cat) lines.push(`CATEGORIES:${escapeText(cat.label)}`);

  lines.push('END:VEVENT');
  return lines;
}

export function buildIcs(doc: PlannerDocument): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Curriculr Planner//DE',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(doc.meta.name)}`,
    'X-WR-TIMEZONE:Europe/Berlin'
  ];
  for (const e of doc.events) lines.push(...buildEvent(e, doc));
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
