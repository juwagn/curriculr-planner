import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { YearGrid } from './YearGrid';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';

beforeEach(() => {
  const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  doc.events.push({ id: 'e1', title: 'Wandertag', start: '2026-09-15', end: '2026-09-15', allDay: true, categoryId: doc.categories[0].id, groups: [] });
  usePlannerStore.setState({ doc });
});

describe('YearGrid', () => {
  it('renders a row per month from Aug 2026 to Jul 2027', () => {
    render(<DndContext><YearGrid /></DndContext>);
    expect(screen.getByText(/Aug 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Jul 2027/i)).toBeInTheDocument();
  });

  it('renders day-of-month column headers 1..31', () => {
    render(<DndContext><YearGrid /></DndContext>);
    expect(screen.getByRole('columnheader', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '31' })).toBeInTheDocument();
  });

  it('marks the day cell that holds an event', () => {
    render(<DndContext><YearGrid /></DndContext>);
    expect(screen.getByLabelText('2026-09-15')).toHaveAttribute('data-has-event', 'true');
  });
});
