import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordpressTab } from './WordpressTab';
import { useWpSyncStore } from '@/stores/wpSync';
import { EMPTY_CONFIG } from '@/lib/wp-sync-config';

beforeEach(() => {
  localStorage.clear();
  useWpSyncStore.setState({ config: structuredClone(EMPTY_CONFIG), syncState: 'idle', message: '', conflict: null });
});

describe('WordpressTab', () => {
  it('toggles enabled and persists it', () => {
    render(<WordpressTab />);
    const checkbox = screen.getByRole('checkbox');
    expect(useWpSyncStore.getState().config.enabled).toBe(false);
    fireEvent.click(checkbox);
    expect(useWpSyncStore.getState().config.enabled).toBe(true);
    expect(JSON.parse(localStorage.getItem('curriculr-planner:wp-sync')!).enabled).toBe(true);
  });
  it('stores the WordPress address', () => {
    render(<WordpressTab />);
    fireEvent.change(screen.getByPlaceholderText('https://schule.example'), { target: { value: 'https://x.de' } });
    expect(useWpSyncStore.getState().config.baseUrl).toBe('https://x.de');
  });
});
