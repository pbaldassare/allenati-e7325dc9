import { useRef } from "react";
import { LucideIcon, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useVirtualKeyboard } from "@/hooks/useVirtualKeyboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBottomNavCollisionDetector } from "@/hooks/useBottomNavCollisionDetector";

export interface RoleBottomNavTab {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
  /** Optional exact-match prefix; defaults to startsWith(path) */
  exact?: boolean;
}

interface RoleBottomNavProps {
  tabs: RoleBottomNavTab[];
}

/**
 * Shared bottom nav used by Owner and Instructor mobile layouts.
 * - Identical height/anchoring across roles
 * - z-40 so Drawers/Dialogs (z-50) overlay it
 * - Hidden when keyboard is up or user scrolls down
 * - Honors iOS safe-area-inset-bottom
 */
export const RoleBottomNav = ({ tabs }: RoleBottomNavProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toggleSidebar } = useSidebar();
  const { isVisible: keyboardVisible } = useVirtualKeyboard();
  const isMobile = useIsMobile();
  const navRef = useRef<HTMLElement>(null);

  useBottomNavCollisionDetector(navRef, { enabled: isMobile && import.meta.env.DEV });

  if (!isMobile) return null;

  const isActive = (tab: RoleBottomNavTab) =>
    tab.exact ? pathname === tab.path : pathname === tab.path || pathname.startsWith(tab.path + "/") || pathname.startsWith(tab.path);

  return (
    <nav
      ref={navRef}
      data-testid="role-bottom-nav"
      data-bottom-nav-height="64"
      aria-label="Navigazione principale mobile"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-primary/10 shadow-card transition-transform duration-300 safe-area-bottom",
        keyboardVisible && "translate-y-full"
      )}
    >
      <div className="flex items-stretch justify-around px-2 py-2 max-w-md mx-auto h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 h-full p-1 rounded-2xl flex-1 min-w-0 transition-all",
                active
                  ? "text-white bg-gradient-primary shadow-primary scale-105"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-white")} />
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight truncate w-full text-center",
                  active ? "text-white" : "text-muted-foreground"
                )}
              >
                {tab.label}
              </span>
            </Button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          aria-label="Apri menu"
          className="flex flex-col items-center justify-center gap-0.5 h-full p-1 rounded-2xl flex-1 min-w-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
          <Menu className="h-5 w-5 shrink-0" />
          <span className="text-[10px] font-medium text-muted-foreground leading-tight">Menu</span>
        </Button>
      </div>
    </nav>
  );
};

export default RoleBottomNav;
