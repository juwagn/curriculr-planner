import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Welcome } from './Welcome';

beforeEach(() => localStorage.clear());

describe('Welcome', () => {
  it('shows "Neuen Jahresplan erstellen" button', async () => {
    render(<Welcome onCreateNew={() => {}} onOpenDoc={() => {}} onImportJson={() => {}} />);
    expect(await screen.findByRole('button', { name: /Neuen Jahresplan/i })).toBeInTheDocument();
  });

  it('shows JSON-Backup-Button', async () => {
    render(<Welcome onCreateNew={() => {}} onOpenDoc={() => {}} onImportJson={() => {}} />);
    expect(await screen.findByRole('button', { name: /JSON-Backup laden/i })).toBeInTheDocument();
  });

  it('fires onCreateNew on click', async () => {
    const onCreateNew = vi.fn();
    render(<Welcome onCreateNew={onCreateNew} onOpenDoc={() => {}} onImportJson={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: /Neuen Jahresplan/i }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it('lists existing docs from storage', async () => {
    localStorage.setItem('curriculr-planner:docs', JSON.stringify(['doc1']));
    localStorage.setItem(
      'curriculr-planner:doc:doc1',
      JSON.stringify({
        version: 1,
        schoolyear: {
          id: 'doc1',
          label: '2026/27',
          firstSchoolDay: '2026-08-24',
          firstTeachingDay: '2026-08-31',
          lastSchoolDay: '2027-07-16',
          holidays: [],
          quarterBoundaries: ['2026-10-30', '2027-01-29', '2027-04-09'],
          createdAt: '',
          updatedAt: ''
        },
        categories: [],
        events: [],
        annotations: [],
        availableGroups: [],
        meta: { name: 'Jahresplan 2026/27', lastSaved: '2026-05-26T10:00:00Z' }
      })
    );
    render(<Welcome onCreateNew={() => {}} onOpenDoc={() => {}} onImportJson={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/Jahresplan 2026\/27/i)).toBeInTheDocument();
    });
  });
});
