import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandPanel } from './BrandPanel';

describe('BrandPanel', () => {
  it('logged out with empty baseUrl: shows address field + disabled login', () => {
    render(<BrandPanel authed={false} userName={null} groups={[]} baseUrl="" onBaseUrlChange={() => {}} onLogin={() => {}} onLogout={() => {}} />);
    expect(screen.getByPlaceholderText(/schule/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /anmelden/i })).toBeDisabled();
  });

  it('logged out with baseUrl: login enabled, calls onLogin', () => {
    const onLogin = vi.fn();
    render(<BrandPanel authed={false} userName={null} groups={[]} baseUrl="https://schule.example" onBaseUrlChange={() => {}} onLogin={onLogin} onLogout={() => {}} />);
    const btn = screen.getByRole('button', { name: /anmelden/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onLogin).toHaveBeenCalled();
  });

  it('logged in: shows name + group + logout', () => {
    const onLogout = vi.fn();
    render(<BrandPanel authed userName="Martina Weber" groups={['Schulleitung']} baseUrl="https://schule.example" onBaseUrlChange={() => {}} onLogin={() => {}} onLogout={onLogout} />);
    expect(screen.getByText('Martina Weber')).toBeInTheDocument();
    expect(screen.getByText(/Schulleitung/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /abmelden/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});
