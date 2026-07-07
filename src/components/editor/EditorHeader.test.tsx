import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorHeader } from './EditorHeader';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useWpSyncStore } from '@/stores/wpSync';

const noop = () => {};

beforeEach(() => {
  const doc = createEmptyDoc('Testplan', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  usePlannerStore.setState({ doc, savingState: 'idle' });
  useUiStore.setState({ viewMode: 'table' });
  useAuthStore.setState({ status: 'unauthenticated', claims: null, token: null });
  useWpSyncStore.setState({ config: { enabled: false, baseUrl: '', links: {} } });
});

describe('EditorHeader', () => {
  it('has no standalone Hilfe/Einstellungen/Export buttons, only the overflow trigger', () => {
    render(<EditorHeader onSwitchPlan={noop} />);
    expect(screen.queryByRole('button', { name: 'Hilfe' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Einstellungen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Export/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Weitere Optionen' })).toBeInTheDocument();
  });

  it('does not render the view-toggle in the header (moved to toolbar)', () => {
    render(<EditorHeader onSwitchPlan={noop} />);
    expect(document.querySelector('header [data-tour="view-toggle"]')).toBeNull();
  });

  it('shows save status without a separate presence pill', () => {
    render(<EditorHeader onSwitchPlan={noop} />);
    expect(screen.getByText('Gespeichert')).toBeInTheDocument();
    expect(screen.queryByText(/hat.*gespeichert$/)).not.toBeInTheDocument();
  });
});
