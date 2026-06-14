import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Welcome } from './Welcome';

vi.mock('@/lib/storage', () => ({
  storage: {
    listDocs: vi.fn().mockResolvedValue([
      { id: 'sy1', name: 'Mein Plan', schoolyearLabel: '2026/27', eventCount: 12, lastSaved: '2026-06-12T09:00:00Z' },
    ]),
  },
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn((selector) => selector({ status: 'unauthenticated', claims: null, token: null, logout: vi.fn() })),
}));

vi.mock('@/stores/wpSync', () => ({
  useWpSyncStore: vi.fn((selector) => selector({
    config: { enabled: false, baseUrl: '', links: {} },
    syncState: 'idle',
    message: '',
    setConfig: vi.fn(),
    loadFromWp: vi.fn().mockResolvedValue('loaded'),
  })),
}));

vi.mock('@/stores/planner', () => ({
  usePlannerStore: vi.fn((selector) => selector({ setDoc: vi.fn() })),
  createEmptyDoc: vi.fn(() => ({ categories: [{ id: 'c1', slug: 'sondertag', name: 'Sondertag', color: '#000', isDefault: false }] })),
}));

vi.mock('@/lib/wp-sync', () => ({
  fetchDocList: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('@/lib/wp-auth-actions', () => ({
  startIservLogin: vi.fn(),
  iservLogout: vi.fn(),
}));

const noop = () => {};
function renderWelcome(over: Record<string, unknown> = {}) {
  return render(
    <Welcome onCreateNew={noop} onOpenDoc={noop} onImportJson={noop} onStartTour={noop} onEnterEditor={noop} {...over} />,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('Welcome', () => {
  it('shows the three source buttons', () => {
    renderWelcome();
    expect(screen.getByRole('button', { name: /Dieses Gerät/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /WordPress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Neu/i })).toBeInTheDocument();
  });

  it('local source lists saved plans and opens one', async () => {
    const onOpenDoc = vi.fn();
    renderWelcome({ onOpenDoc });
    await waitFor(() => expect(screen.getByText('Mein Plan')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /öffnen/i }));
    expect(onOpenDoc).toHaveBeenCalledWith('sy1');
  });

  it('"Neu" source exposes create / ICS / demo / tour and NO Excel', () => {
    const onCreateNew = vi.fn();
    renderWelcome({ onCreateNew });
    fireEvent.click(screen.getByRole('button', { name: /^Neu$/i }));
    expect(screen.getByRole('button', { name: /Neuen Jahresplan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ICS/i })).toBeInTheDocument();
    expect(screen.queryByText(/Excel/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Neuen Jahresplan/i }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it('WordPress source while logged out prompts to log in', () => {
    renderWelcome();
    fireEvent.click(screen.getByRole('button', { name: /WordPress/i }));
    expect(screen.getByText(/anmelden/i)).toBeInTheDocument();
  });
});
