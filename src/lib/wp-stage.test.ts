import { describe, it, expect } from 'vitest';
import { nextStage, availableActions, STAGE_LABELS } from './wp-stage';

describe('wp-stage', () => {
  it('labels all three stages in German', () => {
    expect(STAGE_LABELS.entwurf).toBe('Entwurf');
    expect(STAGE_LABELS.genehmigt).toBe('Genehmigt');
    expect(STAGE_LABELS.oeffentlich).toBe('Öffentlich');
  });
  it('freigeben moves entwurf -> genehmigt only', () => {
    expect(nextStage('entwurf', 'freigeben')).toBe('genehmigt');
    expect(nextStage('genehmigt', 'freigeben')).toBeNull();
    expect(nextStage('oeffentlich', 'freigeben')).toBeNull();
  });
  it('oeffentlich-schalten moves genehmigt -> oeffentlich only', () => {
    expect(nextStage('genehmigt', 'oeffentlich-schalten')).toBe('oeffentlich');
    expect(nextStage('entwurf', 'oeffentlich-schalten')).toBeNull();
  });
  it('exposes the available action per stage', () => {
    expect(availableActions('entwurf')).toEqual(['freigeben']);
    expect(availableActions('genehmigt')).toEqual(['oeffentlich-schalten']);
    expect(availableActions('oeffentlich')).toEqual([]);
  });
});
