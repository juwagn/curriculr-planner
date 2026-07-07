import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorOverflowMenu } from './EditorOverflowMenu';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no concept of the `download` attribute — a real anchor.click()
  // logs "Not implemented: navigation to another Document" for each export test.
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const doc = createEmptyDoc('Testplan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  usePlannerStore.setState({ doc });
  useUiStore.setState({ helpOpen: false, settingsModalOpen: false, printDialogOpen: false });
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

  it('exports ICS on click', async () => {
    await openMenu();
    await userEvent.click(screen.getByText('ICS-Datei (.ics)'));
    expect(toast.success).toHaveBeenCalledWith('ICS heruntergeladen');
  });

  it('exports JSON-Backup on click', async () => {
    await openMenu();
    await userEvent.click(screen.getByText('JSON-Backup (.json)'));
    expect(toast.success).toHaveBeenCalledWith('Backup heruntergeladen');
  });

  it('exports Excel on click', async () => {
    await openMenu();
    await userEvent.click(screen.getByText('Excel-Konverter-Format (.xlsx)'));
    expect(toast.success).toHaveBeenCalledWith('Excel heruntergeladen');
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
