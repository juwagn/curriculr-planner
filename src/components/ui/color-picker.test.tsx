import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorPicker } from './color-picker';
import { CATEGORY_PALETTE } from '@/lib/colors';

describe('ColorPicker', () => {
  it('renders one swatch per palette color', () => {
    render(<ColorPicker value={CATEGORY_PALETTE[0]} onChange={() => {}} />);
    for (const c of CATEGORY_PALETTE) {
      expect(screen.getByRole('button', { name: c })).toBeInTheDocument();
    }
  });

  it('marks the active swatch via aria-pressed', () => {
    render(<ColorPicker value={CATEGORY_PALETTE[2]} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: CATEGORY_PALETTE[2] })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: CATEGORY_PALETTE[0] })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('calls onChange when a preset swatch is clicked', async () => {
    const onChange = vi.fn();
    render(<ColorPicker value={CATEGORY_PALETTE[0]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: CATEGORY_PALETTE[4] }));
    expect(onChange).toHaveBeenCalledWith(CATEGORY_PALETTE[4]);
  });
});
