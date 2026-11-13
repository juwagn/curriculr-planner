import { describe, it, expect } from 'vitest';
import { normalizeGroups, addGroup, removeGroup, hasGroup, resolveGroupName } from './groups';

describe('groups helpers', () => {
  it('normalizeGroups trims, drops empties and dedupes case-insensitively (first wins)', () => {
    expect(normalizeGroups([' Eltern ', 'eltern', '', '   ', 'Kollegium', 'ELTERN'])).toEqual(['Eltern', 'Kollegium']);
  });

  it('addGroup appends a trimmed new name and ignores duplicates or blanks', () => {
    expect(addGroup(['Eltern'], ' Sek II ')).toEqual(['Eltern', 'Sek II']);
    expect(addGroup(['Eltern'], ' eltern ')).toEqual(['Eltern']);
    expect(addGroup(['Eltern'], '   ')).toEqual(['Eltern']);
  });

  it('removeGroup removes every case variant', () => {
    expect(removeGroup(['Kollegium', 'eltern'], ' Eltern ')).toEqual(['Kollegium']);
  });

  it('hasGroup compares trimmed and case-insensitively', () => {
    expect(hasGroup([' ELTERN'], 'eltern')).toBe(true);
    expect(hasGroup(['Kollegium'], 'Eltern')).toBe(false);
  });

  it('resolveGroupName reuses the spelling from the available list, else the fallback', () => {
    expect(resolveGroupName(['Kollegium', ' ELTERN '], 'Eltern')).toBe('ELTERN');
    expect(resolveGroupName(['Kollegium'], 'Eltern')).toBe('Eltern');
  });
});
