import { describe, it, expect } from 'vitest';
import { contrastColor, pastelize } from './colors';

describe('contrastColor', () => {
  it('returns black on light background', () => {
    expect(contrastColor('#FFFFFF')).toBe('#000000');
  });
  it('returns white on dark background', () => {
    expect(contrastColor('#00345C')).toBe('#FFFFFF');
  });
});

describe('pastelize', () => {
  it('lightens a strong color', () => {
    const result = pastelize('#FF0000');
    expect(result).toMatch(/^#[0-9A-F]{6}$/i);
    expect(result).not.toBe('#FF0000');
  });
});
