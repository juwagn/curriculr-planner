import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventModal } from './EventModal';
import { createEmptyDoc, usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';

function setup(availableGroups?: string[]) {
  const doc = createEmptyDoc('Muster-Gesamtschule', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  if (availableGroups) doc.availableGroups = availableGroups;
  usePlannerStore.setState({ doc });
  useUiStore.setState({ eventModalState: { open: true, mode: 'create', presetDate: '2026-09-22' } });
  render(<EventModal />);
}

async function saveWithTitle(title: string) {
  await userEvent.type(screen.getByLabelText(/Titel/), title);
  await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
  return usePlannerStore.getState().doc!.events[0];
}

describe('EventModal Gruppen', () => {
  beforeEach(() => {
    usePlannerStore.setState({ doc: null });
    useUiStore.setState({ eventModalState: { open: false } });
  });

  it('Schalter Eltern an: gespeicherter Termin enthält Eltern', async () => {
    setup();
    const sw = screen.getByRole('checkbox', { name: 'Eltern' });
    expect(sw).not.toBeChecked();
    await userEvent.click(sw);
    expect(sw).toBeChecked();
    expect((await saveWithTitle('Elternabend')).groups).toEqual(['Eltern']);
  });

  it('Schalter Eltern aus: Gruppe wird entfernt', async () => {
    setup();
    const sw = screen.getByRole('checkbox', { name: 'Eltern' });
    await userEvent.click(sw);
    await userEvent.click(sw);
    expect(sw).not.toBeChecked();
    expect((await saveWithTitle('Konferenz')).groups).toEqual([]);
  });

  it('zusätzliche Eingabe " eltern " erzeugt kein Duplikat', async () => {
    setup();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Eltern' }));
    await userEvent.type(screen.getByPlaceholderText(/Eigene Gruppe/), ' eltern {Enter}');
    expect((await saveWithTitle('Elternabend')).groups).toEqual(['Eltern']);
  });

  it('übernimmt vorhandene Schreibweise aus availableGroups', async () => {
    setup(['Kollegium', 'ELTERN']);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Eltern' }));
    expect((await saveWithTitle('Elternabend')).groups).toEqual(['ELTERN']);
  });

  it('Schalter leitet sich aus groups ab (Chip schaltet ihn mit)', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Eltern' }));
    expect(screen.getByRole('checkbox', { name: 'Eltern' })).toBeChecked();
  });
});

describe('EventModal Bearbeiten', () => {
  it('Schalter an bei eltern/ELTERN; ausschalten entfernt alle Schreibweisen', async () => {
    const doc = createEmptyDoc('Muster-Gesamtschule', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
    doc.events = [
      {
        id: 'e1',
        title: 'Elternabend',
        start: '2026-09-22',
        end: '2026-09-22',
        allDay: true,
        categoryId: doc.categories[0].id,
        groups: ['eltern', 'ELTERN', 'Kollegium']
      }
    ];
    usePlannerStore.setState({ doc });
    useUiStore.setState({ eventModalState: { open: true, mode: 'edit', eventId: 'e1' } });
    render(<EventModal />);
    const sw = screen.getByRole('checkbox', { name: 'Eltern' });
    expect(sw).toBeChecked();
    await userEvent.click(sw);
    expect(sw).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(usePlannerStore.getState().doc!.events[0].groups).toEqual(['Kollegium']);
  });

  it('Chip Eltern zweimal klicken: Schalter danach nicht mehr aktiv', async () => {
    setup();
    const chip = screen.getByRole('button', { name: 'Eltern' });
    await userEvent.click(chip);
    await userEvent.click(chip);
    expect(screen.getByRole('checkbox', { name: 'Eltern' })).not.toBeChecked();
  });
});

describe('EventModal Labels', () => {
  it('Felder sind per Label auffindbar', () => {
    setup();
    expect(screen.getByLabelText('Startdatum')).toBeInTheDocument();
    expect(screen.getByLabelText('Endedatum')).toBeInTheDocument();
    expect(screen.getByLabelText('Bemerkung')).toBeInTheDocument();
    expect(screen.getByLabelText('Kategorie')).toBeInTheDocument();
  });
});
