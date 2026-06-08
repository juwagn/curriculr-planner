import { z } from 'zod';
import { parseISO, startOfWeek, addDays, isWithinInterval } from 'date-fns';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required');
const isoTime = z.string().regex(/^\d{2}:\d{2}$/, 'HH:mm required');

export const HolidaySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  start: isoDate,
  end: isoDate,
  type: z.enum(['ferien', 'feiertag']),
  source: z.enum(['api', 'manual']).optional()
});

export const SchoolyearSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  firstSchoolDay: isoDate,
  firstTeachingDay: isoDate,
  lastSchoolDay: isoDate,
  holidays: z.array(HolidaySchema),
  quarterBoundaries: z.array(isoDate).min(3).max(3),
  stateCode: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const CategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  slug: z.string().min(1),
  keywords: z.array(z.string())
});

export const PlanEventSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1, { message: 'Titel erforderlich' }),
    start: isoDate,
    end: isoDate,
    startTime: isoTime.optional(),
    endTime: isoTime.optional(),
    allDay: z.boolean(),
    categoryId: z.string().min(1),
    notes: z.string().optional(),
    location: z.string().optional(),
    groups: z.array(z.string())
  })
  .refine((e) => (e.allDay ? true : !!e.startTime && !!e.endTime), {
    message: 'Zeiten erforderlich wenn nicht ganztägig',
    path: ['startTime']
  })
  .refine((e) => e.end >= e.start, {
    message: 'Endedatum muss >= Startdatum sein',
    path: ['end']
  });

export const WeekAnnotationSchema = z.object({
  schoolweek: z.number().int().nonnegative(),
  text: z.string(),
  updatedAt: z.string()
});

export const EventTemplateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1, { message: 'Name erforderlich' }),
    categoryId: z.string().min(1),
    defaultTitle: z.string().optional(),
    allDay: z.boolean(),
    startTime: isoTime.optional(),
    endTime: isoTime.optional(),
    defaultGroups: z.array(z.string())
  })
  .refine((t) => (t.allDay ? true : !!t.startTime && !!t.endTime), {
    message: 'Zeiten erforderlich wenn nicht ganztägig',
    path: ['startTime']
  });

export const PlannerDocumentSchema = z.object({
  version: z.literal(5),
  schoolyear: SchoolyearSchema,
  categories: z.array(CategorySchema),
  events: z.array(PlanEventSchema),
  annotations: z.array(WeekAnnotationSchema),
  availableGroups: z.array(z.string()),
  ignoredConflicts: z.array(z.string()),
  templates: z.array(EventTemplateSchema),
  meta: z.object({
    name: z.string().min(1),
    lastSaved: z.string(),
    schoolName: z.string().optional(),
    schoolInfo: z.string().optional()
  })
});

/**
 * Build a mapping from old schoolweek indices (threshold < 3) to new (threshold < 5).
 * Weeks with 3–4 holiday days were excluded from the old scheme but are included in the
 * new scheme, shifting every subsequent old index forward by the count of such weeks.
 */
function buildAnnotationRemap(
  sy: { firstSchoolDay: string; lastSchoolDay: string; holidays: Array<{ start: string; end: string }> }
): Map<number, number> {
  const start = startOfWeek(parseISO(sy.firstSchoolDay), { weekStartsOn: 1 });
  const last = parseISO(sy.lastSchoolDay);
  const remap = new Map<number, number>();
  let oldIdx = 0;
  let offset = 0;
  let cursor = start;
  while (cursor <= last) {
    let hdays = 0;
    for (let i = 0; i < 5; i++) {
      const day = addDays(cursor, i);
      if (sy.holidays.some((h) => isWithinInterval(day, { start: parseISO(h.start), end: parseISO(h.end) }))) {
        hdays++;
      }
    }
    if (hdays < 3) {
      remap.set(oldIdx, oldIdx + offset);
      oldIdx++;
    } else if (hdays < 5) {
      // Week newly included in new scheme — shifts all subsequent old indices
      offset++;
    }
    cursor = addDays(cursor, 7);
  }
  return remap;
}

/** Upgrade older persisted docs in-place to the current shape before Zod parse. */
export function migrate(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) return raw as Record<string, unknown>;
  const doc = { ...(raw as Record<string, unknown>) };
  if (doc.version === 1) {
    doc.version = 2;
    if (!Array.isArray(doc.ignoredConflicts)) doc.ignoredConflicts = [];
  }
  if (doc.version === 2) {
    doc.version = 3;
    if (!Array.isArray(doc.templates)) doc.templates = [];
  }
  if (doc.version === 3) {
    doc.version = 4;
    const sy = doc.schoolyear as { holidays?: Array<Record<string, unknown>> } | undefined;
    if (sy && Array.isArray(sy.holidays)) {
      for (const h of sy.holidays) {
        if (typeof h.type !== 'string') h.type = 'ferien';
      }
    }
  }
  if (doc.version === 4) {
    doc.version = 5;
    // Re-index annotations: the computeSchoolweeks threshold changed from < 3 to < 5.
    // Weeks with 3–4 holiday days were excluded (no index) in the old scheme but are
    // now included, shifting all subsequent schoolweek indices. Remap stored values.
    const sy = doc.schoolyear as {
      firstSchoolDay?: string; lastSchoolDay?: string;
      holidays?: Array<{ start: string; end: string }>
    } | undefined;
    const annotations = doc.annotations as Array<{ schoolweek: number }> | undefined;
    if (
      sy?.firstSchoolDay && sy.lastSchoolDay &&
      Array.isArray(sy.holidays) && Array.isArray(annotations)
    ) {
      const remap = buildAnnotationRemap(sy as { firstSchoolDay: string; lastSchoolDay: string; holidays: Array<{ start: string; end: string }> });
      if (remap.size > 0) {
        for (const a of annotations) {
          const mapped = remap.get(a.schoolweek);
          if (mapped !== undefined) a.schoolweek = mapped;
        }
      }
    }
  }
  return doc;
}
