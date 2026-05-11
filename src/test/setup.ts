import "@testing-library/jest-dom";
import { vi } from "vitest";

// jsdom: simulate desktop by default; tests that need mobile call setMobileViewport()
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("max-width") ? window.innerWidth < 768 : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Smooth scroll & rAF polyfills used by some libs
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 0) as unknown as number;
  window.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// Always silence noisy logs we explicitly assert against
vi.spyOn(console, "error").mockImplementation(() => {});
