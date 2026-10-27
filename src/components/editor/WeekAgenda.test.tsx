import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { WeekTable } from './WeekTable';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';

function mockNarrow(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  );
}

function setupDoc() {
  const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  doc.schoolyear.quarterBoundaries = ['2026-10-31', '2027-01-31', '2027-04-15'];
  doc.schoolyear.holidays = [
    { id: 'h1', label: 'Herbstferien', start: '2026-10-19', end: '2026-10-30', type: 'ferien' }
  ];
  const cat = doc.categories[0];
  doc.events.push(
    { id: 'e1', title: 'Gesamtkonferenz', start: '2026-09-02', end: '2026-09-02', allDay: false, startTime: '14:00', endTime: '16:00', categoryId: cat.id, groups: [] },
    { id: 'e2', title: 'Projektfahrt', start: '2026-09-08', end: '2026-09-10', allDay: true, categoryId: cat.id, groups: [] },
    { id: 'e3', title: 'Schulfest', start: '2026-09-12', end: '2026-09-12', allDay: true, categoryId: cat.id, groups: [] }
  );
  usePlannerStore.setState({ doc });
  useUiStore.setState({ currentQuarter: 1, density: 'standard' });
}

beforeEach(setupDoc);
afterEach(() => vi.unstubAllGlobals());

describe('WeekTable below 1024 px (agenda)', () => {
  it('renders the agenda instead of the table', () => {
    mockNarrow(true);
    render(<DndContext><WeekTable /></DndContext>);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('heading', { name: /Wochenübersicht Quartal 1/ })).toBeInTheDocument();
  });

  it('keeps the Schulwochen column as recognition mark', () => {
    mockNarrow(true);
    render(<DndContext><WeekTable /></DndContext>);
    const week = screen.getByRole('listitem', { name: /Schulwoche 00/ });
    expect(week).toBeInTheDocument();
    expect(within(week).getByText('SW')).toBeInTheDocument();
  });

  it('lists a multi-day event once, on its first day, with end date', () => {
    mockNarrow(true);
    render(<DndContext><WeekTable /></DndContext>);
    expect(screen.getAllByText('Projektfahrt')).toHaveLength(1);
    expect(screen.getByText(/bis 10\.09\./)).toBeInTheDocument();
  });

  it('shows weekend events and opens an event for editing', () => {
    mockNarrow(true);
    render(<DndContext><WeekTable /></DndContext>);
    fireEvent.click(screen.getByText('Schulfest'));
    expect(useUiStore.getState().eventModalState).toEqual({ open: true, mode: 'edit', eventId: 'e3' });
  });

  it('creates an event in the chosen week via "Termin anlegen"', () => {
    mockNarrow(true);
    render(<DndContext><WeekTable /></DndContext>);
    const week = screen.getByRole('listitem', { name: /Schulwoche 01/ });
    fireEvent.click(within(week).getByRole('button', { name: /Termin anlegen/ }));
    expect(useUiStore.getState().eventModalState).toEqual({ open: true, mode: 'create', presetDate: '2026-08-31' });
  });

  it('collapses empty holiday weeks to a labelled strip', () => {
    mockNarrow(true);
    useUiStore.setState({ currentQuarter: 1 });
    render(<DndContext><WeekTable /></DndContext>);
    expect(screen.getAllByText('Herbstferien').length).toBeGreaterThan(0);
  });
});

describe('WeekTable from 1024 px (table)', () => {
  it('renders the table', () => {
    mockNarrow(false);
    render(<DndContext><WeekTable /></DndContext>);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
