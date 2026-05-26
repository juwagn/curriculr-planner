import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Step1Schoolyear, DEFAULT_HOLIDAYS } from './Step1Schoolyear';
import { Step2Categories } from './Step2Categories';
import { Step3Review } from './Step3Review';
import { createEmptyDoc } from '@/stores/planner';
import type { Step1Data, Step2Data } from './wizard-state';
import type { PlannerDocument } from '@/types';

interface Props {
  onCancel(): void;
  onComplete(doc: PlannerDocument): void;
}

const currentSchoolyearLabel = () => {
  const y = new Date().getFullYear();
  return `${y}/${(y + 1).toString().slice(-2)}`;
};

export function Wizard({ onCancel, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [step1, setStep1] = useState<Step1Data>({
    label: currentSchoolyearLabel(),
    name: `Jahresplan ${currentSchoolyearLabel()}`,
    firstSchoolDay: '',
    firstTeachingDay: '',
    lastSchoolDay: '',
    holidays: DEFAULT_HOLIDAYS(new Date().getFullYear())
  });
  const [step2, setStep2] = useState<Step2Data>(() => {
    const skeleton = createEmptyDoc('', '', '', '', '');
    return {
      quarterBoundaries: ['', '', ''],
      categories: skeleton.categories,
      availableGroups: skeleton.availableGroups
    };
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogTitle className="sr-only">Setup-Wizard</DialogTitle>
        <div className="flex items-center gap-3 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= s ? 'bg-[var(--color-primary-700)] text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
          <div className="ml-3 text-sm text-[var(--color-text-muted)]">Schritt {step} von 3</div>
        </div>

        {step === 1 && (
          <Step1Schoolyear
            initial={step1}
            onCancel={onCancel}
            onNext={(data) => {
              setStep1(data);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <Step2Categories
            initial={step2}
            onBack={() => setStep(1)}
            onNext={(data) => {
              setStep2(data);
              setStep(3);
            }}
          />
        )}
        {step === 3 && step2 && (() => {
          const previewDoc = createEmptyDoc(
            step1.name,
            step1.label,
            step1.firstSchoolDay,
            step1.firstTeachingDay,
            step1.lastSchoolDay
          );
          previewDoc.schoolyear.holidays = step1.holidays;
          previewDoc.schoolyear.quarterBoundaries = [...step2.quarterBoundaries];
          previewDoc.categories = step2.categories;
          previewDoc.availableGroups = step2.availableGroups;
          return (
            <Step3Review
              doc={previewDoc}
              onBack={() => setStep(2)}
              onCreate={() => onComplete(previewDoc)}
            />
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
