import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useUiStore } from '@/stores/ui';
import { HelpModal } from './HelpModal';

describe('HelpModal', () => {
  beforeEach(() => {
    useUiStore.setState({ helpOpen: true, tourPending: false });
  });

  it('renders when helpOpen is true', () => {
    render(<HelpModal />);
    expect(screen.getByText('Hilfe')).toBeInTheDocument();
  });

  it('does not render when helpOpen is false', () => {
    useUiStore.setState({ helpOpen: false });
    render(<HelpModal />);
    expect(screen.queryByText('Hilfe')).not.toBeInTheDocument();
  });

  it('shows Erste Schritte section by default', () => {
    render(<HelpModal />);
    expect(screen.getByTestId('section-start')).toBeInTheDocument();
  });

  it('switches to Termine section on nav click', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: /Termine & Kategorien/i }));
    expect(screen.getByTestId('section-events')).toBeInTheDocument();
  });

  it('switches to Ansichten section on nav click', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: /Ansichten/i }));
    expect(screen.getByTestId('section-views')).toBeInTheDocument();
  });

  it('switches to Vorlagen section on nav click', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: /Vorlagen/i }));
    expect(screen.getByTestId('section-templates')).toBeInTheDocument();
  });

  it('switches to Export section on nav click', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: /Export & Backup/i }));
    expect(screen.getByTestId('section-export')).toBeInTheDocument();
  });

  it('tour CTA closes help and sets tourPending', () => {
    render(<HelpModal />);
    fireEvent.click(screen.getByRole('button', { name: /Geführte Tour starten/i }));
    expect(useUiStore.getState().helpOpen).toBe(false);
    expect(useUiStore.getState().tourPending).toBe(true);
  });
});
