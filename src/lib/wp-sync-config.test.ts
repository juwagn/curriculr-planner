import { describe, it, expect, beforeEach } from 'vitest';
import { loadWpConfig, saveWpConfig, EMPTY_CONFIG } from './wp-sync-config';

beforeEach(() => localStorage.clear());

describe('wp-sync-config', () => {
  it('returns an empty, disabled config when nothing is stored', () => {
    expect(loadWpConfig()).toEqual(EMPTY_CONFIG);
    expect(loadWpConfig().enabled).toBe(false);
  });
  it('round-trips a saved config', () => {
    const cfg = { enabled: true, baseUrl: 'https://s.example', username: 'a', appPassword: 'p',
      links: { 'doc-1': { schoolyearKey: 'sj_2026_27', wpProfileId: 'p2', stage: 'entwurf' as const, knownVersion: 3 } } };
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
