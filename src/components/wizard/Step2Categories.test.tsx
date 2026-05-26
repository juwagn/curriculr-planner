import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step2Categories } from './Step2Categories';
import { createEmptyDoc } from '@/stores/planner';

describe('Step2Categories', () => {
  it('renders 7 default categories', () => {
    const doc = createEmptyDoc('X', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    render(
      <Step2Categories
        initial={{
          quarterBoundaries: ['', '', ''],
          categories: doc.categories,
          availableGroups: doc.availableGroups
        }}
        onBack={() => {}}
        onNext={() => {}}
      />
    );
    expect(screen.getAllByPlaceholderText(/Label/i)).toHaveLength(7);
  });

  it('rejects empty quarter boundaries', async () => {
    const onNext = vi.fn();
    const doc = createEmptyDoc('X', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    render(
      <Step2Categories
        initial={{
          quarterBoundaries: ['', '', ''],
          categories: doc.categories,
          availableGroups: doc.availableGroups
        }}
        onBack={() => {}}
        onNext={onNext}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Weiter/i }));
    expect(onNext).not.toHaveBeenCalled();
  });

  it('adds + removes a group chip', async () => {
    const doc = createEmptyDoc('X', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    render(
      <Step2Categories
        initial={{
          quarterBoundaries: ['', '', ''],
          categories: doc.categories,
          availableGroups: doc.availableGroups
        }}
        onBack={() => {}}
        onNext={() => {}}
      />
    );
    const input = screen.getByPlaceholderText(/Neue Gruppe/i);
    await userEvent.type(input, 'Sek III');
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('Sek III')).toBeInTheDocument();
  });
});
