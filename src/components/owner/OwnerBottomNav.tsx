import { Gauge, CalendarClock, ClipboardList, Users, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useVirtualKeyboard } from "@/hooks/useVirtualKeyboard";
import { useIsMobile } from "@/hooks/use-mobile";

const tabs = [
  { id: "dashboard", icon: Gauge, label: "Home", path: "/owner" },
  { id: "schedule", icon: CalendarClock, label: "Calendario", path: "/owner/schedule" },
  { id: "bookings", icon: ClipboardList, label: "Prenot.", path: "/owner/bookings" },
  { id: "users", icon: Users, label: "Utenti", path: "/owner/users" },
];

export const OwnerBottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toggleSidebar } = useSidebar();
  const scrollDirection = useScrollDirection();
  const { isVisible: keyboardVisible } = useVirtualKeyboard();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const isActive = (path: string) =>
    path === "/owner" ? pathname === "/owner" : pathname.startsWith(path);

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-primary/10 shadow-card transition-transform duration-300 safe-area-bottom",
        scrollDirection === "down" && !keyboardVisible && "translate-y-full",
        keyboardVisible && "translate-y-full"
      )}
    >
      <div className="flex items-center justify-around px-3 py-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center gap-1 h-auto p-2 rounded-2xl min-h-[56px] flex-1 transition-all",
                active
                  ? "text-white bg-gradient-primary shadow-primary scale-105"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-white")} />
              <span className={cn("text-[10px] font-medium", active ? "text-white" : "text-muted-foreground")}>
                {tab.label}
              </span>
            </Button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="flex flex-col items-center gap-1 h-auto p-2 rounded-2xl min-h-[56px] flex-1 text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium text-muted-foreground">Menu</span>
        </Button>
      </div>
    </div>
  );
};

export default OwnerBottomNav;
