import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useBottomNavCollisionDetector } from "@/hooks/useBottomNavCollisionDetector";

const installNav = (top: number, bottom: number) => {
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Navigazione principale mobile");
  nav.getBoundingClientRect = () =>
    ({ top, bottom, left: 0, right: 390, width: 390, height: bottom - top, x: 0, y: top, toJSON: () => ({}) } as DOMRect);
  document.body.appendChild(nav);
  return nav;
};

const installButton = (label: string, top: number, bottom: number) => {
  const b = document.createElement("button");
  b.textContent = label;
  // jsdom: offsetParent === null unless attached. Attaching to body is enough.
  document.body.appendChild(b);
  Object.defineProperty(b, "offsetParent", { configurable: true, get: () => document.body });
  b.getBoundingClientRect = () =>
    ({ top, bottom, left: 10, right: 100, width: 90, height: bottom - top, x: 10, y: top, toJSON: () => ({}) } as DOMRect);
  return b;
};

describe("useBottomNavCollisionDetector", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers();
  });

  it("warns when a button overlaps the BottomNav rect", async () => {
    const nav = installNav(764, 844); // nav occupies bottom 80px
    installButton("Salva", 770, 810); // CTA inside nav band → collision

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement>(nav);
      useBottomNavCollisionDetector(ref, { enabled: true, intervalMs: 100 });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(warnSpy).toHaveBeenCalled();
    const call = warnSpy.mock.calls.find((c) => String(c[0]).includes("BottomNavCollision"));
    expect(call?.[1]).toMatchObject({ text: "Salva" });

    unmount();
  });

  it("does NOT warn for buttons safely above the BottomNav", async () => {
    const nav = installNav(764, 844);
    installButton("Conferma", 100, 150); // far above the nav

    renderHook(() => {
      const ref = useRef<HTMLElement>(nav);
      useBottomNavCollisionDetector(ref, { enabled: true, intervalMs: 100 });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const collisionCalls = warnSpy.mock.calls.filter((c) =>
      String(c[0]).includes("BottomNavCollision")
    );
    expect(collisionCalls).toHaveLength(0);
  });

  it("is a no-op when disabled (production)", async () => {
    installNav(764, 844);
    installButton("Salva", 770, 810);

    renderHook(() => {
      const ref = useRef<HTMLElement>(null);
      useBottomNavCollisionDetector(ref, { enabled: false, intervalMs: 100 });
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
