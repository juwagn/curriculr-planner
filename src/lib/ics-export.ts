import type { PlannerDocument, PlanEvent } from '@/types';
import { addDays, format, parseISO } from 'date-fns';

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r/g, '').replace(/\n/g, '\\n');
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

// RFC 5545 line folding: max 75 octets per physical line, continuation lines
// carry a leading space; UTF-8 multi-byte sequences are never split
// (mirrors PHP gsh_tp_curriculr_ics_fold in the WordPress plugin).
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const decoder = new TextDecoder();
  const out: string[] = [];
  let i = 0;
  let first = true;
  while (i < bytes.length) {
    const max = first ? 75 : 74; // continuation lines carry 1 leading space
    let take = Math.min(max, bytes.length - i);
    // Never cut inside a UTF-8 sequence: back off while the next byte
    // is a continuation byte (10xxxxxx).
    while (take > 0 && i + take < bytes.length && ((bytes[i + take] ?? 0) & 0xc0) === 0x80) {
      take--;
    }
    if (take <= 0) take = max; // safety net (should never happen)
    const chunk = decoder.decode(bytes.subarray(i, i + take));
    out.push(first ? chunk : ' ' + chunk);
    i += take;
    first = false;
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
