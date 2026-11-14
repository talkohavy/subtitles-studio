import { useLayoutEffect, useState, type RefObject } from 'react';

type ElementSize = {
  width: number;
  height: number;
};

/**
 * The element's content size, kept up to date as it resizes.
 */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;

      if (!rect) return;

      setSize((previous) =>
        previous.width === rect.width && previous.height === rect.height
          ? previous
          : { width: rect.width, height: rect.height },
      );
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return size;
}
