import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step1Schoolyear } from './Step1Schoolyear';

describe('Step1Schoolyear', () => {
  it('rejects firstTeachingDay before firstSchoolDay', async () => {
    const onNext = vi.fn();
    render(
      <Step1Schoolyear
        initial={{
          label: '2026/27',
          name: 'Jahresplan 2026/27',
          firstSchoolDay: '2026-08-31',
          firstTeachingDay: '2026-08-24',
          lastSchoolDay: '2027-07-16',
          holidays: []
        }}
        onCancel={() => {}}
        onNext={onNext}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Weiter/i }));
    expect(onNext).not.toHaveBeenCalled();
    expect(await screen.findByText(/Erster Unterrichtstag muss ≥ Erster Schultag/i)).toBeInTheDocument();
  });

  it('rejects lastSchoolDay before firstSchoolDay', async () => {
    const onNext = vi.fn();
    render(
      <Step1Schoolyear
        initial={{
          label: '2026/27',
          name: 'X',
          firstSchoolDay: '2026-08-24',
          firstTeachingDay: '2026-08-31',
          lastSchoolDay: '2025-07-16',
          holidays: []
        }}
        onCancel={() => {}}
        onNext={onNext}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Weiter/i }));
    expect(onNext).not.toHaveBeenCalled();
  });

  it('passes valid data to onNext', async () => {
    const onNext = vi.fn();
    render(
      <Step1Schoolyear
        initial={{
          label: '2026/27',
          name: 'Jahresplan 2026/27',
          firstSchoolDay: '2026-08-24',
          firstTeachingDay: '2026-08-31',
          lastSchoolDay: '2027-07-16',
          holidays: []
        }}
        onCancel={() => {}}
        onNext={onNext}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Weiter/i }));
    await waitFor(() => expect(onNext).toHaveBeenCalled());
  });
});
