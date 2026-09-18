import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { WeekTable } from './WeekTable';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';

function setupDoc() {
  const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  doc.schoolyear.quarterBoundaries = ['2026-10-31', '2027-01-31', '2027-04-15'];
  doc.schoolyear.holidays = [
    { id: 'h1', label: 'Herbstferien', start: '2026-10-19', end: '2026-10-30', type: 'ferien' },
    { id: 'h2', label: 'Osterferien', start: '2027-03-22', end: '2027-04-02', type: 'ferien' }
  ];
  // Teacher event INSIDE the first Herbstferien week (Mon 2026-10-19).
  doc.events.push({
    id: 'ev-ferien',
    title: 'Ferienkonferenz',
    start: '2026-10-19',
    end: '2026-10-19',
    allDay: true,
    categoryId: doc.categories[0].id,
    groups: []
  });
  usePlannerStore.setState({ doc });
  useUiStore.setState({ currentQuarter: 1, density: 'standard' });
}

beforeEach(setupDoc);

describe('WeekTable holiday weeks', () => {
  it('renders events that fall inside a holiday week', () => {
    render(<DndContext><WeekTable /></DndContext>);
    expect(screen.getByText('Ferienkonferenz')).toBeInTheDocument();
  });

  it('still labels the holiday week as Ferien', () => {
    render(<DndContext><WeekTable /></DndContext>);
    expect(screen.getAllByText('Herbstferien').length).toBeGreaterThan(0);
  });

  it('shows a weekend event in a holiday week that has no weekday events', () => {
    const doc = usePlannerStore.getState().doc!;
    doc.events.push({
      id: 'ev-ferien-sa', title: 'Ferien-Sportfest', start: '2026-10-31', end: '2026-10-31',
      allDay: true, categoryId: doc.categories[0].id, groups: []
    });
    usePlannerStore.setState({ doc: { ...doc } });
    render(<DndContext><WeekTable /></DndContext>);
    expect(screen.getByText('Ferien-Sportfest')).toBeInTheDocument();
  });

  it('keeps day cells clickable inside a holiday week with events', () => {
    render(<DndContext><WeekTable /></DndContext>);
    // The Monday cell of the event week must exist as a droppable day cell.
    const block = screen.getByText('Ferienkonferenz');
    const cell = block.closest('td');
    expect(cell).not.toBeNull();
  });
});

describe('WeekTable weekend column', () => {
  function addSaturdayEvent() {
    const doc = usePlannerStore.getState().doc!;
    doc.events.push({
      id: 'ev-sa', title: 'Tag der offenen Tür', start: '2026-09-26', end: '2026-09-26',
      allDay: false, startTime: '10:00', endTime: '14:00', categoryId: doc.categories[0].id, groups: ['Eltern']
    });
    usePlannerStore.setState({ doc: { ...doc } });
  }

  it('renders a Sa/So column header', () => {
    render(<DndContext><WeekTable /></DndContext>);
    expect(screen.getByRole('columnheader', { name: 'Sa/So' })).toBeInTheDocument();
  });

  it('shows Saturday events with their day label and opens them for editing', () => {
    addSaturdayEvent();
    render(<DndContext><WeekTable /></DndContext>);
    expect(screen.getByText('Tag der offenen Tür')).toBeInTheDocument();
    expect(screen.getByText('Sa 26.09.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Tag der offenen Tür'));
    expect(useUiStore.getState().eventModalState).toEqual({ open: true, mode: 'edit', eventId: 'ev-sa' });
  });

  it('creates a new event on Saturday when an empty weekend cell is clicked', () => {
    render(<DndContext><WeekTable /></DndContext>);
    fireEvent.click(screen.getByLabelText('Termin am Wochenende 29.08.–30.08. anlegen'));
    expect(useUiStore.getState().eventModalState).toEqual({ open: true, mode: 'create', presetDate: '2026-08-29' });
  });
});
