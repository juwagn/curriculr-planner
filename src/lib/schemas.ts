import { z } from 'zod';
import { parseISO, startOfWeek, addDays, isWithinInterval, format } from 'date-fns';

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
  id: z.string().min(1),
  weekStart: isoDate,
  text: z.string(),
  order: z.number().int().nonnegative(),
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
  version: z.literal(6),
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

function legacyWeekStart(
  sy: { firstSchoolDay: string; lastSchoolDay: string; holidays: Array<{ start: string; end: string }> },
  schoolweek: number
): string | null {
  const start = startOfWeek(parseISO(sy.firstSchoolDay), { weekStartsOn: 1 });
  const last = parseISO(sy.lastSchoolDay);
  let index = 0;
  let cursor = start;
  let isFirstWeek = true;
  while (cursor <= last) {
    let holidayDays = 0;
    for (let day = 0; day < 5; day++) {
      const current = addDays(cursor, day);
      if (sy.holidays.some((holiday) => isWithinInterval(current, { start: parseISO(holiday.start), end: parseISO(holiday.end) }))) {
        holidayDays++;
      }
    }
    if (isFirstWeek || holidayDays < 5) {
      if (index === schoolweek) return format(cursor, 'yyyy-MM-dd');
      index++;
    }
    isFirstWeek = false;
    cursor = addDays(cursor, 7);
  }
  return null;
}

/**
 * Map v4 indices directly from the historical `< 3` rule to today's rule:
 * the first week is always SW 00, subsequent weeks need fewer than five
 * holiday days. The SW00 exception was introduced without a v5 schema bump,
 * so it must be part of this v4 migration rather than inferred later.
 */
function buildAnnotationRemap(
  sy: { firstSchoolDay: string; lastSchoolDay: string; holidays: Array<{ start: string; end: string }> }
): Map<number, number> {
  const start = startOfWeek(parseISO(sy.firstSchoolDay), { weekStartsOn: 1 });
  const last = parseISO(sy.lastSchoolDay);
  const remap = new Map<number, number>();
  let oldIdx = 0;
  let newIdx = 0;
  let cursor = start;
  let isFirstWeek = true;
  while (cursor <= last) {
    let hdays = 0;
    for (let i = 0; i < 5; i++) {
      const day = addDays(cursor, i);
      if (sy.holidays.some((h) => isWithinInterval(day, { start: parseISO(h.start), end: parseISO(h.end) }))) {
        hdays++;
      }
    }
    const includedByOldRule = hdays < 3;
    const includedByCurrentRule = isFirstWeek || hdays < 5;
    if (includedByOldRule && includedByCurrentRule) {
      remap.set(oldIdx, newIdx);
    }
    if (includedByOldRule) {
      oldIdx++;
    }
    if (includedByCurrentRule) {
      newIdx++;
    }
    isFirstWeek = false;
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
    // Re-index v4 annotations directly to the current schoolweek semantics.
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
  if (doc.version === 5) {
    doc.version = 6;
    // v5 did not record whether it predated 5fde477 (SW00 holiday exception).
    // Treat persisted v5 indices as the then-current v5 representation; a
    // heuristic could silently move valid notes and is therefore unsafe.
    const sy = doc.schoolyear as {
      firstSchoolDay?: string; lastSchoolDay?: string;
      holidays?: Array<{ start: string; end: string }>;
    } | undefined;
    const annotations = Array.isArray(doc.annotations) ? doc.annotations : [];
    doc.annotations = annotations.flatMap((annotation, index) => {
      if (typeof annotation !== 'object' || annotation === null) return [];
      const legacy = annotation as { schoolweek?: unknown; text?: unknown; updatedAt?: unknown };
      if (typeof legacy.schoolweek !== 'number' || !Number.isInteger(legacy.schoolweek) || legacy.schoolweek < 0) return [];
      if (!sy?.firstSchoolDay || !sy.lastSchoolDay || !Array.isArray(sy.holidays)) return [];
      const weekStart = legacyWeekStart(sy as { firstSchoolDay: string; lastSchoolDay: string; holidays: Array<{ start: string; end: string }> }, legacy.schoolweek);
      if (!weekStart) return [];
      return [{
        id: `migrated-annotation-${index}-${legacy.schoolweek}`,
        weekStart,
        text: typeof legacy.text === 'string' ? legacy.text : '',
        order: index,
        updatedAt: typeof legacy.updatedAt === 'string' ? legacy.updatedAt : ''
      }];
    });
  }
  return doc;
}
