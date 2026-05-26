import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step3Review } from './Step3Review';
import { createEmptyDoc } from '@/stores/planner';

describe('Step3Review', () => {
  it('shows computed schoolweek count', () => {
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.schoolyear.holidays = [
      { id: 'h1', label: 'Herbst', start: '2026-10-19', end: '2026-10-30' }
    ];
    doc.schoolyear.quarterBoundaries = ['2026-10-30', '2027-01-29', '2027-04-09'];
    render(<Step3Review doc={doc} onBack={() => {}} onCreate={() => {}} />);
    const text = screen.getByText(/Schulwochen/i);
    expect(text).toBeInTheDocument();
  });

  it('fires onCreate when button clicked', async () => {
    const onCreate = vi.fn();
    const doc = createEmptyDoc('Plan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.schoolyear.quarterBoundaries = ['2026-10-30', '2027-01-29', '2027-04-09'];
    render(<Step3Review doc={doc} onBack={() => {}} onCreate={onCreate} />);
    await userEvent.click(screen.getByRole('button', { name: /Plan erstellen/i }));
    expect(onCreate).toHaveBeenCalled();
  });
});
