import type { Holiday, Category } from '@/types';

export interface Step1Data {
  label: string;
  name: string;
  firstSchoolDay: string;
  firstTeachingDay: string;
  lastSchoolDay: string;
  holidays: Holiday[];
  stateCode?: string;
}

export interface Step2Data {
  quarterBoundaries: [string, string, string];
  categories: Category[];
  availableGroups: string[];
}

export interface WizardState {
  step: 1 | 2 | 3;
  step1?: Step1Data;
  step2?: Step2Data;
}
