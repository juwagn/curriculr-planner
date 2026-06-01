import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Eltern Abend')).toBe('eltern-abend');
  });

  it('transliterates German umlauts and ß', () => {
    expect(slugify('Prüfung Größe Schließtag')).toBe('pruefung-groesse-schliesstag');
  });

  it('strips other special characters', () => {
    expect(slugify('AG / Wahl (Jg. 10)!')).toBe('ag-wahl-jg-10');
  });

  it('collapses and trims dashes', () => {
    expect(slugify('  --Fest  &  Feier-- ')).toBe('fest-feier');
  });

  it('returns empty string for empty or symbol-only input', () => {
    expect(slugify('')).toBe('');
    expect(slugify('***')).toBe('');
  });
});
