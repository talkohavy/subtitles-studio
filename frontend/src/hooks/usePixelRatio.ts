import { useSyncExternalStore } from 'react';

/**
 * Canvases sharper than this cost more memory and drawing time without looking any different.
 */
const MAX_PIXEL_RATIO = 2;

function subscribe(onChange: () => void) {
  let query: MediaQueryList | null = null;

  function listen() {
    query?.removeEventListener('change', handleChange);
    query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener('change', handleChange);
  }

  function handleChange() {
    listen();
    onChange();
  }

  listen();

  return () => query?.removeEventListener('change', handleChange);
}

function getSnapshot(): number {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

  return pixelRatio;
}

/**
 * The pixel ratio to draw canvases at. Updates when the window moves to another screen or the page is zoomed.
 */
export function usePixelRatio(): number {
  const pixelRatio = useSyncExternalStore(subscribe, getSnapshot);

  return pixelRatio;
}
