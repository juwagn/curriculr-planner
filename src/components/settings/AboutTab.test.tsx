import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AboutTab } from './AboutTab';

describe('AboutTab', () => {
  it('shows the current version and developer credit', () => {
    render(<AboutTab />);
    // 1.2.0 appears in both the header and the changelog list
    expect(screen.getAllByText('1.2.0').length).toBeGreaterThan(0);
    expect(screen.getByText(/Julian Wagner/)).toBeInTheDocument();
    expect(screen.getByText(/Curricular/)).toBeInTheDocument();
  });

  it('links to the GitHub repository', () => {
    render(<AboutTab />);
    const repoLink = screen.getByRole('link', { name: 'Quellcode auf GitHub' });
    expect(repoLink).toHaveAttribute(
      'href',
      'https://github.com/juwagn/curriculr-planner',
    );
  });

  it('renders the changelog with the latest release highlights', () => {
    render(<AboutTab />);
    expect(
      screen.getByRole('heading', { name: 'Änderungsverlauf' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Termin-Vorlagen/)).toBeInTheDocument();
    expect(screen.getAllByText(/Schuljahr-Grid/).length).toBeGreaterThan(0);
  });
});
