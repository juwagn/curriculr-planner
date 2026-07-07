import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorOverflowMenu } from './EditorOverflowMenu';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';

beforeEach(() => {
  const doc = createEmptyDoc('Testplan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  usePlannerStore.setState({ doc });
  useUiStore.setState({ helpOpen: false, settingsModalOpen: false });
});

async function openMenu() {
  render(<EditorOverflowMenu />);
  await userEvent.click(screen.getByRole('button', { name: 'Weitere Optionen' }));
}

describe('EditorOverflowMenu', () => {
  it('lists export options, Hilfe and Einstellungen', async () => {
    await openMenu();
    expect(screen.getByText('ICS-Datei (.ics)')).toBeInTheDocument();
    expect(screen.getByText('JSON-Backup (.json)')).toBeInTheDocument();
    expect(screen.getByText('Excel-Konverter-Format (.xlsx)')).toBeInTheDocument();
    expect(screen.getByText('PDF / Druck')).toBeInTheDocument();
    expect(screen.getByText('Hilfe')).toBeInTheDocument();
    expect(screen.getByText('Einstellungen')).toBeInTheDocument();
  });

  it('opens help on click', async () => {
    await openMenu();
    await userEvent.click(screen.getByText('Hilfe'));
    expect(useUiStore.getState().helpOpen).toBe(true);
  });

  it('opens settings on click', async () => {
    await openMenu();
    await userEvent.click(screen.getByText('Einstellungen'));
    expect(useUiStore.getState().settingsModalOpen).toBe(true);
  });

  it('opens the print dialog on "PDF / Druck"', async () => {
    await openMenu();
    await userEvent.click(screen.getByText('PDF / Druck'));
    expect(useUiStore.getState().printDialogOpen).toBe(true);
  });
});
