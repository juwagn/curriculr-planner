import { describe, it, expect, beforeEach } from 'vitest';
import { applyPrintOrientation } from './print-orientation';

const STYLE_ID = 'curriculr-print-page';

describe('applyPrintOrientation', () => {
  beforeEach(() => {
    document.getElementById(STYLE_ID)?.remove();
  });

  it('injects @page landscape rule', () => {
    applyPrintOrientation('landscape');
    const style = document.getElementById(STYLE_ID);
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain('A4 landscape');
  });

  it('injects @page portrait rule', () => {
    applyPrintOrientation('portrait');
    const style = document.getElementById(STYLE_ID);
    expect(style?.textContent).toContain('A4 portrait');
  });

  it('replaces existing rule when called twice', () => {
    applyPrintOrientation('landscape');
    applyPrintOrientation('portrait');
    const styles = document.querySelectorAll(`#${STYLE_ID}`);
    expect(styles.length).toBe(1);
    expect(styles[0].textContent).toContain('A4 portrait');
  });
});
