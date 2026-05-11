import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Home, Calendar } from "lucide-react";
import { setMobileViewport, setDesktopViewport } from "@/test/mobile-utils";

vi.mock("@/hooks/useScrollDirection", () => ({
  useScrollDirection: () => "up",
}));

vi.mock("@/hooks/useVirtualKeyboard", () => ({
  useVirtualKeyboard: vi.fn(() => ({ isVisible: false, viewportHeight: 844 })),
}));

vi.mock("@/components/ui/sidebar", async () => {
  const actual = await vi.importActual<typeof import("@/components/ui/sidebar")>(
    "@/components/ui/sidebar"
  );
  return {
    ...actual,
    useSidebar: () => ({
      toggleSidebar: vi.fn(),
      state: "collapsed",
      open: false,
      setOpen: vi.fn(),
      isMobile: true,
      openMobile: false,
      setOpenMobile: vi.fn(),
    }),
  };
});

import { RoleBottomNav, RoleBottomNavTab } from "@/components/RoleBottomNav";

const tabs: RoleBottomNavTab[] = [
  { id: "home", icon: Home, label: "Home", path: "/owner", exact: true },
  { id: "schedule", icon: Calendar, label: "Calendario", path: "/owner/schedule" },
];

const renderNav = (path = "/owner") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <RoleBottomNav tabs={tabs} />
    </MemoryRouter>
  );

describe("RoleBottomNav", () => {
  beforeEach(() => {
    setMobileViewport(390, 844);
  });

  it("renders nothing on desktop viewport", () => {
    setDesktopViewport();
    renderNav();
    expect(screen.queryByTestId("role-bottom-nav")).toBeNull();
  });

  it("renders all tabs and a Menu button on mobile", () => {
    renderNav();
    expect(screen.getByTestId("role-bottom-nav")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Calendario")).toBeInTheDocument();
    expect(screen.getByLabelText("Apri menu")).toBeInTheDocument();
  });

  it("uses z-40 so dialogs/drawers (z-50) overlay it", () => {
    renderNav();
    const nav = screen.getByTestId("role-bottom-nav");
    expect(nav.className).toMatch(/z-40/);
    expect(nav.className).not.toMatch(/z-50/);
  });

  it("anchors to the bottom edge with safe-area padding", () => {
    renderNav();
    const nav = screen.getByTestId("role-bottom-nav");
    expect(nav.className).toMatch(/fixed/);
    expect(nav.className).toMatch(/bottom-0/);
    expect(nav.className).toMatch(/safe-area-bottom/);
  });

  it("hides itself when the virtual keyboard is visible", () => {
    mockedKeyboard.mockReturnValue({ isVisible: true, viewportHeight: 400 });
    renderNav();
    const nav = screen.getByTestId("role-bottom-nav");
    expect(nav.className).toMatch(/translate-y-full/);
  });

  it("highlights the active tab based on the current pathname", () => {
    renderNav("/owner/schedule/extra");
    const calendarBtn = screen.getByText("Calendario").closest("button")!;
    expect(calendarBtn.className).toMatch(/bg-gradient-primary/);
    const homeBtn = screen.getByText("Home").closest("button")!;
    expect(homeBtn.className).not.toMatch(/bg-gradient-primary/);
  });
});
