import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required');
const isoTime = z.string().regex(/^\d{2}:\d{2}$/, 'HH:mm required');

export const HolidaySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  start: isoDate,
  end: isoDate
});

export const SchoolyearSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  firstSchoolDay: isoDate,
  firstTeachingDay: isoDate,
  lastSchoolDay: isoDate,
  holidays: z.array(HolidaySchema),
  quarterBoundaries: z.array(isoDate).min(3).max(3),
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

export const PlannerDocumentSchema = z.object({
  version: z.literal(1),
  schoolyear: SchoolyearSchema,
  categories: z.array(CategorySchema),
  events: z.array(PlanEventSchema),
  annotations: z.array(WeekAnnotationSchema),
  availableGroups: z.array(z.string()),
  meta: z.object({
    name: z.string().min(1),
    lastSaved: z.string()
  })
});
