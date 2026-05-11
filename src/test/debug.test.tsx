import { describe, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Home } from "lucide-react";

const { ks } = vi.hoisted(() => ({ ks: { isVisible: true } }));
vi.mock("@/hooks/useVirtualKeyboard", () => ({ useVirtualKeyboard: () => ks }));
vi.mock("@/hooks/useScrollDirection", () => ({ useScrollDirection: () => "up" }));
vi.mock("@/components/ui/sidebar", async () => {
  const a = await vi.importActual<any>("@/components/ui/sidebar");
  return { ...a, useSidebar: () => ({ toggleSidebar: () => {}, state: "collapsed", isMobile: true }) };
});

import { useVirtualKeyboard } from "@/hooks/useVirtualKeyboard";
import { RoleBottomNav } from "@/components/RoleBottomNav";

describe("debug", () => {
  it("logs", () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    console.log("hook returns:", useVirtualKeyboard());
    const { container } = render(
      <MemoryRouter><RoleBottomNav tabs={[{ id: "h", icon: Home, label: "H", path: "/x" }]} /></MemoryRouter>
    );
    console.log("HTML:", container.innerHTML.slice(0, 300));
  });
});
