import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';
import { useUiStore } from '@/stores/ui';

describe('SettingsModal sizing', () => {
  beforeEach(() => {
    cleanup();
    useUiStore.setState({ settingsModalOpen: true, settingsTab: 'publish' });
  });

  it('applies a fixed height so the box does not resize per tab', () => {
    render(<SettingsModal />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('h-[min(680px,90vh)]');
  });

  it('uses the same height class regardless of active tab', () => {
    useUiStore.setState({ settingsTab: 'publish' });
    render(<SettingsModal />);
    const short = screen.getByRole('dialog').className;
    cleanup();
    useUiStore.setState({ settingsModalOpen: true, settingsTab: 'info' });
    render(<SettingsModal />);
    const tall = screen.getByRole('dialog').className;
    expect(tall).toBe(short);
  });
});
