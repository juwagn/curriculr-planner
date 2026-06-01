import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './ui';

describe('ui store — help & tour flags', () => {
  beforeEach(() => {
    useUiStore.setState({
      helpOpen: false,
      tourPending: false,
    });
  });

  it('openHelp sets helpOpen true', () => {
    useUiStore.getState().openHelp();
    expect(useUiStore.getState().helpOpen).toBe(true);
  });

  it('closeHelp sets helpOpen false', () => {
    useUiStore.setState({ helpOpen: true });
    useUiStore.getState().closeHelp();
    expect(useUiStore.getState().helpOpen).toBe(false);
  });

  it('setTourPending(true) sets flag', () => {
    useUiStore.getState().setTourPending(true);
    expect(useUiStore.getState().tourPending).toBe(true);
  });

  it('setTourPending(false) clears flag', () => {
    useUiStore.setState({ tourPending: true });
    useUiStore.getState().setTourPending(false);
    expect(useUiStore.getState().tourPending).toBe(false);
  });
});
