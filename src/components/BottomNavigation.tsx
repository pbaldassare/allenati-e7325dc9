import { Home, TrendingUp, Calendar, CreditCard, User, ShoppingBag, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  const { isAdmin } = useAuth();
  
  const tabs = [
    { id: "home", icon: Home, label: "Home" },
    { id: "leaderboard", icon: TrendingUp, label: "Classifica" },
    { id: "calendar", icon: Calendar, label: "Corsi" },
    { id: "shop", icon: ShoppingBag, label: "Shop" },
    ...(isAdmin ? [{ id: "admin", icon: Settings, label: "Admin" }] : [{ id: "profile", icon: User, label: "Profilo" }]),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 h-auto p-2 transition-smooth",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon 
                className={cn(
                  "h-5 w-5",
                  isActive && "text-primary"
                )} 
              />
              <span className="text-xs font-medium">{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};