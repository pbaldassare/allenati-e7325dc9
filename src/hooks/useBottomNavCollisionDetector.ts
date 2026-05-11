import { useEffect } from "react";

/**
 * Dev-only regression detector.
 * Scans visible interactive elements (button, [role=button], a) and logs a warning
 * when their bounding rect overlaps the BottomNav, signalling a CTA covered by the nav.
 *
 * No-op in production. Throttled to one scan per 1.5s.
 */
export const useBottomNavCollisionDetector = (
  navRef: React.RefObject<HTMLElement>,
  options: { enabled?: boolean; intervalMs?: number; tolerance?: number } = {}
) => {
  const { enabled = import.meta.env.DEV, intervalMs = 1500, tolerance = 4 } = options;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const seen = new Set<string>();

    const scan = () => {
      const navEl = navRef.current;
      if (!navEl) return;

      // If the nav is hidden (e.g. translate-y-full when keyboard is up), skip.
      const navRect = navEl.getBoundingClientRect();
      if (navRect.top >= window.innerHeight - 4) return;

      const candidates = document.querySelectorAll<HTMLElement>(
        'button, [role="button"], a[href], input[type="submit"]'
      );

      candidates.forEach((el) => {
        if (navEl.contains(el)) return;
        if (el.closest('[role="dialog"], [data-vaul-drawer]')) return; // drawers/dialogs overlay nav
        if (el.offsetParent === null) return; // not visible

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        if (rect.bottom <= navRect.top + tolerance) return;
        if (rect.top >= navRect.bottom) return;

        // Build a stable signature so we don't spam the console.
        const sig = `${el.tagName}:${el.textContent?.trim().slice(0, 40)}:${Math.round(rect.top)}`;
        if (seen.has(sig)) return;
        seen.add(sig);

        // eslint-disable-next-line no-console
        console.warn(
          "[BottomNavCollision] CTA potenzialmente coperta dalla BottomNav",
          {
            element: el,
            text: el.textContent?.trim().slice(0, 60),
            rect: { top: rect.top, bottom: rect.bottom },
            navTop: navRect.top,
          }
        );
      });
    };

    const id = window.setInterval(scan, intervalMs);
    // Initial scan after layout.
    const raf = window.requestAnimationFrame(() => window.setTimeout(scan, 300));

    return () => {
      window.clearInterval(id);
      window.cancelAnimationFrame(raf);
    };
  }, [navRef, enabled, intervalMs, tolerance]);
};
