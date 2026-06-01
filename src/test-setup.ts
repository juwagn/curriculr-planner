import '@testing-library/jest-dom';

// Node.js v26 defines `localStorage` on globalThis as `undefined` (without
// --localstorage-file), which prevents vitest from forwarding jsdom's
// localStorage onto the global. Re-establish it from the jsdom instance that
// vitest exposes as `globalThis.jsdom`.
// See: https://github.com/vitest-dev/vitest/issues/xxxx
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dom: { window: Window } | undefined = (globalThis as any).jsdom;
  if (dom?.window?.localStorage != null) {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      enumerable: true,
      get: () => dom.window.localStorage,
    });
  }
}
