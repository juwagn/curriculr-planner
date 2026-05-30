import { z } from 'zod';

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
  version: z.literal(4),
  schoolyear: SchoolyearSchema,
  categories: z.array(CategorySchema),
  events: z.array(PlanEventSchema),
  annotations: z.array(WeekAnnotationSchema),
  availableGroups: z.array(z.string()),
  ignoredConflicts: z.array(z.string()),
  templates: z.array(EventTemplateSchema),
  meta: z.object({
    name: z.string().min(1),
    lastSaved: z.string()
  })
});

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
  return doc;
}
