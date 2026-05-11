import { vi } from "vitest";

/** Force the useIsMobile hook to a given viewport width. */
export const setMobileViewport = (width = 390, height = 844) => {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event("resize"));
};

export const setDesktopViewport = () => setMobileViewport(1280, 800);

/** Mock all browser-side hooks that depend on window APIs we don't care about in unit tests. */
export const mockMobileHooks = () => {
  vi.mock("@/hooks/useScrollDirection", () => ({
    useScrollDirection: () => "up",
  }));
  vi.mock("@/hooks/useVirtualKeyboard", () => ({
    useVirtualKeyboard: () => ({ isVisible: false }),
  }));
};
