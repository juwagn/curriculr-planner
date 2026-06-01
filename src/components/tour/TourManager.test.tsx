import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useUiStore } from '@/stores/ui';

// vi.hoisted ensures mockDrive is available inside the vi.mock factory
// (vi.mock calls are hoisted before variable declarations by Vitest)
const { mockDrive, mockDriver } = vi.hoisted(() => ({
  mockDrive: vi.fn(),
  mockDriver: vi.fn(() => ({ drive: vi.fn() })),
}));

vi.mock('driver.js', () => ({ driver: mockDriver }));
vi.mock('driver.js/dist/driver.css', () => ({}));

import { TourManager } from './TourManager';

describe('TourManager', () => {
  beforeEach(() => {
    useUiStore.setState({ tourPending: false });
    mockDriver.mockClear();
    mockDrive.mockClear();
    // Reset mockDriver to return a fresh drive spy each call
    mockDriver.mockImplementation(() => ({ drive: mockDrive }));
  });

  it('does not start tour when tourPending is false', () => {
    render(<TourManager />);
    expect(mockDriver).not.toHaveBeenCalled();
  });

  it('starts tour when tourPending is true', () => {
    useUiStore.setState({ tourPending: true });
    render(<TourManager />);
    expect(mockDriver).toHaveBeenCalledOnce();
    expect(mockDrive).toHaveBeenCalledOnce();
  });

  it('clears tourPending immediately after starting', () => {
    useUiStore.setState({ tourPending: true });
    render(<TourManager />);
    expect(useUiStore.getState().tourPending).toBe(false);
  });
});
