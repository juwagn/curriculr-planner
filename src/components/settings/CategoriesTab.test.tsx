import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoriesTab } from './CategoriesTab';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';

function setupDoc() {
  const doc = createEmptyDoc('Test', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  usePlannerStore.setState({ doc, savingState: 'idle' });
  return doc;
}

describe('CategoriesTab', () => {
  beforeEach(() => {
    usePlannerStore.setState({ doc: null, savingState: 'idle' });
    localStorage.clear();
  });

  it('adds a new category row', async () => {
    const doc = setupDoc();
    render(<CategoriesTab />);
    const before = screen.getAllByPlaceholderText('Name').length;
    expect(before).toBe(doc.categories.length);
    await userEvent.click(screen.getByRole('button', { name: '+ Neue Kategorie' }));
    expect(screen.getAllByPlaceholderText('Name')).toHaveLength(before + 1);
  });

  it('deletes an unused category immediately without a dialog', async () => {
    const doc = setupDoc();
    // 'Sondertag' default has no keywords and no events → unused.
    const target = doc.categories.find((c) => c.label === 'Sondertag')!;
    render(<CategoriesTab />);
    await userEvent.click(screen.getByRole('button', { name: `${target.label} löschen` }));
    expect(screen.queryByText('Kategorie löschen')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Sondertag')).not.toBeInTheDocument();
  });

  it('opens the reassign dialog when deleting a category in use', async () => {
    const doc = setupDoc();
    const target = doc.categories[0];
    usePlannerStore.getState().addEvent({
      id: 'e1',
      title: 'X',
      start: '2026-09-15',
      end: '2026-09-15',
      allDay: true,
      categoryId: target.id,
      groups: []
    });
    render(<CategoriesTab />);
    await userEvent.click(screen.getByRole('button', { name: `${target.label} löschen` }));
    expect(screen.getByText('Kategorie löschen')).toBeInTheDocument();
  });
});
