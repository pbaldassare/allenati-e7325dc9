import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

describe("Drawer mobile safety", () => {
  it("renders a portal with z-50 content above z-40 BottomNav", () => {
    render(
      <Drawer open>
        <DrawerTrigger>open</DrawerTrigger>
        <DrawerContent data-testid="drawer-content">
          <DrawerHeader>
            <DrawerTitle>Title</DrawerTitle>
          </DrawerHeader>
          <DrawerFooter data-testid="drawer-footer">
            <button>CTA</button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );

    const content = screen.getByTestId("drawer-content");
    expect(content.className).toMatch(/z-50/);
    // Safe-area bottom padding so CTAs aren't hidden by the iPhone home indicator
    expect(content.className).toMatch(/safe-area-inset-bottom/);

    const footer = screen.getByTestId("drawer-footer");
    expect(footer.className).toMatch(/mobile-action-safe/);
    expect(screen.getByText("CTA")).toBeVisible();
  });
});
