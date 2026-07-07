import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorToolbar } from './EditorToolbar';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';

beforeEach(() => {
  const doc = createEmptyDoc('Testplan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  doc.schoolyear.quarterBoundaries = ['2026-10-31', '2027-01-31', '2027-04-30'];
  usePlannerStore.setState({ doc });
  useUiStore.setState({ viewMode: 'table', currentQuarter: 1 });
});

describe('EditorToolbar', () => {
  it('renders the view toggle with the view-toggle tour anchor', () => {
    render(<EditorToolbar />);
    const toggle = document.querySelector('[data-tour="view-toggle"]');
    expect(toggle).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Tabelle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schuljahr' })).toBeInTheDocument();
  });

  it('switches to year view on click', async () => {
    render(<EditorToolbar />);
    await userEvent.click(screen.getByRole('button', { name: 'Schuljahr' }));
    expect(useUiStore.getState().viewMode).toBe('year');
  });

  it('renders Notizen with an svg icon, not an emoji', () => {
    render(<EditorToolbar />);
    const notizenBtn = screen.getByRole('button', { name: /Notizen/i });
    expect(notizenBtn.textContent).not.toMatch(/📝/);
    expect(notizenBtn.querySelector('svg')).not.toBeNull();
  });
});
