import '@testing-library/jest-dom';

// Node.js v26 defines `localStorage` on globalThis as `undefined`, which
// prevents vitest from forwarding jsdom's localStorage onto the test global.
// Re-establish it from the jsdom instance vitest exposes as `globalThis.jsdom`.
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

// Radix's DropdownMenu calls hasPointerCapture, releasePointerCapture, and
// scrollIntoView when opening. jsdom v29 doesn't implement these, so polyfill them.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
