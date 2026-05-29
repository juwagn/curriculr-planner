export type ISODate = string;
export type ISOTime = string;
export type UUID = string;

export interface Holiday {
  id: UUID;
  label: string;
  start: ISODate;
  end: ISODate;
}

export interface Schoolyear {
  id: UUID;
  label: string;
  firstSchoolDay: ISODate;
  firstTeachingDay: ISODate;
  lastSchoolDay: ISODate;
  holidays: Holiday[];
  quarterBoundaries: ISODate[];
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
  schoolweek: number;
  text: string;
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
  version: 3;
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
  };
}
