import { startOfWeek, parseISO, format } from 'date-fns';
import type { ISODate, WeekAnnotation } from '@/types';

/** Return annotations in their persisted order with an ID tie-breaker. */
export function sortAnnotations<T extends Pick<WeekAnnotation, 'order' | 'id'>>(annotations: T[]): T[] {
  return [...annotations].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function annotationsForWeek(annotations: WeekAnnotation[], weekStart: ISODate): WeekAnnotation[] {
  return sortAnnotations(annotations.filter((annotation) => annotation.weekStart === weekStart));
}

/** The document always stores the Monday, even if callers provide another weekday. */
export function mondayOfWeek(iso: ISODate): ISODate {
  return format(startOfWeek(parseISO(iso), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}
