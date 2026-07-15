import { describe, it, expect, beforeEach } from 'vitest';
import { loadWpConfig, saveWpConfig, sjKeyFromLabel, EMPTY_CONFIG } from './wp-sync-config';

beforeEach(() => localStorage.clear());

describe('wp-sync-config', () => {
  it('returns an empty, disabled config when nothing is stored', () => {
    expect(loadWpConfig()).toEqual(EMPTY_CONFIG);
    expect(loadWpConfig().enabled).toBe(false);
  });
  it('round-trips a saved config', () => {
    const cfg = { enabled: true, baseUrl: 'https://s.example',
      links: { 'doc-1': { schoolyearKey: 'sj_2026_27', schoolyearLabel: '2026/27', stage: 'entwurf' as const, knownVersion: 3 } } };
    saveWpConfig(cfg);
    expect(loadWpConfig()).toEqual(cfg);
  });
  it('tolerates corrupt JSON and returns the empty config', () => {
    localStorage.setItem('curriculr-planner:wp-sync', '{not json');
    expect(loadWpConfig()).toEqual(EMPTY_CONFIG);
  });
  it('fills missing fields with safe defaults', () => {
    localStorage.setItem('curriculr-planner:wp-sync', JSON.stringify({ enabled: true }));
    const cfg = loadWpConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.baseUrl).toBe('');
    expect(cfg.links).toEqual({});
  });
});

describe('sjKeyFromLabel', () => {
  it('derives a stable key from the schoolyear label', () => {
    expect(sjKeyFromLabel('2026/27')).toBe('sj_2026_27');
  });
  it('collapses whitespace and separators', () => {
    expect(sjKeyFromLabel('Schuljahr  2026 / 27')).toBe('sj_schuljahr_2026_27');
  });
  it('transliterates German umlauts', () => {
    expect(sjKeyFromLabel('Übergänge 25/26')).toBe('sj_uebergaenge_25_26');
  });
  it('strips leading/trailing separators', () => {
    expect(sjKeyFromLabel('-2026/27-')).toBe('sj_2026_27');
  });
  it('returns empty string for empty/unusable labels', () => {
    expect(sjKeyFromLabel('')).toBe('');
    expect(sjKeyFromLabel('///')).toBe('');
  });
});
