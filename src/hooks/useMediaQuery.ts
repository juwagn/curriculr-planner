import { useSyncExternalStore } from 'react';

/** Subscribes to a CSS media query. Falls back to `false` where matchMedia is missing (jsdom, SSR). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false
  );
}

/** Below 1024 px the week table is replaced by the agenda list (design rule: responsive work surfaces). */
export const NARROW_QUERY = '(max-width: 1023.98px)';
export function useIsNarrow(): boolean {
  return useMediaQuery(NARROW_QUERY);
}
