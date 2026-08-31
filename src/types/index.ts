export type ISODate = string;
export type ISOTime = string;
export type UUID = string;

export interface Holiday {
  id: UUID;
  label: string;
  start: ISODate;
  end: ISODate;
  type: 'ferien' | 'feiertag';
  /** 'api' = aus OpenHolidays gezogen (wird bei Re-Fetch ersetzt); fehlt = manuell. */
  source?: 'api' | 'manual';
}

export interface Schoolyear {
  id: UUID;
  label: string;
  firstSchoolDay: ISODate;
  firstTeachingDay: ISODate;
  lastSchoolDay: ISODate;
  holidays: Holiday[];
  quarterBoundaries: ISODate[];
  /** Bundesland-Code (z. B. 'DE-NW') für Re-Fetch der Ferien/Feiertage. */
  stateCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: UUID;
  label: string;
  color: string;
  slug: string;
  keywords: string[];
}

export interface PlanEvent {
  id: UUID;
  title: string;
  start: ISODate;
  end: ISODate;
  startTime?: ISOTime;
  endTime?: ISOTime;
  allDay: boolean;
  categoryId: UUID;
  notes?: string;
  location?: string;
  groups: string[];
}

export interface WeekAnnotation {
  id: UUID;
  /** Monday of the annotated school week; stable across holiday weeks. */
  weekStart: ISODate;
  text: string;
  /** Stable order inside one week. */
  order: number;
  updatedAt: string;
}

export interface EventTemplate {
  id: UUID;
  name: string;
  categoryId: UUID;
  defaultTitle?: string;
  allDay: boolean;
  startTime?: ISOTime;
  endTime?: ISOTime;
  defaultGroups: string[];
}

export interface PlannerDocument {
  version: 6;
  schoolyear: Schoolyear;
  categories: Category[];
  events: PlanEvent[];
  annotations: WeekAnnotation[];
  availableGroups: string[];
  ignoredConflicts: string[];
  templates: EventTemplate[];
  meta: {
    name: string;
    lastSaved: string;
    schoolName?: string;
    schoolInfo?: string;
  };
}
