import { useState, useEffect } from 'react';

type ScrollDirection = 'up' | 'down' | 'stable';

/**
 * Tracks the direction of scrolling on a target element (or window by default).
 * IMPORTANT: pass the actual scrolling element when the page uses an inner
 * `overflow-y-auto` container — otherwise no scroll events fire and direction
 * stays 'stable'.
 */
export const useScrollDirection = (
  threshold: number = 10,
  target?: HTMLElement | Window | null
) => {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('stable');
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const el: HTMLElement | Window =
      target ?? (typeof window !== 'undefined' ? window : (null as unknown as Window));
    if (!el) return;

    const getY = () =>
      el === window
        ? window.pageYOffset
        : (el as HTMLElement).scrollTop;

    const updateScrollDirection = () => {
      const scrollY = getY();
      if (Math.abs(scrollY - lastScrollY) < threshold) return;
      setScrollDirection(scrollY > lastScrollY ? 'down' : 'up');
      setLastScrollY(scrollY > 0 ? scrollY : 0);
    };

    el.addEventListener('scroll', updateScrollDirection, { passive: true } as AddEventListenerOptions);
    return () => el.removeEventListener('scroll', updateScrollDirection);
  }, [lastScrollY, threshold, target]);

  return scrollDirection;
};
